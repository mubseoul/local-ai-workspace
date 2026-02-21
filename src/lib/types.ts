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
  created_at: string;
  updated_at: string;
}

export interface Source {
  filename: string;
  chunk_text: string;
  page: number | null;
  score: number;
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

export interface AppSettings {
  chat_model: string;
  embedding_model: string;
  temperature: number;
  top_k: number;
  context_window: number;
  chunk_size: number;
  chunk_overlap: number;
  data_dir: string;
}

export type ChatMode = "general" | "workspace";

export interface StreamChunk {
  type: "chunk" | "done" | "error";
  content?: string;
  message_id?: string;
  sources?: Source[];
}
