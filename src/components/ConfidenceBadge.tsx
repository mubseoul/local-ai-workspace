import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface Props {
  confidence: "high" | "medium" | "low" | "unknown";
  showIcon?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ConfidenceBadge({
  confidence,
  showIcon = true,
  showLabel = true,
  size = "sm"
}: Props) {
  const config = {
    high: {
      label: "High",
      icon: CheckCircle2,
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      iconClassName: "text-emerald-400",
      tooltip: "High confidence match (score ≥ 0.8)"
    },
    medium: {
      label: "Medium",
      icon: Info,
      className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      iconClassName: "text-yellow-400",
      tooltip: "Medium confidence match (score ≥ 0.5)"
    },
    low: {
      label: "Low",
      icon: AlertCircle,
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      iconClassName: "text-red-400",
      tooltip: "Low confidence match (score < 0.5)"
    },
    unknown: {
      label: "Unknown",
      icon: Info,
      className: "bg-surface-700 text-surface-400 border-surface-600",
      iconClassName: "text-surface-400",
      tooltip: "Confidence level unknown"
    }
  };

  const c = config[confidence];
  const Icon = c.icon;
  const iconSize = size === "sm" ? 12 : 14;
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${c.className} ${textSize}`}
      title={c.tooltip}
    >
      {showIcon && <Icon size={iconSize} className={c.iconClassName} />}
      {showLabel && <span className="font-medium">{c.label}</span>}
    </span>
  );
}
