import { create } from "zustand";
import type {
  Workspace,
  Conversation,
  Message,
  AppSettings,
  OllamaStatus,
  ChatMode,
  Source,
} from "../lib/types";
import { api } from "../lib/api";

interface AppState {
  initialized: boolean;
  ollamaStatus: OllamaStatus | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  chatMode: ChatMode;
  isStreaming: boolean;
  streamingContent: string;
  streamingSources: Source[];
  settings: AppSettings | null;
  sidebarOpen: boolean;
  error: string | null;

  init: () => Promise<void>;
  checkOllama: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (ws: Workspace | null) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => Promise<void>;
  createConversation: (mode?: ChatMode, systemPrompt?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setChatMode: (mode: ChatMode) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<AppSettings>) => Promise<void>;
  toggleSidebar: () => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  ollamaStatus: null,
  workspaces: [],
  activeWorkspace: null,
  conversations: [],
  activeConversation: null,
  messages: [],
  chatMode: "general",
  isStreaming: false,
  streamingContent: "",
  streamingSources: [],
  settings: null,
  sidebarOpen: true,
  error: null,

  init: async () => {
    try {
      await get().checkOllama();
      await get().loadWorkspaces();
      await get().loadSettings();
      await get().loadConversations();
      set({ initialized: true });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Initialization failed", initialized: true });
    }
  },

  checkOllama: async () => {
    try {
      const status = await api.ollama.status();
      set({ ollamaStatus: status });
    } catch {
      set({
        ollamaStatus: {
          running: false,
          models: [],
          error: "Cannot reach Ollama. Is it running?",
        },
      });
    }
  },

  loadWorkspaces: async () => {
    const workspaces = await api.workspaces.list();
    set({ workspaces });
  },

  setActiveWorkspace: (ws) => {
    set({ activeWorkspace: ws, activeConversation: null, messages: [] });
    if (ws) {
      set({ chatMode: "workspace" });
    }
    get().loadConversations();
  },

  createWorkspace: async (name) => {
    const ws = await api.workspaces.create(name);
    await get().loadWorkspaces();
    return ws;
  },

  deleteWorkspace: async (id) => {
    await api.workspaces.delete(id);
    const { activeWorkspace } = get();
    if (activeWorkspace?.id === id) {
      set({ activeWorkspace: null });
    }
    await get().loadWorkspaces();
    await get().loadConversations();
  },

  loadConversations: async () => {
    const { activeWorkspace, chatMode } = get();
    const wsId = chatMode === "workspace" ? activeWorkspace?.id : undefined;
    const conversations = await api.chat.conversations(wsId);
    set({ conversations });
  },

  setActiveConversation: async (conv) => {
    set({ activeConversation: conv, messages: [], streamingContent: "", streamingSources: [] });
    if (conv) {
      const messages = await api.chat.messages(conv.id);
      set({ messages });
    }
  },

  createConversation: async (mode, systemPrompt) => {
    const { activeWorkspace, chatMode } = get();
    const m = mode || chatMode;
    const conv = await api.chat.createConversation({
      workspace_id: m === "workspace" ? activeWorkspace?.id : undefined,
      mode: m,
      system_prompt: systemPrompt || "",
    });
    await get().loadConversations();
    await get().setActiveConversation(conv);
    return conv;
  },

  deleteConversation: async (id) => {
    await api.chat.deleteConversation(id);
    const { activeConversation } = get();
    if (activeConversation?.id === id) {
      set({ activeConversation: null, messages: [] });
    }
    await get().loadConversations();
  },

  sendMessage: async (content) => {
    const { activeConversation, chatMode, activeWorkspace, settings } = get();
    if (!activeConversation) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversation.id,
      role: "user",
      content,
      sources: [],
      created_at: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      isStreaming: true,
      streamingContent: "",
      streamingSources: [],
      error: null,
    }));

    try {
      const stream = api.chat.send({
        conversation_id: activeConversation.id,
        message: content,
        mode: chatMode,
        workspace_id: chatMode === "workspace" ? activeWorkspace?.id : undefined,
        model: settings?.chat_model,
        temperature: settings?.temperature,
        system_prompt: activeConversation.system_prompt || undefined,
      });

      for await (const chunk of stream) {
        if (chunk.type === "chunk" && chunk.content) {
          set((s) => ({
            streamingContent: s.streamingContent + chunk.content,
          }));
        } else if (chunk.type === "done") {
          const assistantMessage: Message = {
            id: chunk.message_id || crypto.randomUUID(),
            conversation_id: activeConversation.id,
            role: "assistant",
            content: get().streamingContent,
            sources: chunk.sources || [],
            created_at: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, assistantMessage],
            isStreaming: false,
            streamingContent: "",
            streamingSources: chunk.sources || [],
          }));
        } else if (chunk.type === "error") {
          set({
            isStreaming: false,
            error: chunk.content || "An error occurred",
          });
        }
      }
    } catch (e) {
      set({
        isStreaming: false,
        error: e instanceof Error ? e.message : "Failed to send message",
      });
    }

    get().loadConversations();
  },

  setChatMode: (mode) => {
    set({ chatMode: mode });
    if (mode === "general") {
      set({ activeWorkspace: null });
    }
    get().loadConversations();
  },

  loadSettings: async () => {
    try {
      const settings = await api.settings.get();
      set({ settings });
    } catch {
      // Use defaults
    }
  },

  updateSettings: async (data) => {
    const settings = await api.settings.update(data);
    set({ settings });
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  clearError: () => set({ error: null }),
}));
