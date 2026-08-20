import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Sparkles, 
  Bot, 
  Zap, 
  Terminal, 
  Folder, 
  Send,
  BrainCircuit,
  Rocket,
  Boxes,
  Server,
  Code2,
  CornerDownLeft,
  Clock,
  ChevronDown,
  Check,
  Settings as SettingsIcon,
  CheckCircle2
} from "lucide-react";
import { TerminalData } from "../terminal/TerminalSession";
import { DirectoryTemplate } from "../../types/settings";

interface HomeLaunchpadProps {
  onLaunchTerminal: (config: Omit<TerminalData, "id" | "status">) => void;
  directoryTemplates?: DirectoryTemplate[];
  defaultCwd?: string;
  visibleAgents?: Record<string, boolean>;
  detectedAgents?: Record<string, boolean>;
  onOpenSettings?: () => void;
}

interface AgentOption {
  id: string;
  name: string;
  category: "ai" | "shell";
  badge: string;
  appType: TerminalData["appType"];
  shellOrCommand: string;
  getArgs: (prompt?: string) => string[];
  description: string;
  icon: React.ReactNode;
}

const AGENT_OPTIONS: AgentOption[] = [
  // AI Agents
  {
    id: "antigravity",
    name: "Antigravity CLI",
    category: "ai",
    badge: "Google",
    appType: "antigravity",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `agy "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "agy"],
    description: "Google Antigravity interactive AI coding agent & toolchain",
    icon: <Sparkles size={14} className="text-sage-light" />,
  },
  {
    id: "claude",
    name: "Claude Code",
    category: "ai",
    badge: "Anthropic",
    appType: "claude",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `claude "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "claude"],
    description: "Anthropic Claude Code terminal coding assistant",
    icon: <Bot size={14} className="text-orange-400" />,
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    category: "ai",
    badge: "OpenAI",
    appType: "codex",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `codex "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "codex"],
    description: "OpenAI Codex agentic terminal assistant",
    icon: <BrainCircuit size={14} className="text-emerald-400" />,
  },
  {
    id: "grok",
    name: "xAI Grok Build",
    category: "ai",
    badge: "xAI",
    appType: "grok",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `grok "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "grok"],
    description: "xAI Grok interactive builder with parallel subagents",
    icon: <Rocket size={14} className="text-rose-400" />,
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    category: "ai",
    badge: "Google",
    appType: "gemini",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `gemini "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "gemini"],
    description: "Google Gemini Code Assist shell terminal interface",
    icon: <Sparkles size={14} className="text-blue-400" />,
  },
  {
    id: "opencode",
    name: "OpenCode",
    category: "ai",
    badge: "Open Source",
    appType: "opencode",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `opencode "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "opencode"],
    description: "Open-source model-agnostic terminal AI agent",
    icon: <Boxes size={14} className="text-cyan-400" />,
  },
  {
    id: "kilo",
    name: "Kilo CLI",
    category: "ai",
    badge: "Open Source",
    appType: "kilo",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `kilo "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "kilo"],
    description: "Kilo lightweight terminal editor and AI assistant",
    icon: <Zap size={14} className="text-yellow-400" />,
  },

  {
    id: "copilot",
    name: "GitHub Copilot CLI",
    category: "ai",
    badge: "GitHub",
    appType: "copilot",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `gh copilot suggest "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "gh copilot"],
    description: "GitHub Copilot CLI command assistance",
    icon: <Bot size={14} className="text-sky-400" />,
  },
  {
    id: "ollama",
    name: "Ollama CLI",
    category: "ai",
    badge: "Local AI",
    appType: "ollama",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `ollama run llama3 "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "ollama"],
    description: "Local open-weights LLM runner in terminal",
    icon: <Server size={14} className="text-teal-400" />,
  },

  // Runtimes & Interpreters
  {
    id: "node",
    name: "Node.js REPL",
    category: "shell",
    badge: "JS/Node",
    appType: "node",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `node -e "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "node"],
    description: "Interactive JavaScript / Node.js runtime",
    icon: <Code2 size={14} className="text-emerald-400" />,
  },
  {
    id: "python",
    name: "Python REPL",
    category: "shell",
    badge: "Python",
    appType: "python",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", `python -c "${prompt.replace(/"/g, '`"')}"`] : ["-NoExit", "-Command", "python"],
    description: "Interactive Python shell interpreter",
    icon: <Code2 size={14} className="text-yellow-300" />,
  },

  // Shells
  {
    id: "powershell",
    name: "PowerShell",
    category: "shell",
    badge: "Microsoft",
    appType: "powershell",
    shellOrCommand: "powershell.exe",
    getArgs: (prompt) => prompt ? ["-NoExit", "-Command", prompt] : ["-NoLogo"],
    description: "Native Windows PowerShell execution",
    icon: <Terminal size={14} className="text-sage" />,
  },
  {
    id: "cmd",
    name: "Command Prompt",
    category: "shell",
    badge: "Windows",
    appType: "cmd",
    shellOrCommand: "cmd.exe",
    getArgs: (prompt) => prompt ? ["/k", prompt] : [],
    description: "Classic Windows Command Prompt (cmd.exe)",
    icon: <Terminal size={14} className="text-slate-300" />,
  },
  {
    id: "wsl",
    name: "WSL Linux (Bash)",
    category: "shell",
    badge: "Linux",
    appType: "wsl",
    shellOrCommand: "wsl.exe",
    getArgs: (prompt) => prompt ? ["-e", "bash", "-c", `${prompt}; exec bash`] : [],
    description: "Windows Subsystem for Linux Bash environment",
    icon: <Terminal size={14} className="text-blue-400" />,
  },
  {
    id: "gitbash",
    name: "Git Bash",
    category: "shell",
    badge: "Git",
    appType: "gitbash",
    shellOrCommand: "bash.exe",
    getArgs: (prompt) => prompt ? ["-c", `${prompt}; exec bash`] : [],
    description: "Git for Windows Bash terminal environment",
    icon: <Terminal size={14} className="text-amber-300" />,
  },
];

const TASK_TEMPLATES = [
  { id: "review", label: "🔍 Code Review & Git Diff", prompt: "Review git status and uncommitted changes, explain what was modified" },
  { id: "test", label: "🧪 Run & Fix Test Failures", prompt: "Run unit tests and diagnose/fix any failing test suites" },
  { id: "refactor", label: "✨ Refactor & Clean Code", prompt: "Inspect the codebase for technical debt, remove dead code, and improve formatting" },
  { id: "server", label: "🚀 Start Dev Server", prompt: "npm run dev" },
];

const STORAGE_KEY_RECENT_TASKS = "desktop_studio_recent_dispatched_tasks_v1";

interface RecentDispatchedTask {
  id: string;
  prompt: string;
  agentId: string;
  cwd?: string;
  timestamp: number;
}

export default function HomeLaunchpad({
  onLaunchTerminal,
  directoryTemplates = [],
  defaultCwd = "",
  visibleAgents,
  detectedAgents,
  onOpenSettings,
}: HomeLaunchpadProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedCwd, setSelectedCwd] = useState<string>(defaultCwd);

  // Filter available agents according to visibility preferences
  const visibleAgentOptions = useMemo(() => {
    const filtered = AGENT_OPTIONS.filter((a) => (visibleAgents?.[a.id] ?? true));
    return filtered.length > 0 ? filtered : AGENT_OPTIONS;
  }, [visibleAgents]);

  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    // Pick first installed AI agent, or first available visible agent
    const installedAi = visibleAgentOptions.find((a) => a.category === "ai" && detectedAgents?.[a.id]);
    const firstAi = visibleAgentOptions.find((a) => a.category === "ai");
    return installedAi?.id || firstAi?.id || visibleAgentOptions[0]?.id || "powershell";
  });

  // Automatically keep selectedAgentId valid if visible options change
  useEffect(() => {
    if (!visibleAgentOptions.some((a) => a.id === selectedAgentId)) {
      const installedAi = visibleAgentOptions.find((a) => a.category === "ai" && detectedAgents?.[a.id]);
      const firstAi = visibleAgentOptions.find((a) => a.category === "ai");
      const fallback = installedAi?.id || firstAi?.id || visibleAgentOptions[0]?.id || "powershell";
      setSelectedAgentId(fallback);
    }
  }, [visibleAgentOptions, detectedAgents]);

  // Custom Dropdown Open States
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isDirMenuOpen, setIsDirMenuOpen] = useState(false);

  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const dirDropdownRef = useRef<HTMLDivElement>(null);

  const [recentTasks, setRecentTasks] = useState<RecentDispatchedTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_TASKS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const selectedAgent = visibleAgentOptions.find((a) => a.id === selectedAgentId) || visibleAgentOptions[0] || AGENT_OPTIONS[0];

  // Selected Directory label
  const selectedTemplate = directoryTemplates.find((t) => t.path === selectedCwd);
  const dirDisplayLabel = selectedTemplate ? selectedTemplate.name : (selectedCwd || "User Default (~)");

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(target)) {
        setIsAgentMenuOpen(false);
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(target)) {
        setIsTemplateMenuOpen(false);
      }
      if (dirDropdownRef.current && !dirDropdownRef.current.contains(target)) {
        setIsDirMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Close dropdowns on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAgentMenuOpen(false);
        setIsTemplateMenuOpen(false);
        setIsDirMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save recent tasks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECENT_TASKS, JSON.stringify(recentTasks.slice(0, 4)));
    } catch {
      // ignore
    }
  }, [recentTasks]);

  const handleDispatch = () => {
    const trimmedPrompt = prompt.trim();
    const args = selectedAgent.getArgs(trimmedPrompt || undefined);
    const title = trimmedPrompt 
      ? `${selectedAgent.name.split(" ")[0]}: ${trimmedPrompt.length > 28 ? trimmedPrompt.slice(0, 28) + "..." : trimmedPrompt}` 
      : selectedAgent.name;

    if (trimmedPrompt) {
      const newTask: RecentDispatchedTask = {
        id: `task_${Date.now()}`,
        prompt: trimmedPrompt,
        agentId: selectedAgent.id,
        cwd: selectedCwd,
        timestamp: Date.now(),
      };
      setRecentTasks((prev) => [newTask, ...prev.filter((t) => t.prompt !== trimmedPrompt)].slice(0, 4));
    }

    onLaunchTerminal({
      title,
      appType: selectedAgent.appType,
      shellOrCommand: selectedAgent.shellOrCommand,
      args,
      cwd: selectedCwd.trim() || undefined,
    });

    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      handleDispatch();
    }
  };

  const handleApplyRecentTask = (task: RecentDispatchedTask) => {
    setPrompt(task.prompt);
    setSelectedAgentId(task.agentId);
    if (task.cwd !== undefined) setSelectedCwd(task.cwd);
  };

  const aiAgents = visibleAgentOptions.filter((a) => a.category === "ai");
  const systemShells = visibleAgentOptions.filter((a) => a.category === "shell");
  const customTemplates = directoryTemplates.filter((t) => t.path && t.path.trim() !== "");

  return (
    <div className="home-section-card omni-launchpad-card">
      {/* Header */}
      <div className="home-section-header">
        <div className="home-section-title-wrap">
          <div className="home-section-icon">
            <Sparkles size={16} className="text-sage-light" />
          </div>
          <div>
            <h3 className="home-section-title">AI Command Bar & Task Dispatcher</h3>
            <p className="home-section-desc">
              Type an instruction or command to immediately spawn and execute in your preferred AI agent or shell
            </p>
          </div>
        </div>
      </div>

      {/* Main Omni Command Box */}
      <div className="omni-command-box">
        <div className="omni-input-wrapper">
          <textarea
            className="omni-textarea"
            placeholder={`Describe what you want to build or run (e.g. 'Review uncommitted git diff', 'Run unit tests and fix errors', 'npm run dev')...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />

          <div className="omni-input-bottom-bar">
            {/* Left Controls: Inline Modern Custom Dropdowns */}
            <div className="omni-dropdowns-group">
              {/* 1. Agent Selector Dropdown */}
              <div className="omni-select-control" ref={agentDropdownRef}>
                <span className="omni-control-label">Agent:</span>
                <div className="custom-dropdown-container">
                  <button
                    type="button"
                    className={`custom-dropdown-trigger ${isAgentMenuOpen ? "active" : ""}`}
                    onClick={() => {
                      setIsAgentMenuOpen(!isAgentMenuOpen);
                      setIsTemplateMenuOpen(false);
                      setIsDirMenuOpen(false);
                    }}
                  >
                    <span className="custom-trigger-icon">{selectedAgent.icon}</span>
                    <span className="custom-dropdown-trigger-text">{selectedAgent.name}</span>
                    <span className="custom-agent-badge">{selectedAgent.badge}</span>
                    {detectedAgents?.[selectedAgent.id] && (
                      <span className="agent-installed-dot" title="Installed on PATH" />
                    )}
                    <ChevronDown size={13} className={`custom-dropdown-chevron ${isAgentMenuOpen ? "open" : ""}`} />
                  </button>

                  {isAgentMenuOpen && (
                    <div className="custom-dropdown-popup agent-popup animate-fade">
                      {aiAgents.length > 0 && (
                        <>
                          <div className="custom-dropdown-group-title">AI Coding Agents ({aiAgents.length})</div>
                          {aiAgents.map((agent) => {
                            const isSelected = agent.id === selectedAgentId;
                            const isInstalled = !!detectedAgents?.[agent.id];
                            return (
                              <div
                                key={agent.id}
                                className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={() => {
                                  setSelectedAgentId(agent.id);
                                  setIsAgentMenuOpen(false);
                                }}
                              >
                                <span className="custom-item-icon">{agent.icon}</span>
                                <div className="custom-dropdown-item-text">
                                  <div className="flex items-center gap-1.5">
                                    <span className="custom-item-title">{agent.name}</span>
                                    {isInstalled && (
                                      <span className="installed-chip-small" title="Installed on PATH">
                                        <CheckCircle2 size={10} className="text-emerald-400" />
                                        <span>Installed</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="custom-item-sub">{agent.description}</span>
                                </div>
                                <span className="custom-item-badge">{agent.badge}</span>
                                {isSelected && <Check size={13} className="text-sage custom-item-check" />}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {systemShells.length > 0 && (
                        <>
                          <div className="custom-dropdown-divider" />
                          <div className="custom-dropdown-group-title">System Shells ({systemShells.length})</div>
                          {systemShells.map((agent) => {
                            const isSelected = agent.id === selectedAgentId;
                            return (
                              <div
                                key={agent.id}
                                className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={() => {
                                  setSelectedAgentId(agent.id);
                                  setIsAgentMenuOpen(false);
                                }}
                              >
                                <span className="custom-item-icon">{agent.icon}</span>
                                <div className="custom-dropdown-item-text">
                                  <span className="custom-item-title">{agent.name}</span>
                                  <span className="custom-item-sub">{agent.description}</span>
                                </div>
                                <span className="custom-item-badge">{agent.badge}</span>
                                {isSelected && <Check size={13} className="text-sage custom-item-check" />}
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
                              setIsAgentMenuOpen(false);
                              onOpenSettings();
                            }}
                          >
                            <SettingsIcon size={12} className="text-sage" />
                            <span>Manage / Show More Agents in Settings</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Directory Selector Dropdown */}
              <div className="omni-select-control" ref={dirDropdownRef}>
                <span className="omni-control-label">Directory:</span>
                <div className="custom-dropdown-container">
                  <button
                    type="button"
                    className={`custom-dropdown-trigger dir-trigger ${isDirMenuOpen ? "active" : ""}`}
                    onClick={() => {
                      setIsDirMenuOpen(!isDirMenuOpen);
                      setIsAgentMenuOpen(false);
                      setIsTemplateMenuOpen(false);
                    }}
                  >
                    <Folder size={13} className="text-sage" />
                    <span className="custom-dropdown-trigger-text" title={selectedCwd || "User Default (~)"}>
                      {dirDisplayLabel}
                    </span>
                    <ChevronDown size={13} className={`custom-dropdown-chevron ${isDirMenuOpen ? "open" : ""}`} />
                  </button>

                  {isDirMenuOpen && (
                    <div className="custom-dropdown-popup dir-popup animate-fade">
                      <div 
                        className={`custom-dropdown-item ${!selectedCwd ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedCwd("");
                          setIsDirMenuOpen(false);
                        }}
                      >
                        <Folder size={13} className="text-muted" />
                        <div className="custom-dropdown-item-text">
                          <span className="custom-item-title">User Default (~)</span>
                          <span className="custom-item-sub">Home user directory</span>
                        </div>
                        {!selectedCwd && <Check size={13} className="text-sage custom-item-check" />}
                      </div>

                      {customTemplates.length > 0 && <div className="custom-dropdown-divider" />}

                      {customTemplates.map((tmpl) => {
                        const isSelected = selectedCwd === tmpl.path;
                        return (
                          <div
                            key={tmpl.id}
                            className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setSelectedCwd(tmpl.path);
                              setIsDirMenuOpen(false);
                            }}
                          >
                            <Folder size={13} className="text-sage" />
                            <div className="custom-dropdown-item-text">
                              <span className="custom-item-title">{tmpl.name}</span>
                              <span className="custom-item-sub" title={tmpl.path}>{tmpl.path}</span>
                            </div>
                            {isSelected && <Check size={13} className="text-sage custom-item-check" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Task Template Dropdown */}
              <div className="omni-select-control" ref={templateDropdownRef}>
                <span className="omni-control-label">Template:</span>
                <div className="custom-dropdown-container">
                  <button
                    type="button"
                    className={`custom-dropdown-trigger template-trigger ${isTemplateMenuOpen ? "active" : ""}`}
                    onClick={() => {
                      setIsTemplateMenuOpen(!isTemplateMenuOpen);
                      setIsAgentMenuOpen(false);
                      setIsDirMenuOpen(false);
                    }}
                  >
                    <span className="custom-dropdown-trigger-text text-muted">
                      Choose template...
                    </span>
                    <ChevronDown size={13} className={`custom-dropdown-chevron ${isTemplateMenuOpen ? "open" : ""}`} />
                  </button>

                  {isTemplateMenuOpen && (
                    <div className="custom-dropdown-popup template-popup animate-fade">
                      {TASK_TEMPLATES.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className="custom-dropdown-item"
                          onClick={() => {
                            setPrompt(tmpl.prompt);
                            setIsTemplateMenuOpen(false);
                          }}
                        >
                          <div className="custom-dropdown-item-text">
                            <span className="custom-item-title">{tmpl.label}</span>
                            <span className="custom-item-sub">{tmpl.prompt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Submit Action */}
            <div className="omni-submit-group">
              <span className="omni-hint-text">↵ Enter to dispatch</span>
              <button 
                className="btn-primary omni-dispatch-btn" 
                onClick={handleDispatch}
              >
                <Send size={13} />
                <span>{prompt.trim() ? "Dispatch Task" : `Launch ${selectedAgent.name.split(" ")[0]}`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Dispatched Tasks Memory */}
        {recentTasks.length > 0 && (
          <div className="omni-recent-tasks-row">
            <span className="recent-tasks-label">
              <Clock size={11} className="text-muted" />
              <span>Recent Dispatches:</span>
            </span>
            <div className="recent-tasks-list">
              {recentTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="recent-task-pill"
                  onClick={() => handleApplyRecentTask(t)}
                  title={`Click to reload: "${t.prompt}"`}
                >
                  <CornerDownLeft size={10} className="text-sage" />
                  <span className="recent-task-prompt">{t.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
