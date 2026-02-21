from fastapi import APIRouter
from services.ollama_service import OllamaService

router = APIRouter()
ollama = OllamaService()


@router.get("/status")
async def get_status():
    return await ollama.get_status()


@router.get("/models")
async def list_models():
    return await ollama.list_models()


@router.post("/pull/{model_name}")
async def pull_model(model_name: str):
    return await ollama.pull_model(model_name)
