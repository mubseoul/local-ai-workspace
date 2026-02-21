import uuid
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from database import get_db
from models import Document
from config import settings
from services.document_service import DocumentService
from utils.text_extraction import extract_text

router = APIRouter()
logger = logging.getLogger(__name__)
doc_service = DocumentService()


@router.get("/{workspace_id}", response_model=list[Document])
async def list_documents(workspace_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE workspace_id = ? ORDER BY created_at DESC",
            (workspace_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


@router.post("/upload")
async def upload_document(
    workspace_id: str = Form(...),
    chunk_size: int = Form(None),
    chunk_overlap: int = Form(None),
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    supported = {"pdf", "txt", "md", "docx"}
    if ext not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Supported: {', '.join(supported)}",
        )

    content = await file.read()

    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.max_file_size_mb}MB",
        )

    file_hash = hashlib.sha256(content).hexdigest()

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id FROM documents WHERE workspace_id = ? AND file_hash = ?",
            (workspace_id, file_hash),
        )
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=409,
                detail="This file has already been ingested in this workspace",
            )
    finally:
        await db.close()

    doc_id = str(uuid.uuid4())
    ws_dir = settings.workspace_dir(workspace_id)
    file_path = ws_dir / "documents" / f"{doc_id}_{file.filename}"
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(content)

    now = datetime.now(timezone.utc).isoformat()
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO documents
               (id, workspace_id, filename, file_path, file_hash, file_size, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc_id, workspace_id, file.filename, str(file_path), file_hash, len(content), "processing", now),
        )
        await db.commit()
    finally:
        await db.close()

    try:
        chunk_count = await doc_service.ingest(
            workspace_id=workspace_id,
            doc_id=doc_id,
            file_path=str(file_path),
            filename=file.filename,
            chunk_size=chunk_size or settings.chunk_size,
            chunk_overlap=chunk_overlap or settings.chunk_overlap,
        )

        db = await get_db()
        try:
            await db.execute(
                "UPDATE documents SET status = 'ready', chunk_count = ? WHERE id = ?",
                (chunk_count, doc_id),
            )
            await db.commit()
        finally:
            await db.close()

        return {
            "id": doc_id,
            "filename": file.filename,
            "status": "ready",
            "chunk_count": chunk_count,
        }

    except Exception as e:
        logger.error("Ingestion failed for %s: %s", file.filename, e)
        db = await get_db()
        try:
            await db.execute(
                "UPDATE documents SET status = 'error', error_message = ? WHERE id = ?",
                (str(e), doc_id),
            )
            await db.commit()
        finally:
            await db.close()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")


@router.delete("/{workspace_id}/{doc_id}")
async def delete_document(workspace_id: str, doc_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE id = ? AND workspace_id = ?",
            (doc_id, workspace_id),
        )
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        await db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        await db.commit()
    finally:
        await db.close()

    try:
        await doc_service.remove_document(workspace_id, doc_id)
    except Exception as e:
        logger.warning("Failed to remove vectors for doc %s: %s", doc_id, e)

    return {"deleted": True}


@router.post("/{workspace_id}/{doc_id}/reingest")
async def reingest_document(
    workspace_id: str,
    doc_id: str,
    chunk_size: int = Form(None),
    chunk_overlap: int = Form(None),
):
    """Re-ingest a document with new chunking settings."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE id = ? AND workspace_id = ?",
            (doc_id, workspace_id),
        )
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        await db.execute(
            "UPDATE documents SET status = 'processing', error_message = NULL WHERE id = ?",
            (doc_id,),
        )
        await db.commit()
    finally:
        await db.close()

    try:
        await doc_service.remove_document(workspace_id, doc_id)
    except Exception as e:
        logger.warning("Failed to remove old vectors for doc %s: %s", doc_id, e)

    try:
        chunk_count = await doc_service.ingest(
            workspace_id=workspace_id,
            doc_id=doc_id,
            file_path=doc["file_path"],
            filename=doc["filename"],
            chunk_size=chunk_size or settings.chunk_size,
            chunk_overlap=chunk_overlap or settings.chunk_overlap,
        )
        db = await get_db()
        try:
            await db.execute(
                "UPDATE documents SET status = 'ready', chunk_count = ? WHERE id = ?",
                (chunk_count, doc_id),
            )
            await db.commit()
        finally:
            await db.close()
        return {"status": "ready", "chunk_count": chunk_count}
    except Exception as e:
        logger.error("Re-ingestion failed for %s: %s", doc["filename"], e)
        db = await get_db()
        try:
            await db.execute(
                "UPDATE documents SET status = 'error', error_message = ? WHERE id = ?",
                (str(e), doc_id),
            )
            await db.commit()
        finally:
            await db.close()
        raise HTTPException(status_code=500, detail=f"Re-ingestion failed: {e}")


@router.get("/{workspace_id}/{doc_id}/preview")
async def preview_document(workspace_id: str, doc_id: str):
    """Preview extracted text from a document."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM documents WHERE id = ? AND workspace_id = ?",
            (doc_id, workspace_id),
        )
        doc = await cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
    finally:
        await db.close()

    try:
        page_texts = extract_text(doc["file_path"])
        full_text = "\n\n".join(text for _, text in page_texts)
        total_pages = len(page_texts)
        preview = full_text[:5000]
        return {
            "filename": doc["filename"],
            "total_chars": len(full_text),
            "total_pages": total_pages,
            "preview": preview,
            "truncated": len(full_text) > 5000,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {e}")
