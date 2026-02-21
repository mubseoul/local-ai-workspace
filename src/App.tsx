import { useEffect, useState } from "react";
import { useAppStore } from "./store/appStore";
import { Sidebar } from "./components/Sidebar";
import { ChatPage } from "./pages/ChatPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { Loader2 } from "lucide-react";

type Page = "chat" | "documents" | "workspaces" | "settings";

export default function App() {
  const { init, initialized, ollamaStatus } = useAppStore();
  const [page, setPage] = useState<Page>("chat");
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      <OnboardingPage
        onComplete={() => {
          localStorage.setItem("law_onboarding_done", "true");
          setShowOnboarding(false);
        }}
      />
    );
  }

  const renderPage = () => {
    switch (page) {
      case "chat":
        return <ChatPage />;
      case "documents":
        return <DocumentsPage />;
      case "workspaces":
        return <WorkspacesPage onNavigate={(p) => setPage(p as Page)} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ChatPage />;
    }
  };

  return (
    <div className="h-screen flex bg-surface-950">
      <Sidebar currentPage={page} onNavigate={(p) => setPage(p as Page)} />
      <main className="flex-1 flex flex-col min-w-0">{renderPage()}</main>
    </div>
  );
}
