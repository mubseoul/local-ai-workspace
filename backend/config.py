from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Local AI Workspace"
    data_dir: Path = Path.home() / ".local-ai-workspace"
    ollama_base_url: str = "http://localhost:11434"
    default_chat_model: str = "llama3"
    default_embedding_model: str = "nomic-embed-text"
    chunk_size: int = 512
    chunk_overlap: int = 64
    top_k: int = 5
    temperature: float = 0.7
    context_window: int = 4096
    max_file_size_mb: int = 100
    api_timeout: int = 120
    retry_attempts: int = 3
    retry_backoff: float = 1.0
    debug: bool = False

    model_config = {"env_file": ".env", "env_prefix": "LAW_"}

    def workspace_dir(self, workspace_id: str) -> Path:
        d = self.data_dir / "workspaces" / workspace_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def db_path(self) -> Path:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return self.data_dir / "local_ai.db"


settings = Settings()
