import { useState, useRef } from "react";
import { 
  Terminal as TermIcon, 
  Plus, 
  Sparkles, 
  Zap, 
  Bot, 
  Minimize2, 
  X,
  Cpu
} from "lucide-react";
import TerminalSession, { TerminalData } from "../components/terminal/TerminalSession";
import TerminalToolbar, { GridLayoutMode } from "../components/terminal/TerminalToolbar";
import LaunchAppModal from "../components/terminal/LaunchAppModal";
import BroadcastModal from "../components/terminal/BroadcastModal";
import { WorkspaceData } from "../types/workspace";
import { HistoricalSession } from "../types/analytics";
import { DirectoryTemplate } from "../types/settings";

interface WorkspacePageProps {
  workspace: WorkspaceData;
  onUpdateWorkspace: (updated: Partial<WorkspaceData>) => void;
  onRenameWorkspace: (newName: string) => void;
  onLogSessionStart?: (session: HistoricalSession) => void;
  onLogSessionEnd?: (id: string) => void;
  directoryTemplates?: DirectoryTemplate[];
  defaultCwd?: string;
  onSaveDirectoryTemplate?: (name: string, path: string) => void;
}

export default function WorkspacePage({
  workspace,
  onUpdateWorkspace,
  onLogSessionStart,
  onLogSessionEnd,
  directoryTemplates = [],
  defaultCwd = "",
  onSaveDirectoryTemplate,
}: WorkspacePageProps) {
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const termCounter = useRef(1);

  // Spawn a terminal via Tauri Rust PTY bridge
  const spawnTerminal = async (config: Omit<TerminalData, "id" | "status">) => {
    const id = `term_${workspace.id}_${Date.now()}_${termCounter.current++}`;
    const startedAt = Date.now();
    const effectiveCwd = config.cwd || workspace.defaultCwd || defaultCwd || undefined;

    const newTerm: TerminalData = {
      id,
      title: config.title || `Terminal #${termCounter.current - 1}`,
      appType: config.appType,
      shellOrCommand: config.shellOrCommand,
      args: config.args,
      cwd: effectiveCwd,
      status: "running",
      startedAt,
      outputChunksCount: 0,
      lastActiveAt: startedAt,
    };

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const info = await invoke<{ pid?: number }>("spawn_terminal", {
        id: newTerm.id,
        title: newTerm.title,
        shell: newTerm.shellOrCommand,
        args: newTerm.args || null,
        cwd: newTerm.cwd || null,
        cols: 80,
        rows: 24,
      });
      newTerm.pid = info.pid;
    } catch {
      // Running in web preview mode
      newTerm.pid = Math.floor(10000 + Math.random() * 90000);
    }

    onLogSessionStart?.({
      id: newTerm.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      title: newTerm.title,
      appType: newTerm.appType,
      shellOrCommand: newTerm.shellOrCommand,
      cwd: newTerm.cwd,
      pid: newTerm.pid,
      startedAt,
      status: "running",
      outputChunksCount: 0,
    });

    const nextTerminals = [...workspace.terminals, newTerm];
    onUpdateWorkspace({
      terminals: nextTerminals,
      focusedId: newTerm.id,
      maximizedId: workspace.maximizedId ? newTerm.id : workspace.maximizedId,
    });
  };

  // Quick launch helper
  const handleQuickSpawn = (appType: TerminalData["appType"]) => {
    const targetCwd = workspace.defaultCwd || defaultCwd || undefined;

    switch (appType) {
      case "kilo":
        spawnTerminal({
          title: "Kilo CLI",
          appType: "kilo",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "kilo"],
          cwd: targetCwd,
        });
        break;
      case "antigravity":
        spawnTerminal({
          title: "Antigravity CLI",
          appType: "antigravity",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "agy"],
          cwd: targetCwd,
        });
        break;
      case "claude":
        spawnTerminal({
          title: "Claude Code",
          appType: "claude",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "claude"],
          cwd: targetCwd,
        });
        break;
      default:
        spawnTerminal({
          title: "PowerShell",
          appType: "powershell",
          shellOrCommand: "powershell.exe",
          args: ["-NoLogo"],
          cwd: targetCwd,
        });
        break;
    }
  };

  // Close / Kill a terminal
  const handleCloseTerminal = async (id: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("kill_terminal", { id });
    } catch {
      // ignore
    }

    onLogSessionEnd?.(id);

    const remaining = workspace.terminals.filter((t) => t.id !== id);
    let nextFocused = workspace.focusedId;
    if (workspace.focusedId === id && remaining.length > 0) {
      nextFocused = remaining[0].id;
    }
    let nextMaximized = workspace.maximizedId;
    if (workspace.maximizedId === id) {
      nextMaximized = remaining.length > 0 ? remaining[0].id : null;
    }

    onUpdateWorkspace({
      terminals: remaining,
      focusedId: nextFocused,
      maximizedId: nextMaximized,
    });
  };

  // Restart a terminal
  const handleRestartTerminal = async (id: string) => {
    const existing = workspace.terminals.find((t) => t.id === id);
    if (!existing) return;

    await handleCloseTerminal(id);
    spawnTerminal({
      title: existing.title,
      appType: existing.appType,
      shellOrCommand: existing.shellOrCommand,
      args: existing.args,
      cwd: existing.cwd,
    });
  };

  // Close all terminals in current workspace
  const handleKillAll = async () => {
    for (const t of workspace.terminals) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("kill_terminal", { id: t.id });
      } catch {
        // ignore
      }
      onLogSessionEnd?.(t.id);
    }
    onUpdateWorkspace({
      terminals: [],
      maximizedId: null,
      focusedId: null,
    });
  };

  // Broadcast command to all running terminals in current workspace
  const handleBroadcast = async (command: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      for (const t of workspace.terminals) {
        await invoke("write_terminal", { id: t.id, data: command + "\r" });
      }
    } catch {
      // ignore
    }
  };

  // Track session activity timestamp
  const handleSessionActivity = (id: string) => {
    onUpdateWorkspace({
      terminals: workspace.terminals.map((t) =>
        t.id === id 
          ? { 
              ...t, 
              lastActiveAt: Date.now(), 
              status: "running",
              outputChunksCount: (t.outputChunksCount || 0) + 1 
            } 
          : t
      ),
    });
  };

  // Compute dynamic grid style based on layout mode and active terminals
  const getGridStyle = (): React.CSSProperties => {
    if (workspace.maximizedId || workspace.gridLayout === "focus") {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
        height: "100%",
        width: "100%",
      };
    }

    const count = workspace.terminals.length;

    if (workspace.gridLayout === "side-by-side") {
      // Put ALL terminals side-by-side in vertical columns (no stacking)
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${count}, minmax(280px, 1fr))`,
        gridTemplateRows: "100%",
        height: "100%",
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
      };
    }

    if (workspace.gridLayout === "stacked") {
      // Stack ALL terminals vertically in horizontal rows (no disappearing)
      return {
        display: "grid",
        gridTemplateColumns: "100%",
        gridTemplateRows: `repeat(${count}, minmax(200px, 1fr))`,
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      };
    }

    if (workspace.gridLayout === "grid") {
      // 2-column matrix
      const cols = count > 1 ? 2 : 1;
      const rows = Math.ceil(count / 2);
      return {
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, minmax(240px, 1fr))`,
        height: "100%",
        width: "100%",
        overflowY: "auto",
      };
    }

    return {
      display: "grid",
      gridTemplateColumns: `repeat(${count}, minmax(280px, 1fr))`,
      gridTemplateRows: "100%",
      height: "100%",
      width: "100%",
    };
  };

  const getAppIcon = (appType: TerminalData["appType"]) => {
    switch (appType) {
      case "antigravity":
        return <Sparkles size={13} className="text-cyan-400" />;
      case "claude":
        return <Bot size={13} className="text-orange-400" />;
      case "kilo":
        return <Zap size={13} className="text-yellow-400" />;
      default:
        return <TermIcon size={13} className="text-indigo-400" />;
    }
  };


  return (
    <div className="workspace-hub animate-fade">
      {/* Top Operations Toolbar */}
      <TerminalToolbar
        terminals={workspace.terminals}
        gridLayout={workspace.gridLayout}
        onSetGridLayout={(mode: GridLayoutMode) => onUpdateWorkspace({ gridLayout: mode })}
        onOpenLaunchModal={() => setIsLaunchModalOpen(true)}
        onQuickSpawn={handleQuickSpawn}
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        onKillAll={handleKillAll}
      />

      {/* Maximized / Focus Mode Top Session Switcher Bar */}
      {(workspace.maximizedId || (workspace.gridLayout === "focus" && workspace.terminals.length > 0)) && (
        <div className="maximized-session-bar animate-fade">
          <div className="maximized-tabs-scroll">
            <span className="maximized-bar-label">
              {workspace.maximizedId ? "Maximized View:" : "Active Sessions:"}
            </span>

            {workspace.terminals.map((t) => {
              const isCurrent = workspace.maximizedId 
                ? workspace.maximizedId === t.id 
                : workspace.focusedId === t.id;
              return (
                <div
                  key={t.id}
                  className={`maximized-tab ${isCurrent ? "active" : ""}`}
                  onClick={() => {
                    if (workspace.maximizedId) onUpdateWorkspace({ maximizedId: t.id });
                    else onUpdateWorkspace({ focusedId: t.id });
                  }}
                >
                  <div className="tab-icon-title">
                    {getAppIcon(t.appType)}
                    <span className="tab-title">{t.title}</span>
                  </div>

                  {t.pid && (
                    <span className="tab-pid">
                      <Cpu size={10} />
                      {t.pid}
                    </span>
                  )}

                  <span className="status-dot running" title="Running" />

                  <button
                    className="tab-close-btn"
                    title="Close session"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTerminal(t.id);
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            <button 
              className="maximized-add-btn" 
              title="Launch new terminal"
              onClick={() => setIsLaunchModalOpen(true)}
            >
              <Plus size={13} />
              <span>New</span>
            </button>
          </div>

          {/* Restore Grid button */}
          {workspace.maximizedId && (
            <button
              className="btn-restore-grid"
              onClick={() => onUpdateWorkspace({ maximizedId: null })}
              title="Restore multi-pane grid view"
            >
              <Minimize2 size={14} />
              <span>Restore Grid</span>
            </button>
          )}
        </div>
      )}

      {/* Grid Canvas */}
      <div className="workspace-canvas">
        {workspace.terminals.length === 0 ? (
          <div className="empty-workspace-state animate-fade">
            <div className="empty-icon-glow">
              <TermIcon size={36} className="text-indigo-400" />
            </div>
            <h3>No Active Terminals in {workspace.name}</h3>
            <p>Launch PowerShell, Kilo CLI, Antigravity CLI, Claude Code, or custom commands in this workspace.</p>

            <div className="empty-quick-buttons">
              <button className="btn-primary" onClick={() => setIsLaunchModalOpen(true)}>
                <Plus size={15} />
                <span>Launch Application</span>
              </button>
              <button className="btn-secondary" onClick={() => handleQuickSpawn("kilo")}>
                <Zap size={15} className="text-yellow-400" />
                <span>Launch Kilo</span>
              </button>
              <button className="btn-secondary" onClick={() => handleQuickSpawn("antigravity")}>
                <Sparkles size={15} className="text-cyan-400" />
                <span>Launch Antigravity</span>
              </button>
              <button className="btn-secondary" onClick={() => handleQuickSpawn("claude")}>
                <Bot size={15} className="text-orange-400" />
                <span>Launch Claude</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="terminals-grid-container" style={getGridStyle()}>
            {workspace.terminals.map((term) => {
              // If maximized, only render maximized terminal
              if (workspace.maximizedId && workspace.maximizedId !== term.id) return null;
              // If in focus mode and not maximized, only render focused terminal
              if (workspace.gridLayout === "focus" && !workspace.maximizedId && workspace.focusedId && workspace.focusedId !== term.id) return null;

              return (
                <TerminalSession
                  key={term.id}
                  session={term}
                  isMaximized={workspace.maximizedId === term.id}
                  onMaximizeToggle={(id) => onUpdateWorkspace({
                    maximizedId: workspace.maximizedId === id ? null : id
                  })}
                  onClose={handleCloseTerminal}
                  onRestart={handleRestartTerminal}
                  onSessionActivity={handleSessionActivity}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Launch App Modal */}
      <LaunchAppModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        onLaunch={spawnTerminal}
        directoryTemplates={directoryTemplates}
        defaultCwd={workspace.defaultCwd || defaultCwd || ""}
        onSaveTemplate={onSaveDirectoryTemplate}
      />

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        terminalCount={workspace.terminals.length}
        onClose={() => setIsBroadcastModalOpen(false)}
        onBroadcast={handleBroadcast}
      />
    </div>
  );
}
