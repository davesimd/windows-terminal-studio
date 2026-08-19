import { useState, useEffect } from "react";
import { 
  X, 
  Terminal, 
  Sparkles, 
  Bot, 
  Zap, 
  Folder, 
  Play, 
  Check, 
  Layers, 
  Code2, 
  BookmarkPlus, 
  Compass, 
  RotateCcw, 
  CheckCircle2
} from "lucide-react";
import { TerminalData } from "./TerminalSession";
import { DirectoryTemplate } from "../../types/settings";

interface LaunchAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (config: Omit<TerminalData, "id" | "status">) => void;
  directoryTemplates?: DirectoryTemplate[];
  defaultCwd?: string;
  onSaveTemplate?: (name: string, path: string) => void;
}

interface Preset {
  id: string;
  title: string;
  category: "ai" | "shell" | "dev";
  appType: TerminalData["appType"];
  shellOrCommand: string;
  args?: string[];
  description: string;
  icon: React.ReactNode;
}

const CATEGORIES = [
  {
    id: "ai" as const,
    title: "AI Developer Agents",
    icon: <Sparkles size={14} className="text-cyan-400" />,
  },
  {
    id: "shell" as const,
    title: "System Shells & Environments",
    icon: <Terminal size={14} className="text-indigo-400" />,
  },
  {
    id: "dev" as const,
    title: "Developer Tools & Custom",
    icon: <Layers size={14} className="text-emerald-400" />,
  },
];

const PRESETS: Preset[] = [
  {
    id: "claude",
    title: "Claude Code",
    category: "ai",
    appType: "claude",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "claude"],
    description: "Anthropic Claude Code interactive terminal assistant",
    icon: <Bot size={18} className="text-orange-400" />,
  },
  {
    id: "antigravity",
    title: "Antigravity CLI",
    category: "ai",
    appType: "antigravity",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "agy"],
    description: "Google Antigravity (agy) interactive AI coding agent",
    icon: <Sparkles size={18} className="text-cyan-400" />,
  },
  {
    id: "kilo",
    title: "Kilo CLI",
    category: "ai",
    appType: "kilo",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "kilo"],
    description: "Kilo lightweight terminal editor / coding agent",
    icon: <Zap size={18} className="text-yellow-400" />,
  },
  {
    id: "powershell",
    title: "PowerShell",
    category: "shell",
    appType: "powershell",
    shellOrCommand: "powershell.exe",
    args: ["-NoLogo"],
    description: "Native Windows PowerShell environment",
    icon: <Terminal size={18} className="text-indigo-400" />,
  },
  {
    id: "cmd",
    title: "Command Prompt",
    category: "shell",
    appType: "cmd",
    shellOrCommand: "cmd.exe",
    description: "Classic Windows Command Prompt (cmd.exe)",
    icon: <Terminal size={18} className="text-slate-300" />,
  },
  {
    id: "wsl",
    title: "WSL (Linux)",
    category: "shell",
    appType: "wsl",
    shellOrCommand: "wsl.exe",
    description: "Windows Subsystem for Linux (Bash / Ubuntu)",
    icon: <Layers size={18} className="text-emerald-400" />,
  },
  {
    id: "node",
    title: "Node.js REPL",
    category: "dev",
    appType: "custom",
    shellOrCommand: "node",
    description: "Interactive JavaScript / Node.js runtime",
    icon: <Code2 size={18} className="text-green-400" />,
  },
  {
    id: "python",
    title: "Python REPL",
    category: "dev",
    appType: "custom",
    shellOrCommand: "python",
    description: "Interactive Python interpreter",
    icon: <Code2 size={18} className="text-sky-400" />,
  },
];

export default function LaunchAppModal({ 
  isOpen, 
  onClose, 
  onLaunch,
  directoryTemplates = [],
  defaultCwd = "",
  onSaveTemplate,
}: LaunchAppModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [customCommand, setCustomCommand] = useState("");
  const [customCwd, setCustomCwd] = useState(defaultCwd);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomCwd(defaultCwd || "");
      setIsSavingTemplate(false);
      setTemplateName("");
      setSavedFeedback(null);
    }
  }, [isOpen, defaultCwd]);

  if (!isOpen) return null;

  const handleLaunch = () => {
    const cwdToUse = customCwd.trim() || defaultCwd.trim() || undefined;

    if (isCustomMode) {
      const command = customCommand.trim() || "powershell.exe";
      const title = customTitle.trim() || "Custom Terminal";
      onLaunch({
        title,
        appType: "custom",
        shellOrCommand: "powershell.exe",
        args: ["-NoExit", "-Command", command],
        cwd: cwdToUse,
      });
    } else {
      onLaunch({
        title: customTitle.trim() || selectedPreset.title,
        appType: selectedPreset.appType,
        shellOrCommand: selectedPreset.shellOrCommand,
        args: selectedPreset.args,
        cwd: cwdToUse,
      });
    }
    onClose();
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!customCwd.trim()) return;
    const name = templateName.trim() || customCwd.split("\\").pop() || "Saved Directory";
    onSaveTemplate?.(name, customCwd.trim());
    setIsSavingTemplate(false);
    setTemplateName("");
    setSavedFeedback(`Template "${name}" saved!`);
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Terminal size={18} className="text-indigo-400" />
            <h3>Launch Terminal or Application</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Categorized Presets */}
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="preset-category-section">
              <div className="preset-category-header">
                <span className="preset-category-icon">{cat.icon}</span>
                <span className="preset-category-title">{cat.title}</span>
              </div>

              <div className="preset-grid">
                {PRESETS.filter((p) => p.category === cat.id).map((preset) => {
                  const isSelected = !isCustomMode && selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`preset-card ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedPreset(preset);
                        setIsCustomMode(false);
                      }}
                    >
                      <div className="preset-card-icon">{preset.icon}</div>
                      <div className="preset-card-info">
                        <div className="preset-card-title">
                          <span>{preset.title}</span>
                          {isSelected && <Check size={14} className="text-indigo-400" />}
                        </div>
                        <span className="preset-card-desc">{preset.description}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Custom Command Card under Developer Tools */}
                {cat.id === "dev" && (
                  <div
                    className={`preset-card ${isCustomMode ? "selected" : ""}`}
                    onClick={() => setIsCustomMode(true)}
                  >
                    <div className="preset-card-icon">
                      <Code2 size={18} className="text-purple-400" />
                    </div>
                    <div className="preset-card-info">
                      <div className="preset-card-title">
                        <span>Custom App / Command</span>
                        {isCustomMode && <Check size={14} className="text-indigo-400" />}
                      </div>
                      <span className="preset-card-desc">Run any CLI script or executable</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Configuration Fields */}
          <div className="modal-form-section">
            {isCustomMode && (
              <div className="form-group">
                <div className="form-label-wrap">
                  <label>Command / Script to Execute:</label>
                </div>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. npm run dev, docker compose up, cargo run"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group flex-1">
                <div className="form-label-wrap">
                  <label>Terminal Title (Optional):</label>
                </div>
                <input
                  type="text"
                  className="modal-input"
                  placeholder={isCustomMode ? "Custom Terminal" : selectedPreset.title}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>

              <div className="form-group flex-1">
                <div className="form-label-wrap">
                  <label>Working Directory (Optional):</label>
                  {customCwd.trim() !== "" && onSaveTemplate && !isSavingTemplate && (
                    <button
                      type="button"
                      className="btn-bookmark-action"
                      onClick={() => setIsSavingTemplate(true)}
                      title="Save this folder path as a reusable template"
                    >
                      <BookmarkPlus size={12} />
                      <span>+ Save as Template</span>
                    </button>
                  )}
                </div>

                <div className="input-with-icon-clear">
                  <Folder size={14} className="input-leading-icon" />
                  <input
                    type="text"
                    className="modal-input with-leading-icon"
                    placeholder={defaultCwd ? `Default: ${defaultCwd}` : "e.g. C:\\projects\\my-app"}
                    value={customCwd}
                    onChange={(e) => setCustomCwd(e.target.value)}
                  />
                  {customCwd && (
                    <button
                      type="button"
                      className="btn-input-clear"
                      onClick={() => setCustomCwd("")}
                      title="Clear path (use default directory)"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save Feedback Toast */}
            {savedFeedback && (
              <div className="template-saved-toast animate-fade">
                <CheckCircle2 size={13} className="text-green" />
                <span>{savedFeedback}</span>
              </div>
            )}

            {/* Inline Save Template Form */}
            {isSavingTemplate && (
              <div className="save-template-card animate-fade">
                <div className="save-template-header">
                  <BookmarkPlus size={13} className="text-indigo-400" />
                  <span className="text-xs font-medium text-slate-200">Save Directory Template</span>
                </div>
                <div className="save-template-inputs">
                  <input
                    type="text"
                    className="template-name-input"
                    placeholder="Template Name (e.g. Frontend Project)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn-confirm-save-tmpl"
                    onClick={handleSaveCurrentAsTemplate}
                  >
                    <Check size={12} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-tmpl"
                    onClick={() => setIsSavingTemplate(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Directory Templates Quick Picks */}
            {directoryTemplates.length > 0 && (
              <div className="directory-templates-section">
                <span className="templates-label">
                  <Compass size={12} />
                  <span>Directory Presets:</span>
                </span>
                <div className="template-chips-scroll">
                  {directoryTemplates.map((tmpl) => {
                    const isCurrent = customCwd === tmpl.path;
                    return (
                      <button
                        type="button"
                        key={tmpl.id}
                        className={`template-chip ${isCurrent ? "active" : ""}`}
                        onClick={() => setCustomCwd(tmpl.path)}
                        title={tmpl.path || "Default User Home (~)"}
                      >
                        <Folder size={12} className={isCurrent ? "text-indigo-400" : "text-slate-400"} />
                        <span>{tmpl.name}</span>
                        {isCurrent && <Check size={11} className="text-indigo-400" />}
                      </button>
                    );
                  })}
                  {customCwd !== "" && (
                    <button
                      type="button"
                      className="template-chip reset"
                      onClick={() => setCustomCwd("")}
                      title="Reset to default directory (~)"
                    >
                      <RotateCcw size={11} />
                      <span>Reset to Default (~)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleLaunch}>
            <Play size={14} />
            <span>Launch Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
