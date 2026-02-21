import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "./store/appStore";
import { Sidebar } from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/Toast";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutHelp } from "./components/ShortcutHelp";
import { ChatPage } from "./pages/ChatPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Loader2 } from "lucide-react";

type Page = "chat" | "documents" | "workspaces" | "settings";

export default function App() {
  const { init, initialized, ollamaStatus, createConversation, toggleSidebar } = useAppStore();
  const [page, setPage] = useState<Page>("chat");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (initialized && ollamaStatus) {
      const hasSeenOnboarding = localStorage.getItem("law_onboarding_done");
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [initialized, ollamaStatus]);

  const handleNewChat = useCallback(async () => {
    await createConversation();
    setPage("chat");
  }, [createConversation]);

  const handleFocusChatInput = useCallback(() => {
    setPage("chat");
    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      textarea?.focus();
    }, 100);
  }, []);

  const handleEscape = useCallback(() => {
    if (showCommandPalette) setShowCommandPalette(false);
    else if (showShortcutHelp) setShowShortcutHelp(false);
  }, [showCommandPalette, showShortcutHelp]);

  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onCommandPalette: () => setShowCommandPalette((v) => !v),
    onToggleSidebar: toggleSidebar,
    onFocusChatInput: handleFocusChatInput,
    onEscape: handleEscape,
    onShortcutHelp: () => setShowShortcutHelp((v) => !v),
  });

  if (!initialized) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={32} className="text-accent animate-spin mx-auto" />
          <p className="text-surface-400 text-sm">Starting Local AI Workspace...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <ErrorBoundary fallbackMessage="Onboarding encountered an error.">
        <OnboardingPage
          onComplete={() => {
            localStorage.setItem("law_onboarding_done", "true");
            setShowOnboarding(false);
          }}
        />
        <ToastContainer />
      </ErrorBoundary>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "chat":
        return (
          <ErrorBoundary fallbackMessage="Chat encountered an error. Try starting a new conversation.">
            <ChatPage />
          </ErrorBoundary>
        );
      case "documents":
        return (
          <ErrorBoundary fallbackMessage="Document manager encountered an error.">
            <DocumentsPage />
          </ErrorBoundary>
        );
      case "workspaces":
        return (
          <ErrorBoundary fallbackMessage="Workspace manager encountered an error.">
            <WorkspacesPage onNavigate={(p) => setPage(p as Page)} />
          </ErrorBoundary>
        );
      case "settings":
        return (
          <ErrorBoundary fallbackMessage="Settings page encountered an error.">
            <SettingsPage />
          </ErrorBoundary>
        );
      default:
        return <ChatPage />;
    }
  };

  return (
    <div className="h-screen flex bg-surface-950 text-surface-100 transition-colors duration-200">
      <ErrorBoundary fallbackMessage="Sidebar encountered an error.">
        <Sidebar currentPage={page} onNavigate={(p) => setPage(p as Page)} />
      </ErrorBoundary>
      <main className="flex-1 flex flex-col min-w-0">{renderPage()}</main>
      <ToastContainer />
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={(p) => setPage(p as Page)}
        onNewChat={handleNewChat}
      />
      <ShortcutHelp open={showShortcutHelp} onClose={() => setShowShortcutHelp(false)} />
    </div>
  );
}
