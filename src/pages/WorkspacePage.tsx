import { useState, useRef, useEffect, useMemo } from "react";
import { 
  Terminal as TermIcon, 
  Plus, 
  Sparkles, 
  Zap, 
  Bot, 
  Minimize2,
  BrainCircuit,
  Rocket,
  Boxes,
  Server,
  Code2,
  Layers,
  ChevronDown,
  Settings as SettingsIcon,
  CheckCircle2
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import TerminalSession, { TerminalData } from "../components/terminal/TerminalSession";
import TerminalToolbar, { GridLayoutMode } from "../components/terminal/TerminalToolbar";
import LaunchAppModal from "../components/terminal/LaunchAppModal";
import BroadcastModal from "../components/terminal/BroadcastModal";
import CustomizePresetsModal from "../components/terminal/CustomizePresetsModal";
import { WorkspaceData, WorkspaceSummary } from "../types/workspace";
import { HistoricalSession, AppType } from "../types/analytics";
import { DirectoryTemplate, DEFAULT_PINNED_PRESETS } from "../types/settings";
import { ALL_PRESET_DEFINITIONS } from "../constants/presets";

interface WorkspacePageProps {
  workspace: WorkspaceData;
  onUpdateWorkspace: (updated: Partial<WorkspaceData> | ((prev: WorkspaceData) => WorkspaceData)) => void;
  onRenameWorkspace?: (newName: string) => void;
  onLogSessionStart?: (session: HistoricalSession) => void;
  onLogSessionEnd?: (sessionId: string) => void;
  directoryTemplates?: DirectoryTemplate[];
  defaultCwd?: string;
  onSaveDirectoryTemplate?: (name: string, path: string) => void;
  pinnedPresets?: AppType[];
  onUpdatePinnedPresets?: (pinned: AppType[]) => void;
  availableWorkspaces?: WorkspaceSummary[];
  onMoveTerminal?: (terminalId: string, sourceWorkspaceId: string, targetWorkspaceId: string | "new", switchNow: boolean) => void;
  visibleAgents?: Record<string, boolean>;
  detectedAgents?: Record<string, boolean>;
  onOpenSettings?: () => void;
}

export default function WorkspacePage({
  workspace,
  onUpdateWorkspace,
  onLogSessionStart,
  onLogSessionEnd,
  directoryTemplates = [],
  defaultCwd = "",
  onSaveDirectoryTemplate,
  pinnedPresets,
  onUpdatePinnedPresets,
  availableWorkspaces,
  onMoveTerminal,
  visibleAgents,
  detectedAgents,
  onOpenSettings,
}: WorkspacePageProps) {

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isQuickSpawnOpen, setIsQuickSpawnOpen] = useState(false);
  const [paneSizes, setPaneSizes] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const quickSpawnRef = useRef<HTMLDivElement>(null);

  // Close quick spawn menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (quickSpawnRef.current && !quickSpawnRef.current.contains(target)) {
        setIsQuickSpawnOpen(false);
      }
    };
    if (isQuickSpawnOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isQuickSpawnOpen]);

  // Close quick spawn menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsQuickSpawnOpen(false);
      }
    };
    if (isQuickSpawnOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuickSpawnOpen]);

  // Synchronize proportional sizes when terminal count or layout changes
  useEffect(() => {
    const count = workspace.terminals.length;
    if (count > 0) {
      setPaneSizes(Array(count).fill(100 / count));
    } else {
      setPaneSizes([]);
    }
  }, [workspace.terminals.length, workspace.gridLayout]);

  // Filtered preset groups for quick spawning in workspace (strictly respecting visibleAgents)
  const visiblePresets = useMemo(() => {
    return ALL_PRESET_DEFINITIONS.filter((p) => (visibleAgents?.[p.id] ?? true));
  }, [visibleAgents]);

  const quickSpawnAiPresets = useMemo(() => visiblePresets.filter((p) => p.category === "ai"), [visiblePresets]);
  const quickSpawnDevPresets = useMemo(() => visiblePresets.filter((p) => p.category === "dev"), [visiblePresets]);
  const quickSpawnShellPresets = useMemo(() => visiblePresets.filter((p) => p.category === "shell"), [visiblePresets]);

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
      case "codex":
        spawnTerminal({
          title: "OpenAI Codex",
          appType: "codex",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "codex"],
          cwd: targetCwd,
        });
        break;
      case "grok":
        spawnTerminal({
          title: "xAI Grok Build",
          appType: "grok",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "grok"],
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
      case "antigravity":
        spawnTerminal({
          title: "Antigravity CLI",
          appType: "antigravity",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "agy"],
          cwd: targetCwd,
        });
        break;
      case "opencode":
        spawnTerminal({
          title: "OpenCode CLI",
          appType: "opencode",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "opencode"],
          cwd: targetCwd,
        });
        break;
      case "gemini":
        spawnTerminal({
          title: "Gemini CLI",
          appType: "gemini",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "gemini"],
          cwd: targetCwd,
        });
        break;
      case "copilot":
        spawnTerminal({
          title: "GitHub Copilot CLI",
          appType: "copilot",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "gh copilot suggest"],
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
      case "ollama":
        spawnTerminal({
          title: "Ollama CLI",
          appType: "ollama",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "ollama run llama3"],
          cwd: targetCwd,
        });
        break;
      case "node":
        spawnTerminal({
          title: "Node.js REPL",
          appType: "node",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "node"],
          cwd: targetCwd,
        });
        break;
      case "python":
        spawnTerminal({
          title: "Python REPL",
          appType: "python",
          shellOrCommand: "powershell.exe",
          args: ["-NoExit", "-Command", "python"],
          cwd: targetCwd,
        });
        break;
      case "gitbash":
        spawnTerminal({
          title: "Git Bash",
          appType: "gitbash",
          shellOrCommand: "bash.exe",
          cwd: targetCwd,
        });
        break;
      case "cmd":
        spawnTerminal({
          title: "Command Prompt",
          appType: "cmd",
          shellOrCommand: "cmd.exe",
          cwd: targetCwd,
        });
        break;
      case "wsl":
        spawnTerminal({
          title: "WSL Linux",
          appType: "wsl",
          shellOrCommand: "wsl.exe",
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
      case "codex":
        return <BrainCircuit size={13} className="text-emerald-400" />;
      case "grok":
        return <Rocket size={13} className="text-rose-400" />;
      case "claude":
        return <Bot size={13} className="text-orange-400" />;
      case "antigravity":
        return <Sparkles size={13} className="text-sage-light" />;
      case "opencode":
        return <Boxes size={13} className="text-cyan-400" />;
      case "gemini":
        return <Sparkles size={13} className="text-blue-400" />;
      case "copilot":
        return <Bot size={13} className="text-sky-400" />;
      case "kilo":
        return <Zap size={13} className="text-yellow-400" />;
      case "ollama":
        return <Server size={13} className="text-teal-400" />;
      case "node":
        return <Code2 size={13} className="text-emerald-400" />;
      case "python":
        return <Code2 size={13} className="text-yellow-300" />;
      case "gitbash":
        return <TermIcon size={13} className="text-amber-300" />;
      case "wsl":
        return <Layers size={13} className="text-sage" />;
      case "cmd":
        return <TermIcon size={13} className="text-slate-300" />;
      case "custom":
        return <Code2 size={13} className="text-purple-400" />;
      default:
        return <TermIcon size={13} className="text-sage" />;
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
        pinnedPresets={pinnedPresets}
        onOpenCustomizePresets={onUpdatePinnedPresets ? () => setIsCustomizeModalOpen(true) : undefined}
        visibleAgents={visibleAgents}
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
              <TermIcon size={36} className="text-sage" />
            </div>
            <h3>No Active Terminals in {workspace.name}</h3>
            <p>Launch an AI coding agent, system shell, or custom environment in this workspace.</p>

            <div className="empty-quick-actions">
              <button className="btn-primary" onClick={() => setIsLaunchModalOpen(true)}>
                <Plus size={15} />
                <span>Launch / Add</span>
              </button>

              <div className="custom-dropdown-container" ref={quickSpawnRef}>
                <button
                  type="button"
                  className={`btn-secondary custom-dropdown-trigger ${isQuickSpawnOpen ? "active" : ""}`}
                  onClick={() => setIsQuickSpawnOpen(!isQuickSpawnOpen)}
                >
                  <Sparkles size={15} className="text-sage-light" />
                  <span>Quick Spawn</span>
                  <ChevronDown size={14} className={`custom-dropdown-chevron ${isQuickSpawnOpen ? "open" : ""}`} />
                </button>

                {isQuickSpawnOpen && (
                  <div className="custom-dropdown-popup quick-spawn-popup animate-fade">
                    {quickSpawnAiPresets.length > 0 && (
                      <>
                        <div className="custom-dropdown-group-title">AI Coding Agents</div>
                        {quickSpawnAiPresets.map((preset) => {
                          const isInstalled = !!detectedAgents?.[preset.id];
                          return (
                            <div
                              key={preset.id}
                              className="custom-dropdown-item"
                              onClick={() => {
                                handleQuickSpawn(preset.id as TerminalData["appType"]);
                                setIsQuickSpawnOpen(false);
                              }}
                            >
                              <span className="custom-item-icon">{preset.icon(14)}</span>
                              <div className="custom-dropdown-item-text">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="custom-item-title">{preset.title}</span>
                                  {isInstalled && (
                                    <span className="installed-chip-small"><CheckCircle2 size={9} /> Installed</span>
                                  )}
                                </div>
                                <span className="custom-item-sub">{preset.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {quickSpawnDevPresets.length > 0 && (
                      <>
                        {quickSpawnAiPresets.length > 0 && <div className="custom-dropdown-divider" />}
                        <div className="custom-dropdown-group-title">Runtimes & Interpreters</div>
                        {quickSpawnDevPresets.map((preset) => {
                          const isInstalled = !!detectedAgents?.[preset.id];
                          return (
                            <div
                              key={preset.id}
                              className="custom-dropdown-item"
                              onClick={() => {
                                handleQuickSpawn(preset.id as TerminalData["appType"]);
                                setIsQuickSpawnOpen(false);
                              }}
                            >
                              <span className="custom-item-icon">{preset.icon(14)}</span>
                              <div className="custom-dropdown-item-text">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="custom-item-title">{preset.title}</span>
                                  {isInstalled && (
                                    <span className="installed-chip-small"><CheckCircle2 size={9} /> Installed</span>
                                  )}
                                </div>
                                <span className="custom-item-sub">{preset.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {quickSpawnShellPresets.length > 0 && (
                      <>
                        {(quickSpawnAiPresets.length > 0 || quickSpawnDevPresets.length > 0) && <div className="custom-dropdown-divider" />}
                        <div className="custom-dropdown-group-title">System Shells</div>
                        {quickSpawnShellPresets.map((preset) => {
                          const isInstalled = detectedAgents?.[preset.id] !== false;
                          return (
                            <div
                              key={preset.id}
                              className="custom-dropdown-item"
                              onClick={() => {
                                handleQuickSpawn(preset.id as TerminalData["appType"]);
                                setIsQuickSpawnOpen(false);
                              }}
                            >
                              <span className="custom-item-icon">{preset.icon(14)}</span>
                              <div className="custom-dropdown-item-text">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="custom-item-title">{preset.title}</span>
                                  {isInstalled && (
                                    <span className="installed-chip-small"><CheckCircle2 size={9} /> Ready</span>
                                  )}
                                </div>
                                <span className="custom-item-sub">{preset.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {onOpenSettings && (
                      <>
                        <div className="custom-dropdown-divider" />
                        <button
                          type="button"
                          className="custom-dropdown-settings-link"
                          onClick={() => {
                            setIsQuickSpawnOpen(false);
                            onOpenSettings();
                          }}
                        >
                          <SettingsIcon size={12} className="text-sage" />
                          <span>Configure Visible Tools in Settings</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="terminals-viewport-container">
            {(() => {
              const currentLayout = workspace.maximizedId ? "maximized" : workspace.gridLayout;
              const activeFocusId = workspace.maximizedId || workspace.focusedId || workspace.terminals[0]?.id;
              const termCount = workspace.terminals.length;

              const gridStyle: React.CSSProperties | undefined =
                currentLayout === "grid"
                  ? (() => {
                      if (termCount <= 1) return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" };
                      if (termCount === 2) return { gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "1fr" };
                      if (termCount <= 4) return { gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))" };
                      if (termCount <= 6) return { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))" };
                      if (termCount <= 8) return { gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: "repeat(2, minmax(0, 1fr))" };
                      if (termCount <= 9) return { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: "repeat(3, minmax(0, 1fr))" };
                      const cols = Math.ceil(Math.sqrt(termCount));
                      const rows = Math.ceil(termCount / cols);
                      return {
                        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                      };
                    })()
                  : undefined;

              return (
                <div 
                  className={`terminals-viewport-layout layout-${currentLayout} ${isDragging ? "dragging" : ""}`}
                  style={gridStyle}
                >
                  {workspace.terminals.map((term, index) => {
                    const isFocusHidden = (currentLayout === "focus" || currentLayout === "maximized") && term.id !== activeFocusId;
                    const paneFlex = (currentLayout === "side-by-side" || currentLayout === "stacked")
                      ? (paneSizes[index] ?? 1)
                      : undefined;
                    const isGridSpanned = currentLayout === "grid" && termCount === 3 && index === 2;

                    const paneStyle: React.CSSProperties = {
                      ...(paneFlex !== undefined ? { flex: paneFlex } : {}),
                      ...(isGridSpanned ? { gridColumn: "span 2" } : {}),
                    };

                    return (
                      <div
                        key={term.id}
                        className={`terminal-pane-wrapper ${isFocusHidden ? "focus-hidden" : ""}`}
                        style={Object.keys(paneStyle).length > 0 ? paneStyle : undefined}
                      >
                        <div className="pane-inner">
                          <TerminalSession
                            session={term}
                            isMaximized={Boolean(workspace.maximizedId)}
                            onMaximizeToggle={(id) => onUpdateWorkspace({
                              maximizedId: workspace.maximizedId === id ? null : id
                            })}
                            onClose={handleCloseTerminal}
                            onRestart={handleRestartTerminal}
                            onSessionActivity={handleSessionActivity}
                            availableWorkspaces={availableWorkspaces}
                            currentWorkspaceId={workspace.id}
                            onMoveToWorkspace={onMoveTerminal ? (termId: string, targetWsId: string | "new", switchNow: boolean) => onMoveTerminal(termId, workspace.id, targetWsId, switchNow) : undefined}
                          />
                        </div>

                        {/* Side-by-side column resizer */}
                        {currentLayout === "side-by-side" && index < workspace.terminals.length - 1 && (
                          <div
                            className="pane-resizer-col"
                            onMouseDown={(e) => handleStartResize(index, "col", e)}
                            onDoubleClick={handleResetPaneSizes}
                            title="Drag to resize columns (double-click to reset sizes)"
                          />
                        )}

                        {/* Stacked row resizer */}
                        {currentLayout === "stacked" && index < workspace.terminals.length - 1 && (
                          <div
                            className="pane-resizer-row"
                            onMouseDown={(e) => handleStartResize(index, "row", e)}
                            onDoubleClick={handleResetPaneSizes}
                            title="Drag to resize rows (double-click to reset sizes)"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
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
        visibleAgents={visibleAgents}
        detectedAgents={detectedAgents}
        onOpenSettings={onOpenSettings}
      />

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        terminalCount={workspace.terminals.length}
        onClose={() => setIsBroadcastModalOpen(false)}
        onBroadcast={handleBroadcast}
      />

      {/* Customize Pinned Presets Modal */}
      {onUpdatePinnedPresets && (
        <CustomizePresetsModal
          isOpen={isCustomizeModalOpen}
          onClose={() => setIsCustomizeModalOpen(false)}
          pinnedPresets={pinnedPresets || DEFAULT_PINNED_PRESETS}
          onSavePinnedPresets={onUpdatePinnedPresets}
          detectedAgents={detectedAgents}
          visibleAgents={visibleAgents}
        />
      )}
    </div>
  );
}
