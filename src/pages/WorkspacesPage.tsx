import { useState } from "react";
import { FolderOpen, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { api } from "../lib/api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { toast } from "../components/Toast";

interface Props {
  onNavigate: (page: string) => void;
}

export function WorkspacesPage({ onNavigate }: Props) {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, deleteWorkspace, loadWorkspaces } =
    useAppStore();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createWorkspace(newName.trim());
    toast.success(`Workspace "${newName.trim()}" created`);
    setNewName("");
    setCreating(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await api.workspaces.update(id, editName.trim());
    await loadWorkspaces();
    toast.success("Workspace renamed");
    setEditingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteWorkspace(deleteTarget.id);
    toast.success(`Workspace "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const handleSelect = (ws: typeof workspaces[0]) => {
    setActiveWorkspace(ws);
    onNavigate("chat");
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-surface-100">Workspaces</h1>
              <p className="text-sm text-surface-400 mt-1">
                Each workspace has its own document collection and chat history.
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm"
            >
              <Plus size={16} />
              New
            </button>
          </div>

          {creating && (
            <div className="mb-4 flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Workspace name..."
                className="flex-1 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600 text-sm"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all cursor-pointer group ${
                  activeWorkspace?.id === ws.id
                    ? "bg-accent/10 border-accent/30"
                    : "bg-surface-800 border-surface-700 hover:border-surface-600"
                }`}
                onClick={() => handleSelect(ws)}
              >
                <FolderOpen
                  size={20}
                  className={activeWorkspace?.id === ws.id ? "text-accent" : "text-surface-400"}
                />

                {editingId === ws.id ? (
                  <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(ws.id)}
                      className="flex-1 px-2 py-1 bg-surface-900 border border-surface-600 rounded text-sm text-surface-200 focus:outline-none focus:border-accent"
                    />
                    <button onClick={() => handleRename(ws.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-surface-400 hover:bg-surface-700 rounded">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-surface-200">{ws.name}</div>
                      <div className="text-xs text-surface-500">
                        Created {new Date(ws.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingId(ws.id);
                          setEditName(ws.name);
                        }}
                        className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: ws.id, name: ws.name })}
                        className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {workspaces.length === 0 && !creating && (
              <div className="text-center py-12">
                <FolderOpen size={48} className="text-surface-600 mx-auto mb-4" />
                <p className="text-surface-400 text-sm">No workspaces yet. Create one to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All documents, chat history, and vector data in this workspace will be permanently removed.`}
        confirmLabel="Delete Workspace"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
