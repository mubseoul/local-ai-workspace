import logging
import logging.handlers
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import init_db, get_db
from routers import chat, documents, workspaces, ollama, app_settings
from services.ollama_service import OllamaService


def setup_logging():
    log_dir = settings.data_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "backend.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)


setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("Starting Local AI Workspace backend v0.2.0")
    logger.info("Data directory: %s", settings.data_dir)
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    await init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Local AI Workspace API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    if not request.url.path.startswith("/api/health"):
        logger.info("%s %s → %d (%dms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "detail": str(exc) if settings.debug else "An unexpected error occurred.",
        },
    )


app.include_router(ollama.router, prefix="/api/ollama", tags=["ollama"])
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(app_settings.router, prefix="/api/settings", tags=["settings"])


@app.get("/api/health")
async def health():
    ollama_ok = False
    ollama_error = None
    try:
        svc = OllamaService()
        ollama_ok = await svc.is_running()
    except Exception as e:
        ollama_error = str(e)

    db_ok = False
    try:
        db = await get_db()
        await db.execute("SELECT 1")
        await db.close()
        db_ok = True
    except Exception:
        pass

    overall = "ok" if (ollama_ok and db_ok) else "degraded"

    return {
        "status": overall,
        "version": "0.2.0",
        "services": {
            "ollama": {"ok": ollama_ok, "error": ollama_error},
            "database": {"ok": db_ok},
        },
        "privacy": "All data stays on your device.",
    }
