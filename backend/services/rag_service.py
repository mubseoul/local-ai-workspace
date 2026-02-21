import logging

from config import settings
from services.ollama_service import OllamaService
from services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self):
        self.ollama = OllamaService()
        self.vector_store = VectorStoreService()

    async def search(
        self,
        workspace_id: str,
        query: str,
        top_k: int | None = None,
    ) -> list[dict]:
        k = top_k or settings.top_k

        try:
            query_embedding = await self.ollama.embed(query)
        except Exception as e:
            logger.error("Failed to embed query: %s", e)
            return []

        results = self.vector_store.query(workspace_id, query_embedding, top_k=k)
        return results
