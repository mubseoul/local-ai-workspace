import { useState, useEffect } from "react";
import {
  X,
  Plus,
  BookOpen,
  Download,
  Upload,
  Trash2,
  Edit3,
  Sparkles,
  Code,
  FileText,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { api } from "../lib/api";
import { toast } from "./Toast";
import type { PromptTemplate, PromptTemplateCreate } from "../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (content: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  general: <BookOpen size={14} />,
  coding: <Code size={14} />,
  custom: <FileText size={14} />,
};

export function PromptTemplatePanel({ open, onClose, onInsert }: Props) {
  const { templates, loadTemplates } = useAppStore();
  const [filter, setFilter] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<PromptTemplateCreate>({
    name: "",
    content: "",
    category: "custom",
    variables: [],
  });

  useEffect(() => {
    if (open) loadTemplates();
  }, [open, loadTemplates]);

  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);
  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];

  const handleCreate = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    try {
      const vars = form.content.match(/\{\{(\w+)\}\}/g)?.map((v) => v.slice(2, -2)) || [];
      await api.templates.create({ ...form, variables: vars });
      await loadTemplates();
      setCreating(false);
      setForm({ name: "", content: "", category: "custom", variables: [] });
      toast.success("Template created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create template");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const vars = form.content.match(/\{\{(\w+)\}\}/g)?.map((v) => v.slice(2, -2)) || [];
      await api.templates.update(id, { ...form, variables: vars });
      await loadTemplates();
      setEditing(null);
      toast.success("Template updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update template");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.templates.delete(id);
      await loadTemplates();
      toast.success("Template deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete template");
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.templates.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "prompt-templates.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Templates exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api.templates.importAll(data);
        await loadTemplates();
        toast.success("Templates imported");
      } catch {
        toast.error("Invalid template file");
      }
    };
    input.click();
  };

  const handleInsertTemplate = (template: PromptTemplate) => {
    let content = template.content;
    if (template.variables.length > 0) {
      for (const v of template.variables) {
        content = content.replace(`{{${v}}}`, `[${v}]`);
      }
    }
    onInsert(content);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-800 border border-surface-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-in">
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-surface-100">Prompt Templates</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleImport} className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors" title="Import">
              <Upload size={16} />
            </button>
            <button onClick={handleExport} className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors" title="Export">
              <Download size={16} />
            </button>
            <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-700">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === cat
                  ? "bg-accent text-white"
                  : "bg-surface-700 text-surface-400 hover:text-surface-200"
              }`}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <button
            onClick={() => { setCreating(true); setForm({ name: "", content: "", category: "custom", variables: [] }); }}
            className="ml-auto flex items-center gap-1 px-3 py-1 text-xs bg-accent/10 text-accent-light rounded-full hover:bg-accent/20 transition-colors"
          >
            <Plus size={12} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(creating || editing) && (
            <div className="bg-surface-900 border border-surface-600 rounded-lg p-4 space-y-3">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Template name..."
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-accent"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Template content... Use {{variable}} for placeholders"
                rows={4}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder-surface-500 resize-none focus:outline-none focus:border-accent"
              />
              <div className="flex items-center gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-xs text-surface-200 focus:outline-none"
                >
                  <option value="custom">Custom</option>
                  <option value="general">General</option>
                  <option value="coding">Coding</option>
                </select>
                <div className="flex-1" />
                <button
                  onClick={() => { setCreating(false); setEditing(null); }}
                  className="px-3 py-1.5 text-xs text-surface-400 bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editing ? handleUpdate(editing) : handleCreate()}
                  className="px-3 py-1.5 text-xs text-white bg-accent rounded-lg hover:bg-accent-hover transition-colors"
                >
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </div>
          )}

          {filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group bg-surface-900/50 border border-surface-700 rounded-lg p-3 hover:border-surface-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-surface-400">
                    {categoryIcons[tmpl.category] || <FileText size={14} />}
                  </span>
                  <span className="text-sm font-medium text-surface-200">{tmpl.name}</span>
                  {tmpl.is_builtin && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent-light rounded">built-in</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!tmpl.is_builtin && (
                    <>
                      <button
                        onClick={() => {
                          setEditing(tmpl.id);
                          setCreating(false);
                          setForm({ name: tmpl.name, content: tmpl.content, category: tmpl.category, variables: tmpl.variables });
                        }}
                        className="p-1 text-surface-400 hover:text-surface-200 rounded transition-colors"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(tmpl.id)}
                        className="p-1 text-surface-400 hover:text-red-400 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleInsertTemplate(tmpl)}
                    className="px-2 py-0.5 text-[10px] bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
              <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">{tmpl.content}</p>
              {tmpl.variables.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {tmpl.variables.map((v) => (
                    <span key={v} className="text-[10px] px-1.5 py-0.5 bg-surface-800 text-surface-400 rounded border border-surface-700">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && !creating && (
            <div className="text-center py-8 text-surface-500 text-sm">
              No templates in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
