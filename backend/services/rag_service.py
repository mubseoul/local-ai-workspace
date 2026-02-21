import logging
from typing import Literal

from config import settings
from services.ollama_service import OllamaService
from services.vector_store import VectorStoreService
from services.hybrid_search import HybridSearchService

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self):
        self.ollama = OllamaService()
        self.vector_store = VectorStoreService()
        self.hybrid_search = HybridSearchService()

    async def search(
        self,
        workspace_id: str,
        query: str,
        top_k: int | None = None,
        strategy: Literal["vector", "bm25", "hybrid", "hybrid_rerank"] = "vector",
        use_recursive: bool = False,
    ) -> list[dict]:
        """
        Search for relevant chunks in a workspace.

        Args:
            workspace_id: Workspace to search in
            query: Search query
            top_k: Number of results to return
            strategy: Search strategy:
                - "vector": Vector similarity only (default, fastest)
                - "bm25": BM25 keyword search only
                - "hybrid": Combine vector + BM25
                - "hybrid_rerank": Hybrid search + cross-encoder re-ranking (best quality)
            use_recursive: Enable recursive retrieval for low-confidence results

        Returns:
            List of search results with scores and metadata
        """
        k = top_k or settings.top_k

        try:
            query_embedding = await self.ollama.embed(query)
        except Exception as e:
            logger.error("Failed to embed query: %s", e)
            return []

        # Get vector search results
        vector_results = self.vector_store.query(workspace_id, query_embedding, top_k=k * 2)

        if strategy == "vector":
            results = vector_results[:k]

        elif strategy == "bm25":
            results = self.hybrid_search.search_bm25(workspace_id, query, top_k=k)

        elif strategy == "hybrid" or strategy == "hybrid_rerank":
            results = await self.hybrid_search.hybrid_search(
                workspace_id=workspace_id,
                query=query,
                query_embedding=query_embedding,
                vector_results=vector_results,
                top_k=k * 2 if strategy == "hybrid_rerank" else k,
            )

            if strategy == "hybrid_rerank":
                # Apply cross-encoder re-ranking
                results = await self.hybrid_search.rerank_results(query, results, top_k=k)

        else:
            results = vector_results[:k]

        # Apply recursive retrieval if enabled
        if use_recursive:
            results, iterations = await self.hybrid_search.recursive_retrieval(
                workspace_id=workspace_id,
                query=query,
                query_embedding=query_embedding,
                initial_results=results,
            )
            if iterations > 0:
                logger.info(f"Recursive retrieval used {iterations} iterations")

        # Add confidence indicator
        for result in results:
            result["confidence"] = self._calculate_confidence(result)

        return results

    def _calculate_confidence(self, result: dict) -> str:
        """
        Calculate confidence level based on score.

        Returns: "high", "medium", or "low"
        """
        score = result.get("score", 0)

        if score >= 0.8:
            return "high"
        elif score >= 0.5:
            return "medium"
        else:
            return "low"
