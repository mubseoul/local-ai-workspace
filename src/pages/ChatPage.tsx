import { useEffect, useRef } from "react";
import { Bot, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput } from "../components/ChatInput";
import { useChat } from "../hooks/useChat";
import { useOllama } from "../hooks/useOllama";
import { useAppStore } from "../store/appStore";

export function ChatPage() {
  const { messages, isStreaming, streamingContent, send, error } = useChat();
  const { isRunning } = useOllama();
  const { chatMode, activeWorkspace, activeConversation, clearError } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

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

  const showEmptyState = messages.length === 0 && !isStreaming;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-700 bg-surface-900/50">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium text-surface-200">
            {activeConversation?.title || "New Chat"}
          </h1>
          {chatMode === "workspace" && activeWorkspace && (
            <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent-light rounded-full">
              {activeWorkspace.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {chatMode === "workspace" ? "Workspace RAG" : "General Chat"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
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
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {/* Streaming message */}
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
        onSend={send}
        isStreaming={isStreaming}
        placeholder={
          chatMode === "workspace"
            ? "Ask about your documents..."
            : "Type a message..."
        }
      />
    </div>
  );
}
