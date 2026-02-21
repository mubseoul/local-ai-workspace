import json

from fastapi import APIRouter
from database import get_db
from models import SettingsUpdate
from config import settings

router = APIRouter()


@router.get("/")
async def get_settings():
    db = await get_db()
    try:
        cursor = await db.execute("SELECT key, value FROM app_settings")
        rows = await cursor.fetchall()
        stored = {row["key"]: row["value"] for row in rows}
    finally:
        await db.close()

    return {
        "chat_model": stored.get("chat_model", settings.default_chat_model),
        "embedding_model": stored.get("embedding_model", settings.default_embedding_model),
        "temperature": float(stored.get("temperature", settings.temperature)),
        "top_k": int(stored.get("top_k", settings.top_k)),
        "context_window": int(stored.get("context_window", settings.context_window)),
        "chunk_size": int(stored.get("chunk_size", settings.chunk_size)),
        "chunk_overlap": int(stored.get("chunk_overlap", settings.chunk_overlap)),
        "data_dir": stored.get("data_dir", str(settings.data_dir)),
    }


@router.put("/")
async def update_settings(body: SettingsUpdate):
    db = await get_db()
    try:
        updates = body.model_dump(exclude_none=True)
        for key, value in updates.items():
            await db.execute(
                "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
                (key, str(value)),
            )
        await db.commit()
    finally:
        await db.close()

    return await get_settings()
