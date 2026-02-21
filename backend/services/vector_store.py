import logging

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import settings

logger = logging.getLogger(__name__)


class VectorStoreService:
    def __init__(self):
        chroma_dir = settings.data_dir / "chroma"
        chroma_dir.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    def _collection_name(self, workspace_id: str) -> str:
        safe = workspace_id.replace("-", "_")[:60]
        return f"ws_{safe}"

    def get_or_create_collection(self, workspace_id: str):
        name = self._collection_name(workspace_id)
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(
        self,
        workspace_id: str,
        doc_id: str,
        chunks: list[dict],
        embeddings: list[list[float]],
    ) -> int:
        collection = self.get_or_create_collection(workspace_id)
        ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "doc_id": doc_id,
                "filename": c.get("filename", ""),
                "page": c.get("page", 0),
                "chunk_index": i,
            }
            for i, c in enumerate(chunks)
        ]

        batch_size = 100
        for start in range(0, len(ids), batch_size):
            end = start + batch_size
            collection.add(
                ids=ids[start:end],
                documents=documents[start:end],
                embeddings=embeddings[start:end],
                metadatas=metadatas[start:end],
            )

        logger.info("Added %d chunks for doc %s in workspace %s", len(chunks), doc_id, workspace_id)
        return len(chunks)

    def query(
        self,
        workspace_id: str,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict]:
        try:
            collection = self.get_or_create_collection(workspace_id)
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error("Vector query failed: %s", e)
            return []

        items = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 1.0
                items.append({
                    "chunk_text": doc,
                    "filename": meta.get("filename", "unknown"),
                    "page": meta.get("page", 0),
                    "score": round(1 - distance, 4),
                    "doc_id": meta.get("doc_id", ""),
                })
        return items

    def delete_document(self, workspace_id: str, doc_id: str):
        try:
            collection = self.get_or_create_collection(workspace_id)
            all_ids = collection.get(where={"doc_id": doc_id})
            if all_ids and all_ids["ids"]:
                collection.delete(ids=all_ids["ids"])
                logger.info("Deleted %d chunks for doc %s", len(all_ids["ids"]), doc_id)
        except Exception as e:
            logger.error("Failed to delete doc vectors: %s", e)

    def delete_collection(self, workspace_id: str):
        name = self._collection_name(workspace_id)
        try:
            self.client.delete_collection(name)
            logger.info("Deleted collection %s", name)
        except Exception as e:
            logger.warning("Failed to delete collection %s: %s", name, e)
