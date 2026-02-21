"""
Hybrid search combining vector similarity and BM25 keyword search.

Includes:
- BM25 keyword search
- Hybrid search (weighted combination of vector + BM25)
- Cross-encoder re-ranking
- Recursive retrieval
"""

import logging
from typing import Literal

logger = logging.getLogger(__name__)


class HybridSearchService:
    """Service for advanced retrieval with hybrid search and re-ranking."""

    def __init__(self):
        self.bm25_indices = {}  # workspace_id -> BM25 index
        self.reranker = None  # Lazy-loaded cross-encoder

    def index_documents_for_bm25(self, workspace_id: str, documents: list[str]):
        """
        Build BM25 index for a workspace.

        Args:
            workspace_id: Workspace identifier
            documents: List of document texts to index
        """
        from rank_bm25 import BM25Okapi

        # Tokenize documents (simple word split)
        tokenized_docs = [doc.lower().split() for doc in documents]

        # Create BM25 index
        self.bm25_indices[workspace_id] = {
            "index": BM25Okapi(tokenized_docs),
            "documents": documents,
        }

        logger.info(f"Built BM25 index for workspace {workspace_id} with {len(documents)} documents")

    def search_bm25(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 10,
    ) -> list[dict]:
        """
        Search using BM25 keyword matching.

        Args:
            workspace_id: Workspace to search in
            query: Search query
            top_k: Number of results to return

        Returns:
            List of search results with scores
        """
        if workspace_id not in self.bm25_indices:
            logger.warning(f"No BM25 index found for workspace {workspace_id}")
            return []

        index_data = self.bm25_indices[workspace_id]
        bm25 = index_data["index"]
        documents = index_data["documents"]

        # Tokenize query
        tokenized_query = query.lower().split()

        # Get BM25 scores
        scores = bm25.get_scores(tokenized_query)

        # Get top-k results
        import numpy as np
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0:  # Only include results with positive scores
                results.append({
                    "chunk_text": documents[idx],
                    "score": float(scores[idx]),
                    "rank": len(results) + 1,
                })

        return results

    async def hybrid_search(
        self,
        workspace_id: str,
        query: str,
        query_embedding: list[float],
        vector_results: list[dict],
        top_k: int = 10,
        vector_weight: float = 0.7,
        bm25_weight: float = 0.3,
    ) -> list[dict]:
        """
        Combine vector search and BM25 search results.

        Args:
            workspace_id: Workspace to search in
            query: Search query
            query_embedding: Vector embedding of query
            vector_results: Results from vector search
            top_k: Number of final results
            vector_weight: Weight for vector scores (0-1)
            bm25_weight: Weight for BM25 scores (0-1)

        Returns:
            Combined and re-ranked results
        """
        # Get BM25 results
        bm25_results = self.search_bm25(workspace_id, query, top_k=top_k * 2)

        if not bm25_results:
            # Fall back to vector-only search
            return vector_results[:top_k]

        # Normalize scores to 0-1 range
        vector_results_normalized = self._normalize_scores(vector_results)
        bm25_results_normalized = self._normalize_scores(bm25_results)

        # Combine results
        combined = self._combine_results(
            vector_results_normalized,
            bm25_results_normalized,
            vector_weight,
            bm25_weight,
        )

        # Sort by combined score
        combined.sort(key=lambda x: x["score"], reverse=True)

        return combined[:top_k]

    async def rerank_results(
        self,
        query: str,
        results: list[dict],
        top_k: int = 5,
    ) -> list[dict]:
        """
        Re-rank results using a cross-encoder model.

        Cross-encoders are more accurate than bi-encoders (used for retrieval)
        because they jointly encode the query and document.

        Args:
            query: Search query
            results: Initial search results
            top_k: Number of top results to return

        Returns:
            Re-ranked results
        """
        if not results:
            return []

        # Lazy-load the cross-encoder
        if self.reranker is None:
            try:
                from sentence_transformers import CrossEncoder
                # Use a lightweight cross-encoder model
                self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
                logger.info("Loaded cross-encoder for re-ranking")
            except Exception as e:
                logger.warning(f"Failed to load cross-encoder: {e}")
                return results[:top_k]

        # Prepare query-document pairs
        pairs = [[query, result["chunk_text"]] for result in results]

        try:
            # Get cross-encoder scores
            scores = self.reranker.predict(pairs)

            # Update results with new scores
            for i, result in enumerate(results):
                result["rerank_score"] = float(scores[i])
                result["original_score"] = result.get("score", 0.0)

            # Sort by rerank score
            results.sort(key=lambda x: x["rerank_score"], reverse=True)

            return results[:top_k]

        except Exception as e:
            logger.error(f"Re-ranking failed: {e}")
            return results[:top_k]

    async def recursive_retrieval(
        self,
        workspace_id: str,
        query: str,
        query_embedding: list[float],
        initial_results: list[dict],
        confidence_threshold: float = 0.5,
        max_iterations: int = 2,
    ) -> tuple[list[dict], int]:
        """
        Perform recursive retrieval if initial results are low-confidence.

        If the top results have low scores, expand the search by:
        1. Increasing top-k
        2. Using query expansion
        3. Retrieving parent chunks (if hierarchical chunking is used)

        Args:
            workspace_id: Workspace to search in
            query: Original query
            query_embedding: Query embedding
            initial_results: First-pass results
            confidence_threshold: Minimum score to be considered confident
            max_iterations: Maximum number of retrieval iterations

        Returns:
            (results, iterations_used)
        """
        if not initial_results:
            return [], 0

        # Check confidence
        max_score = max(r.get("score", 0) for r in initial_results)

        if max_score >= confidence_threshold:
            # Results are confident, no need for recursion
            return initial_results, 0

        logger.info(f"Low confidence ({max_score:.3f}), expanding search...")

        # Iteration 1: Expand top-k
        # (This would call the vector store with increased top_k)
        # For now, just return initial results with a flag

        # Future: Implement query expansion, parent chunk retrieval

        return initial_results, 1

    def _normalize_scores(self, results: list[dict]) -> list[dict]:
        """Normalize scores to 0-1 range using min-max scaling."""
        if not results:
            return []

        scores = [r.get("score", 0) for r in results]
        if not scores:
            return results

        min_score = min(scores)
        max_score = max(scores)

        if max_score == min_score:
            # All scores are the same
            for r in results:
                r["score"] = 1.0
            return results

        for r in results:
            original_score = r.get("score", 0)
            r["score"] = (original_score - min_score) / (max_score - min_score)

        return results

    def _combine_results(
        self,
        vector_results: list[dict],
        bm25_results: list[dict],
        vector_weight: float,
        bm25_weight: float,
    ) -> list[dict]:
        """
        Combine vector and BM25 results using weighted scoring.

        Uses Reciprocal Rank Fusion (RRF) with score weighting.
        """
        # Create a map of chunk_text -> combined score
        combined_map = {}

        for result in vector_results:
            text = result["chunk_text"]
            score = result.get("score", 0) * vector_weight
            combined_map[text] = {
                **result,
                "score": score,
                "vector_score": result.get("score", 0),
            }

        for result in bm25_results:
            text = result["chunk_text"]
            bm25_score = result.get("score", 0) * bm25_weight

            if text in combined_map:
                # Already in vector results, boost score
                combined_map[text]["score"] += bm25_score
                combined_map[text]["bm25_score"] = result.get("score", 0)
            else:
                # Only in BM25 results
                combined_map[text] = {
                    **result,
                    "score": bm25_score,
                    "bm25_score": result.get("score", 0),
                    "vector_score": 0.0,
                }

        return list(combined_map.values())

    def update_index(self, workspace_id: str, documents: list[str]):
        """Update BM25 index when documents are added/removed."""
        self.index_documents_for_bm25(workspace_id, documents)

    def delete_index(self, workspace_id: str):
        """Delete BM25 index for a workspace."""
        if workspace_id in self.bm25_indices:
            del self.bm25_indices[workspace_id]
            logger.info(f"Deleted BM25 index for workspace {workspace_id}")
