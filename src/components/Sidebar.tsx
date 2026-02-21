import { useState } from "react";
import {
  MessageSquarePlus,
  Trash2,
  FolderOpen,
  Settings,
  FileText,
  ChevronLeft,
  Shield,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { WorkspaceSelector } from "./WorkspaceSelector";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "./Toast";
import { SidebarSkeleton } from "./Skeleton";
import type { ChatMode } from "../lib/types";

interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: Props) {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    deleteConversation,
    chatMode,
    setChatMode,
    sidebarOpen,
    toggleSidebar,
    initialized,
  } = useAppStore();
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const handleNewChat = async () => {
    await createConversation();
    onNavigate("chat");
  };

  const handleModeToggle = (mode: ChatMode) => {
    setChatMode(mode);
    onNavigate("chat");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteConversation(deleteTarget.id);
    toast.success("Conversation deleted");
    setDeleteTarget(null);
  };

  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed left-2 top-2 z-50 p-2 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
      >
        <ChevronLeft size={16} className="rotate-180" />
      </button>
    );
  }

  return (
    <>
      <aside className="w-72 max-lg:w-60 bg-surface-900 border-r border-surface-700 flex flex-col h-full flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-surface-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              <span className="font-semibold text-sm">Local AI</span>
            </div>
            <button onClick={toggleSidebar} className="p-1 hover:bg-surface-700 rounded transition-colors">
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            100% offline — your data stays here
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="p-3 border-b border-surface-700">
          <div className="flex rounded-lg bg-surface-800 p-0.5">
            <button
              onClick={() => handleModeToggle("general")}
              className={`flex-1 text-xs py-1.5 px-3 rounded-md transition-all ${
                chatMode === "general"
                  ? "bg-accent text-white"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              General
            </button>
            <button
              onClick={() => handleModeToggle("workspace")}
              className={`flex-1 text-xs py-1.5 px-3 rounded-md transition-all ${
                chatMode === "workspace"
                  ? "bg-accent text-white"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              Workspace
            </button>
          </div>
        </div>

        {/* Workspace Selector */}
        {chatMode === "workspace" && (
          <div className="p-3 border-b border-surface-700">
            <WorkspaceSelector />
          </div>
        )}

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 bg-surface-800 hover:bg-surface-700 rounded-lg border border-surface-600 border-dashed transition-colors"
          >
            <MessageSquarePlus size={16} />
            New Chat
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2">
          {!initialized ? (
            <SidebarSkeleton />
          ) : (
            <>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onMouseEnter={() => setHoveredConv(conv.id)}
                  onMouseLeave={() => setHoveredConv(null)}
                  className={`group flex items-center gap-2 px-3 py-2.5 mx-1 my-0.5 rounded-lg cursor-pointer transition-all text-sm ${
                    activeConversation?.id === conv.id
                      ? "bg-surface-700/80 text-surface-100"
                      : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                  }`}
                  onClick={() => {
                    setActiveConversation(conv);
                    onNavigate("chat");
                  }}
                >
                  <MessageSquarePlus size={14} className="flex-shrink-0 opacity-50" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  {hoveredConv === conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: conv.id, title: conv.title });
                      }}
                      className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center text-surface-500 text-xs py-8 px-4">
                  No conversations yet. Start a new chat!
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Nav */}
        <div className="border-t border-surface-700 p-2">
          <button
            onClick={() => onNavigate("documents")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              currentPage === "documents"
                ? "bg-surface-700 text-surface-100"
                : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            }`}
          >
            <FileText size={16} />
            Documents
          </button>
          <button
            onClick={() => onNavigate("workspaces")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              currentPage === "workspaces"
                ? "bg-surface-700 text-surface-100"
                : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            }`}
          >
            <FolderOpen size={16} />
            Workspaces
          </button>
          <button
            onClick={() => onNavigate("settings")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              currentPage === "settings"
                ? "bg-surface-700 text-surface-100"
                : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </aside>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${deleteTarget?.title || "this conversation"}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
