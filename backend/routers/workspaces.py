import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import get_db
from models import WorkspaceCreate, WorkspaceUpdate, Workspace
from services.vector_store import VectorStoreService

router = APIRouter()


@router.get("/", response_model=list[Workspace])
async def list_workspaces():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM workspaces ORDER BY updated_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


@router.post("/", response_model=Workspace)
async def create_workspace(body: WorkspaceCreate):
    db = await get_db()
    try:
        workspace_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (workspace_id, body.name, now, now),
        )
        await db.commit()
        return {
            "id": workspace_id,
            "name": body.name,
            "created_at": now,
            "updated_at": now,
        }
    finally:
        await db.close()


@router.put("/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, body: WorkspaceUpdate):
    db = await get_db()
    try:
        now = datetime.now(timezone.utc).isoformat()
        result = await db.execute(
            "UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?",
            (body.name, now, workspace_id),
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workspace not found")
        await db.commit()
        cursor = await db.execute(
            "SELECT * FROM workspaces WHERE id = ?", (workspace_id,)
        )
        row = await cursor.fetchone()
        return dict(row)
    finally:
        await db.close()


@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str):
    db = await get_db()
    try:
        result = await db.execute(
            "DELETE FROM workspaces WHERE id = ?", (workspace_id,)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workspace not found")
        await db.commit()

        try:
            vs = VectorStoreService()
            vs.delete_collection(workspace_id)
        except Exception:
            pass

        return {"deleted": True}
    finally:
        await db.close()
