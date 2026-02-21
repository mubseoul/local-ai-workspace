import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  File,
  X,
} from "lucide-react";
import type { Document, DocumentPreview } from "../lib/types";
import { api } from "../lib/api";
import { toast } from "./Toast";

interface Props {
  documents: Document[];
  uploading: boolean;
  onUpload: (file: File) => void;
  onDelete: (docId: string) => void;
  workspaceId?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const iconClass = "flex-shrink-0";
  switch (ext) {
    case "pdf":
      return <File size={18} className={`${iconClass} text-red-400`} />;
    case "docx":
    case "doc":
      return <File size={18} className={`${iconClass} text-blue-400`} />;
    case "md":
      return <FileText size={18} className={`${iconClass} text-purple-400`} />;
    case "txt":
      return <FileText size={18} className={`${iconClass} text-surface-400`} />;
    default:
      return <FileText size={18} className={`${iconClass} text-surface-400`} />;
  }
}

function getFileTypeBadge(filename: string) {
  const ext = filename.split(".").pop()?.toUpperCase() || "FILE";
  const colors: Record<string, string> = {
    PDF: "bg-red-500/10 text-red-400 border-red-500/20",
    DOCX: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    MD: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    TXT: "bg-surface-700 text-surface-400 border-surface-600",
  };
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${colors[ext] || colors.TXT}`}>
      {ext}
    </span>
  );
}

const statusIcons = {
  ready: <CheckCircle2 size={14} className="text-emerald-400" />,
  processing: <Loader2 size={14} className="text-amber-400 animate-spin" />,
  pending: <Loader2 size={14} className="text-surface-400 animate-spin" />,
  error: <AlertCircle size={14} className="text-red-400" />,
};

export function DocumentList({ documents, uploading, onUpload, onDelete, workspaceId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [previewData, setPreviewData] = useState<DocumentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reingesting, setReingesting] = useState<string | null>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const prog = new Map<string, number>();
      files.forEach((f, i) => prog.set(f.name, 0));
      setUploadProgress(prog);
      files.forEach((file, i) => {
        setTimeout(() => {
          onUpload(file);
          setUploadProgress((prev) => {
            const next = new Map(prev);
            next.set(file.name, 100);
            return next;
          });
        }, i * 200);
      });
      setTimeout(() => setUploadProgress(new Map()), files.length * 200 + 2000);
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const prog = new Map<string, number>();
      files.forEach((f) => prog.set(f.name, 0));
      setUploadProgress(prog);
      files.forEach((file, i) => {
        setTimeout(() => {
          onUpload(file);
          setUploadProgress((prev) => {
            const next = new Map(prev);
            next.set(file.name, 100);
            return next;
          });
        }, i * 200);
      });
      setTimeout(() => setUploadProgress(new Map()), files.length * 200 + 2000);
      e.target.value = "";
    },
    [onUpload]
  );

  const handlePreview = useCallback(async (doc: Document) => {
    if (!workspaceId) return;
    setPreviewLoading(true);
    try {
      const data = await api.documents.preview(workspaceId, doc.id);
      setPreviewData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    }
    setPreviewLoading(false);
  }, [workspaceId]);

  const handleReingest = useCallback(async (doc: Document) => {
    if (!workspaceId) return;
    setReingesting(doc.id);
    try {
      await api.documents.reingest(workspaceId, doc.id);
      toast.success(`"${doc.filename}" re-ingested successfully`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Re-ingest failed");
    }
    setReingesting(null);
  }, [workspaceId]);

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

      {/* Batch Upload Progress */}
      {uploadProgress.size > 0 && (
        <div className="space-y-1">
          {Array.from(uploadProgress.entries()).map(([name, progress]) => (
            <div key={name} className="flex items-center gap-3 px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg">
              <Loader2 size={14} className={progress === 100 ? "text-emerald-400" : "text-accent animate-spin"} />
              <span className="flex-1 text-xs text-surface-300 truncate">{name}</span>
              <div className="w-24 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 bg-surface-800 border border-surface-700 rounded-lg group hover:border-surface-600 transition-colors"
            >
              {getFileIcon(doc.filename)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-200 truncate">{doc.filename}</span>
                  {getFileTypeBadge(doc.filename)}
                </div>
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
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handlePreview(doc)}
                  className="p-1.5 text-surface-500 hover:text-surface-300 rounded-lg transition-colors"
                  title="Preview"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleReingest(doc)}
                  disabled={reingesting === doc.id}
                  className="p-1.5 text-surface-500 hover:text-accent rounded-lg transition-colors disabled:opacity-50"
                  title="Re-ingest"
                >
                  <RefreshCw size={14} className={reingesting === doc.id ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => onDelete(doc.id)}
                  className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <p className="text-center text-surface-500 text-sm py-4">
          No documents in this workspace yet.
        </p>
      )}

      {/* Document Preview Modal */}
      {(previewData || previewLoading) && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewData(null)} />
          <div className="relative bg-surface-800 border border-surface-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-in">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <div>
                <h3 className="text-sm font-semibold text-surface-100">
                  {previewData?.filename || "Loading..."}
                </h3>
                {previewData && (
                  <p className="text-xs text-surface-500 mt-0.5">
                    {previewData.total_chars.toLocaleString()} chars
                    {previewData.total_pages > 0 && ` · ${previewData.total_pages} pages`}
                    {previewData.truncated && " · truncated"}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-accent animate-spin" />
                </div>
              ) : (
                <pre className="text-xs text-surface-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {previewData?.preview}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
