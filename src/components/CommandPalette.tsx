import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  MessageSquarePlus,
  FileText,
  FolderOpen,
  Settings,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useTheme } from "../hooks/useTheme";
import { api } from "../lib/api";
import type { ConversationSearchResult } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  onNewChat: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

export function CommandPalette({ open, onClose, onNavigate, onNewChat }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<ConversationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    workspaces,
    setActiveConversation,
    setActiveWorkspace,
    toggleSidebar,
  } = useAppStore();
  const { cycleTheme, theme } = useTheme();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setSearchResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.chat.search(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const themeIcon = theme === "dark" ? <Moon size={16} /> : theme === "light" ? <Sun size={16} /> : <Monitor size={16} />;

  const staticItems: PaletteItem[] = [
    { id: "new-chat", label: "New Conversation", icon: <MessageSquarePlus size={16} />, action: () => { onNewChat(); onClose(); }, category: "Actions" },
    { id: "nav-docs", label: "Go to Documents", icon: <FileText size={16} />, action: () => { onNavigate("documents"); onClose(); }, category: "Navigation" },
    { id: "nav-workspaces", label: "Go to Workspaces", icon: <FolderOpen size={16} />, action: () => { onNavigate("workspaces"); onClose(); }, category: "Navigation" },
    { id: "nav-settings", label: "Go to Settings", icon: <Settings size={16} />, action: () => { onNavigate("settings"); onClose(); }, category: "Navigation" },
    { id: "toggle-sidebar", label: "Toggle Sidebar", icon: <Settings size={16} />, action: () => { toggleSidebar(); onClose(); }, category: "Actions" },
    { id: "cycle-theme", label: `Theme: ${theme}`, icon: themeIcon, action: () => { cycleTheme(); onClose(); }, category: "Actions" },
  ];

  const conversationItems: PaletteItem[] = conversations
    .filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)
    .map((c) => ({
      id: `conv-${c.id}`,
      label: c.title,
      description: c.mode === "workspace" ? "Workspace" : "General",
      icon: <MessageSquarePlus size={16} />,
      action: () => {
        setActiveConversation(c);
        onNavigate("chat");
        onClose();
      },
      category: "Conversations",
    }));

  const workspaceItems: PaletteItem[] = workspaces
    .filter((w) => w.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map((w) => ({
      id: `ws-${w.id}`,
      label: w.name,
      icon: <FolderOpen size={16} />,
      action: () => {
        setActiveWorkspace(w);
        onNavigate("chat");
        onClose();
      },
      category: "Workspaces",
    }));

  const searchItems: PaletteItem[] = searchResults.slice(0, 8).map((r) => ({
    id: `search-${r.message_id}`,
    label: r.conversation_title,
    description: r.match_preview,
    icon: <Search size={16} />,
    action: () => {
      const conv = conversations.find((c) => c.id === r.conversation_id);
      if (conv) setActiveConversation(conv);
      onNavigate("chat");
      onClose();
    },
    category: "Search Results",
  }));

  const allItems = query.trim()
    ? [...searchItems, ...conversationItems, ...workspaceItems, ...staticItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))]
    : [...staticItems, ...conversationItems.slice(0, 5)];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && allItems[selectedIndex]) {
        e.preventDefault();
        allItems[selectedIndex].action();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [allItems, selectedIndex, onClose]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  let lastCategory = "";

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-800 dark:bg-surface-800 border border-surface-600 rounded-xl shadow-2xl overflow-hidden animate-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700">
          <Search size={18} className="text-surface-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations, navigate, run actions..."
            className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 text-sm focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-surface-500 bg-surface-900 border border-surface-700 rounded">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {allItems.length === 0 && (
            <div className="px-4 py-8 text-center text-surface-500 text-sm">
              {searching ? "Searching..." : "No results found"}
            </div>
          )}
          {allItems.map((item, i) => {
            const showCategory = item.category !== lastCategory;
            lastCategory = item.category;
            return (
              <div key={item.id}>
                {showCategory && (
                  <div className="px-4 pt-2 pb-1 text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                    {item.category}
                  </div>
                )}
                <button
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    i === selectedIndex
                      ? "bg-accent/10 text-accent-light"
                      : "text-surface-300 hover:bg-surface-700/50"
                  }`}
                >
                  <span className="flex-shrink-0 opacity-60">{item.icon}</span>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-surface-500 truncate max-w-[200px]">
                      {item.description}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-surface-700 flex items-center gap-4 text-[10px] text-surface-500">
          <span><kbd className="px-1 py-0.5 bg-surface-900 rounded border border-surface-700 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 bg-surface-900 rounded border border-surface-700 font-mono">↵</kbd> select</span>
          <span><kbd className="px-1 py-0.5 bg-surface-900 rounded border border-surface-700 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
