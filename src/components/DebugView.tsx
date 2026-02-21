import { useState } from "react";
import { Bug, ChevronDown, ChevronUp, Search, Layers } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface Props {
  metadata: {
    strategy: string;
    total_results: number;
    confidence_breakdown: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export function DebugView({ metadata }: Props) {
  const [expanded, setExpanded] = useState(false);

  const strategyLabels = {
    vector: "Vector Similarity",
    bm25: "BM25 Keyword Search",
    hybrid: "Hybrid (Vector + BM25)",
    hybrid_rerank: "Hybrid + Re-ranking"
  };

  const strategyLabel = strategyLabels[metadata.strategy as keyof typeof strategyLabels] || metadata.strategy;

  return (
    <div className="border border-surface-700 rounded-lg overflow-hidden bg-surface-800/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-800/70 text-surface-400 hover:text-surface-300 transition-colors"
      >
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Bug size={12} />
          Debug Info
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-3 py-2.5 space-y-3">
          {/* Strategy */}
          <div className="flex items-center gap-2">
            <Search size={12} className="text-accent" />
            <span className="text-xs text-surface-500">Strategy:</span>
            <span className="text-xs text-surface-300 font-medium">{strategyLabel}</span>
          </div>

          {/* Total Results */}
          <div className="flex items-center gap-2">
            <Layers size={12} className="text-accent" />
            <span className="text-xs text-surface-500">Retrieved:</span>
            <span className="text-xs text-surface-300 font-medium">{metadata.total_results} chunks</span>
          </div>

          {/* Confidence Breakdown */}
          <div>
            <div className="text-xs text-surface-500 mb-2">Confidence Distribution:</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence="high" showLabel={false} size="sm" />
                  <span className="text-xs text-surface-400">High</span>
                </div>
                <span className="text-xs text-surface-300 font-mono">{metadata.confidence_breakdown.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence="medium" showLabel={false} size="sm" />
                  <span className="text-xs text-surface-400">Medium</span>
                </div>
                <span className="text-xs text-surface-300 font-mono">{metadata.confidence_breakdown.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence="low" showLabel={false} size="sm" />
                  <span className="text-xs text-surface-400">Low</span>
                </div>
                <span className="text-xs text-surface-300 font-mono">{metadata.confidence_breakdown.low}</span>
              </div>
            </div>
          </div>

          {/* Visual Bar Chart */}
          <div className="space-y-1">
            {metadata.total_results > 0 && (
              <div className="flex gap-0.5 h-2 rounded overflow-hidden">
                {metadata.confidence_breakdown.high > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(metadata.confidence_breakdown.high / metadata.total_results) * 100}%`
                    }}
                    title={`${metadata.confidence_breakdown.high} high confidence`}
                  />
                )}
                {metadata.confidence_breakdown.medium > 0 && (
                  <div
                    className="bg-yellow-500"
                    style={{
                      width: `${(metadata.confidence_breakdown.medium / metadata.total_results) * 100}%`
                    }}
                    title={`${metadata.confidence_breakdown.medium} medium confidence`}
                  />
                )}
                {metadata.confidence_breakdown.low > 0 && (
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(metadata.confidence_breakdown.low / metadata.total_results) * 100}%`
                    }}
                    title={`${metadata.confidence_breakdown.low} low confidence`}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
