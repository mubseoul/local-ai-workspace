import { create } from "zustand";
import type {
  Workspace,
  Conversation,
  ConversationUpdate,
  Message,
  AppSettings,
  OllamaStatus,
  ChatMode,
  Source,
  Theme,
  PromptTemplate,
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
  theme: Theme;
  resolvedTheme: "light" | "dark";
  templates: PromptTemplate[];

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
  updateConversation: (id: string, data: ConversationUpdate) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  setChatMode: (mode: ChatMode) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<AppSettings>) => Promise<void>;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  clearError: () => void;
  loadTemplates: () => Promise<void>;
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
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
  theme: "system",
  resolvedTheme: getResolvedTheme("system"),
  templates: [],

  init: async () => {
    try {
      await get().checkOllama();
      await get().loadWorkspaces();
      await get().loadSettings();
      await get().loadConversations();
      await get().loadTemplates();

      const settings = get().settings;
      if (settings?.theme) {
        const resolved = getResolvedTheme(settings.theme);
        applyTheme(resolved);
        set({ theme: settings.theme, resolvedTheme: resolved });
      } else {
        applyTheme(get().resolvedTheme);
      }

      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", () => {
        const { theme } = get();
        if (theme === "system") {
          const resolved = getResolvedTheme("system");
          applyTheme(resolved);
          set({ resolvedTheme: resolved });
        }
      });

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

  updateConversation: async (id, data) => {
    await api.chat.updateConversation(id, data);
    await get().loadConversations();
    const { activeConversation } = get();
    if (activeConversation?.id === id) {
      const convs = get().conversations;
      const updated = convs.find((c) => c.id === id);
      if (updated) set({ activeConversation: updated });
    }
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
        // v1.5 Advanced RAG parameters
        retrieval_strategy: settings?.retrieval_strategy,
        use_recursive_retrieval: settings?.use_recursive_retrieval,
        show_debug_context: false, // Can be toggled in UI later
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

  editMessage: async (messageId, content) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    try {
      await api.chat.editMessage(activeConversation.id, messageId, content);
      const messages = await api.chat.messages(activeConversation.id);
      set({ messages });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to edit message" });
    }
  },

  regenerateLastResponse: async () => {
    const { activeConversation, messages } = get();
    if (!activeConversation) return;

    try {
      const result = await api.chat.regenerate(activeConversation.id);
      if (result.last_user_message) {
        const updatedMessages = messages.filter((m) => m.id !== result.deleted_message_id);
        set({ messages: updatedMessages });
        const lastUserContent = result.last_user_message.content;
        await get().sendMessage(lastUserContent);
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to regenerate" });
    }
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
    if (data.theme) {
      get().setTheme(data.theme);
    }
  },

  setTheme: (theme) => {
    const resolved = getResolvedTheme(theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  clearError: () => set({ error: null }),

  loadTemplates: async () => {
    try {
      const templates = await api.templates.list();
      set({ templates });
    } catch {
      // Templates may not be available yet
    }
  },
}));
