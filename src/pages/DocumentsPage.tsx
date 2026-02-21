import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { DocumentList } from "../components/DocumentList";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { toast } from "../components/Toast";
import { useWorkspace } from "../hooks/useWorkspace";

export function DocumentsPage() {
  const {
    activeWorkspace,
    workspaces,
    documents,
    uploading,
    uploadFile,
    deleteDocument,
    setActiveWorkspace,
    createWorkspace,
  } = useWorkspace();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleUpload = async (file: File) => {
    try {
      await uploadFile(file);
      toast.success(`"${file.name}" ingested successfully`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
    setDeleteTarget(null);
  };

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-4">
          <FolderOpen size={48} className="text-surface-500 mx-auto" />
          <h2 className="text-lg font-semibold text-surface-200">Select a Workspace</h2>
          <p className="text-sm text-surface-400">
            Choose a workspace from the sidebar, or create a new one to start adding documents.
          </p>
          {workspaces.length === 0 && (
            <button
              onClick={async () => {
                const ws = await createWorkspace("My First Workspace");
                setActiveWorkspace(ws);
              }}
              className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm"
            >
              Create First Workspace
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-surface-100">Documents</h1>
            <p className="text-sm text-surface-400 mt-1">
              Workspace: <span className="text-accent-light">{activeWorkspace.name}</span>
            </p>
          </div>
          <DocumentList
            documents={documents}
            uploading={uploading}
            onUpload={handleUpload}
            onDelete={(docId) => {
              const doc = documents.find((d) => d.id === docId);
              setDeleteTarget({ id: docId, name: doc?.filename || "this document" });
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? The document and its embeddings will be permanently removed from this workspace.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
