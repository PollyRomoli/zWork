import { useEffect, useState } from "react";
import appPackage from "../package.json";
import { Sidebar } from "./components/Sidebar";
import { Landing } from "./components/Landing";
import { ChatView } from "./components/ChatView";
import { SettingsPage } from "./components/Settings";
import { SearchModal } from "./components/SearchModal";
import { Onboarding } from "./components/Onboarding";
import { ProjectView } from "./components/ProjectView";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { useApp } from "./lib/store";
import { detectUpdate, installUpdate } from "./lib/update";
import { cn } from "./lib/cn";

export default function App() {
  const appVersion = appPackage.version;
  const bootstrap = useApp((s) => s.bootstrap);
  const view = useApp((s) => s.view);
  const active = useApp((s) => s.activeChatId);
  const chat = useApp((s) => (active ? s.chats[active] : undefined));
  const artifactPanelOpen = !!(view === "chat" && active && chat?.artifactPanelOpen);
  const openLanding = useApp((s) => s.openLanding);
  const toggleSidebar = useApp((s) => s.toggleSidebar);
  const setView = useApp((s) => s.setView);
  const setSearchOpen = useApp((s) => s.setSearchOpen);
  const onboardingDone = useApp((s) => s.onboardingDone);
  const [updateCard, setUpdateCard] = useState<{ latestVersion: string; releaseUrl: string; source: "updater" | "github" } | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdates() {
      const detected = await detectUpdate(appVersion);
      if (cancelled || !detected) return;

      const dismissed = window.localStorage.getItem("zwork:dismissed-update");
      if (dismissed === detected.latestVersion) return;
      setUpdateCard(detected);
    }

    void checkForUpdates();
    const interval = window.setInterval(() => {
      void checkForUpdates();
    }, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [appVersion]);

  const runUpdate = async () => {
    if (updateBusy) return;
    setUpdateBusy(true);
    try {
      const installed = await installUpdate();
      if (!installed && updateCard?.releaseUrl) {
        window.open(updateCard.releaseUrl, "_blank", "noreferrer");
      }
    } finally {
      setUpdateBusy(false);
    }
  };

  const dismissUpdate = () => {
    if (updateCard) {
      try {
        window.localStorage.setItem("zwork:dismissed-update", updateCard.latestVersion);
      } catch {
        /* ignore */
      }
    }
    setUpdateCard(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        openLanding();
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      } else if (mod && e.key === ",") {
        e.preventDefault();
        setView("settings");
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openLanding, toggleSidebar, setView, setSearchOpen]);

  const showLanding = view === "chat" && active === null;
  const showChatLoading = view === "chat" && !!active && !chat;
  const [showLandingOverlay, setShowLandingOverlay] = useState(showLanding);
  const [particlesExiting, setParticlesExiting] = useState(false);

  useEffect(() => {
    if (showLanding) {
      setShowLandingOverlay(true);
      setParticlesExiting(false);
      return;
    }
    if (showLandingOverlay) {
      setParticlesExiting(true);
      const t = window.setTimeout(() => {
        setShowLandingOverlay(false);
        setParticlesExiting(false);
      }, 340);
      return () => window.clearTimeout(t);
    }
  }, [showLanding, showLandingOverlay]);
  // Show onboarding when we know it's NOT done. `null` = still loading; render
  // nothing then to avoid flash.
  if (onboardingDone === false) {
    return <Onboarding />;
  }
  if (onboardingDone === null) {
    return <div className="h-screen w-screen bg-paper" />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 overflow-hidden">
        {view === "settings" ? (
          <SettingsPage />
        ) : view === "projects" ? (
          <ProjectView />
        ) : showChatLoading ? (
          <div className="flex h-full w-full items-center justify-center bg-paper">
            <div className="rounded-2xl border border-line bg-paper-raised px-4 py-2 text-[12.5px] text-ink-muted">
              Loading chat…
            </div>
          </div>
        ) : (
          <>
            {!showLanding && <ChatView />}
            {showLandingOverlay && (
              <div
                className={cn(
                  "absolute inset-0 z-10 transition-opacity duration-300 ease-out",
                  particlesExiting ? "opacity-0" : "opacity-100",
                )}
              >
                <Landing
                  particlesExiting={particlesExiting}
                  updateCard={updateCard}
                  updateBusy={updateBusy}
                  onUpdate={updateCard ? runUpdate : undefined}
                  onDismissUpdate={updateCard ? dismissUpdate : undefined}
                />
              </div>
            )}
          </>
        )}
      </main>
      {artifactPanelOpen && <ArtifactPanel />}
      <SearchModal />
    </div>
  );
}
