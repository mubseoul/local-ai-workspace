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
    is_pinned: bool = False
    folder: Optional[str] = None
    tags: list[str] = []
    created_at: str
    updated_at: str


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    folder: Optional[str] = None
    tags: Optional[list[str]] = None
    system_prompt: Optional[str] = None


class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    mode: str = "general"
    workspace_id: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    system_prompt: Optional[str] = None
    # v1.5 Advanced RAG parameters
    retrieval_strategy: Optional[str] = "vector"  # "vector", "bm25", "hybrid", "hybrid_rerank"
    use_recursive_retrieval: Optional[bool] = False
    show_debug_context: Optional[bool] = False


class EditMessageRequest(BaseModel):
    content: str


class Source(BaseModel):
    filename: str
    chunk_text: str
    page: Optional[int] = None
    score: float = 0.0
    # v1.5 Advanced RAG fields
    confidence: Optional[str] = "unknown"  # "high", "medium", "low"
    doc_id: Optional[str] = ""
    full_chunk_text: Optional[str] = None  # For source highlighting


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
    theme: Optional[str] = None
    # v1.5 Advanced RAG settings
    retrieval_strategy: Optional[str] = None  # "vector", "bm25", "hybrid", "hybrid_rerank"
    chunking_strategy: Optional[str] = None  # "sentence", "semantic", "hierarchical"
    use_recursive_retrieval: Optional[bool] = None


class OllamaModel(BaseModel):
    name: str
    size: Optional[int] = None
    parameter_size: Optional[str] = None
    quantization: Optional[str] = None


class OllamaStatus(BaseModel):
    running: bool
    models: list[OllamaModel] = []
    error: Optional[str] = None


class PromptTemplate(BaseModel):
    id: str
    name: str
    content: str
    category: str = "custom"
    is_builtin: bool = False
    variables: list[str] = []
    created_at: str
    updated_at: str


class PromptTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1)
    category: str = "custom"
    variables: list[str] = []


class PromptTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    variables: Optional[list[str]] = None


class ConversationSearchResult(BaseModel):
    conversation_id: str
    conversation_title: str
    message_id: str
    role: str
    content: str
    match_preview: str
    created_at: str
