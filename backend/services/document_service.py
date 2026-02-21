import logging

from services.ollama_service import OllamaService
from services.vector_store import VectorStoreService
from utils.text_extraction import extract_text
from utils.chunking import chunk_text

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self):
        self.ollama = OllamaService()
        self.vector_store = VectorStoreService()

    async def ingest(
        self,
        workspace_id: str,
        doc_id: str,
        file_path: str,
        filename: str,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
    ) -> int:
        logger.info("Ingesting %s for workspace %s", filename, workspace_id)

        pages = extract_text(file_path)
        if not pages:
            raise ValueError(f"No text could be extracted from {filename}")

        chunks = []
        for page_num, page_text in pages:
            page_chunks = chunk_text(page_text, chunk_size, chunk_overlap)
            for chunk in page_chunks:
                chunks.append({
                    "text": chunk,
                    "filename": filename,
                    "page": page_num,
                })

        if not chunks:
            raise ValueError(f"No text chunks generated from {filename}")

        logger.info("Generated %d chunks from %s", len(chunks), filename)

        texts = [c["text"] for c in chunks]
        embeddings = await self.ollama.embed_batch(texts)

        count = self.vector_store.add_chunks(workspace_id, doc_id, chunks, embeddings)
        logger.info("Ingestion complete: %d chunks stored for %s", count, filename)
        return count

    async def remove_document(self, workspace_id: str, doc_id: str):
        self.vector_store.delete_document(workspace_id, doc_id)
