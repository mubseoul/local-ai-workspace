import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from database import get_db
from models import ChatRequest, ConversationCreate, Conversation, Message
from services.ollama_service import OllamaService
from services.rag_service import RAGService
from config import settings

router = APIRouter()
ollama = OllamaService()
rag = RAGService()


@router.get("/conversations", response_model=list[Conversation])
async def list_conversations(workspace_id: str | None = None):
    db = await get_db()
    try:
        if workspace_id:
            cursor = await db.execute(
                "SELECT * FROM conversations WHERE workspace_id = ? ORDER BY updated_at DESC",
                (workspace_id,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM conversations ORDER BY updated_at DESC"
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


@router.post("/conversations", response_model=Conversation)
async def create_conversation(body: ConversationCreate):
    db = await get_db()
    try:
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """INSERT INTO conversations
               (id, workspace_id, title, mode, system_prompt, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (conv_id, body.workspace_id, body.title, body.mode, body.system_prompt, now, now),
        )
        await db.commit()
        return {
            "id": conv_id,
            "workspace_id": body.workspace_id,
            "title": body.title,
            "mode": body.mode,
            "system_prompt": body.system_prompt,
            "created_at": now,
            "updated_at": now,
        }
    finally:
        await db.close()


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
        result = await db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conversation not found")
        await db.commit()
        return {"deleted": True}
    finally:
        await db.close()


@router.post("/send")
async def send_message(body: ChatRequest):
    model = body.model or settings.default_chat_model
    temperature = body.temperature if body.temperature is not None else settings.temperature

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
    if body.mode == "workspace" and body.workspace_id:
        search_results = await rag.search(body.workspace_id, body.message)
        sources = search_results
        if sources:
            context_parts = []
            for i, s in enumerate(sources, 1):
                page_info = f" (page {s['page']})" if s.get("page") else ""
                context_parts.append(f"[{i}] {s['filename']}{page_info}:\n{s['chunk_text']}")
            context_text = "\n\n".join(context_parts)

    system = body.system_prompt or ""
    if body.mode == "workspace" and context_text:
        rag_instruction = (
            "Answer the user's question based on the following document excerpts. "
            "Cite sources using [1], [2], etc. If the documents don't contain "
            "relevant information, say so clearly.\n\n"
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
                    "page": s.get("page"),
                    "score": s.get("score", 0),
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

            done_payload = json.dumps({
                "type": "done",
                "message_id": assistant_msg_id,
                "sources": source_list,
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
