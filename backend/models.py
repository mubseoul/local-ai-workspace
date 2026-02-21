from pydantic import BaseModel, Field
from typing import Optional


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class WorkspaceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class Workspace(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str


class ConversationCreate(BaseModel):
    workspace_id: Optional[str] = None
    title: str = "New Chat"
    mode: str = "general"
    system_prompt: str = ""


class Conversation(BaseModel):
    id: str
    workspace_id: Optional[str]
    title: str
    mode: str
    system_prompt: str
    created_at: str
    updated_at: str


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    mode: str = "general"
    workspace_id: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    system_prompt: Optional[str] = None


class Source(BaseModel):
    filename: str
    chunk_text: str
    page: Optional[int] = None
    score: float = 0.0


class Message(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources: list[Source] = []
    created_at: str


class DocumentUpload(BaseModel):
    workspace_id: str
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None


class Document(BaseModel):
    id: str
    workspace_id: str
    filename: str
    file_path: str
    file_hash: str
    file_size: int
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: str


class SettingsUpdate(BaseModel):
    chat_model: Optional[str] = None
    embedding_model: Optional[str] = None
    temperature: Optional[float] = None
    top_k: Optional[int] = None
    context_window: Optional[int] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    data_dir: Optional[str] = None


class OllamaModel(BaseModel):
    name: str
    size: Optional[int] = None
    parameter_size: Optional[str] = None
    quantization: Optional[str] = None


class OllamaStatus(BaseModel):
    running: bool
    models: list[OllamaModel] = []
    error: Optional[str] = None
