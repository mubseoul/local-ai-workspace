import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (type, message, duration = 4000) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }));
  },
  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().add("success", msg),
  error: (msg: string) => useToastStore.getState().add("error", msg, 6000),
  info: (msg: string) => useToastStore.getState().add("info", msg),
};

const icons = {
  success: <CheckCircle2 size={16} className="text-emerald-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-blue-400" />,
};

const borderColors = {
  success: "border-emerald-500/30",
  error: "border-red-500/30",
  info: "border-blue-500/30",
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  useEffect(() => {
    if (item.duration && item.duration > 0) {
      const timer = setTimeout(dismiss, item.duration);
      return () => clearTimeout(timer);
    }
  }, [item.duration, dismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-surface-800 border ${borderColors[item.type]} rounded-lg shadow-xl transition-all duration-200 ${
        exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
      }`}
    >
      {icons[item.type]}
      <span className="text-sm text-surface-200 flex-1">{item.message}</span>
      <button
        onClick={dismiss}
        className="p-0.5 text-surface-500 hover:text-surface-300 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={() => remove(item.id)} />
      ))}
    </div>
  );
}
