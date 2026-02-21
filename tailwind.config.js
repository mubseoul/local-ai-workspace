/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          50: "var(--surface-50, #f8fafc)",
          100: "var(--surface-100, #f1f5f9)",
          200: "var(--surface-200, #e2e8f0)",
          300: "var(--surface-300, #cbd5e1)",
          400: "var(--surface-400, #94a3b8)",
          500: "var(--surface-500, #64748b)",
          600: "var(--surface-600, #475569)",
          700: "var(--surface-700, #334155)",
          800: "var(--surface-800, #1e293b)",
          900: "var(--surface-900, #0f172a)",
          950: "var(--surface-950, #020617)",
        },
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          light: "#a5b4fc",
          dark: "#3730a3",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
