import { useState, useRef } from "react";
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
  Compass
} from "lucide-react";
import { AppSettings, DirectoryTemplate } from "../types/settings";
import { WorkspaceData } from "../types/workspace";
import CustomSelect, { SelectOption } from "../components/ui/CustomSelect";

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
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplatePath, setNewTemplatePath] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Shell options with rich icons
  const shellOptions: SelectOption[] = [
    {
      value: "powershell",
      label: "Windows PowerShell",
      sublabel: "powershell.exe",
      icon: <TermIcon size={14} className="text-blue-400" />,
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
      icon: <TermIcon size={14} className="text-emerald-400" />,
    },
  ];

  // Layout options with rich icons
  const layoutOptions: SelectOption[] = [
    {
      value: "side-by-side",
      label: "Side-by-Side (Columns)",
      sublabel: "All active panes side by side",
      icon: <Columns size={14} className="text-indigo-400" />,
    },
    {
      value: "stacked",
      label: "Stacked (Rows)",
      sublabel: "Vertical horizontal rows with scroll",
      icon: <Rows size={14} className="text-indigo-400" />,
    },
    {
      value: "grid",
      label: "2x2 Matrix Grid",
      sublabel: "Balanced 2-column matrix",
      icon: <Grid2X2 size={14} className="text-indigo-400" />,
    },
    {
      value: "focus",
      label: "Focus View (Single Tabbed)",
      sublabel: "Single pane with top switcher tabs",
      icon: <Maximize2 size={14} className="text-indigo-400" />,
    },
  ];

  // Add a new template
  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplatePath.trim()) return;

    const name = newTemplateName.trim() || newTemplatePath.split("\\").pop() || "Custom Directory";
    const newTmpl: DirectoryTemplate = {
      id: `tmpl_${Date.now()}`,
      name,
      path: newTemplatePath.trim(),
    };

    onUpdateSettings({
      directoryTemplates: [...(settings.directoryTemplates || []), newTmpl],
    });

    setNewTemplateName("");
    setNewTemplatePath("");
    showFeedback(`Template "${name}" added`);
  };

  // Delete a template
  const handleDeleteTemplate = (id: string) => {
    onUpdateSettings({
      directoryTemplates: (settings.directoryTemplates || []).filter((t) => t.id !== id),
    });
    showFeedback("Template removed");
  };

  // Calculate approximate storage usage
  const storageUsageBytes = JSON.stringify(workspaces).length + JSON.stringify(settings).length;
  const storageUsageKB = (storageUsageBytes / 1024).toFixed(1);

  // Backup configuration to JSON file
  const handleBackup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      workspaces: workspaces.map((w) => ({
        ...w,
        terminals: w.terminals.map((t) => ({
          title: t.title,
          appType: t.appType,
          shellOrCommand: t.shellOrCommand,
          args: t.args,
          cwd: t.cwd,
        })),
      })),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `desktop_studio_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showFeedback("Configuration exported successfully!");
  };

  // Import configuration from JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.settings) {
          onUpdateSettings(parsed.settings);
        }

        if (parsed.workspaces && Array.isArray(parsed.workspaces)) {
          const restored: WorkspaceData[] = parsed.workspaces.map((w: any, index: number) => ({
            id: w.id || `ws_${Date.now()}_${index}`,
            name: w.name || `Restored Workspace ${index + 1}`,
            gridLayout: w.gridLayout || "side-by-side",
            focusedId: null,
            maximizedId: null,
            createdAt: w.createdAt || Date.now(),
            terminals: (w.terminals || []).map((t: any, tIndex: number) => ({
              id: `term_${Date.now()}_${tIndex}`,
              title: t.title || "Restored Terminal",
              appType: t.appType || "powershell",
              shellOrCommand: t.shellOrCommand || "powershell.exe",
              args: t.args || ["-NoLogo"],
              cwd: t.cwd,
              status: "running",
            })),
          }));

          onRestoreWorkspaces(restored);
          showFeedback("Configuration and workspaces imported!");
        }
      } catch (err) {
        alert("Failed to parse configuration file. Please ensure it is valid JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="settings-hub animate-fade">
      {/* Settings Header */}
      <div className="settings-header">
        <div>
          <h2 className="settings-title">Application Preferences & Persistence</h2>
          <p className="settings-subtitle">
            Configure session recovery, working directory defaults & templates, shell environments, and storage.
          </p>
        </div>

        {saveToast && (
          <div className="save-toast animate-fade">
            <CheckCircle2 size={14} className="text-green" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      <div className="settings-scroll-body">
        {/* Section 1: Session Recovery & Persistence */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-header-left">
              <Save size={16} className="text-indigo-400" />
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

        {/* Section 2: Default Working Directory & Templates */}
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
                <Compass size={14} className="text-indigo-400" />
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

        {/* Section 3: Default Workspace Environment */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-header-left">
              <Layers size={16} className="text-blue-400" />
              <h3>Workspace & Shell Defaults</h3>
            </div>
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
        </div>

        {/* Section 4: Backup, Restore & Cache Management */}
        <div className="settings-card">
          <div className="card-header">
            <div className="card-header-left">
              <HardDrive size={16} className="text-amber-400" />
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
      </div>
    </div>
  );
}
