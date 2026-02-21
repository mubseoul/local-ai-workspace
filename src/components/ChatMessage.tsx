import ReactMarkdown from "react-markdown";
import { User, Bot } from "lucide-react";
import { SourceCitation } from "./SourceCitation";
import type { Message } from "../lib/types";

interface Props {
  message: Message;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-4 px-4 py-6 ${isUser ? "bg-surface-900/50" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser ? "bg-accent/20 text-accent-light" : "bg-emerald-500/20 text-emerald-400"
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-surface-400 mb-1.5">
          {isUser ? "You" : "Assistant"}
        </div>

        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-surface-800 prose-pre:border prose-pre:border-surface-700 prose-code:text-accent-light prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.sources.length > 0 && (
          <div className="mt-4">
            <SourceCitation sources={message.sources} />
          </div>
        )}
      </div>
    </div>
  );
}
