import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "../store/appStore";
import { api } from "../lib/api";
import type { Document } from "../lib/types";

export function useWorkspace() {
  const { activeWorkspace, workspaces, setActiveWorkspace, createWorkspace, deleteWorkspace } =
    useAppStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!activeWorkspace) {
      setDocuments([]);
      return;
    }
    try {
      const docs = await api.documents.list(activeWorkspace.id);
      setDocuments(docs);
    } catch {
      setDocuments([]);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!activeWorkspace) return;
      setUploading(true);
      try {
        await api.documents.upload(activeWorkspace.id, file);
        await loadDocuments();
      } finally {
        setUploading(false);
      }
    },
    [activeWorkspace, loadDocuments]
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      if (!activeWorkspace) return;
      await api.documents.delete(activeWorkspace.id, docId);
      await loadDocuments();
    },
    [activeWorkspace, loadDocuments]
  );

  return {
    activeWorkspace,
    workspaces,
    documents,
    uploading,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    uploadFile,
    deleteDocument,
    refreshDocuments: loadDocuments,
  };
}
