export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string | null;
  title: string;
  mode: "general" | "workspace";
  system_prompt: string;
  is_pinned: boolean;
  folder: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ConversationUpdate {
  title?: string;
  is_pinned?: boolean;
  folder?: string | null;
  tags?: string[];
  system_prompt?: string;
}

export interface Source {
  filename: string;
  chunk_text: string;
  page: number | null;
  score: number;
  // v1.5 Advanced RAG fields
  confidence?: "high" | "medium" | "low" | "unknown";
  doc_id?: string;
  full_chunk_text?: string; // For source highlighting
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: Source[];
  created_at: string;
}

export interface ChatRequest {
  conversation_id: string;
  message: string;
  mode: "general" | "workspace";
  workspace_id?: string;
  model?: string;
  temperature?: number;
  system_prompt?: string;
  // v1.5 Advanced RAG parameters
  retrieval_strategy?: "vector" | "bm25" | "hybrid" | "hybrid_rerank";
  use_recursive_retrieval?: boolean;
  show_debug_context?: boolean;
}

export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  file_path: string;
  file_hash: string;
  file_size: number;
  chunk_count: number;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  created_at: string;
}

export interface OllamaModel {
  name: string;
  size: number | null;
  parameter_size: string | null;
  quantization: string | null;
}

export interface OllamaStatus {
  running: boolean;
  models: OllamaModel[];
  error: string | null;
}

export type Theme = "light" | "dark" | "system";

export type RetrievalStrategy = "vector" | "bm25" | "hybrid" | "hybrid_rerank";
export type ChunkingStrategy = "sentence" | "semantic" | "hierarchical";

export interface AppSettings {
  chat_model: string;
  embedding_model: string;
  temperature: number;
  top_k: number;
  context_window: number;
  chunk_size: number;
  chunk_overlap: number;
  data_dir: string;
  theme: Theme;
  // v1.5 Advanced RAG settings
  retrieval_strategy?: RetrievalStrategy;
  chunking_strategy?: ChunkingStrategy;
  use_recursive_retrieval?: boolean;
}

export type ChatMode = "general" | "workspace";

export interface StreamChunk {
  type: "chunk" | "done" | "error";
  content?: string;
  message_id?: string;
  sources?: Source[];
  // v1.5 Advanced RAG fields
  confidence?: "high" | "medium" | "low";
  retrieval_metadata?: {
    strategy: string;
    total_results: number;
    confidence_breakdown: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  is_builtin: boolean;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateCreate {
  name: string;
  content: string;
  category?: string;
  variables?: string[];
}

export interface ConversationSearchResult {
  conversation_id: string;
  conversation_title: string;
  message_id: string;
  role: string;
  content: string;
  match_preview: string;
  created_at: string;
}

export interface DocumentPreview {
  filename: string;
  total_chars: number;
  total_pages: number;
  preview: string;
  truncated: boolean;
}

// v1.5 Advanced RAG types
export interface DebugRetrievalResult {
  query: string;
  strategy: string;
  total_results: number;
  results: Array<{
    chunk_text: string;
    filename: string;
    page: number | null;
    score: number;
    confidence: string;
  }>;
  confidence_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
}
