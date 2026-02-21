import { useEffect } from "react";
import { useAppStore } from "../store/appStore";

export function useOllama() {
  const { ollamaStatus, checkOllama } = useAppStore();

  useEffect(() => {
    checkOllama();
    const interval = setInterval(checkOllama, 30000);
    return () => clearInterval(interval);
  }, [checkOllama]);

  return {
    isRunning: ollamaStatus?.running ?? false,
    models: ollamaStatus?.models ?? [],
    error: ollamaStatus?.error ?? null,
    refresh: checkOllama,
  };
}
