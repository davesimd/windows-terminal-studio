import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Home, 
  BarChart3, 
  Settings, 
  Zap, 
  Plus, 
  Edit2, 
  Edit3,
  Trash2, 
  Check, 
  Folder
} from "lucide-react";
import HomePage from "./pages/HomePage";
import WorkspacePage from "./pages/WorkspacePage";
import ScratchpadPage from "./pages/ScratchpadPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import LaunchAppModal from "./components/terminal/LaunchAppModal";
import { TerminalData } from "./components/terminal/TerminalSession";
import { disposeTerminalInstance } from "./components/terminal/XTermInstance";
import { WorkspaceData, ClosedWorkspaceData, WorkspaceActivityState } from "./types/workspace";
import { HistoricalSession, AppType } from "./types/analytics";
import { AppSettings, DEFAULT_APP_SETTINGS, DEFAULT_DIRECTORY_TEMPLATES, DEFAULT_VISIBLE_AGENTS } from "./types/settings";
import { ScratchpadItem, DeletedScratchpadItem, INITIAL_SCRATCHPAD } from "./types/scratchpad";
import { ALL_PRESET_DEFINITIONS } from "./constants/presets";
import "./App.css";

type NavTab = "home" | "workspace" | "scratchpad" | "analytics" | "settings";

const STORAGE_KEYS = {
  SETTINGS: "desktop_studio_settings_v1",
  WORKSPACES: "desktop_studio_workspaces_v1",
  CLOSED_WORKSPACES: "desktop_studio_closed_workspaces_v1",
  TELEMETRY: "desktop_studio_telemetry_v1",
  ACTIVE_WS: "desktop_studio_active_ws_v1",
  SCRATCHPADS: "desktop_studio_scratchpads_v1",
  DELETED_SCRATCHPADS: "desktop_studio_deleted_scratchpads_v1",
  ACTIVE_PAD: "desktop_studio_active_pad_v1",
};

const INITIAL_WORKSPACES: WorkspaceData[] = [
  {
    id: "ws_default",
    name: "Main Workspace",
    terminals: [],
    gridLayout: "side-by-side",
    focusedId: null,
    maximizedId: null,
    createdAt: Date.now(),
  },
];

export default function App() {
  // Load initial settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const templates = (parsed.directoryTemplates || DEFAULT_DIRECTORY_TEMPLATES).filter(
          (t: any) => t.id !== "tmpl_projects" && t.id !== "tmpl_repos"
        );
        return {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          directoryTemplates: templates.length > 0 ? templates : DEFAULT_DIRECTORY_TEMPLATES,
          pinnedQuickPresets: Array.isArray(parsed.pinnedQuickPresets) ? parsed.pinnedQuickPresets : DEFAULT_APP_SETTINGS.pinnedQuickPresets,
          visibleAgents: parsed.visibleAgents || DEFAULT_VISIBLE_AGENTS,
          detectedAgents: parsed.detectedAgents || {},
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_APP_SETTINGS;
  });

  const [activeNav, setActiveNav] = useState<NavTab>("home");

  // Auto-detect installed CLI tools & AI agents on boot
  useEffect(() => {
    const runToolDetection = async () => {
      try {
        const results = await invoke<Record<string, boolean>>("detect_installed_tools");
        if (results && typeof results === "object") {
          setSettings((prev) => {
            const hasExisting = prev.visibleAgents && Object.keys(prev.visibleAgents).length > 0;
            const updatedVisible = { ...(prev.visibleAgents || DEFAULT_VISIBLE_AGENTS) };

            // If auto-detect is enabled or first boot, initialize/sync visibility with detection
            if (!hasExisting || prev.autoDetectAgentsOnBoot !== false) {
              for (const [id, isInstalled] of Object.entries(results)) {
                if (id === "powershell" || id === "cmd" || id === "wsl" || id === "gitbash") {
                  if (updatedVisible[id] === undefined) updatedVisible[id] = true;
                } else if (!hasExisting) {
                  // First run: set AI agent visibility to detected status
                  updatedVisible[id] = isInstalled;
                } else if (prev.autoDetectAgentsOnBoot !== false) {
                  // If newly detected on system PATH and was previously undefined, enable it
                  if (isInstalled && updatedVisible[id] === undefined) {
                    updatedVisible[id] = true;
                  }
                }
              }
            }

            return {
              ...prev,
              detectedAgents: results,
              visibleAgents: updatedVisible,
            };
          });
        }
      } catch (err) {
        console.warn("Tool detection not available (non-Tauri or error):", err);
      }
    };

    runToolDetection();
  }, []);

  // Load initial workspaces from localStorage
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const appSettings: AppSettings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_APP_SETTINGS;

      if (appSettings.autoRestoreWorkspaces) {
        const savedWs = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
        if (savedWs) {
          const parsed: WorkspaceData[] = JSON.parse(savedWs);
          if (parsed && parsed.length > 0) {
            if (!appSettings.restoreTerminalsOnLaunch) {
              return parsed.map((w) => ({ ...w, terminals: [] }));
            }
            return parsed;
          }
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_WORKSPACES;
  });

  // Load closed workspaces history (ignoring empty workspaces with no terminals)
  const [closedWorkspaces, setClosedWorkspaces] = useState<ClosedWorkspaceData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLOSED_WORKSPACES);
      if (saved) {
        const parsed: ClosedWorkspaceData[] = JSON.parse(saved);
        return parsed.filter((w) => w.terminals && w.terminals.length > 0);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_WS);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return "ws_default";
  });

  // Home modal trigger state for custom process
  const [homeLaunchModalWsId, setHomeLaunchModalWsId] = useState<string | null>(null);


  // Load initial session history
  const [sessionHistory, setSessionHistory] = useState<HistoricalSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TELEMETRY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Load initial scratchpads from localStorage
  const [scratchpads, setScratchpads] = useState<ScratchpadItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCRATCHPADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [INITIAL_SCRATCHPAD];
  });

  const [activePadId, setActivePadId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_PAD);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return INITIAL_SCRATCHPAD.id;
  });

  // Load deleted scratchpads history from localStorage
  const [deletedScratchpads, setDeletedScratchpads] = useState<DeletedScratchpadItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DELETED_SCRATCHPADS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  
  // Tick to refresh idle/active status transitions and durations
  const [, setTick] = useState(0);

  // Inline renaming state for sidebar
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState<string>("");

  const isInitialMount = useRef(true);

  // Periodic ticker for live timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save workspaces to persistent storage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (settings.autoRestoreWorkspaces) {
      try {
        localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(workspaces));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_WS, activeWorkspaceId);
      } catch (err) {
        console.error("Failed to save workspaces to localStorage:", err);
      }
    }
  }, [workspaces, activeWorkspaceId, settings.autoRestoreWorkspaces]);

  // Save settings to persistent storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }, [settings]);

  // Synchronize dynamic application theme (Sage vs Gold)
  useEffect(() => {
    const currentTheme = settings.theme || "sage";
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [settings.theme]);

  // Save closed workspaces history to persistent storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOSED_WORKSPACES, JSON.stringify(closedWorkspaces));
    } catch (err) {
      console.error("Failed to save closed workspaces:", err);
    }
  }, [closedWorkspaces]);

  // Save telemetry history to persistent storage
  useEffect(() => {
    if (settings.persistAnalyticsHistory) {
      try {
        localStorage.setItem(STORAGE_KEYS.TELEMETRY, JSON.stringify(sessionHistory));
      } catch (err) {
        console.error("Failed to save telemetry:", err);
      }
    }
  }, [sessionHistory, settings.persistAnalyticsHistory]);

  // Save scratchpads to persistent storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCRATCHPADS, JSON.stringify(scratchpads));
      localStorage.setItem(STORAGE_KEYS.DELETED_SCRATCHPADS, JSON.stringify(deletedScratchpads));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PAD, activePadId);
    } catch (err) {
      console.error("Failed to save scratchpads:", err);
    }
  }, [scratchpads, deletedScratchpads, activePadId]);

  // Scratchpad CRUD Handlers
  const handleCreateScratchpad = () => {
    const newIndex = scratchpads.length + 1;
    const newPad: ScratchpadItem = {
      id: `pad_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `Prompt Draft ${newIndex}`,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setScratchpads((prev) => [newPad, ...prev]);
    setActivePadId(newPad.id);
  };

  const handleUpdateScratchpad = (id: string, patch: Partial<ScratchpadItem>) => {
    setScratchpads((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p))
    );
  };

  const handleDeleteScratchpad = (id: string) => {
    const target = scratchpads.find((p) => p.id === id);
    if (target) {
      const deletedEntry: DeletedScratchpadItem = {
        ...target,
        deletedAt: Date.now(),
      };
      setDeletedScratchpads((prev) => [deletedEntry, ...prev.filter((p) => p.id !== id)]);
    }

    setScratchpads((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const freshPad: ScratchpadItem = {
          id: `pad_${Date.now()}`,
          title: "Prompt Draft 1",
          content: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setActivePadId(freshPad.id);
        return [freshPad];
      }
      if (activePadId === id && remaining.length > 0) {
        setActivePadId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRestoreScratchpad = (id: string) => {
    const target = deletedScratchpads.find((p) => p.id === id);
    if (!target) return;
    const { deletedAt, ...restoredPad } = target;
    setScratchpads((prev) => [restoredPad, ...prev.filter((p) => p.id !== restoredPad.id)]);
    setActivePadId(restoredPad.id);
    setDeletedScratchpads((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePermanentDeleteScratchpad = (id: string) => {
    setDeletedScratchpads((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearDeletedScratchpads = () => {
    setDeletedScratchpads([]);
  };

  const handleDuplicateScratchpad = (id: string) => {
    const source = scratchpads.find((p) => p.id === id);
    if (!source) return;
    const duplicated: ScratchpadItem = {
      ...source,
      id: `pad_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `${source.title} (Copy)`,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setScratchpads((prev) => [duplicated, ...prev]);
    setActivePadId(duplicated.id);
  };

  // Launch agent from scratchpad with prompt and readiness check
  const handleSpawnAgentFromScratchpad = (config: {
    agentType: AppType;
    prompt: string;
    targetWorkspaceId: string | "new";
    newWorkspaceName?: string;
    autoSend: boolean;
    cwd?: string;
  }) => {
    // Copy prompt to clipboard so it's always immediately accessible
    try {
      navigator.clipboard.writeText(config.prompt);
    } catch {
      // ignore
    }

    const preset = ALL_PRESET_DEFINITIONS.find((p) => p.id === config.agentType);
    const title = preset ? preset.shortTitle : config.agentType;
    const shell = preset ? preset.commandName : `${config.agentType}.exe`;

    const targetWs =
      config.targetWorkspaceId !== "new"
        ? workspaces.find((w) => w.id === config.targetWorkspaceId)
        : null;

    const cwdToUse = config.cwd?.trim() || targetWs?.defaultCwd || settings.defaultCwd || "";

    const newTermId = `term_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTerm: TerminalData = {
      id: newTermId,
      title: `${title} (Agent)`,
      appType: config.agentType,
      shellOrCommand: shell,
      cwd: cwdToUse || undefined,
      initialPrompt: config.prompt,
      autoSendPrompt: config.autoSend !== false,
      status: "running",
      startedAt: Date.now(),
      outputChunksCount: 0,
    };

    let destinationWsId = config.targetWorkspaceId;

    if (config.targetWorkspaceId === "new") {
      const newWsId = `ws_${Date.now()}`;
      destinationWsId = newWsId;
      const wsName = config.newWorkspaceName || `Workspace ${workspaces.length + 1}`;

      const newWs: WorkspaceData = {
        id: newWsId,
        name: wsName,
        terminals: [newTerm],
        gridLayout: settings.defaultLayout || "side-by-side",
        focusedId: newTerm.id,
        maximizedId: null,
        createdAt: Date.now(),
      };

      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWsId);
      setActiveNav("workspace");
    } else {
      const targetWs = workspaces.find((w) => w.id === config.targetWorkspaceId) || workspaces[0];
      if (targetWs) {
        destinationWsId = targetWs.id;
        handleUpdateWorkspaceById(targetWs.id, (prev) => ({
          ...prev,
          terminals: [...prev.terminals, newTerm],
          focusedId: newTerm.id,
        }));
        setActiveWorkspaceId(targetWs.id);
        setActiveNav("workspace");
      }
    }

    handleLogSessionStart({
      id: newTerm.id,
      workspaceId: destinationWsId,
      workspaceName:
        config.targetWorkspaceId === "new"
          ? config.newWorkspaceName || `Workspace ${workspaces.length + 1}`
          : workspaces.find((w) => w.id === destinationWsId)?.name || "Workspace",
      title: newTerm.title,
      appType: newTerm.appType,
      shellOrCommand: newTerm.shellOrCommand,
      cwd: newTerm.cwd || "",
      startedAt: newTerm.startedAt!,
      status: "running",
      outputChunksCount: 0,
    });
  };

  // Helper to compute workspace activity state
  const getWorkspaceActivityState = (ws: WorkspaceData): WorkspaceActivityState => {
    if (ws.terminals.length === 0) return "empty";
    const now = Date.now();
    const hasActive = ws.terminals.some(
      (t) => t.lastActiveAt && now - t.lastActiveAt < 3500
    );
    return hasActive ? "active" : "idle";
  };

  // Add a new workspace
  const handleAddWorkspace = () => {
    const newIndex = workspaces.length + 1;
    const newWs: WorkspaceData = {
      id: `ws_${Date.now()}`,
      name: `Workspace ${newIndex}`,
      terminals: [],
      gridLayout: settings.defaultLayout || "side-by-side",
      focusedId: null,
      maximizedId: null,
      createdAt: Date.now(),
    };

    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
    setActiveNav("workspace");
  };

  // Delete a workspace and record in closedWorkspaces only if it had terminals
  const handleDeleteWorkspace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (workspaces.length <= 1) return; // Keep at least one

    const targetWs = workspaces.find((w) => w.id === id);
    if (targetWs) {
      targetWs.terminals.forEach((t) => {
        disposeTerminalInstance(t.id);
        invoke("kill_terminal", { id: t.id }).catch(() => {});
        handleLogSessionEnd(t.id);
      });
      
      // Only record into history if the workspace had at least one terminal
      if (targetWs.terminals.length > 0) {
        const closedEntry: ClosedWorkspaceData = {
          id: targetWs.id,
          name: targetWs.name,
          defaultCwd: targetWs.defaultCwd,
          terminals: targetWs.terminals,
          gridLayout: targetWs.gridLayout,
          createdAt: targetWs.createdAt,
          closedAt: Date.now(),
        };
        setClosedWorkspaces((prev) => [closedEntry, ...prev.filter((w) => w.id !== id)]);
      }
    }

    setWorkspaces((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Reopen a previously closed workspace
  const handleReopenWorkspace = (closedWs: ClosedWorkspaceData) => {
    const restoredId = `ws_${Date.now()}`;
    const restoredWs: WorkspaceData = {
      id: restoredId,
      name: closedWs.name,
      defaultCwd: closedWs.defaultCwd,
      terminals: closedWs.terminals.map((t) => ({
        ...t,
        id: `term_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        status: "running",
        startedAt: Date.now(),
        outputChunksCount: 0,
      })),
      gridLayout: closedWs.gridLayout,
      focusedId: null,
      maximizedId: null,
      createdAt: Date.now(),
    };

    // Log newly spawned sessions to telemetry
    restoredWs.terminals.forEach((term) => {
      handleLogSessionStart({
        id: term.id,
        workspaceId: restoredWs.id,
        workspaceName: restoredWs.name,
        title: term.title,
        appType: term.appType,
        shellOrCommand: term.shellOrCommand,
        cwd: term.cwd,
        startedAt: term.startedAt!,
        status: "running",
        outputChunksCount: 0,
      });
    });

    setWorkspaces((prev) => [...prev, restoredWs]);
    setActiveWorkspaceId(restoredWs.id);
    setClosedWorkspaces((prev) => prev.filter((w) => w.id !== closedWs.id));
    setActiveNav("workspace");
  };

  // Resume an individual session into active workspace
  const handleResumeSession = (session: HistoricalSession) => {
    let targetWs = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!targetWs && workspaces.length > 0) {
      targetWs = workspaces[0];
    }

    const newTermId = `term_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTerm: TerminalData = {
      id: newTermId,
      title: session.title,
      appType: session.appType,
      shellOrCommand: session.shellOrCommand,
      cwd: session.cwd,
      status: "running",
      startedAt: Date.now(),
      outputChunksCount: 0,
    };

    if (targetWs) {
      handleUpdateWorkspaceById(targetWs.id, (prev) => ({
        ...prev,
        terminals: [...prev.terminals, newTerm],
        focusedId: newTerm.id,
      }));
      setActiveWorkspaceId(targetWs.id);
    } else {
      const newWs: WorkspaceData = {
        id: `ws_${Date.now()}`,
        name: "Workspace 1",
        terminals: [newTerm],
        gridLayout: settings.defaultLayout || "side-by-side",
        focusedId: newTerm.id,
        maximizedId: null,
        createdAt: Date.now(),
      };
      setWorkspaces([newWs]);
      setActiveWorkspaceId(newWs.id);
    }

    handleLogSessionStart({
      id: newTerm.id,
      workspaceId: targetWs ? targetWs.id : `ws_${Date.now()}`,
      workspaceName: targetWs ? targetWs.name : "Workspace 1",
      title: newTerm.title,
      appType: newTerm.appType,
      shellOrCommand: newTerm.shellOrCommand,
      cwd: newTerm.cwd,
      startedAt: newTerm.startedAt!,
      status: "running",
      outputChunksCount: 0,
    });

    setActiveNav("workspace");
  };

  // Launch terminal from Instant Launchpad on Home
  const handleLaunchTerminalFromHome = (config: Omit<TerminalData, "id" | "status">) => {
    let targetWs = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!targetWs && workspaces.length > 0) {
      targetWs = workspaces[0];
    }

    const newTermId = `term_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTerm: TerminalData = {
      ...config,
      id: newTermId,
      status: "running",
      startedAt: Date.now(),
      outputChunksCount: 0,
    };

    if (targetWs) {
      handleUpdateWorkspaceById(targetWs.id, (prev) => ({
        ...prev,
        terminals: [...prev.terminals, newTerm],
        focusedId: newTerm.id,
      }));
      setActiveWorkspaceId(targetWs.id);
    } else {
      const newWs: WorkspaceData = {
        id: `ws_${Date.now()}`,
        name: "Workspace 1",
        terminals: [newTerm],
        gridLayout: settings.defaultLayout || "side-by-side",
        focusedId: newTerm.id,
        maximizedId: null,
        createdAt: Date.now(),
      };
      setWorkspaces([newWs]);
      setActiveWorkspaceId(newWs.id);
    }

    handleLogSessionStart({
      id: newTerm.id,
      workspaceId: targetWs ? targetWs.id : `ws_${Date.now()}`,
      workspaceName: targetWs ? targetWs.name : "Workspace 1",
      title: newTerm.title,
      appType: newTerm.appType,
      shellOrCommand: newTerm.shellOrCommand,
      cwd: newTerm.cwd,
      startedAt: newTerm.startedAt!,
      status: "running",
      outputChunksCount: 0,
    });

    setActiveNav("workspace");
  };

  // Delete a closed workspace entry
  const handleDeleteClosedWorkspace = (id: string) => {
    setClosedWorkspaces((prev) => prev.filter((w) => w.id !== id));
  };

  // Clear all closed workspace entries
  const handleClearClosedWorkspaces = () => {
    setClosedWorkspaces([]);
  };

  // Start inline rename
  const handleStartRename = (e: React.MouseEvent, ws: WorkspaceData) => {
    e.stopPropagation();
    setEditingWsId(ws.id);
    setEditNameInput(ws.name);
  };

  // Save inline rename
  const handleSaveRename = (id: string) => {
    if (editNameInput.trim()) {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: editNameInput.trim() } : w))
      );
    }
    setEditingWsId(null);
  };

  // Update a specific workspace by ID (supports partial object or functional updater)
  const handleUpdateWorkspaceById = (
    wsId: string,
    updater: Partial<WorkspaceData> | ((prev: WorkspaceData) => WorkspaceData)
  ) => {
    setWorkspaces((prev) =>
      prev.map((w) => {
        if (w.id !== wsId) return w;
        if (typeof updater === "function") {
          return updater(w);
        }
        return { ...w, ...updater };
      })
    );
  };

  // Move a terminal from one workspace to another (or to a newly created workspace)
  // Preserves the exact running terminal state, process, and output buffer seamlessly
  const handleMoveTerminal = (
    terminalId: string,
    sourceWsId: string,
    targetWsId: string | "new",
    switchNow: boolean = false
  ) => {
    const sourceWs = workspaces.find((w) => w.id === sourceWsId);
    if (!sourceWs) return;
    const terminalToMove = sourceWs.terminals.find((t) => t.id === terminalId);
    if (!terminalToMove) return;

    let destinationWsId = targetWsId;

    if (targetWsId === "new") {
      const newIndex = workspaces.length + 1;
      const newWsId = `ws_${Date.now()}`;
      destinationWsId = newWsId;

      const newWs: WorkspaceData = {
        id: newWsId,
        name: `Workspace ${newIndex}`,
        terminals: [terminalToMove],
        gridLayout: settings.defaultLayout || "side-by-side",
        focusedId: terminalToMove.id,
        maximizedId: null,
        createdAt: Date.now(),
      };

      setWorkspaces((prev) => [
        ...prev.map((w) => {
          if (w.id === sourceWsId) {
            const remaining = w.terminals.filter((t) => t.id !== terminalId);
            return {
              ...w,
              terminals: remaining,
              focusedId: w.focusedId === terminalId ? (remaining[0]?.id || null) : w.focusedId,
              maximizedId: w.maximizedId === terminalId ? null : w.maximizedId,
            };
          }
          return w;
        }),
        newWs,
      ]);
    } else {
      setWorkspaces((prev) =>
        prev.map((w) => {
          if (w.id === sourceWsId) {
            const remaining = w.terminals.filter((t) => t.id !== terminalId);
            return {
              ...w,
              terminals: remaining,
              focusedId: w.focusedId === terminalId ? (remaining[0]?.id || null) : w.focusedId,
              maximizedId: w.maximizedId === terminalId ? null : w.maximizedId,
            };
          }
          if (w.id === destinationWsId) {
            return {
              ...w,
              terminals: [...w.terminals, terminalToMove],
              focusedId: terminalToMove.id,
            };
          }
          return w;
        })
      );
    }

    // Telemetry: Update workspace association for the persistent terminal session
    setSessionHistory((prev) =>
      prev.map((s) => {
        if (s.id === terminalId) {
          const targetWs = workspaces.find((w) => w.id === destinationWsId);
          return {
            ...s,
            workspaceId: destinationWsId,
            workspaceName: targetWs?.name || (targetWsId === "new" ? `Workspace ${workspaces.length + 1}` : s.workspaceName),
          };
        }
        return s;
      })
    );

    if (switchNow) {
      setActiveWorkspaceId(destinationWsId);
      setActiveNav("workspace");
    }
  };

  // Update settings
  const handleUpdateSettings = (updated: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  // Telemetry session logging
  const handleLogSessionStart = (session: HistoricalSession) => {
    setSessionHistory((prev) => {
      const exists = prev.some((s) => s.id === session.id);
      if (exists) return prev;
      return [session, ...prev];
    });
  };

  const handleLogSessionEnd = (id: string) => {
    setSessionHistory((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const ended = Date.now();
          return {
            ...s,
            endedAt: ended,
            durationSeconds: (ended - s.startedAt) / 1000,
            status: "exited" as const,
          };
        }
        return s;
      })
    );
  };

  // Save a new directory template into settings
  const handleSaveDirectoryTemplate = (name: string, path: string) => {
    const newTmpl = {
      id: `tmpl_${Date.now()}`,
      name,
      path,
    };
    setSettings((prev) => ({
      ...prev,
      directoryTemplates: [...(prev.directoryTemplates || []), newTmpl],
    }));
  };

  // Save pinned quick presets into settings
  const handleUpdatePinnedPresets = (pinned: AppSettings["pinnedQuickPresets"]) => {
    setSettings((prev) => ({
      ...prev,
      pinnedQuickPresets: pinned,
    }));
  };

  const handleClearHistory = () => {
    const activeIds = new Set<string>();
    workspaces.forEach((w) => w.terminals.forEach((t) => activeIds.add(t.id)));
    setSessionHistory((prev) => prev.filter((s) => activeIds.has(s.id)));
  };

  // Reset all workspaces and local storage to defaults
  const handleResetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEYS.WORKSPACES);
    localStorage.removeItem(STORAGE_KEYS.CLOSED_WORKSPACES);
    localStorage.removeItem(STORAGE_KEYS.TELEMETRY);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_WS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    setSettings(DEFAULT_APP_SETTINGS);
    setWorkspaces(INITIAL_WORKSPACES);
    setClosedWorkspaces([]);
    setActiveWorkspaceId("ws_default");
    setSessionHistory([]);
  };

  // Global counts
  const totalActiveTerminals = workspaces.reduce((sum, w) => sum + w.terminals.length, 0);
  const totalActiveWorkspaces = workspaces.filter(
    (w) => getWorkspaceActivityState(w) === "active"
  ).length;

  return (
    <div className="desktop-app">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">
            <Zap size={16} />
          </div>
          <span className="brand-title">Desktop Studio</span>
        </div>

        <div className="header-status">
          <span
            className={`pulse-indicator ${
              totalActiveWorkspaces > 0 ? "active-streaming" : "idle"
            }`}
          ></span>
          <span className="status-text">
            {workspaces.length} Workspaces • {totalActiveTerminals} Terminals ({totalActiveWorkspaces > 0 ? `${totalActiveWorkspaces} Active` : "All Idle"})
          </span>
        </div>
      </header>

      {/* Main Body */}
      <div className="app-body">
        {/* Left Navigation Sidebar */}
        <aside className="app-sidebar">
          {/* Section 1: Overview & General */}
          <div className="sidebar-section-container">
            <div className="sidebar-group">
              <span className="nav-group-label">Overview</span>
              <nav className="nav-group-items">
                <button 
                  className={`nav-item ${activeNav === "home" ? "active" : ""}`}
                  onClick={() => setActiveNav("home")}
                >
                  <Home size={16} />
                  <span>Home</span>
                </button>
                <button 
                  className={`nav-item ${activeNav === "analytics" ? "active" : ""}`}
                  onClick={() => setActiveNav("analytics")}
                >
                  <BarChart3 size={16} />
                  <span>Analytics</span>
                </button>
              </nav>
            </div>

            {/* Section 2: Work Tools */}
            <div className="sidebar-group">
              <span className="nav-group-label">Work Tools</span>
              <nav className="nav-group-items">
                <button 
                  className={`nav-item ${activeNav === "scratchpad" ? "active" : ""}`}
                  onClick={() => setActiveNav("scratchpad")}
                >
                  <Edit3 size={16} />
                  <span>Scratchpad</span>
                  <span className="sidebar-pad-pill" title={`${scratchpads.length} scratchpad${scratchpads.length > 1 ? "s" : ""}`}>
                    {scratchpads.length}
                  </span>
                </button>
              </nav>
            </div>

            {/* Section 2: Workspaces Hub */}
            <div className="sidebar-group">
              <div className="nav-section-header">
                <span className="nav-group-label">Workspaces</span>
                <button
                  className="btn-add-sidebar"
                  title="Add new workspace"
                  onClick={handleAddWorkspace}
                >
                  <Plus size={13} />
                </button>
              </div>

              <div className="workspaces-list">
                {workspaces.map((ws) => {
                  const isActive = activeNav === "workspace" && activeWorkspaceId === ws.id;
                  const isEditing = editingWsId === ws.id;
                  const activityState = getWorkspaceActivityState(ws);

                  return (
                    <div
                      key={ws.id}
                      className={`ws-sidebar-item ${isActive ? "active" : ""} ${activityState}`}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setActiveNav("workspace");
                      }}
                    >
                      <div className="ws-item-left">
                        {/* State Dot Wrapper (prevents glow clipping) */}
                        <div className="ws-status-dot-wrapper">
                          <span 
                            className={`ws-status-dot ${activityState}`}
                            title={`Status: ${activityState}`}
                          />
                        </div>

                        <Folder size={15} className={isActive ? "text-sage" : "text-slate-400"} />

                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            className="ws-inline-input"
                            value={editNameInput}
                            onChange={(e) => setEditNameInput(e.target.value)}
                            onBlur={() => handleSaveRename(ws.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(ws.id);
                              if (e.key === "Escape") setEditingWsId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="ws-name" title={ws.name}>
                            {ws.name}
                          </span>
                        )}
                      </div>

                      {/* Right actions / badge */}
                      <div className="ws-item-right">
                        {isEditing ? (
                          <button
                            className="ws-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveRename(ws.id);
                            }}
                          >
                            <Check size={13} className="text-green" />
                          </button>
                        ) : (
                          <>
                            {/* Activity State Badge / Terminal Count */}
                            {ws.terminals.length > 0 && (
                              <span 
                                className={`ws-term-count ${activityState}`} 
                                title={`${ws.terminals.length} terminal${ws.terminals.length > 1 ? "s" : ""} (${activityState})`}
                              >
                                {ws.terminals.length}
                              </span>
                            )}

                            <div className="ws-hover-actions">
                              <button
                                className="ws-action-icon-btn"
                                title="Rename workspace"
                                onClick={(e) => handleStartRename(e, ws)}
                              >
                                <Edit2 size={12} />
                              </button>

                              {workspaces.length > 1 && (
                                <button
                                  className="ws-action-icon-btn delete"
                                  title="Delete workspace"
                                  onClick={(e) => handleDeleteWorkspace(e, ws.id)}
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="btn-new-ws-bottom" onClick={handleAddWorkspace}>
                <Plus size={13} />
                <span>New Workspace</span>
              </button>
            </div>
          </div>

          {/* Section 3: Dedicated Preferences & System Section */}
          <div className="sidebar-bottom-section">
            <span className="nav-group-label">Preferences</span>
            <button 
              className={`nav-item settings-item ${activeNav === "settings" ? "active" : ""}`}
              onClick={() => setActiveNav("settings")}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>

            <div className="sidebar-system-pill">
              <span className="sys-dot"></span>
              <span>Windows Host v0.1.0</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="app-main">
          <div className={`page-view-layer ${activeNav === "home" ? "active" : ""}`}>
            {activeNav === "home" && (
              <HomePage
                workspaces={workspaces}
                closedWorkspaces={closedWorkspaces}
                sessionHistory={sessionHistory}
                onNavigateToWorkspace={(wsId) => {
                  setActiveWorkspaceId(wsId);
                  setActiveNav("workspace");
                }}
                onNewWorkspace={handleAddWorkspace}
                onLaunchTerminal={handleLaunchTerminalFromHome}
                onOpenCustomLaunchModal={(wsId) => {
                  setHomeLaunchModalWsId(wsId || activeWorkspaceId);
                }}
                onReopenWorkspace={handleReopenWorkspace}
                onResumeSession={handleResumeSession}
                onDeleteClosedWorkspace={handleDeleteClosedWorkspace}
                onClearClosedWorkspaces={handleClearClosedWorkspaces}
                onClearSessionHistory={handleClearHistory}
                directoryTemplates={settings.directoryTemplates || []}
                defaultCwd={settings.defaultCwd || ""}
                visibleAgents={settings.visibleAgents}
                detectedAgents={settings.detectedAgents}
                onOpenSettings={() => setActiveNav("settings")}
              />
            )}
          </div>

          {/* Workspaces: Maintained with display toggles so running PTY sessions stay alive when switching between workspaces */}
          {workspaces.map((ws) => {
            const isVisible = activeNav === "workspace" && ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                className={`workspace-view-layer ${isVisible ? "active" : ""}`}
                style={{
                  display: isVisible ? "flex" : "none",
                  width: "100%",
                  height: "100%",
                  flexDirection: "column",
                  flex: 1,
                }}
              >
                <WorkspacePage
                  workspace={ws}
                  onUpdateWorkspace={(updated) => handleUpdateWorkspaceById(ws.id, updated)}
                  onRenameWorkspace={(newName) => handleUpdateWorkspaceById(ws.id, { name: newName })}
                  onLogSessionStart={handleLogSessionStart}
                  onLogSessionEnd={handleLogSessionEnd}
                  directoryTemplates={settings.directoryTemplates || []}
                  defaultCwd={settings.defaultCwd || ""}
                  onSaveDirectoryTemplate={handleSaveDirectoryTemplate}
                  pinnedPresets={settings.pinnedQuickPresets ?? DEFAULT_APP_SETTINGS.pinnedQuickPresets}
                  onUpdatePinnedPresets={handleUpdatePinnedPresets}
                  availableWorkspaces={workspaces.map((w) => ({
                    id: w.id,
                    name: w.name,
                    terminalCount: w.terminals.length,
                  }))}
                  onMoveTerminal={handleMoveTerminal}
                  visibleAgents={settings.visibleAgents}
                  detectedAgents={settings.detectedAgents}
                  onOpenSettings={() => setActiveNav("settings")}
                />
              </div>
            );
          })}

          <div className={`page-view-layer ${activeNav === "scratchpad" ? "active" : ""}`}>
            {activeNav === "scratchpad" && (
              <ScratchpadPage
                scratchpads={scratchpads}
                activePadId={activePadId}
                onSelectPad={setActivePadId}
                onCreatePad={handleCreateScratchpad}
                onUpdatePad={handleUpdateScratchpad}
                onDeletePad={handleDeleteScratchpad}
                onDuplicatePad={handleDuplicateScratchpad}
                deletedScratchpads={deletedScratchpads}
                onRestorePad={handleRestoreScratchpad}
                onPermanentDeletePad={handlePermanentDeleteScratchpad}
                onClearDeletedPads={handleClearDeletedScratchpads}
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                onSpawnAgent={handleSpawnAgentFromScratchpad}
                directoryTemplates={settings.directoryTemplates || []}
                defaultCwd={settings.defaultCwd || ""}
                visibleAgents={settings.visibleAgents}
              />
            )}
          </div>

          <div className={`page-view-layer ${activeNav === "analytics" ? "active" : ""}`}>
            {activeNav === "analytics" && (
              <AnalyticsPage
                workspaces={workspaces}
                sessionHistory={sessionHistory}
                onNavigateToWorkspace={(wsId) => {
                  setActiveWorkspaceId(wsId);
                  setActiveNav("workspace");
                }}
                onClearHistory={handleClearHistory}
              />
            )}
          </div>

          <div className={`page-view-layer ${activeNav === "settings" ? "active" : ""}`}>
            {activeNav === "settings" && (
              <SettingsPage
                settings={settings}
                workspaces={workspaces}
                onUpdateSettings={handleUpdateSettings}
                onRestoreWorkspaces={(imported) => {
                  setWorkspaces(imported);
                  if (imported.length > 0) setActiveWorkspaceId(imported[0].id);
                }}
                onResetToDefaults={handleResetToDefaults}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Launch Modal for Home Custom Process Launcher */}
      <LaunchAppModal
        isOpen={homeLaunchModalWsId !== null}
        onClose={() => setHomeLaunchModalWsId(null)}
        directoryTemplates={settings.directoryTemplates || []}
        defaultCwd={settings.defaultCwd || ""}
        onSaveTemplate={handleSaveDirectoryTemplate}
        visibleAgents={settings.visibleAgents}
        detectedAgents={settings.detectedAgents}
        onOpenSettings={() => {
          setHomeLaunchModalWsId(null);
          setActiveNav("settings");
        }}
        onLaunch={(config) => {
          if (homeLaunchModalWsId) {
            setActiveWorkspaceId(homeLaunchModalWsId);
          }
          handleLaunchTerminalFromHome(config);
          setHomeLaunchModalWsId(null);
        }}
      />
    </div>
  );
}

