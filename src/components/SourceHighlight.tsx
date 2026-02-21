import { useState } from "react";
import { X, FileText, Hash } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { Source } from "../lib/types";

interface Props {
  source: Source;
  index: number;
  onClose: () => void;
}

export function SourceHighlight({ source, index, onClose }: Props) {
  const [showFullText, setShowFullText] = useState(false);
  const textToDisplay = showFullText ? source.full_chunk_text || source.chunk_text : source.chunk_text;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-surface-800 border border-surface-700 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-accent/20 text-accent font-mono text-sm rounded">
              {index + 1}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-surface-400" />
                <span className="text-sm font-medium text-surface-200">{source.filename}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {source.page && source.page > 0 && (
                  <span className="text-xs text-surface-500">Page {source.page}</span>
                )}
                {source.confidence && (
                  <ConfidenceBadge confidence={source.confidence} size="sm" />
                )}
                <span className="text-xs text-surface-500">
                  {(source.score * 100).toFixed(0)}% match
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap bg-surface-900/50 p-4 rounded-lg text-sm text-surface-300 leading-relaxed border border-surface-700">
              {textToDisplay}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-700 bg-surface-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Hash size={12} />
            <span>
              {textToDisplay.length} characters
              {source.full_chunk_text && source.full_chunk_text !== source.chunk_text && (
                <span className="ml-1">
                  {showFullText ? "(full text)" : "(preview)"}
                </span>
              )}
            </span>
          </div>
          {source.full_chunk_text && source.full_chunk_text !== source.chunk_text && (
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="text-xs px-2 py-1 bg-accent/20 text-accent hover:bg-accent/30 rounded transition-colors"
            >
              {showFullText ? "Show Preview" : "Show Full Text"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
