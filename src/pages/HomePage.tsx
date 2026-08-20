import HomeHeroBanner from "../components/home/HomeHeroBanner";
import HomeLaunchpad from "../components/home/HomeLaunchpad";
import HomeWorkspaceFleet from "../components/home/HomeWorkspaceFleet";
import HomeRecentHistory from "../components/home/HomeRecentHistory";
import { WorkspaceData, ClosedWorkspaceData } from "../types/workspace";
import { HistoricalSession } from "../types/analytics";
import { DirectoryTemplate } from "../types/settings";
import { TerminalData } from "../components/terminal/TerminalSession";

interface HomePageProps {
  workspaces: WorkspaceData[];
  closedWorkspaces: ClosedWorkspaceData[];
  sessionHistory: HistoricalSession[];
  onNavigateToWorkspace: (workspaceId: string) => void;
  onNewWorkspace: () => void;
  onLaunchTerminal: (config: Omit<TerminalData, "id" | "status">) => void;
  onOpenCustomLaunchModal: (workspaceId?: string) => void;
  onReopenWorkspace: (closedWs: ClosedWorkspaceData) => void;
  onResumeSession: (session: HistoricalSession) => void;
  onDeleteClosedWorkspace: (id: string) => void;
  onClearClosedWorkspaces: () => void;
  onClearSessionHistory: () => void;
  directoryTemplates?: DirectoryTemplate[];
  defaultCwd?: string;
  visibleAgents?: Record<string, boolean>;
  detectedAgents?: Record<string, boolean>;
  onOpenSettings?: () => void;
}

export default function HomePage({
  workspaces,
  closedWorkspaces,
  sessionHistory,
  onNavigateToWorkspace,
  onNewWorkspace,
  onLaunchTerminal,
  onOpenCustomLaunchModal,
  onReopenWorkspace,
  onResumeSession,
  onDeleteClosedWorkspace,
  onClearClosedWorkspaces,
  onClearSessionHistory,
  directoryTemplates = [],
  defaultCwd = "",
  visibleAgents,
  detectedAgents,
  onOpenSettings,
}: HomePageProps) {
  return (
    <div className="home-dashboard-container animate-fade">
      {/* 1. Hero & Mission Control Banner */}
      <HomeHeroBanner
        workspaces={workspaces}
        onNewWorkspace={onNewWorkspace}
      />

      {/* 2. Instant AI Command Bar & Task Dispatcher */}
      <HomeLaunchpad
        onLaunchTerminal={onLaunchTerminal}
        directoryTemplates={directoryTemplates}
        defaultCwd={defaultCwd}
        visibleAgents={visibleAgents}
        detectedAgents={detectedAgents}
        onOpenSettings={onOpenSettings}
      />

      {/* 3. Live Workspace Fleet HUD */}
      <HomeWorkspaceFleet
        workspaces={workspaces}
        onNavigateToWorkspace={onNavigateToWorkspace}
        onSpawnInWorkspace={(wsId) => onOpenCustomLaunchModal(wsId)}
        onNewWorkspace={onNewWorkspace}
      />

      {/* 4. Recent Session History & Recovery (Top Priority) */}
      <HomeRecentHistory
        closedWorkspaces={closedWorkspaces}
        sessionHistory={sessionHistory}
        activeWorkspaces={workspaces}
        onReopenWorkspace={onReopenWorkspace}
        onResumeSession={onResumeSession}
        onDeleteClosedWorkspace={onDeleteClosedWorkspace}
        onClearClosedWorkspaces={onClearClosedWorkspaces}
        onClearSessionHistory={onClearSessionHistory}
      />
    </div>
  );
}
