import { useState } from "react";
import {
  Shield,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { useOllama } from "../hooks/useOllama";
import { useAppStore } from "../store/appStore";

interface Props {
  onComplete: () => void;
}

export function OnboardingPage({ onComplete }: Props) {
  const { isRunning, models, refresh } = useOllama();
  const { updateSettings, createWorkspace, setActiveWorkspace } = useAppStore();
  const [step, setStep] = useState(0);
  const [selectedChat, setSelectedChat] = useState("");
  const [selectedEmbed, setSelectedEmbed] = useState("");
  const [checking, setChecking] = useState(false);

  const chatModels = models.filter((m) => !m.name.includes("embed"));
  const embedModels = models.filter((m) => m.name.includes("embed"));

  const handleCheck = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
  };

  const handleFinish = async () => {
    if (selectedChat) {
      await updateSettings({ chat_model: selectedChat });
    }
    if (selectedEmbed) {
      await updateSettings({ embedding_model: selectedEmbed });
    }
    const ws = await createWorkspace("My Documents");
    setActiveWorkspace(ws);
    onComplete();
  };

  const steps = [
    {
      title: "Welcome to Local AI Workspace",
      content: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto">
            <Shield size={40} className="text-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-surface-100 mb-2">
              Your AI, Your Privacy
            </h2>
            <p className="text-surface-400 max-w-md mx-auto leading-relaxed">
              Everything runs on your device. No cloud, no API keys, no data
              collection. Chat with AI and your documents in complete privacy.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-center">
            {[
              { label: "100% Offline", icon: Shield },
              { label: "Local Models", icon: Cpu },
              { label: "Your Data", icon: CheckCircle2 },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="p-3 bg-surface-800 rounded-lg">
                <Icon size={20} className="text-accent mx-auto mb-1" />
                <div className="text-xs text-surface-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Connect to Ollama",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-surface-100 mb-2">
              Ollama Connection
            </h2>
            <p className="text-sm text-surface-400">
              Ollama runs AI models locally on your machine.
            </p>
          </div>

          <div className="bg-surface-800 border border-surface-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              {isRunning ? (
                <CheckCircle2 size={24} className="text-emerald-400" />
              ) : (
                <XCircle size={24} className="text-red-400" />
              )}
              <div>
                <div className="text-sm font-medium text-surface-200">
                  {isRunning ? "Ollama is running!" : "Ollama not detected"}
                </div>
                <div className="text-xs text-surface-500">
                  {isRunning
                    ? `${models.length} models available`
                    : "Follow the steps below to set up"}
                </div>
              </div>
            </div>

            {!isRunning && (
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-surface-900 rounded-lg">
                  <p className="text-surface-300 font-medium mb-1">1. Install Ollama</p>
                  <p className="text-surface-500 text-xs">
                    Visit <span className="text-accent">ollama.com</span> and download for your OS
                  </p>
                </div>
                <div className="p-3 bg-surface-900 rounded-lg">
                  <p className="text-surface-300 font-medium mb-1">2. Start Ollama</p>
                  <code className="text-xs text-accent-light bg-surface-800 px-2 py-0.5 rounded">
                    ollama serve
                  </code>
                </div>
                <div className="p-3 bg-surface-900 rounded-lg">
                  <p className="text-surface-300 font-medium mb-1">3. Pull a model</p>
                  <code className="text-xs text-accent-light bg-surface-800 px-2 py-0.5 rounded">
                    ollama pull llama3 && ollama pull nomic-embed-text
                  </code>
                </div>
              </div>
            )}

            <button
              onClick={handleCheck}
              disabled={checking}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-surface-700 text-surface-200 rounded-lg hover:bg-surface-600 transition-colors text-sm"
            >
              {checking ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Check Connection
            </button>
          </div>
        </div>
      ),
    },
    {
      title: "Choose Models",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-surface-100 mb-2">
              Select Your Models
            </h2>
            <p className="text-sm text-surface-400">
              Choose which models to use for chat and embeddings.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-300 mb-2">Chat Model</label>
              <div className="space-y-1.5">
                {chatModels.length > 0 ? (
                  chatModels.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedChat(m.name)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                        selectedChat === m.name
                          ? "border-accent bg-accent/10"
                          : "border-surface-700 bg-surface-800 hover:border-surface-600"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedChat === m.name ? "border-accent" : "border-surface-600"
                      }`}>
                        {selectedChat === m.name && <div className="w-2 h-2 rounded-full bg-accent" />}
                      </div>
                      <div>
                        <div className="text-sm text-surface-200">{m.name}</div>
                        {m.parameter_size && (
                          <div className="text-xs text-surface-500">{m.parameter_size}</div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-surface-500 p-3 bg-surface-800 rounded-lg">
                    No chat models found. Pull one with: <code className="text-accent-light">ollama pull llama3</code>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-surface-300 mb-2">Embedding Model</label>
              <div className="space-y-1.5">
                {embedModels.length > 0 ? (
                  embedModels.map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedEmbed(m.name)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                        selectedEmbed === m.name
                          ? "border-accent bg-accent/10"
                          : "border-surface-700 bg-surface-800 hover:border-surface-600"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedEmbed === m.name ? "border-accent" : "border-surface-600"
                      }`}>
                        {selectedEmbed === m.name && <div className="w-2 h-2 rounded-full bg-accent" />}
                      </div>
                      <div className="text-sm text-surface-200">{m.name}</div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-surface-500 p-3 bg-surface-800 rounded-lg">
                    No embedding models found. Pull one with: <code className="text-accent-light">ollama pull nomic-embed-text</code>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const isLastStep = step === steps.length - 1;
  const canProceed = step === 0 || (step === 1 && isRunning) || step === 2;

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "bg-accent w-8" : "bg-surface-700 w-4"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-surface-900 border border-surface-700 rounded-2xl p-8">
          {steps[step].content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 disabled:invisible transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (isLastStep) handleFinish();
              else setStep(step + 1);
            }}
            disabled={!canProceed}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-all text-sm font-medium"
          >
            {isLastStep ? "Get Started" : "Continue"}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
