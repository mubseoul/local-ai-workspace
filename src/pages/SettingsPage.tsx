import { useEffect, useState } from "react";
import { Save, RefreshCw, CheckCircle2, Monitor, Sun, Moon, Laptop } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useOllama } from "../hooks/useOllama";
import { useTheme } from "../hooks/useTheme";
import type { AppSettings, Theme } from "../lib/types";

export function SettingsPage() {
  const { settings, updateSettings, loadSettings } = useAppStore();
  const { models, isRunning, refresh } = useOllama();
  const { theme, setTheme } = useTheme();
  const [local, setLocal] = useState<Partial<AppSettings>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const handleSave = async () => {
    await updateSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const chatModels = models.filter((m) => !m.name.includes("embed"));
  const embedModels = models.filter((m) => m.name.includes("embed"));

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: "System", icon: <Laptop size={16} /> },
    { value: "light", label: "Light", icon: <Sun size={16} /> },
    { value: "dark", label: "Dark", icon: <Moon size={16} /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-surface-100">Settings</h1>
            <p className="text-sm text-surface-400 mt-1">Configure your Local AI Workspace</p>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              saved
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-accent text-white hover:bg-accent-hover"
            }`}
          >
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>

        {/* Theme Selection */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="flex gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm transition-all ${
                  theme === opt.value
                    ? "border-accent bg-accent/10 text-accent-light"
                    : "border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-200"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Ollama Status */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Ollama Status
          </h2>
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor size={18} className={isRunning ? "text-emerald-400" : "text-red-400"} />
                <div>
                  <div className="text-sm font-medium text-surface-200">
                    {isRunning ? "Connected" : "Not Connected"}
                  </div>
                  <div className="text-xs text-surface-500">
                    {isRunning
                      ? `${models.length} model${models.length !== 1 ? "s" : ""} available`
                      : "Start Ollama: ollama serve"}
                  </div>
                </div>
              </div>
              <button
                onClick={refresh}
                className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Model Selection */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Model Selection
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Chat Model</label>
              <select
                value={local.chat_model || ""}
                onChange={(e) => setLocal({ ...local, chat_model: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
              >
                {chatModels.length > 0 ? (
                  chatModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.parameter_size ? `(${m.parameter_size})` : ""}
                    </option>
                  ))
                ) : (
                  <option value={local.chat_model}>{local.chat_model} (not verified)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Embedding Model</label>
              <select
                value={local.embedding_model || ""}
                onChange={(e) => setLocal({ ...local, embedding_model: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
              >
                {embedModels.length > 0 ? (
                  embedModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <option value={local.embedding_model}>{local.embedding_model} (not verified)</option>
                )}
              </select>
              <p className="text-xs text-surface-500 mt-1">
                Used for document embeddings. Recommended: nomic-embed-text
              </p>
            </div>
          </div>
        </section>

        {/* Generation Parameters */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Generation Parameters
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1.5">
                Temperature: {local.temperature?.toFixed(2) ?? "0.70"}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={local.temperature ?? 0.7}
                onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-surface-500 mt-1">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Context Window</label>
              <input
                type="number"
                value={local.context_window ?? 4096}
                onChange={(e) => setLocal({ ...local, context_window: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </section>

        {/* RAG Settings */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            RAG Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Top-K Results</label>
              <input
                type="number"
                min="1"
                max="20"
                value={local.top_k ?? 5}
                onChange={(e) => setLocal({ ...local, top_k: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
              />
              <p className="text-xs text-surface-500 mt-1">Number of document chunks to retrieve per query</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-surface-400 mb-1.5">Chunk Size</label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  step="50"
                  value={local.chunk_size ?? 512}
                  onChange={(e) => setLocal({ ...local, chunk_size: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-1.5">Chunk Overlap</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  step="16"
                  value={local.chunk_overlap ?? 64}
                  onChange={(e) => setLocal({ ...local, chunk_overlap: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Advanced RAG Settings (v1.5) */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider">
              Advanced RAG (v1.5)
            </h2>
            <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">New</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Retrieval Strategy</label>
              <select
                value={local.retrieval_strategy ?? "vector"}
                onChange={(e) => setLocal({ ...local, retrieval_strategy: e.target.value as any })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
              >
                <option value="vector">Vector Similarity (Fastest)</option>
                <option value="bm25">BM25 Keyword Search</option>
                <option value="hybrid">Hybrid (Vector + BM25)</option>
                <option value="hybrid_rerank">Hybrid + Re-ranking (Best Quality)</option>
              </select>
              <p className="text-xs text-surface-500 mt-1">
                Choose search strategy. Hybrid re-ranking provides best quality but is slower.
              </p>
            </div>

            <div>
              <label className="block text-sm text-surface-400 mb-1.5">Chunking Strategy</label>
              <select
                value={local.chunking_strategy ?? "sentence"}
                onChange={(e) => setLocal({ ...local, chunking_strategy: e.target.value as any })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 focus:outline-none focus:border-accent"
              >
                <option value="sentence">Sentence-based (Standard)</option>
                <option value="semantic">Semantic (Topic-aware)</option>
                <option value="hierarchical">Hierarchical (Parent-Child)</option>
              </select>
              <p className="text-xs text-surface-500 mt-1">
                How documents are split into chunks. Applies to newly ingested documents.
              </p>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-surface-800 border border-surface-700 rounded-lg">
              <div>
                <div className="text-sm text-surface-300">Recursive Retrieval</div>
                <p className="text-xs text-surface-500 mt-0.5">
                  Automatically expand search when confidence is low
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={local.use_recursive_retrieval ?? false}
                  onChange={(e) => setLocal({ ...local, use_recursive_retrieval: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Data Location */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Data Storage
          </h2>
          <div>
            <label className="block text-sm text-surface-400 mb-1.5">Data Directory</label>
            <input
              type="text"
              value={local.data_dir ?? ""}
              onChange={(e) => setLocal({ ...local, data_dir: e.target.value })}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-200 font-mono focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-surface-500 mt-1">
              All data is stored locally at this path. Change requires restart.
            </p>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
            Keyboard Shortcuts
          </h2>
          <div className="bg-surface-800 border border-surface-700 rounded-lg divide-y divide-surface-700">
            {[
              { keys: "⌘/Ctrl + N", desc: "New conversation" },
              { keys: "⌘/Ctrl + K", desc: "Command palette" },
              { keys: "⌘/Ctrl + Shift + S", desc: "Toggle sidebar" },
              { keys: "⌘/Ctrl + /", desc: "Focus chat input" },
              { keys: "Esc", desc: "Close modals" },
              { keys: "⌘/Ctrl + ?", desc: "Shortcut help" },
            ].map(({ keys, desc }) => (
              <div key={keys} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-surface-300">{desc}</span>
                <kbd className="text-xs font-mono text-surface-400 bg-surface-900 px-2 py-0.5 rounded border border-surface-700">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Notice */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-xs text-emerald-400 leading-relaxed">
            All data is stored exclusively on your device. No telemetry, no cloud sync, no
            external API calls. Your conversations and documents never leave your machine.
          </p>
        </div>
      </div>
    </div>
  );
}
