import { useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { Document } from "../lib/types";

interface Props {
  documents: Document[];
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (docId: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusIcons = {
  ready: <CheckCircle2 size={14} className="text-emerald-400" />,
  processing: <Loader2 size={14} className="text-amber-400 animate-spin" />,
  pending: <Loader2 size={14} className="text-surface-400 animate-spin" />,
  error: <AlertCircle size={14} className="text-red-400" />,
};

export function DocumentList({ documents, uploading, onUpload, onDelete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      files.forEach(onUpload);
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(onUpload);
      e.target.value = "";
    },
    [onUpload]
  );

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-surface-600 rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="text-accent animate-spin" />
            <p className="text-sm text-surface-300">Processing document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-surface-400" />
            <p className="text-sm text-surface-300">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-surface-500">
              Supported: PDF, TXT, MD, DOCX
            </p>
          </div>
        )}
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 bg-surface-800 border border-surface-700 rounded-lg group hover:border-surface-600 transition-colors"
            >
              <FileText size={18} className="text-surface-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-surface-200 truncate">{doc.filename}</div>
                <div className="text-xs text-surface-500 flex items-center gap-2 mt-0.5">
                  <span>{formatSize(doc.file_size)}</span>
                  {doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}
                  <span className="flex items-center gap-1">
                    {statusIcons[doc.status]}
                    {doc.status}
                  </span>
                </div>
                {doc.error_message && (
                  <div className="text-xs text-red-400 mt-1">{doc.error_message}</div>
                )}
              </div>
              <button
                onClick={() => onDelete(doc.id)}
                className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <p className="text-center text-surface-500 text-sm py-4">
          No documents in this workspace yet.
        </p>
      )}
    </div>
  );
}
