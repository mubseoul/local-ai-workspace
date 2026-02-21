import { useEffect, useCallback } from "react";

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export const SHORTCUT_DEFINITIONS = [
  { key: "n", meta: true, description: "New conversation" },
  { key: "k", meta: true, description: "Command palette" },
  { key: "s", meta: true, shift: true, description: "Toggle sidebar" },
  { key: "/", meta: true, description: "Focus chat input" },
  { key: "Escape", description: "Close modals" },
  { key: "?", meta: true, description: "Shortcut help" },
];

interface ShortcutMap {
  onNewChat: () => void;
  onCommandPalette: () => void;
  onToggleSidebar: () => void;
  onFocusChatInput: () => void;
  onEscape: () => void;
  onShortcutHelp: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutMap) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape") {
        handlers.onEscape();
        return;
      }

      if (!isMod) return;

      if (e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        handlers.onNewChat();
        return;
      }

      if (e.key === "k" && !e.shiftKey) {
        e.preventDefault();
        handlers.onCommandPalette();
        return;
      }

      if (e.key === "s" && e.shiftKey) {
        e.preventDefault();
        handlers.onToggleSidebar();
        return;
      }

      if (e.key === "/" && !e.shiftKey) {
        e.preventDefault();
        handlers.onFocusChatInput();
        return;
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        handlers.onShortcutHelp();
        return;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
