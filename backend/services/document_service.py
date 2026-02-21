import logging

from services.ollama_service import OllamaService
from services.vector_store import VectorStoreService
from services.hybrid_search import HybridSearchService
from utils.text_extraction import extract_text
from utils.chunking import chunk_text
from config import settings

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self):
        self.ollama = OllamaService()
        self.vector_store = VectorStoreService()
        self.hybrid_search = HybridSearchService()

    async def ingest(
        self,
        workspace_id: str,
        doc_id: str,
        file_path: str,
        filename: str,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        chunking_strategy: str | None = None,
    ) -> int:
        """
        Ingest a document into a workspace.

        Args:
            workspace_id: Workspace to ingest into
            doc_id: Unique document ID
            file_path: Path to the file
            filename: Original filename
            chunk_size: Maximum chunk size
            chunk_overlap: Overlap between chunks
            chunking_strategy: "sentence", "semantic", "hierarchical", or None (use default)

        Returns:
            Number of chunks created
        """
        logger.info("Ingesting %s for workspace %s", filename, workspace_id)

        pages = extract_text(file_path)
        if not pages:
            raise ValueError(f"No text could be extracted from {filename}")

        # Use configured chunking strategy if not specified
        strategy = chunking_strategy or settings.chunking_strategy

        chunks = []
        for page_num, page_text in pages:
            page_chunks = chunk_text(page_text, chunk_size, chunk_overlap, strategy=strategy)
            for chunk in page_chunks:
                chunks.append({
                    "text": chunk,
                    "filename": filename,
                    "page": page_num,
                })

        if not chunks:
            raise ValueError(f"No text chunks generated from {filename}")

        logger.info("Generated %d chunks from %s using '%s' strategy", len(chunks), filename, strategy)

        texts = [c["text"] for c in chunks]
        embeddings = await self.ollama.embed_batch(texts)

        count = self.vector_store.add_chunks(workspace_id, doc_id, chunks, embeddings)
        logger.info("Ingestion complete: %d chunks stored for %s", count, filename)

        # Rebuild BM25 index for this workspace
        await self._rebuild_bm25_index(workspace_id)

        return count

    async def remove_document(self, workspace_id: str, doc_id: str):
        """Remove a document from a workspace and rebuild BM25 index."""
        self.vector_store.delete_document(workspace_id, doc_id)

        # Rebuild BM25 index
        await self._rebuild_bm25_index(workspace_id)

    async def _rebuild_bm25_index(self, workspace_id: str):
        """Rebuild the BM25 index for a workspace from all stored chunks."""
        try:
            # Get all chunks for this workspace
            collection = self.vector_store.get_or_create_collection(workspace_id)
            all_data = collection.get()

            if all_data and all_data.get("documents"):
                documents = all_data["documents"]
                self.hybrid_search.index_documents_for_bm25(workspace_id, documents)
                logger.info(f"Rebuilt BM25 index for workspace {workspace_id} with {len(documents)} chunks")
            else:
                # No documents, clear the index
                self.hybrid_search.delete_index(workspace_id)
                logger.info(f"Cleared BM25 index for workspace {workspace_id} (no documents)")

        except Exception as e:
            logger.warning(f"Failed to rebuild BM25 index: {e}")
