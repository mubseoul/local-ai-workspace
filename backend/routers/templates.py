import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from database import get_db
from models import PromptTemplate, PromptTemplateCreate, PromptTemplateUpdate

router = APIRouter()

BUILTIN_TEMPLATES = [
    {
        "id": "builtin-summarize",
        "name": "Summarize",
        "content": "Please provide a concise summary of the following:\n\n{{document}}",
        "category": "general",
        "is_builtin": True,
        "variables": ["document"],
    },
    {
        "id": "builtin-explain",
        "name": "Explain Like I'm 5",
        "content": "Explain the following concept in simple terms that a 5-year-old would understand:\n\n{{question}}",
        "category": "general",
        "is_builtin": True,
        "variables": ["question"],
    },
    {
        "id": "builtin-compare",
        "name": "Compare & Contrast",
        "content": "Compare and contrast the following two items, highlighting their key similarities and differences:\n\nItem A: {{item_a}}\nItem B: {{item_b}}",
        "category": "general",
        "is_builtin": True,
        "variables": ["item_a", "item_b"],
    },
    {
        "id": "builtin-extract",
        "name": "Extract Key Points",
        "content": "Extract the key points, facts, and actionable items from the following text. Format as a bulleted list:\n\n{{document}}",
        "category": "general",
        "is_builtin": True,
        "variables": ["document"],
    },
    {
        "id": "builtin-translate",
        "name": "Translate",
        "content": "Translate the following text to {{language}}:\n\n{{text}}",
        "category": "general",
        "is_builtin": True,
        "variables": ["language", "text"],
    },
    {
        "id": "builtin-code-review",
        "name": "Code Review",
        "content": "Review the following code for bugs, performance issues, and best practices. Suggest improvements:\n\n```\n{{code}}\n```",
        "category": "coding",
        "is_builtin": True,
        "variables": ["code"],
    },
    {
        "id": "builtin-pros-cons",
        "name": "Pros & Cons",
        "content": "List the pros and cons of the following:\n\n{{topic}}\n\nFormat as two separate lists.",
        "category": "general",
        "is_builtin": True,
        "variables": ["topic"],
    },
    {
        "id": "builtin-eli-expert",
        "name": "Expert Analysis",
        "content": "As a domain expert, provide a detailed technical analysis of the following:\n\n{{question}}",
        "category": "general",
        "is_builtin": True,
        "variables": ["question"],
    },
]


async def _seed_builtins():
    db = await get_db()
    try:
        for tmpl in BUILTIN_TEMPLATES:
            cursor = await db.execute("SELECT id FROM prompt_templates WHERE id = ?", (tmpl["id"],))
            exists = await cursor.fetchone()
            if not exists:
                now = datetime.now(timezone.utc).isoformat()
                await db.execute(
                    """INSERT INTO prompt_templates (id, name, content, category, is_builtin, variables, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (tmpl["id"], tmpl["name"], tmpl["content"], tmpl["category"],
                     1, json.dumps(tmpl["variables"]), now, now),
                )
        await db.commit()
    finally:
        await db.close()


@router.on_event("startup")
async def startup():
    await _seed_builtins()


@router.get("/", response_model=list[PromptTemplate])
async def list_templates(category: str | None = None):
    await _seed_builtins()
    db = await get_db()
    try:
        if category:
            cursor = await db.execute(
                "SELECT * FROM prompt_templates WHERE category = ? ORDER BY is_builtin DESC, name ASC",
                (category,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM prompt_templates ORDER BY is_builtin DESC, name ASC"
            )
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            d["is_builtin"] = bool(d.get("is_builtin", 0))
            d["variables"] = json.loads(d.get("variables", "[]"))
            result.append(d)
        return result
    finally:
        await db.close()


@router.post("/", response_model=PromptTemplate)
async def create_template(body: PromptTemplateCreate):
    db = await get_db()
    try:
        tmpl_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """INSERT INTO prompt_templates (id, name, content, category, is_builtin, variables, created_at, updated_at)
               VALUES (?, ?, ?, ?, 0, ?, ?, ?)""",
            (tmpl_id, body.name, body.content, body.category, json.dumps(body.variables), now, now),
        )
        await db.commit()
        return {
            "id": tmpl_id,
            "name": body.name,
            "content": body.content,
            "category": body.category,
            "is_builtin": False,
            "variables": body.variables,
            "created_at": now,
            "updated_at": now,
        }
    finally:
        await db.close()


@router.put("/{template_id}", response_model=PromptTemplate)
async def update_template(template_id: str, body: PromptTemplateUpdate):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM prompt_templates WHERE id = ?", (template_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        if row["is_builtin"]:
            raise HTTPException(status_code=400, detail="Cannot edit built-in templates")

        updates = body.model_dump(exclude_none=True)
        if "variables" in updates:
            updates["variables"] = json.dumps(updates["variables"])

        if updates:
            set_parts = [f"{k} = ?" for k in updates]
            set_parts.append("updated_at = ?")
            values = list(updates.values())
            values.append(datetime.now(timezone.utc).isoformat())
            values.append(template_id)
            await db.execute(
                f"UPDATE prompt_templates SET {', '.join(set_parts)} WHERE id = ?",
                values,
            )
            await db.commit()

        cursor = await db.execute("SELECT * FROM prompt_templates WHERE id = ?", (template_id,))
        updated = await cursor.fetchone()
        d = dict(updated)
        d["is_builtin"] = bool(d.get("is_builtin", 0))
        d["variables"] = json.loads(d.get("variables", "[]"))
        return d
    finally:
        await db.close()


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM prompt_templates WHERE id = ?", (template_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        if row["is_builtin"]:
            raise HTTPException(status_code=400, detail="Cannot delete built-in templates")

        await db.execute("DELETE FROM prompt_templates WHERE id = ?", (template_id,))
        await db.commit()
        return {"deleted": True}
    finally:
        await db.close()


@router.get("/export")
async def export_templates():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM prompt_templates WHERE is_builtin = 0 ORDER BY name"
        )
        rows = await cursor.fetchall()
        templates = []
        for row in rows:
            d = dict(row)
            d["variables"] = json.loads(d.get("variables", "[]"))
            del d["is_builtin"]
            templates.append(d)
        return {"templates": templates}
    finally:
        await db.close()


@router.post("/import")
async def import_templates(data: dict):
    templates = data.get("templates", [])
    imported = 0
    db = await get_db()
    try:
        for tmpl in templates:
            tmpl_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            await db.execute(
                """INSERT INTO prompt_templates (id, name, content, category, is_builtin, variables, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 0, ?, ?, ?)""",
                (tmpl_id, tmpl["name"], tmpl["content"], tmpl.get("category", "custom"),
                 json.dumps(tmpl.get("variables", [])), now, now),
            )
            imported += 1
        await db.commit()
    finally:
        await db.close()
    return {"imported": imported}
