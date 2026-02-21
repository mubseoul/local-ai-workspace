import logging
from typing import AsyncGenerator

import httpx

from config import settings
from models import OllamaStatus, OllamaModel

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.timeout = settings.api_timeout

    async def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout)

    async def is_running(self) -> bool:
        try:
            async with await self._client() as client:
                resp = await client.get("/api/tags")
                return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def get_status(self) -> OllamaStatus:
        try:
            async with await self._client() as client:
                resp = await client.get("/api/tags")
                if resp.status_code != 200:
                    return OllamaStatus(running=False, error="Ollama returned non-200 status")
                data = resp.json()
                models = [
                    OllamaModel(
                        name=m.get("name", ""),
                        size=m.get("size"),
                        parameter_size=m.get("details", {}).get("parameter_size"),
                        quantization=m.get("details", {}).get("quantization_level"),
                    )
                    for m in data.get("models", [])
                ]
                return OllamaStatus(running=True, models=models)
        except httpx.ConnectError:
            return OllamaStatus(
                running=False,
                error="Cannot connect to Ollama. Make sure it is running on localhost:11434.",
            )
        except Exception as e:
            return OllamaStatus(running=False, error=str(e))

    async def list_models(self) -> list[OllamaModel]:
        status = await self.get_status()
        return status.models

    async def pull_model(self, model_name: str) -> dict:
        try:
            async with await self._client() as client:
                resp = await client.post(
                    "/api/pull",
                    json={"name": model_name},
                    timeout=600,
                )
                return {"success": resp.status_code == 200, "model": model_name}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def chat_stream(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        async with await self._client() as client:
            async with client.stream(
                "POST",
                "/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "options": {"temperature": temperature},
                },
                timeout=self.timeout,
            ) as resp:
                if resp.status_code != 200:
                    error_body = await resp.aread()
                    raise RuntimeError(
                        f"Ollama error ({resp.status_code}): {error_body.decode()}"
                    )

                import json
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    async def embed(self, text: str, model: str | None = None) -> list[float]:
        model = model or settings.default_embedding_model
        async with await self._client() as client:
            resp = await client.post(
                "/api/embed",
                json={"model": model, "input": text},
                timeout=60,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Embedding failed: {resp.text}")
            data = resp.json()
            embeddings = data.get("embeddings", [])
            if not embeddings:
                raise RuntimeError("No embeddings returned from Ollama")
            return embeddings[0]

    async def embed_batch(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        model = model or settings.default_embedding_model
        results = []
        for text in texts:
            emb = await self.embed(text, model)
            results.append(emb)
        return results
