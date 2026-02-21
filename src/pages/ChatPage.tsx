import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, AlertTriangle, ArrowDown, Download, Tag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput, ChatInputHandle } from "../components/ChatInput";
import { PromptTemplatePanel } from "../components/PromptTemplatePanel";
import { ChatSkeleton } from "../components/Skeleton";
import { useChat } from "../hooks/useChat";
import { useOllama } from "../hooks/useOllama";
import { useAppStore } from "../store/appStore";
import { api } from "../lib/api";
import { toast } from "../components/Toast";

export function ChatPage() {
  const { messages, isStreaming, streamingContent, send, error } = useChat();
  const { isRunning } = useOllama();
  const {
    chatMode,
    activeWorkspace,
    activeConversation,
    clearError,
    editMessage,
    regenerateLastResponse,
    updateConversation,
  } = useAppStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUserScrolledUp(false);
  }, []);

  useEffect(() => {
    if (!userScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingContent, userScrolledUp]);

  const handleScroll = useCallback(() => {
    if (isStreaming) {
      setUserScrolledUp(!isNearBottom());
    }
  }, [isStreaming, isNearBottom]);

  useEffect(() => {
    if (activeConversation) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(t);
    }
  }, [activeConversation?.id]);

  const handleEdit = useCallback(
    async (messageId: string, content: string) => {
      await editMessage(messageId, content);
      await send(content);
    },
    [editMessage, send]
  );

  const handleExport = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const md = await api.chat.exportConversation(activeConversation.id);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeConversation.title.slice(0, 50)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Conversation exported");
    } catch {
      toast.error("Export failed");
    }
  }, [activeConversation]);

  const handleAddTag = useCallback(async () => {
    if (!activeConversation || !tagInput.trim()) return;
    const newTags = [...(activeConversation.tags || []), tagInput.trim()];
    await updateConversation(activeConversation.id, { tags: newTags });
    setTagInput("");
    setShowTagInput(false);
    toast.success("Tag added");
  }, [activeConversation, tagInput, updateConversation]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!activeConversation) return;
      const newTags = (activeConversation.tags || []).filter((t) => t !== tag);
      await updateConversation(activeConversation.id, { tags: newTags });
    },
    [activeConversation, updateConversation]
  );

  const handleTemplateInsert = useCallback((content: string) => {
    chatInputRef.current?.insertText(content);
  }, []);

  const focusChatInput = useCallback(() => {
    chatInputRef.current?.focus();
  }, []);

  if (!isRunning) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle size={48} className="text-amber-400 mx-auto" />
          <h2 className="text-xl font-semibold text-surface-100">Ollama Not Running</h2>
          <p className="text-surface-400 text-sm leading-relaxed">
            Local AI Workspace requires Ollama to run language models on your device.
            Please start Ollama and try again.
          </p>
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-4 text-left text-sm">
            <p className="text-surface-300 font-medium mb-2">Quick Start:</p>
            <ol className="text-surface-400 space-y-1.5 list-decimal list-inside">
              <li>Install Ollama from <span className="text-accent">ollama.com</span></li>
              <li>Run: <code className="text-accent-light bg-surface-900 px-1.5 py-0.5 rounded">ollama serve</code></li>
              <li>Pull a model: <code className="text-accent-light bg-surface-900 px-1.5 py-0.5 rounded">ollama pull llama3</code></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const showEmptyState = messages.length === 0 && !isStreaming && !loading;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-surface-700 bg-surface-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-medium text-surface-200 truncate">
            {activeConversation?.title || "New Chat"}
          </h1>
          {chatMode === "workspace" && activeWorkspace && (
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent-light rounded-full flex-shrink-0">
              {activeWorkspace.name}
            </span>
          )}
          {activeConversation?.tags?.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 bg-surface-800 text-surface-400 rounded-full flex items-center gap-1 border border-surface-700 cursor-pointer hover:border-red-500/30 hover:text-red-400 transition-colors"
              onClick={() => handleRemoveTag(tag)}
              title="Click to remove"
            >
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-500 flex-shrink-0">
          {activeConversation && (
            <>
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors"
                title="Add tag"
              >
                <Tag size={14} />
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors"
                title="Export as Markdown"
              >
                <Download size={14} />
              </button>
            </>
          )}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="hidden sm:inline">{chatMode === "workspace" ? "Workspace RAG" : "General Chat"}</span>
        </div>
      </div>

      {/* Tag Input */}
      {showTagInput && activeConversation && (
        <div className="px-4 py-2 border-b border-surface-700 bg-surface-900/30 flex items-center gap-2">
          <Tag size={13} className="text-surface-400" />
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTag();
              if (e.key === "Escape") setShowTagInput(false);
            }}
            placeholder="Add a tag..."
            className="flex-1 bg-transparent text-sm text-surface-200 placeholder-surface-500 focus:outline-none"
          />
          <button
            onClick={handleAddTag}
            className="px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-hover transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => setShowTagInput(false)}
            className="px-2 py-0.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {loading && <ChatSkeleton />}

        {showEmptyState && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md space-y-4 px-4">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
                <Bot size={32} className="text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-surface-200">
                {chatMode === "workspace" ? "Chat With Your Documents" : "Start a Conversation"}
              </h2>
              <p className="text-sm text-surface-400 leading-relaxed">
                {chatMode === "workspace"
                  ? "Ask questions about your documents. Answers will include citations from your uploaded files."
                  : "Chat with a local AI model. Everything runs on your device — no data leaves your machine."}
              </p>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {messages.map((msg, i) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLast={i === messages.length - 1}
              onEdit={msg.role === "user" ? handleEdit : undefined}
              onRegenerate={msg.role === "assistant" && i === messages.length - 1 ? regenerateLastResponse : undefined}
            />
          ))}

          {isStreaming && streamingContent && (
            <div className="flex gap-4 px-4 py-6">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                <Bot size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-surface-400 mb-1.5">Assistant</div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll-to-bottom fab */}
        {userScrolledUp && isStreaming && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 p-2.5 bg-surface-700 border border-surface-600 rounded-full shadow-lg hover:bg-surface-600 transition-colors"
          >
            <ArrowDown size={16} className="text-surface-300" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex items-center justify-between">
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        ref={chatInputRef}
        onSend={send}
        isStreaming={isStreaming}
        placeholder={
          chatMode === "workspace"
            ? "Ask about your documents..."
            : "Type a message..."
        }
        onOpenTemplates={() => setShowTemplates(true)}
      />

      {/* Templates Panel */}
      <PromptTemplatePanel
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onInsert={handleTemplateInsert}
      />
    </div>
  );
}
