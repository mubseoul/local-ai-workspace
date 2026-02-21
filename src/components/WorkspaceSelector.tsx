import { useState } from "react";
import { Plus, ChevronDown, Check } from "lucide-react";
import { useAppStore } from "../store/appStore";

export function WorkspaceSelector() {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useAppStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const ws = await createWorkspace(newName.trim());
    setActiveWorkspace(ws);
    setNewName("");
    setCreating(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm hover:border-surface-500 transition-colors"
      >
        <span className={activeWorkspace ? "text-surface-200" : "text-surface-500"}>
          {activeWorkspace?.name || "Select workspace..."}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-600 rounded-lg shadow-xl overflow-hidden">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                setActiveWorkspace(ws);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 transition-colors"
            >
              {activeWorkspace?.id === ws.id && <Check size={14} className="text-accent" />}
              <span className={activeWorkspace?.id === ws.id ? "text-accent-light" : ""}>
                {ws.name}
              </span>
            </button>
          ))}

          {creating ? (
            <div className="p-2 border-t border-surface-700">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Workspace name..."
                className="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-accent"
              />
              <div className="flex gap-1 mt-1.5">
                <button
                  onClick={handleCreate}
                  className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="flex-1 px-2 py-1 text-xs bg-surface-700 text-surface-300 rounded hover:bg-surface-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-400 hover:bg-surface-700 border-t border-surface-700 transition-colors"
            >
              <Plus size={14} />
              New Workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
