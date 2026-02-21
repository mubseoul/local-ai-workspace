"""Integration test for the health endpoint."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert data["version"] == "0.2.0"
    assert "services" in data
    assert "ollama" in data["services"]
    assert "database" in data["services"]
    assert data["privacy"] == "All data stays on your device."
