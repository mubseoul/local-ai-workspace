import aiosqlite
from config import settings

DB_PATH = str(settings.db_path())

MIGRATIONS = [
    """
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        title TEXT NOT NULL DEFAULT 'New Chat',
        mode TEXT NOT NULL DEFAULT 'general',
        system_prompt TEXT DEFAULT '',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        folder TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sources TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        chunk_count INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS prompt_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'custom',
        is_builtin INTEGER NOT NULL DEFAULT 0,
        variables TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS conversation_tags (
        conversation_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (conversation_id, tag),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_conversations_workspace
    ON conversations(workspace_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_documents_workspace
    ON documents(workspace_id);
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_hash
    ON documents(workspace_id, file_hash);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_conversations_pinned
    ON conversations(is_pinned);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_category
    ON prompt_templates(category);
    """,
]

V1_MIGRATIONS = [
    "ALTER TABLE conversations ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE conversations ADD COLUMN folder TEXT DEFAULT NULL;",
    """
    CREATE TABLE IF NOT EXISTS prompt_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'custom',
        is_builtin INTEGER NOT NULL DEFAULT 0,
        variables TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS conversation_tags (
        conversation_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (conversation_id, tag),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(is_pinned);",
    "CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);",
]


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        for migration in MIGRATIONS:
            await db.execute(migration)
        await db.commit()

        for migration in V1_MIGRATIONS:
            try:
                await db.execute(migration)
                await db.commit()
            except Exception:
                pass
    finally:
        await db.close()
