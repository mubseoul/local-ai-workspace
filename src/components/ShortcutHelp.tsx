import { X, Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
const mod = isMac ? "⌘" : "Ctrl";

const shortcuts = [
  { keys: [`${mod}`, "N"], description: "New conversation" },
  { keys: [`${mod}`, "K"], description: "Command palette" },
  { keys: [`${mod}`, "⇧", "S"], description: "Toggle sidebar" },
  { keys: [`${mod}`, "/"], description: "Focus chat input" },
  { keys: ["Esc"], description: "Close modals / dropdowns" },
  { keys: [`${mod}`, "?"], description: "This help overlay" },
  { keys: ["Enter"], description: "Send message" },
  { keys: ["Shift", "Enter"], description: "New line in message" },
];

export function ShortcutHelp({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 border border-surface-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-surface-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-1 border-b border-surface-700/50 last:border-0"
            >
              <span className="text-sm text-surface-300">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, j) => (
                  <span key={j}>
                    <kbd className="px-2 py-1 text-xs font-mono bg-surface-900 border border-surface-600 rounded text-surface-300 min-w-[28px] text-center inline-block">
                      {key}
                    </kbd>
                    {j < s.keys.length - 1 && <span className="text-surface-600 mx-0.5">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
