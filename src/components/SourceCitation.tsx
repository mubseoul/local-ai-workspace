import { useState } from "react";
import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { Source } from "../lib/types";

interface Props {
  sources: Source[];
}

export function SourceCitation({ sources }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  // Calculate overall confidence
  const hasConfidence = sources.some(s => s.confidence && s.confidence !== "unknown");
  const highConfidenceCount = sources.filter(s => s.confidence === "high").length;
  const overallConfidence = hasConfidence
    ? highConfidenceCount >= sources.length / 2 ? "high"
      : sources.some(s => s.confidence === "medium") ? "medium"
      : "low"
    : undefined;

  return (
    <div className="border border-surface-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-800/50 text-surface-400 hover:text-surface-300 transition-colors"
      >
        <span className="text-xs font-medium flex items-center gap-2">
          <FileText size={12} />
          {sources.length} source{sources.length !== 1 ? "s" : ""}
          {overallConfidence && (
            <ConfidenceBadge confidence={overallConfidence} size="sm" showIcon={false} />
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="divide-y divide-surface-700/50">
          {sources.map((source, i) => (
            <div key={i} className="px-3 py-2.5 bg-surface-800/30">
              <div className="flex items-center flex-wrap gap-2 text-xs mb-1">
                <span className="text-accent font-mono">[{i + 1}]</span>
                <span className="text-surface-300 font-medium">{source.filename}</span>
                {source.page && source.page > 0 && (
                  <span className="text-surface-500">p. {source.page}</span>
                )}
                {source.confidence && source.confidence !== "unknown" && (
                  <ConfidenceBadge confidence={source.confidence} size="sm" />
                )}
                {source.score > 0 && (
                  <span className="text-surface-500 ml-auto">
                    {(source.score * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
              <p className="text-xs text-surface-400 leading-relaxed line-clamp-3">
                {source.chunk_text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
