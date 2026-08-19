import { useState, useRef, useEffect } from "react";
import { 
  Terminal as TermIcon, 
  Plus, 
  Sparkles, 
  Zap, 
  Bot, 
  Minimize2 
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import TerminalSession, { TerminalData } from "../components/terminal/TerminalSession";
import TerminalToolbar, { GridLayoutMode } from "../components/terminal/TerminalToolbar";
import LaunchAppModal from "../components/terminal/LaunchAppModal";
import BroadcastModal from "../components/terminal/BroadcastModal";
import { WorkspaceData } from "../types/workspace";
import { HistoricalSession } from "../types/analytics";
import { DirectoryTemplate } from "../types/settings";

interface WorkspacePageProps {
  workspace: WorkspaceData;
  onUpdateWorkspace: (updated: Partial<WorkspaceData> | ((prev: WorkspaceData) => WorkspaceData)) => void;
  onRenameWorkspace?: (newName: string) => void;
  onLogSessionStart?: (session: HistoricalSession) => void;
  onLogSessionEnd?: (sessionId: string) => void;
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
  const [paneSizes, setPaneSizes] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize proportional sizes when terminal count or layout changes
  useEffect(() => {
    const count = workspace.terminals.length;
    if (count > 0) {
      setPaneSizes(Array(count).fill(100 / count));
    } else {
      setPaneSizes([]);
    }
  }, [workspace.terminals.length, workspace.gridLayout]);

  // Spawn new terminal
  const spawnTerminal = (config: Omit<TerminalData, "id" | "status">) => {
    const id = `term_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newSession: TerminalData = {
      ...config,
      id,
      status: "running",
      startedAt: Date.now(),
      outputChunksCount: 0,
    };

    onLogSessionStart?.({
      id: newSession.id,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      title: newSession.title,
      appType: newSession.appType,
      shellOrCommand: newSession.shellOrCommand,
      cwd: newSession.cwd,
      pid: undefined,
      startedAt: newSession.startedAt!,
      status: "running",
      outputChunksCount: 0,
    });

    onUpdateWorkspace((prev) => ({
      ...prev,
      terminals: [...prev.terminals, newSession],
      focusedId: newSession.id,
    }));
  };

  // Quick launch helper
  const handleQuickSpawn = (appType: TerminalData["appType"]) => {
    const targetCwd = workspace.defaultCwd || defaultCwd || undefined;

    switch (appType) {
      case "claude":
        spawnTerminal({
          title: "Claude Code",
          appType: "claude",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "claude"],
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
      case "kilo":
        spawnTerminal({
          title: "Kilo CLI",
          appType: "kilo",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "kilo"],
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
      await invoke("kill_terminal", { id });
    } catch {
      // ignore
    }

    onLogSessionEnd?.(id);

    onUpdateWorkspace((prev) => {
      const remaining = prev.terminals.filter((t) => t.id !== id);
      let nextFocused = prev.focusedId;
      if (prev.focusedId === id && remaining.length > 0) {
        nextFocused = remaining[0].id;
      }
      let nextMaximized = prev.maximizedId;
      if (prev.maximizedId === id) {
        nextMaximized = remaining.length > 0 ? remaining[0].id : null;
      }
      return {
        ...prev,
        terminals: remaining,
        focusedId: nextFocused,
        maximizedId: nextMaximized,
      };
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
      for (const t of workspace.terminals) {
        await invoke("write_terminal", { id: t.id, data: command + "\r" });
      }
    } catch {
      // ignore
    }
  };

  // Session activity handler (local visual pulse managed in TerminalSession)
  const handleSessionActivity = () => {};

  const [isDragging, setIsDragging] = useState(false);

  const isCustomSizes = paneSizes.length > 1 && paneSizes.some(
    (s) => Math.abs(s - 100 / paneSizes.length) > 1.5
  );

  const handleResetPaneSizes = () => {
    if (workspace.terminals.length > 0) {
      setPaneSizes(Array(workspace.terminals.length).fill(100 / workspace.terminals.length));
    }
  };

  // Interactive Drag Resizing for columns (horizontal) and stacked (vertical)
  const handleStartResize = (index: number, direction: "col" | "row", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const startPos = direction === "col" ? e.clientX : e.clientY;
    const totalPixels = direction === "col" ? containerRect.width : containerRect.height;
    const currentSizes = [...paneSizes];
    if (currentSizes.length !== workspace.terminals.length) return;

    setIsDragging(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = direction === "col" ? "col-resize" : "row-resize";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === "col" ? moveEvent.clientX : moveEvent.clientY;
      const deltaPixels = currentPos - startPos;
      const deltaPercent = (deltaPixels / totalPixels) * 100;

      const minPercent = 10; // Minimum 10% size per pane
      const sizeA = currentSizes[index] + deltaPercent;
      const sizeB = currentSizes[index + 1] - deltaPercent;

      if (sizeA >= minPercent && sizeB >= minPercent) {
        const next = [...currentSizes];
        next[index] = sizeA;
        next[index + 1] = sizeB;
        setPaneSizes(next);
      }
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
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
    <div className="workspace-hub">
      {/* Top Operations Toolbar */}
      <TerminalToolbar
        terminals={workspace.terminals}
        gridLayout={workspace.gridLayout}
        onSetGridLayout={(mode: GridLayoutMode) => onUpdateWorkspace({ gridLayout: mode })}
        onOpenLaunchModal={() => setIsLaunchModalOpen(true)}
        onQuickSpawn={handleQuickSpawn}
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        onKillAll={handleKillAll}
        onResetPaneSizes={handleResetPaneSizes}
        isCustomSizes={isCustomSizes}
      />

      {/* Maximized / Focus Mode Top Session Switcher Bar */}
      {(workspace.maximizedId || (workspace.gridLayout === "focus" && workspace.terminals.length > 0)) && (
        <div className="maximized-session-bar">
          <div className="maximized-tabs-scroll">
            <span className="maximized-bar-label">
              {workspace.maximizedId ? "Maximized:" : "Focus Tab:"}
            </span>

            {workspace.terminals.map((t) => {
              const currentActiveId = workspace.maximizedId || workspace.focusedId || workspace.terminals[0]?.id;
              const isCurrent = currentActiveId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`maximized-session-tab ${isCurrent ? "active" : ""}`}
                  onClick={() => {
                    if (workspace.maximizedId) {
                      onUpdateWorkspace({ maximizedId: t.id, focusedId: t.id });
                    } else {
                      onUpdateWorkspace({ focusedId: t.id });
                    }
                  }}
                >
                  <span className="session-tab-icon">{getAppIcon(t.appType)}</span>
                  <span className="session-tab-title">{t.title}</span>
                  {t.lastActiveAt && Date.now() - t.lastActiveAt < 3500 && (
                    <span className="session-tab-live-dot" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="maximized-bar-actions">
            {workspace.maximizedId && (
              <button
                type="button"
                className="btn-restore-grid"
                onClick={() => onUpdateWorkspace({ maximizedId: null })}
                title="Restore grid view"
              >
                <Minimize2 size={13} />
                <span>Restore Layout</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Canvas */}
      <div className="workspace-canvas">
        {workspace.terminals.length === 0 ? (
          <div className="empty-workspace-state animate-fade">
            <div className="empty-icon-glow">
              <TermIcon size={36} className="text-indigo-400" />
            </div>
            <h3>No Active Terminals in {workspace.name}</h3>
            <p>Launch PowerShell, Claude Code, Antigravity CLI, Kilo CLI, or custom commands in this workspace.</p>

            <div className="empty-quick-buttons">
              <button className="btn-primary" onClick={() => setIsLaunchModalOpen(true)}>
                <Plus size={15} />
                <span>Launch Application</span>
              </button>
              <button className="btn-secondary" onClick={() => handleQuickSpawn("claude")}>
                <Bot size={15} className="text-orange-400" />
                <span>Launch Claude</span>
              </button>
              <button className="btn-secondary" onClick={() => handleQuickSpawn("antigravity")}>
                <Sparkles size={15} className="text-cyan-400" />
                <span>Launch Antigravity</span>
              </button>
              <button className="btn-secondary" onClick={() => handleQuickSpawn("kilo")}>
                <Zap size={15} className="text-yellow-400" />
                <span>Launch Kilo</span>
              </button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="terminals-viewport-container">
            {/* Maximized or Focus Mode (All panes mounted, only active pane visible) */}
            {(workspace.maximizedId || workspace.gridLayout === "focus") && (
              <div className="single-terminal-view">
                {workspace.terminals.map((term) => {
                  const targetId = workspace.maximizedId || workspace.focusedId || workspace.terminals[0]?.id;
                  const isVisible = term.id === targetId;
                  return (
                    <div
                      key={term.id}
                      className={`focus-pane-layer ${isVisible ? "active" : ""}`}
                    >
                      <TerminalSession
                        session={term}
                        isMaximized={Boolean(workspace.maximizedId)}
                        onMaximizeToggle={(id) => onUpdateWorkspace({
                          maximizedId: workspace.maximizedId === id ? null : id
                        })}
                        onClose={handleCloseTerminal}
                        onRestart={handleRestartTerminal}
                        onSessionActivity={handleSessionActivity}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Side-by-Side (Columns View - Horizontal Resizing) */}
            {!workspace.maximizedId && workspace.gridLayout === "side-by-side" && (
              <div className="columns-resizable-container">
                {workspace.terminals.map((term, index) => (
                  <div key={term.id} className={`pane-wrapper-flex ${isDragging ? "dragging" : ""}`} style={{ flex: paneSizes[index] ?? 1 }}>
                    <div className="pane-inner">
                      <TerminalSession
                        session={term}
                        isMaximized={false}
                        onMaximizeToggle={(id) => onUpdateWorkspace({
                          maximizedId: id
                        })}
                        onClose={handleCloseTerminal}
                        onRestart={handleRestartTerminal}
                        onSessionActivity={handleSessionActivity}
                      />
                    </div>
                    {index < workspace.terminals.length - 1 && (
                      <div
                        className="pane-resizer-col"
                        onMouseDown={(e) => handleStartResize(index, "col", e)}
                        onDoubleClick={() => setPaneSizes(Array(workspace.terminals.length).fill(100 / workspace.terminals.length))}
                        title="Drag to resize columns (double-click to reset)"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stacked (Rows View - Vertical Resizing) */}
            {!workspace.maximizedId && workspace.gridLayout === "stacked" && (
              <div className="stacked-resizable-container">
                {workspace.terminals.map((term, index) => (
                  <div key={term.id} className={`pane-wrapper-stacked ${isDragging ? "dragging" : ""}`} style={{ flex: paneSizes[index] ?? 1 }}>
                    <div className="pane-inner">
                      <TerminalSession
                        session={term}
                        isMaximized={false}
                        onMaximizeToggle={(id) => onUpdateWorkspace({
                          maximizedId: id
                        })}
                        onClose={handleCloseTerminal}
                        onRestart={handleRestartTerminal}
                        onSessionActivity={handleSessionActivity}
                      />
                    </div>
                    {index < workspace.terminals.length - 1 && (
                      <div
                        className="pane-resizer-row"
                        onMouseDown={(e) => handleStartResize(index, "row", e)}
                        onDoubleClick={() => setPaneSizes(Array(workspace.terminals.length).fill(100 / workspace.terminals.length))}
                        title="Drag to resize rows (double-click to reset)"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Matrix 2x2 Grid View */}
            {!workspace.maximizedId && workspace.gridLayout === "grid" && (
              <div 
                className="matrix-grid-container"
                style={{
                  display: "grid",
                  gridTemplateColumns: workspace.terminals.length > 1 ? "1fr 1fr" : "1fr",
                  gridTemplateRows: `repeat(${Math.ceil(workspace.terminals.length / 2)}, minmax(220px, 1fr))`,
                  gap: "8px",
                  height: "100%",
                  width: "100%",
                }}
              >
                {workspace.terminals.map((term) => (
                  <TerminalSession
                    key={term.id}
                    session={term}
                    isMaximized={false}
                    onMaximizeToggle={(id) => onUpdateWorkspace({
                      maximizedId: id
                    })}
                    onClose={handleCloseTerminal}
                    onRestart={handleRestartTerminal}
                    onSessionActivity={handleSessionActivity}
                  />
                ))}
              </div>
            )}
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
