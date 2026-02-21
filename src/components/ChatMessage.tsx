import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { User, Bot, Copy, Check, Edit3, RefreshCw, X } from "lucide-react";
import { SourceCitation } from "./SourceCitation";
import { toast } from "./Toast";
import type { Message } from "../lib/types";

interface Props {
  message: Message;
  isLast?: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: () => void;
}

export function ChatMessage({ message, isLast, onEdit, onRegenerate }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [message.content]);

  const handleEditSubmit = useCallback(() => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setEditing(false);
  }, [onEdit, editContent, message.id, message.content]);

  const handleEditCancel = useCallback(() => {
    setEditContent(message.content);
    setEditing(false);
  }, [message.content]);

  return (
    <div className={`group flex gap-4 px-4 py-6 ${isUser ? "bg-surface-900/50 dark:bg-surface-900/50" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser ? "bg-accent/20 text-accent-light" : "bg-emerald-500/20 text-emerald-400"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-medium text-surface-400">
            {isUser ? "You" : "Assistant"}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 text-surface-500 hover:text-surface-300 rounded transition-colors"
              title="Copy"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            {isUser && onEdit && (
              <button
                onClick={() => { setEditing(true); setEditContent(message.content); }}
                className="p-1 text-surface-500 hover:text-surface-300 rounded transition-colors"
                title="Edit"
              >
                <Edit3 size={13} />
              </button>
            )}
            {!isUser && isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 text-surface-500 hover:text-surface-300 rounded transition-colors"
                title="Regenerate"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                if (e.key === "Escape") handleEditCancel();
              }}
              className="w-full px-3 py-2 bg-surface-800 border border-accent/50 rounded-lg text-sm text-surface-200 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
              rows={Math.min(editContent.split("\n").length + 1, 10)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditSubmit}
                className="px-3 py-1 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Save & Send
              </button>
              <button
                onClick={handleEditCancel}
                className="px-3 py-1 text-xs text-surface-400 bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-surface-800 prose-pre:border prose-pre:border-surface-700 prose-code:text-accent-light prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.sources.length > 0 && !editing && (
          <div className="mt-4">
            <SourceCitation sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  );
}
