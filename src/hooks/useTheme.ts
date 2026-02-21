import { useAppStore } from "../store/appStore";
import type { Theme } from "../lib/types";

export function useTheme() {
  const { theme, resolvedTheme, setTheme, updateSettings } = useAppStore();

  const cycleTheme = () => {
    const order: Theme[] = ["system", "light", "dark"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
    updateSettings({ theme: next });
  };

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    setTheme: (t: Theme) => {
      setTheme(t);
      updateSettings({ theme: t });
    },
    cycleTheme,
  };
}
