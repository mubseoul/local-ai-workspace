import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response

from database import get_db
from models import (
    ChatRequest, ConversationCreate, ConversationUpdate,
    Conversation, Message, EditMessageRequest, ConversationSearchResult,
)
from services.ollama_service import OllamaService
from services.rag_service import RAGService
from config import settings

router = APIRouter()
ollama = OllamaService()
rag = RAGService()


async def _enrich_conversation(row: dict) -> dict:
    row["is_pinned"] = bool(row.get("is_pinned", 0))
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT tag FROM conversation_tags WHERE conversation_id = ?",
            (row["id"],),
        )
        tag_rows = await cursor.fetchall()
        row["tags"] = [r["tag"] for r in tag_rows]
    finally:
        await db.close()
    return row


@router.get("/conversations", response_model=list[Conversation])
async def list_conversations(workspace_id: str | None = None):
    db = await get_db()
    try:
        if workspace_id:
            cursor = await db.execute(
                "SELECT * FROM conversations WHERE workspace_id = ? ORDER BY is_pinned DESC, updated_at DESC",
                (workspace_id,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM conversations ORDER BY is_pinned DESC, updated_at DESC"
            )
        rows = await cursor.fetchall()
    finally:
        await db.close()
    return [await _enrich_conversation(dict(row)) for row in rows]


@router.post("/conversations", response_model=Conversation)
async def create_conversation(body: ConversationCreate):
    db = await get_db()
    try:
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """INSERT INTO conversations
               (id, workspace_id, title, mode, system_prompt, is_pinned, folder, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)""",
            (conv_id, body.workspace_id, body.title, body.mode, body.system_prompt, now, now),
        )
        await db.commit()
        return {
            "id": conv_id,
            "workspace_id": body.workspace_id,
            "title": body.title,
            "mode": body.mode,
            "system_prompt": body.system_prompt,
            "is_pinned": False,
            "folder": None,
            "tags": [],
            "created_at": now,
            "updated_at": now,
        }
    finally:
        await db.close()


@router.patch("/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(conversation_id: str, body: ConversationUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")

        updates = body.model_dump(exclude_none=True)
        tags = updates.pop("tags", None)

        if updates:
            set_parts = []
            values = []
            for k, v in updates.items():
                if k == "is_pinned":
                    set_parts.append(f"{k} = ?")
                    values.append(1 if v else 0)
                else:
                    set_parts.append(f"{k} = ?")
                    values.append(v)
            set_parts.append("updated_at = ?")
            values.append(datetime.now(timezone.utc).isoformat())
            values.append(conversation_id)
            await db.execute(
                f"UPDATE conversations SET {', '.join(set_parts)} WHERE id = ?",
                values,
            )

        if tags is not None:
            await db.execute("DELETE FROM conversation_tags WHERE conversation_id = ?", (conversation_id,))
            for tag in tags:
                await db.execute(
                    "INSERT INTO conversation_tags (conversation_id, tag) VALUES (?, ?)",
                    (conversation_id, tag),
                )

        await db.commit()

        cursor = await db.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        updated = await cursor.fetchone()
    finally:
        await db.close()
    return await _enrich_conversation(dict(updated))


@router.get("/conversations/{conversation_id}/messages", response_model=list[Message])
async def get_messages(conversation_id: str):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,),
        )
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["sources"] = json.loads(d.get("sources", "[]"))
            result.append(d)
        return result
    finally:
        await db.close()


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    db = await get_db()
    try:
        await db.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        await db.execute("DELETE FROM conversation_tags WHERE conversation_id = ?", (conversation_id,))
        result = await db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        await db.commit()
        return {"deleted": True}
    finally:
        await db.close()


@router.put("/conversations/{conversation_id}/messages/{message_id}", response_model=Message)
async def edit_message(conversation_id: str, message_id: str, body: EditMessageRequest):
    """Edit a user message and delete all subsequent messages (for re-send)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE id = ? AND conversation_id = ?",
            (message_id, conversation_id),
        )
        msg = await cursor.fetchone()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        if msg["role"] != "user":
            raise HTTPException(status_code=400, detail="Only user messages can be edited")

        await db.execute(
            "DELETE FROM messages WHERE conversation_id = ? AND created_at > ?",
            (conversation_id, msg["created_at"]),
        )
        await db.execute(
            "UPDATE messages SET content = ? WHERE id = ?",
            (body.content, message_id),
        )
        await db.commit()

        cursor = await db.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
        updated = await cursor.fetchone()
        d = dict(updated)
        d["sources"] = json.loads(d.get("sources", "[]"))
        return d
    finally:
        await db.close()


@router.post("/conversations/{conversation_id}/regenerate")
async def regenerate_last_response(conversation_id: str):
    """Delete the last assistant message so a new response can be generated."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
            (conversation_id,),
        )
        last_msg = await cursor.fetchone()
        if not last_msg or last_msg["role"] != "assistant":
            raise HTTPException(status_code=400, detail="No assistant message to regenerate")

        await db.execute("DELETE FROM messages WHERE id = ?", (last_msg["id"],))
        await db.commit()

        cursor = await db.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
            (conversation_id,),
        )
        last_user = await cursor.fetchone()
        return {"deleted_message_id": last_msg["id"], "last_user_message": dict(last_user) if last_user else None}
    finally:
        await db.close()


@router.get("/conversations/{conversation_id}/export")
async def export_conversation(conversation_id: str):
    """Export a full conversation as Markdown."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        conv = await cursor.fetchone()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor = await db.execute(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
            (conversation_id,),
        )
        messages = await cursor.fetchall()
    finally:
        await db.close()

    lines = [f"# {conv['title']}", f"*Exported from Local AI Workspace*", f"*Mode: {conv['mode']}*", ""]

    if conv["system_prompt"]:
        lines.extend(["## System Prompt", "", conv["system_prompt"], "---", ""])

    for msg in messages:
        role_label = "You" if msg["role"] == "user" else "Assistant"
        lines.append(f"### {role_label}")
        lines.append("")
        lines.append(msg["content"])
        sources = json.loads(msg.get("sources", "[]"))
        if sources:
            lines.append("")
            lines.append("**Sources:**")
            for i, s in enumerate(sources, 1):
                page_info = f" (p. {s.get('page', '')})" if s.get("page") else ""
                lines.append(f"- [{i}] {s['filename']}{page_info}")
        lines.extend(["", "---", ""])

    md_content = "\n".join(lines)
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{conv["title"][:50]}.md"'},
    )


@router.get("/search", response_model=list[ConversationSearchResult])
async def search_conversations(q: str = Query(..., min_length=1)):
    """Full-text search across all conversations."""
    db = await get_db()
    try:
        search_term = f"%{q}%"
        cursor = await db.execute(
            """SELECT m.id as message_id, m.conversation_id, m.role, m.content, m.created_at,
                      c.title as conversation_title
               FROM messages m
               JOIN conversations c ON m.conversation_id = c.id
               WHERE m.content LIKE ?
               ORDER BY m.created_at DESC
               LIMIT 50""",
            (search_term,),
        )
        rows = await cursor.fetchall()
        results = []
        for row in rows:
            d = dict(row)
            content = d["content"]
            idx = content.lower().find(q.lower())
            start = max(0, idx - 50)
            end = min(len(content), idx + len(q) + 50)
            preview = ("..." if start > 0 else "") + content[start:end] + ("..." if end < len(content) else "")
            results.append({
                "conversation_id": d["conversation_id"],
                "conversation_title": d["conversation_title"],
                "message_id": d["message_id"],
                "role": d["role"],
                "content": d["content"],
                "match_preview": preview,
                "created_at": d["created_at"],
            })
        return results
    finally:
        await db.close()


@router.get("/folders")
async def list_folders():
    """Get all unique folder names."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT DISTINCT folder FROM conversations WHERE folder IS NOT NULL AND folder != '' ORDER BY folder"
        )
        rows = await cursor.fetchall()
        return [row["folder"] for row in rows]
    finally:
        await db.close()


@router.post("/debug/retrieve")
async def debug_retrieve(workspace_id: str, query: str, strategy: str = "vector", top_k: int = 5):
    """
    Debug endpoint to show what the RAG system retrieves for a query.

    Returns the full retrieval results with all metadata for transparency.
    """
    try:
        results = await rag.search(
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
            strategy=strategy,
        )

        return {
            "query": query,
            "strategy": strategy,
            "total_results": len(results),
            "results": results,
            "confidence_breakdown": {
                "high": sum(1 for r in results if r.get("confidence") == "high"),
                "medium": sum(1 for r in results if r.get("confidence") == "medium"),
                "low": sum(1 for r in results if r.get("confidence") == "low"),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
async def send_message(body: ChatRequest):
    model = body.model or settings.default_chat_model
    temperature = body.temperature if body.temperature is not None else settings.temperature

    # Get retrieval strategy from request (default to "vector" for compatibility)
    retrieval_strategy = getattr(body, 'retrieval_strategy', 'vector')
    show_debug_context = getattr(body, 'show_debug_context', False)

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM conversations WHERE id = ?", (body.conversation_id,)
        )
        conv = await cursor.fetchone()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    finally:
        await db.close()

    msg_cursor = await (await get_db()).execute(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (body.conversation_id,),
    )
    history_rows = await msg_cursor.fetchall()
    await msg_cursor.connection.close()

    history = [{"role": r["role"], "content": r["content"]} for r in history_rows]

    sources = []
    context_text = ""
    retrieval_metadata = {}

    if body.mode == "workspace" and body.workspace_id:
        # Use advanced RAG search with configurable strategy
        search_results = await rag.search(
            workspace_id=body.workspace_id,
            query=body.message,
            strategy=retrieval_strategy,
            use_recursive=getattr(body, 'use_recursive_retrieval', False),
        )
        sources = search_results

        # Store metadata for debug view
        retrieval_metadata = {
            "strategy": retrieval_strategy,
            "total_results": len(sources),
            "confidence_breakdown": {
                "high": sum(1 for s in sources if s.get("confidence") == "high"),
                "medium": sum(1 for s in sources if s.get("confidence") == "medium"),
                "low": sum(1 for s in sources if s.get("confidence") == "low"),
            }
        }

        if sources:
            context_parts = []
            for i, s in enumerate(sources, 1):
                page_info = f" (page {s['page']})" if s.get("page") else ""
                confidence = s.get("confidence", "unknown")
                score = s.get("score", 0)
                context_parts.append(
                    f"[{i}] {s['filename']}{page_info} [confidence: {confidence}, score: {score:.3f}]:\n{s['chunk_text']}"
                )
            context_text = "\n\n".join(context_parts)

    system = body.system_prompt or ""
    if body.mode == "workspace" and context_text:
        rag_instruction = (
            "Answer the user's question based on the following document excerpts. "
            "Use inline citations like [1], [2], etc. to reference specific sources. "
            "If the documents don't contain relevant information, say so clearly.\n\n"
            f"--- DOCUMENTS ---\n{context_text}\n--- END DOCUMENTS ---"
        )
        system = f"{system}\n\n{rag_instruction}" if system else rag_instruction

    user_msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_msg_id, body.conversation_id, "user", body.message, now),
        )
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now, body.conversation_id),
        )

        if len(history) == 0:
            title = body.message[:60] + ("..." if len(body.message) > 60 else "")
            await db.execute(
                "UPDATE conversations SET title = ? WHERE id = ?",
                (title, body.conversation_id),
            )
        await db.commit()
    finally:
        await db.close()

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.extend(history)
    messages.append({"role": "user", "content": body.message})

    assistant_msg_id = str(uuid.uuid4())

    async def stream_response():
        full_response = ""
        try:
            async for chunk in ollama.chat_stream(model, messages, temperature):
                full_response += chunk
                payload = json.dumps({"type": "chunk", "content": chunk})
                yield f"data: {payload}\n\n"

            source_list = [
                {
                    "filename": s["filename"],
                    "chunk_text": s["chunk_text"][:200],
                    "full_chunk_text": s["chunk_text"],  # Store full text for highlighting
                    "page": s.get("page"),
                    "score": s.get("score", 0),
                    "confidence": s.get("confidence", "unknown"),
                    "doc_id": s.get("doc_id", ""),
                }
                for s in sources
            ]

            db2 = await get_db()
            try:
                now2 = datetime.now(timezone.utc).isoformat()
                await db2.execute(
                    "INSERT INTO messages (id, conversation_id, role, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (assistant_msg_id, body.conversation_id, "assistant", full_response, json.dumps(source_list), now2),
                )
                await db2.commit()
            finally:
                await db2.close()

            # Calculate overall confidence
            overall_confidence = "high"
            if sources:
                high_count = sum(1 for s in sources if s.get("confidence") == "high")
                if high_count < len(sources) / 2:
                    overall_confidence = "medium"
                if all(s.get("confidence") == "low" for s in sources):
                    overall_confidence = "low"

            done_payload = json.dumps({
                "type": "done",
                "message_id": assistant_msg_id,
                "sources": source_list,
                "confidence": overall_confidence,
                "retrieval_metadata": retrieval_metadata if show_debug_context else None,
            })
            yield f"data: {done_payload}\n\n"

        except Exception as e:
            error_payload = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
