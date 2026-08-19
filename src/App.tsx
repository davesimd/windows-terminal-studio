import { useState, useEffect, useRef } from "react";
import { 
  Home, 
  BarChart3, 
  Settings, 
  Zap, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Folder
} from "lucide-react";
import HomePage from "./pages/HomePage";
import WorkspacePage from "./pages/WorkspacePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import { WorkspaceData, WorkspaceActivityState } from "./types/workspace";
import { HistoricalSession } from "./types/analytics";
import { AppSettings, DEFAULT_APP_SETTINGS, DEFAULT_DIRECTORY_TEMPLATES } from "./types/settings";
import "./App.css";

type NavTab = "home" | "workspace" | "analytics" | "settings";

const STORAGE_KEYS = {
  SETTINGS: "desktop_studio_settings_v1",
  WORKSPACES: "desktop_studio_workspaces_v1",
  TELEMETRY: "desktop_studio_telemetry_v1",
  ACTIVE_WS: "desktop_studio_active_ws_v1",
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
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_APP_SETTINGS;
  });

  const [activeNav, setActiveNav] = useState<NavTab>("workspace");

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

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_WS);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return "ws_default";
  });

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

  // Delete a workspace
  const handleDeleteWorkspace = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (workspaces.length <= 1) return; // Keep at least one

    setWorkspaces((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(remaining[0].id);
      }
      return remaining;
    });
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

  const handleClearHistory = () => {
    const activeIds = new Set<string>();
    workspaces.forEach((w) => w.terminals.forEach((t) => activeIds.add(t.id)));
    setSessionHistory((prev) => prev.filter((s) => activeIds.has(s.id)));
  };

  // Reset all workspaces and local storage to defaults
  const handleResetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEYS.WORKSPACES);
    localStorage.removeItem(STORAGE_KEYS.TELEMETRY);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_WS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    setSettings(DEFAULT_APP_SETTINGS);
    setWorkspaces(INITIAL_WORKSPACES);
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

                        <Folder size={15} className={isActive ? "text-indigo-400" : "text-slate-400"} />

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
            {activeNav === "home" && <HomePage />}
          </div>

          {/* Workspaces: Maintained with persistent absolute geometry to prevent canvas resize flash */}
          {workspaces.map((ws) => {
            const isVisible = activeNav === "workspace" && ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                className={`workspace-view-layer ${isVisible ? "active" : ""}`}
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
                />
              </div>
            );
          })}

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
    </div>
  );
}
