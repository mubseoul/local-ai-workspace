import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  onOpenTemplates?: () => void;
}

export interface ChatInputHandle {
  focus: () => void;
  insertText: (text: string) => void;
}

export const ChatInput = forwardRef<ChatInputHandle, Props>(
  function ChatInput({ onSend, disabled, isStreaming, placeholder, onOpenTemplates }, ref) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      insertText: (text: string) => {
        setInput(text);
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
        }
      },
    }));

    const handleSend = useCallback(() => {
      if (!input.trim() || disabled || isStreaming) return;
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, [input, disabled, isStreaming, onSend]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend]
    );

    const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }, []);

    return (
      <div className="border-t border-surface-700 bg-surface-900 p-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="flex-shrink-0 w-11 h-11 text-surface-400 hover:text-accent hover:bg-surface-800 rounded-xl flex items-center justify-center transition-all border border-surface-700"
              title="Prompt Templates"
            >
              <Sparkles size={18} />
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type a message... (Shift+Enter for new line)"}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled || isStreaming}
            className="flex-shrink-0 w-11 h-11 bg-accent hover:bg-accent-hover disabled:bg-surface-700 disabled:text-surface-500 text-white rounded-xl flex items-center justify-center transition-all"
          >
            {isStreaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    );
  }
);
