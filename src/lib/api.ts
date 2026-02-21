import type {
  Workspace,
  Conversation,
  ConversationUpdate,
  Message,
  Document,
  OllamaStatus,
  OllamaModel,
  AppSettings,
  ChatRequest,
  StreamChunk,
  PromptTemplate,
  PromptTemplateCreate,
  ConversationSearchResult,
  DocumentPreview,
} from "./types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  ollama: {
    status: () => request<OllamaStatus>("/ollama/status"),
    models: () => request<OllamaModel[]>("/ollama/models"),
    pull: (model: string) =>
      request<{ success: boolean }>(`/ollama/pull/${model}`, { method: "POST" }),
  },

  workspaces: {
    list: () => request<Workspace[]>("/workspaces/"),
    create: (name: string) =>
      request<Workspace>("/workspaces/", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    update: (id: string, name: string) =>
      request<Workspace>(`/workspaces/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/workspaces/${id}`, { method: "DELETE" }),
  },

  chat: {
    conversations: (workspaceId?: string) => {
      const q = workspaceId ? `?workspace_id=${workspaceId}` : "";
      return request<Conversation[]>(`/chat/conversations${q}`);
    },
    createConversation: (data: {
      workspace_id?: string;
      title?: string;
      mode?: string;
      system_prompt?: string;
    }) =>
      request<Conversation>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateConversation: (id: string, data: ConversationUpdate) =>
      request<Conversation>(`/chat/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    messages: (conversationId: string) =>
      request<Message[]>(`/chat/conversations/${conversationId}/messages`),
    deleteConversation: (conversationId: string) =>
      request<{ deleted: boolean }>(`/chat/conversations/${conversationId}`, {
        method: "DELETE",
      }),
    editMessage: (conversationId: string, messageId: string, content: string) =>
      request<Message>(`/chat/conversations/${conversationId}/messages/${messageId}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    regenerate: (conversationId: string) =>
      request<{ deleted_message_id: string; last_user_message: Message | null }>(
        `/chat/conversations/${conversationId}/regenerate`,
        { method: "POST" }
      ),
    exportConversation: async (conversationId: string): Promise<string> => {
      const res = await fetch(`${BASE}/chat/conversations/${conversationId}/export`);
      if (!res.ok) throw new Error("Export failed");
      return res.text();
    },
    search: (query: string) =>
      request<ConversationSearchResult[]>(`/chat/search?q=${encodeURIComponent(query)}`),
    folders: () => request<string[]>("/chat/folders"),
    send: async function* (body: ChatRequest): AsyncGenerator<StreamChunk> {
      const res = await fetch(`${BASE}/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Stream failed" }));
        throw new Error(err.detail);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6)) as StreamChunk;
            yield data;
          } catch {
            continue;
          }
        }
      }
    },
  },

  documents: {
    list: (workspaceId: string) => request<Document[]>(`/documents/${workspaceId}`),
    upload: async (workspaceId: string, file: File, chunkSize?: number, chunkOverlap?: number) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspace_id", workspaceId);
      if (chunkSize) formData.append("chunk_size", String(chunkSize));
      if (chunkOverlap) formData.append("chunk_overlap", String(chunkOverlap));

      const res = await fetch(`${BASE}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(body.detail);
      }
      return res.json();
    },
    delete: (workspaceId: string, docId: string) =>
      request<{ deleted: boolean }>(`/documents/${workspaceId}/${docId}`, {
        method: "DELETE",
      }),
    reingest: async (workspaceId: string, docId: string, chunkSize?: number, chunkOverlap?: number) => {
      const formData = new FormData();
      if (chunkSize) formData.append("chunk_size", String(chunkSize));
      if (chunkOverlap) formData.append("chunk_overlap", String(chunkOverlap));

      const res = await fetch(`${BASE}/documents/${workspaceId}/${docId}/reingest`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Re-ingest failed" }));
        throw new Error(body.detail);
      }
      return res.json();
    },
    preview: (workspaceId: string, docId: string) =>
      request<DocumentPreview>(`/documents/${workspaceId}/${docId}/preview`),
  },

  settings: {
    get: () => request<AppSettings>("/settings/"),
    update: (data: Partial<AppSettings>) =>
      request<AppSettings>("/settings/", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  templates: {
    list: (category?: string) => {
      const q = category ? `?category=${category}` : "";
      return request<PromptTemplate[]>(`/templates/${q}`);
    },
    create: (data: PromptTemplateCreate) =>
      request<PromptTemplate>("/templates/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PromptTemplateCreate>) =>
      request<PromptTemplate>(`/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/templates/${id}`, { method: "DELETE" }),
    exportAll: () => request<{ templates: PromptTemplate[] }>("/templates/export"),
    importAll: (data: { templates: PromptTemplate[] }) =>
      request<{ imported: number }>("/templates/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
