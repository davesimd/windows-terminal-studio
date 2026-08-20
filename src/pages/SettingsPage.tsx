import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Save, 
  HardDrive, 
  Download, 
  Upload, 
  RotateCcw, 
  Layers, 
  CheckCircle2,
  Terminal as TermIcon,
  Columns,
  Rows,
  Grid2X2,
  Maximize2,
  Folder,
  Plus,
  Trash2,
  Compass,
  Pin,
  Sparkles,
  Check,
  Palette,
  Bot,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { AppSettings, DirectoryTemplate, DEFAULT_PINNED_PRESETS, DEFAULT_VISIBLE_AGENTS } from "../types/settings";
import { WorkspaceData } from "../types/workspace";
import { ALL_PRESET_DEFINITIONS } from "../constants/presets";
import CustomSelect, { SelectOption } from "../components/ui/CustomSelect";
import PinnedPresetsCustomizer from "../components/terminal/PinnedPresetsCustomizer";

type SettingsCategory = "agents" | "appearance" | "persistence" | "directories" | "workspace" | "backup";

interface SettingsPageProps {
  settings: AppSettings;
  workspaces: WorkspaceData[];
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onRestoreWorkspaces: (imported: WorkspaceData[]) => void;
  onResetToDefaults: () => void;
}

export default function SettingsPage({
  settings,
  workspaces,
  onUpdateSettings,
  onRestoreWorkspaces,
  onResetToDefaults,
}: SettingsPageProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("agents");
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplatePath, setNewTemplatePath] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const detected = settings.detectedAgents || {};
  const visible = settings.visibleAgents || DEFAULT_VISIBLE_AGENTS;

  // Re-scan system PATH using native Rust backend
  const handleRescanSystemTools = async () => {
    setIsScanning(true);
    try {
      const results = await invoke<Record<string, boolean>>("detect_installed_tools");
      if (results) {
        const foundCount = Object.values(results).filter(Boolean).length;
        onUpdateSettings({ detectedAgents: results });
        showFeedback(`System scan complete: ${foundCount} tools/agents found on PATH`);
      }
    } catch (err) {
      console.warn("Could not scan system tools:", err);
      showFeedback("Could not query system PATH (browser mode)");
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle visibility of a specific agent or shell
  const handleToggleAgentVisibility = (id: string) => {
    const current = visible[id] !== false;
    const updated = {
      ...visible,
      [id]: !current,
    };
    onUpdateSettings({ visibleAgents: updated });
    showFeedback(`${!current ? "Enabled" : "Hidden"} "${id}" in menus`);
  };

  // Quick Action: Show all installed tools, hide uninstalled AI agents
  const handleShowAllInstalled = () => {
    const updated: Record<string, boolean> = { ...visible };
    for (const preset of ALL_PRESET_DEFINITIONS) {
      if (preset.category === "shell") {
        updated[preset.id] = true;
      } else {
        updated[preset.id] = !!detected[preset.id];
      }
    }
    onUpdateSettings({ visibleAgents: updated });
    showFeedback("Showing all detected tools on PATH");
  };

  // Quick Action: Show all tools
  const handleShowAllTools = () => {
    const updated: Record<string, boolean> = {};
    for (const preset of ALL_PRESET_DEFINITIONS) {
      updated[preset.id] = true;
    }
    onUpdateSettings({ visibleAgents: updated });
    showFeedback("Enabled all AI coding agents and shells");
  };

  // Quick Action: Reset visible agents to defaults
  const handleResetAgents = () => {
    onUpdateSettings({ visibleAgents: DEFAULT_VISIBLE_AGENTS });
    showFeedback("Reset agent visibility to default settings");
  };

  // Count stats
  const totalAi = ALL_PRESET_DEFINITIONS.filter((p) => p.category === "ai").length;
  const installedAiCount = ALL_PRESET_DEFINITIONS.filter((p) => p.category === "ai" && detected[p.id]).length;
  const visibleAiCount = ALL_PRESET_DEFINITIONS.filter((p) => p.category === "ai" && visible[p.id] !== false).length;

  // Shell options with rich icons
  const shellOptions: SelectOption[] = [
    {
      value: "powershell",
      label: "Windows PowerShell",
      sublabel: "powershell.exe",
      icon: <TermIcon size={14} className="text-sage-light" />,
    },
    {
      value: "cmd",
      label: "Command Prompt",
      sublabel: "cmd.exe",
      icon: <TermIcon size={14} className="text-slate-400" />,
    },
    {
      value: "wsl",
      label: "WSL (Linux)",
      sublabel: "wsl.exe",
      icon: <TermIcon size={14} className="text-sage" />,
    },
  ];

  // Layout options with rich icons
  const layoutOptions: SelectOption[] = [
    {
      value: "side-by-side",
      label: "Side-by-Side (Columns)",
      sublabel: "All active panes side by side",
      icon: <Columns size={14} className="text-sage" />,
    },
    {
      value: "stacked",
      label: "Stacked (Rows)",
      sublabel: "Vertical horizontal rows with scroll",
      icon: <Rows size={14} className="text-sage" />,
    },
    {
      value: "grid",
      label: "2x2 Matrix Grid",
      sublabel: "Balanced 2-column matrix",
      icon: <Grid2X2 size={14} className="text-sage" />,
    },
    {
      value: "focus",
      label: "Focus View (Single Tabbed)",
      sublabel: "Single pane with top switcher tabs",
      icon: <Maximize2 size={14} className="text-sage" />,
    },
  ];

  // Add a new template
  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplatePath.trim()) return;

    const name = newTemplateName.trim() || newTemplatePath.split("\\").pop() || "Folder Template";
    const newTmpl: DirectoryTemplate = {
      id: `tmpl_${Date.now()}`,
      name,
      path: newTemplatePath.trim(),
    };

    const updated = [...(settings.directoryTemplates || []), newTmpl];
    onUpdateSettings({ directoryTemplates: updated });
    setNewTemplateName("");
    setNewTemplatePath("");
    showFeedback(`Added template "${name}"`);
  };

  // Delete a template
  const handleDeleteTemplate = (id: string) => {
    const updated = (settings.directoryTemplates || []).filter((t) => t.id !== id);
    onUpdateSettings({ directoryTemplates: updated });
    showFeedback("Template removed");
  };

  // Export JSON Backup
  const handleBackup = () => {
    const backupData = {
      version: 1,
      timestamp: Date.now(),
      settings,
      workspaces,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terminal_studio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback("Backup file exported");
  };

  // Import JSON Backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings) onUpdateSettings(parsed.settings);
        if (Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
          onRestoreWorkspaces(parsed.workspaces);
        }
        showFeedback("Configuration successfully imported");
      } catch (err) {
        alert("Invalid backup JSON file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const storageUsageKB = (
    (JSON.stringify(settings).length + JSON.stringify(workspaces).length) / 1024
  ).toFixed(1);

  const CATEGORIES = [
    {
      id: "agents" as const,
      title: "AI Agents & Tools",
      description: "Auto-detection & visibility toggles",
      icon: <Bot size={15} className="text-sage-light" />,
      tag: `${visibleAiCount}/${totalAi} Active (${installedAiCount} Installed)`,
    },
    {
      id: "appearance" as const,
      title: "Appearance & Themes",
      description: "Sage vs Dark Gold theme styles",
      icon: <Palette size={15} className="text-sage" />,
      tag: (settings.theme || "sage") === "gold" ? "Dark Gold" : "Exact Sage",
    },
    {
      id: "persistence" as const,
      title: "Session & Persistence",
      description: "Auto-recovery & state retention",
      icon: <Save size={15} className="text-sage" />,
      tag: "v1 State",
    },
    {
      id: "directories" as const,
      title: "Directory & Templates",
      description: "Default CWD & saved bookmarks",
      icon: <Folder size={15} className="text-amber-400" />,
      tag: `${(settings.directoryTemplates || []).length} Saved`,
    },
    {
      id: "workspace" as const,
      title: "Workspace & Shell",
      description: "Default shells & matrix layouts",
      icon: <Layers size={15} className="text-sage-light" />,
      tag: "Shells",
    },
    {
      id: "backup" as const,
      title: "Backup & Storage",
      description: "Export, import & factory reset",
      icon: <HardDrive size={15} className="text-sage" />,
      tag: `${storageUsageKB} KB`,
    },
  ];

  return (
    <div className="settings-hub animate-fade">
      {/* Settings Header */}
      <div className="settings-header">
        <div>
          <h2 className="settings-title">Application Settings</h2>
          <p className="settings-subtitle">
            Configure session persistence, directory templates, default shells, and system backups.
          </p>
        </div>

        {saveToast && (
          <div className="save-toast animate-fade">
            <CheckCircle2 size={14} className="text-green" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Two-Column Category Layout */}
      <div className="settings-split-container">
        {/* Left Sub-Navbar */}
        <div className="settings-subnav">
          <span className="settings-subnav-label">Categories</span>
          <div className="settings-subnav-list">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`settings-subnav-item ${isActive ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div className="settings-subnav-icon-wrap">
                    {cat.icon}
                  </div>
                  <div className="settings-subnav-text">
                    <div className="settings-subnav-title-row">
                      <span className="settings-subnav-title">{cat.title}</span>
                    </div>
                    <span className="settings-subnav-desc">{cat.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Category Content Panel */}
        <div className="settings-subcontent animate-fade" key={activeCategory}>
          {/* Category 0: AI Agents & Tools */}
          {activeCategory === "agents" && (
            <div className="settings-scroll-body">
              <div className="settings-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <Bot size={16} className="text-sage" />
                    <h3>AI Coding Agents & CLI Tools</h3>
                  </div>
                  <span className="card-tag">{installedAiCount} Installed / {totalAi} Supported</span>
                </div>

                <p className="card-description">
                  The application automatically checks your Windows system <code>PATH</code> on boot for installed AI agent CLIs.
                  You can manually show or hide any agent below to customize what appears in your Quick Launchers, Home Command Bar, and Workspace toolbar.
                </p>

                {/* Global Controls & Re-scan Action */}
                <div className="agent-settings-toolbar">
                  <button 
                    type="button" 
                    className={`btn-settings-action ${isScanning ? "scanning" : "primary-accent"}`}
                    onClick={handleRescanSystemTools}
                    disabled={isScanning}
                  >
                    <RefreshCw size={13} className={isScanning ? "animate-spin text-sage" : ""} />
                    <span>{isScanning ? "Scanning System PATH..." : "Re-scan System PATH"}</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-settings-action"
                    onClick={handleShowAllInstalled}
                    title="Only display AI agents that are installed on this computer"
                  >
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Show All Installed ({installedAiCount})</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-settings-action"
                    onClick={handleShowAllTools}
                  >
                    <Eye size={13} className="text-sage-light" />
                    <span>Show All</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn-settings-action"
                    onClick={handleResetAgents}
                  >
                    <RotateCcw size={13} />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                {/* Auto-detect on startup switch */}
                <div className="settings-options-list mt-2">
                  <div className="setting-row">
                    <div className="setting-text">
                      <span className="setting-name">Auto-Detect Installed Agents on Startup</span>
                      <span className="setting-desc">
                        Automatically inspect PATH for newly installed AI coding CLIs whenever the application boots.
                      </span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings.autoDetectAgentsOnBoot !== false}
                        onChange={(e) => {
                          onUpdateSettings({ autoDetectAgentsOnBoot: e.target.checked });
                          showFeedback(`Auto-detection on boot ${e.target.checked ? "enabled" : "disabled"}`);
                        }}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 1: AI Developer Agents */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <Sparkles size={16} className="text-sage-light" />
                    <h3>AI Developer Agents & Harnesses</h3>
                  </div>
                  <span className="card-tag">{visibleAiCount} Enabled in Menus</span>
                </div>

                <div className="agent-cards-grid">
                  {ALL_PRESET_DEFINITIONS.filter((p) => p.category === "ai").map((preset) => {
                    const isInstalled = !!detected[preset.id];
                    const isVisible = visible[preset.id] !== false;

                    return (
                      <div 
                        key={preset.id} 
                        className={`agent-manage-card ${isVisible ? "visible" : "hidden"} ${isInstalled ? "installed" : "not-installed"}`}
                      >
                        <div className="agent-manage-card-top">
                          <div className="agent-manage-icon-wrap">
                            {preset.icon(18)}
                          </div>

                          <div className="agent-manage-info">
                            <div className="agent-manage-title-row">
                              <span className="agent-manage-name">{preset.title}</span>
                              <span className="agent-manage-cmd-pill" title={`Binary lookup: ${preset.commandName}`}>
                                {preset.commandName}
                              </span>
                            </div>
                            <span className="agent-manage-desc">{preset.description}</span>
                          </div>
                        </div>

                        <div className="agent-manage-card-bottom">
                          {/* Detection Status Indicator */}
                          <div className={`agent-detection-badge ${isInstalled ? "installed" : "not-found"}`}>
                            {isInstalled ? (
                              <>
                                <span className="detection-dot green" />
                                <span>Installed on PATH</span>
                              </>
                            ) : (
                              <>
                                <span className="detection-dot gray" />
                                <span>Not detected</span>
                              </>
                            )}
                          </div>

                          {/* Visibility Toggle Switch */}
                          <div className="agent-visibility-toggle-wrap">
                            <span className={`visibility-label ${isVisible ? "active" : "muted"}`}>
                              {isVisible ? (
                                <span className="flex items-center gap-1"><Eye size={11} /> Visible</span>
                              ) : (
                                <span className="flex items-center gap-1"><EyeOff size={11} /> Hidden</span>
                              )}
                            </span>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => handleToggleAgentVisibility(preset.id)}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Developer Runtimes & Interpreters */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <TermIcon size={16} className="text-emerald-400" />
                    <h3>Developer Runtimes & Interpreters (Node.js, Python)</h3>
                  </div>
                  <span className="card-tag">CLI Runtimes</span>
                </div>

                <div className="agent-cards-grid">
                  {ALL_PRESET_DEFINITIONS.filter((p) => p.category === "dev").map((preset) => {
                    const isInstalled = !!detected[preset.id];
                    const isVisible = visible[preset.id] !== false;

                    return (
                      <div 
                        key={preset.id} 
                        className={`agent-manage-card ${isVisible ? "visible" : "hidden"} ${isInstalled ? "installed" : "not-installed"}`}
                      >
                        <div className="agent-manage-card-top">
                          <div className="agent-manage-icon-wrap">
                            {preset.icon(18)}
                          </div>

                          <div className="agent-manage-info">
                            <div className="agent-manage-title-row">
                              <span className="agent-manage-name">{preset.title}</span>
                              <span className="agent-manage-cmd-pill" title={`Binary lookup: ${preset.commandName}`}>
                                {preset.commandName}
                              </span>
                            </div>
                            <span className="agent-manage-desc">{preset.description}</span>
                          </div>
                        </div>

                        <div className="agent-manage-card-bottom">
                          <div className={`agent-detection-badge ${isInstalled ? "installed" : "not-found"}`}>
                            {isInstalled ? (
                              <>
                                <span className="detection-dot green" />
                                <span>Installed on PATH</span>
                              </>
                            ) : (
                              <>
                                <span className="detection-dot gray" />
                                <span>Not detected</span>
                              </>
                            )}
                          </div>

                          <div className="agent-visibility-toggle-wrap">
                            <span className={`visibility-label ${isVisible ? "active" : "muted"}`}>
                              {isVisible ? "Visible" : "Hidden"}
                            </span>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => handleToggleAgentVisibility(preset.id)}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: System Shells & Environments */}
              <div className="settings-card">
                <div className="card-header">
                  <div className="card-header-left">
                    <Layers size={16} className="text-sage" />
                    <h3>System Shells & Environments (PowerShell, CMD, WSL, Git Bash)</h3>
                  </div>
                  <span className="card-tag">Core Shells</span>
                </div>

                <div className="agent-cards-grid">
                  {ALL_PRESET_DEFINITIONS.filter((p) => p.category === "shell").map((preset) => {
                    const isInstalled = detected[preset.id] !== false;
                    const isVisible = visible[preset.id] !== false;

                    return (
                      <div 
                        key={preset.id} 
                        className={`agent-manage-card ${isVisible ? "visible" : "hidden"} ${isInstalled ? "installed" : "not-installed"}`}
                      >
                        <div className="agent-manage-card-top">
                          <div className="agent-manage-icon-wrap">
                            {preset.icon(18)}
                          </div>

                          <div className="agent-manage-info">
                            <div className="agent-manage-title-row">
                              <span className="agent-manage-name">{preset.title}</span>
                              <span className="agent-manage-cmd-pill">
                                {preset.commandName}
                              </span>
                            </div>
                            <span className="agent-manage-desc">{preset.description}</span>
                          </div>
                        </div>

                        <div className="agent-manage-card-bottom">
                          <div className={`agent-detection-badge ${isInstalled ? "installed" : "not-found"}`}>
                            {isInstalled ? (
                              <>
                                <span className="detection-dot green" />
                                <span>Installed on PATH</span>
                              </>
                            ) : (
                              <>
                                <span className="detection-dot gray" />
                                <span>Not detected</span>
                              </>
                            )}
                          </div>

                          <div className="agent-visibility-toggle-wrap">
                            <span className={`visibility-label ${isVisible ? "active" : "muted"}`}>
                              {isVisible ? "Visible" : "Hidden"}
                            </span>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => handleToggleAgentVisibility(preset.id)}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Category: Appearance & Themes */}
          {activeCategory === "appearance" && (
            <div className="settings-card">
              <div className="card-header">
                <div className="card-header-left">
                  <Palette size={16} className="text-sage" />
                  <h3>Color Scheme & Theme</h3>
                </div>
                <span className="card-tag">Dark Mode</span>
              </div>

              <div className="settings-options-list">
                <div className="setting-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
                  <div className="setting-text">
                    <span className="setting-name">Select Application Theme</span>
                    <span className="setting-desc">
                      Choose your preferred accent color for the dark mode interface.
                    </span>
                  </div>

                  <div className="theme-selection-grid" style={{ width: "100%" }}>
                    {/* Theme 1: Exact Sage */}
                    <div
                      className={`theme-select-card ${(settings.theme || "sage") === "sage" ? "active" : ""}`}
                      onClick={() => {
                        onUpdateSettings({ theme: "sage" });
                        showFeedback("Theme updated to Exact Sage");
                      }}
                    >
                      <div className="theme-card-header-row">
                        <div className="theme-card-title-group">
                          <div className="theme-color-preview-dot" style={{ background: "#7e9183", border: "2px solid #b3c7b9" }} />
                          <div>
                            <div className="theme-card-title">Exact Sage</div>
                            <span className="theme-card-subtitle">Mineral sage green accent</span>
                          </div>
                        </div>
                        {(settings.theme || "sage") === "sage" && (
                          <div className="theme-active-badge">
                            <Check size={12} />
                            <span>Active</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Theme 2: Burnished Dark Gold */}
                    <div
                      className={`theme-select-card ${settings.theme === "gold" ? "active" : ""}`}
                      onClick={() => {
                        onUpdateSettings({ theme: "gold" });
                        showFeedback("Theme updated to Burnished Dark Gold");
                      }}
                    >
                      <div className="theme-card-header-row">
                        <div className="theme-card-title-group">
                          <div className="theme-color-preview-dot" style={{ background: "#c5a059", border: "2px solid #e5cca0" }} />
                          <div>
                            <div className="theme-card-title">Burnished Gold</div>
                            <span className="theme-card-subtitle">Warm antique gold accent</span>
                          </div>
                        </div>
                        {settings.theme === "gold" && (
                          <div className="theme-active-badge">
                            <Check size={12} />
                            <span>Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category 1: Session & Persistence */}
          {activeCategory === "persistence" && (
            <div className="settings-card">
              <div className="card-header">
                <div className="card-header-left">
                  <Save size={16} className="text-sage" />
                  <h3>Session Recovery & State Persistence</h3>
                </div>
                <span className="card-tag">LocalStorage v1</span>
              </div>

              <div className="settings-options-list">
                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Auto-Restore Workspaces on Launch</span>
                    <span className="setting-desc">
                      Persist all workspace tabs, custom names, and layouts between executable restarts.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.autoRestoreWorkspaces}
                      onChange={(e) => {
                        onUpdateSettings({ autoRestoreWorkspaces: e.target.checked });
                        showFeedback("Setting updated");
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Auto-Relaunch Active Terminals</span>
                    <span className="setting-desc">
                      Automatically respawn saved terminal sessions and AI CLI tools in each workspace when opening the app.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.restoreTerminalsOnLaunch}
                      onChange={(e) => {
                        onUpdateSettings({ restoreTerminalsOnLaunch: e.target.checked });
                        showFeedback("Setting updated");
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Persist Working Directories (CWD)</span>
                    <span className="setting-desc">
                      Remember the exact project paths and working folders configured for custom terminal instances.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.persistWorkingDirectories}
                      onChange={(e) => {
                        onUpdateSettings({ persistWorkingDirectories: e.target.checked });
                        showFeedback("Setting updated");
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Retain Analytics & Telemetry History</span>
                    <span className="setting-desc">
                      Save historical session logs, process uptimes, and tool usage statistics across app restarts.
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.persistAnalyticsHistory}
                      onChange={(e) => {
                        onUpdateSettings({ persistAnalyticsHistory: e.target.checked });
                        showFeedback("Setting updated");
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Category 2: Working Directory & Templates */}
          {activeCategory === "directories" && (
            <div className="settings-card">
              <div className="card-header">
                <div className="card-header-left">
                  <Folder size={16} className="text-amber-400" />
                  <h3>Working Directory Defaults & Presets</h3>
                </div>
                <span className="card-tag">{(settings.directoryTemplates || []).length} Templates</span>
              </div>

              <div className="settings-options-list">
                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Default Working Directory (Global)</span>
                    <span className="setting-desc">
                      Default folder path used for all newly spawned terminals and quick-launch AI CLI tools.
                    </span>
                  </div>

                  <div className="cwd-setting-input-wrap">
                    <Folder size={14} className="cwd-input-icon" />
                    <input
                      type="text"
                      className="settings-text-input"
                      placeholder="e.g. C:\Projects or leave empty for User Home (~)"
                      value={settings.defaultCwd || ""}
                      onChange={(e) => {
                        onUpdateSettings({ defaultCwd: e.target.value });
                        showFeedback("Default directory updated");
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Directory Templates Manager */}
              <div className="templates-manager-box">
                <div className="templates-manager-header">
                  <div className="flex items-center gap-2">
                    <Compass size={14} className="text-sage" />
                    <span className="font-semibold text-xs text-slate-200">Saved Directory Templates</span>
                  </div>
                  <span className="text-xs text-slate-400">Available as 1-click presets in the Launch modal</span>
                </div>

                <div className="templates-list">
                  {(settings.directoryTemplates || []).length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2">No custom directory templates saved.</div>
                  ) : (
                    (settings.directoryTemplates || []).map((tmpl) => (
                      <div key={tmpl.id} className="template-item-row">
                        <div className="template-item-left">
                          <Folder size={13} className="text-amber-400" />
                          <span className="template-item-name">{tmpl.name}</span>
                          <span className="template-item-path">{tmpl.path || "User Home (~)"}</span>
                        </div>

                        <button
                          type="button"
                          className="btn-delete-template"
                          title="Delete template"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Template Form */}
                <form onSubmit={handleAddTemplate} className="add-template-form">
                  <input
                    type="text"
                    className="modal-input-sm flex-1"
                    placeholder="Template Label (e.g. Frontend App)"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="modal-input-sm flex-1"
                    placeholder="Directory Path (e.g. C:\Projects\web)"
                    value={newTemplatePath}
                    onChange={(e) => setNewTemplatePath(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-add-template"
                    disabled={!newTemplatePath.trim()}
                  >
                    <Plus size={13} />
                    <span>Add Template</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Category 3: Workspace & Shell Defaults */}
          {activeCategory === "workspace" && (
            <div className="settings-card">
              <div className="card-header">
                <div className="card-header-left">
                  <Layers size={16} className="text-sage-light" />
                  <h3>Workspace & Shell Defaults</h3>
                </div>
                <span className="card-tag">Environment</span>
              </div>

              <div className="settings-options-list">
                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Default Terminal Shell</span>
                    <span className="setting-desc">
                      Primary shell used when quick-spawning new terminal instances.
                    </span>
                  </div>

                  <CustomSelect
                    options={shellOptions}
                    value={settings.defaultShell}
                    onChange={(val) => {
                      onUpdateSettings({ defaultShell: val as AppSettings["defaultShell"] });
                      showFeedback("Default shell updated");
                    }}
                    width="280px"
                  />
                </div>

                <div className="setting-row">
                  <div className="setting-text">
                    <span className="setting-name">Default Grid Layout Mode</span>
                    <span className="setting-desc">
                      Layout arrangement applied to newly created workspaces.
                    </span>
                  </div>

                  <CustomSelect
                    options={layoutOptions}
                    value={settings.defaultLayout}
                    onChange={(val) => {
                      onUpdateSettings({ defaultLayout: val as AppSettings["defaultLayout"] });
                      showFeedback("Default layout updated");
                    }}
                    width="280px"
                  />
                </div>
              </div>

              {/* Pinned Presets Toolbar Manager Card */}
              <div className="settings-card mt-4">
                <div className="card-header">
                  <div className="card-header-left">
                    <Pin size={16} className="text-sage" />
                    <h3>Workspace Toolbar Pinned Presets</h3>
                  </div>
                  <span className="card-tag">
                    {(settings.pinnedQuickPresets || DEFAULT_PINNED_PRESETS).filter(id => settings.visibleAgents ? settings.visibleAgents[id] !== false : true).length} Pinned
                  </span>
                </div>

                <p className="card-description">
                  Customize which active AI agents, runtimes, and system shells appear in your workspace toolbar for 1-click launch.
                </p>

                <div className="mt-3">
                  <PinnedPresetsCustomizer
                    pinnedPresets={settings.pinnedQuickPresets || DEFAULT_PINNED_PRESETS}
                    onUpdatePinnedPresets={(updated) => {
                      onUpdateSettings({ pinnedQuickPresets: updated });
                      showFeedback("Updated toolbar pins");
                    }}
                    visibleAgents={settings.visibleAgents}
                    detectedAgents={settings.detectedAgents}
                    maxGridHeight="380px"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Category 4: Backup & Storage Management */}
          {activeCategory === "backup" && (
            <div className="settings-card">
              <div className="card-header">
                <div className="card-header-left">
                  <HardDrive size={16} className="text-sage" />
                  <h3>Backup & Storage Management</h3>
                </div>
                <span className="card-tag">{storageUsageKB} KB Cached</span>
              </div>

              <p className="card-description">
                Export a full JSON snapshot of your workspaces, names, layouts, and tool configurations, or restore from a backup file.
              </p>

              <div className="backup-action-buttons">
                <button className="btn-settings-action" onClick={handleBackup}>
                  <Download size={14} />
                  <span>Backup Configuration (JSON)</span>
                </button>

                <button
                  className="btn-settings-action"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  <span>Import Configuration</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".json"
                  onChange={handleImportFile}
                />

                <button
                  className="btn-settings-action danger"
                  onClick={async () => {
                    try {
                      await invoke("kill_all_terminals");
                      showFeedback("Terminated all active terminal processes");
                    } catch {
                      showFeedback("No running sessions to terminate");
                    }
                  }}
                  title="Forcefully terminate all active background terminal sessions"
                >
                  <Trash2 size={14} />
                  <span>Kill All Processes</span>
                </button>

                <button
                  className="btn-settings-action danger"
                  onClick={() => {
                    if (confirm("Are you sure you want to reset all workspaces and settings to defaults?")) {
                      onResetToDefaults();
                      showFeedback("Reset to default settings");
                    }
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
