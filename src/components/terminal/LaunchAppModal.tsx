import { useState, useEffect, useMemo } from "react";
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
  CheckCircle2,
  BrainCircuit,
  Rocket,
  Boxes,
  Server,
  Search
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
  visibleAgents?: Record<string, boolean>;
  detectedAgents?: Record<string, boolean>;
  onOpenSettings?: () => void;
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
    title: "AI Developer Agents & Harnesses",
    icon: <Sparkles size={14} className="text-sage-light" />,
  },
  {
    id: "shell" as const,
    title: "System Shells & Environments",
    icon: <Terminal size={14} className="text-sage" />,
  },
  {
    id: "dev" as const,
    title: "Developer Tools & Custom",
    icon: <Layers size={14} className="text-sage" />,
  },
];

const PRESETS: Preset[] = [
  // --- AI Developer Agents & CLI Harnesses ---
  {
    id: "codex",
    title: "OpenAI Codex",
    category: "ai",
    appType: "codex",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "codex"],
    description: "OpenAI Codex agentic terminal assistant & sandbox",
    icon: <BrainCircuit size={18} className="text-emerald-400" />,
  },
  {
    id: "grok",
    title: "xAI Grok Build",
    category: "ai",
    appType: "grok",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "grok"],
    description: "xAI Grok interactive builder with parallel subagents",
    icon: <Rocket size={18} className="text-rose-400" />,
  },
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
    icon: <Sparkles size={18} className="text-sage-light" />,
  },
  {
    id: "opencode",
    title: "OpenCode CLI",
    category: "ai",
    appType: "opencode",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "opencode"],
    description: "Open-source model-agnostic terminal AI agent (75+ LLMs)",
    icon: <Boxes size={18} className="text-cyan-400" />,
  },
  {
    id: "gemini",
    title: "Gemini CLI",
    category: "ai",
    appType: "gemini",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "gemini"],
    description: "Google Gemini Code Assist shell terminal interface",
    icon: <Sparkles size={18} className="text-blue-400" />,
  },
  {
    id: "copilot",
    title: "GitHub Copilot CLI",
    category: "ai",
    appType: "copilot",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "gh copilot suggest"],
    description: "GitHub Copilot CLI shell command assistance",
    icon: <Bot size={18} className="text-sky-400" />,
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
    id: "ollama",
    title: "Ollama CLI",
    category: "ai",
    appType: "ollama",
    shellOrCommand: "powershell.exe",
    args: ["-NoExit", "-Command", "ollama run llama3"],
    description: "Run local models (Llama 3, DeepSeek, Qwen) in shell",
    icon: <Server size={18} className="text-teal-400" />,
  },

  // --- System Shells & Environments ---
  {
    id: "powershell",
    title: "PowerShell",
    category: "shell",
    appType: "powershell",
    shellOrCommand: "powershell.exe",
    args: ["-NoLogo"],
    description: "Native Windows PowerShell environment",
    icon: <Terminal size={18} className="text-sage" />,
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
    icon: <Layers size={18} className="text-sage" />,
  },
  {
    id: "gitbash",
    title: "Git Bash",
    category: "shell",
    appType: "gitbash",
    shellOrCommand: "bash.exe",
    description: "Git for Windows Bash terminal environment",
    icon: <Terminal size={18} className="text-amber-300" />,
  },

  // --- Developer Tools & Interpreters ---
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
    icon: <Code2 size={18} className="text-sage-muted" />,
  },
];

export default function LaunchAppModal({ 
  isOpen, 
  onClose, 
  onLaunch,
  directoryTemplates = [],
  defaultCwd = "",
  onSaveTemplate,
  visibleAgents,
  detectedAgents,
  onOpenSettings,
}: LaunchAppModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [searchFilter, setSearchFilter] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customCommand, setCustomCommand] = useState("");
  const [customCwd, setCustomCwd] = useState(defaultCwd);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [showHiddenAgents, setShowHiddenAgents] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomCwd(defaultCwd || "");
      setIsSavingTemplate(false);
      setTemplateName("");
      setSavedFeedback(null);
      setSearchFilter("");
      setShowHiddenAgents(false);
    }
  }, [isOpen, defaultCwd]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const hiddenCount = useMemo(() => {
    if (!visibleAgents) return 0;
    return PRESETS.filter((p) => visibleAgents[p.id] === false).length;
  }, [visibleAgents]);

  const filteredPresets = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    let base = PRESETS;

    // Filter by visibility if not searching and not showing hidden
    if (!q && !showHiddenAgents && visibleAgents) {
      base = base.filter((p) => visibleAgents[p.id] !== false);
    }

    if (!q) return base;
    return PRESETS.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }, [searchFilter, showHiddenAgents, visibleAgents]);

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
            <Terminal size={18} className="text-sage" />
            <div>
              <h3>Launch Terminal or AI Agent</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Spawns a fast native PTY process with live streaming terminal I/O
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Preset Search Filter & Controls */}
          <div className="modal-preset-search-row">
            <div className="modal-preset-search">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search AI harnesses, shells, tools (Codex, Grok, Claude, Aider, OpenCode...)"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="modal-search-input"
              />
              {searchFilter && (
                <button className="btn-input-clear" onClick={() => setSearchFilter("")}>
                  <X size={12} />
                </button>
              )}
            </div>

            {hiddenCount > 0 && !searchFilter && (
              <button
                type="button"
                className={`btn-toggle-hidden-agents ${showHiddenAgents ? "active" : ""}`}
                onClick={() => setShowHiddenAgents(!showHiddenAgents)}
              >
                <span>{showHiddenAgents ? "Hide unselected" : `Show all (${hiddenCount} hidden)`}</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                className="btn-modal-settings-link"
                onClick={onOpenSettings}
                title="Configure installed agents & visibility in Settings"
              >
                <span>Settings</span>
              </button>
            )}
          </div>

          {/* Categorized Presets */}
          {CATEGORIES.map((cat) => {
            const items = filteredPresets.filter((p) => p.category === cat.id);
            if (items.length === 0 && (cat.id !== "dev" || searchFilter.trim() !== "")) {
              return null;
            }

            return (
              <div key={cat.id} className="preset-category-section">
                <div className="preset-category-header">
                  <span className="preset-category-icon">{cat.icon}</span>
                  <span className="preset-category-title">{cat.title}</span>
                  <span className="preset-category-count">({items.length})</span>
                </div>

                <div className="preset-grid">
                  {items.map((preset) => {
                    const isSelected = !isCustomMode && selectedPreset.id === preset.id;
                    const isInstalled = !!detectedAgents?.[preset.id];

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
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="truncate">{preset.title}</span>
                              {isInstalled && (
                                <span className="installed-dot-badge" title="Installed on PATH">
                                  <CheckCircle2 size={10} className="text-emerald-400" />
                                </span>
                              )}
                            </div>
                            {isSelected && <Check size={14} className="text-sage flex-shrink-0" />}
                          </div>
                          <span className="preset-card-desc">{preset.description}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom Command Card under Developer Tools */}
                  {cat.id === "dev" && !searchFilter && (
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
                          {isCustomMode && <Check size={14} className="text-sage" />}
                        </div>
                        <span className="preset-card-desc">Run any CLI script or executable</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

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
                  <BookmarkPlus size={13} className="text-sage" />
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
                        <Folder size={12} className={isCurrent ? "text-sage" : "text-slate-400"} />
                        <span>{tmpl.name}</span>
                        {isCurrent && <Check size={11} className="text-sage" />}
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
