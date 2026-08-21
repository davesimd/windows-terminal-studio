import React from "react";
import { 
  Terminal, 
  BrainCircuit, 
  Rocket, 
  Bot, 
  Sparkles, 
  Boxes, 
  Zap, 
  Server, 
  Layers,
  Code2
} from "lucide-react";
import { AppType } from "../types/analytics";

export interface QuickPresetDefinition {
  id: AppType;
  title: string;
  shortTitle: string;
  description: string;
  category: "ai" | "shell" | "dev";
  commandName: string;
  icon: (size?: number) => React.ReactNode;
}

export const ALL_PRESET_DEFINITIONS: QuickPresetDefinition[] = [
  {
    id: "powershell",
    title: "Windows PowerShell",
    shortTitle: "PowerShell",
    description: "Native Windows PowerShell environment",
    category: "shell",
    commandName: "powershell.exe",
    icon: (size = 14) => <Terminal size={size} className="text-sage" />,
  },
  {
    id: "cmd",
    title: "Command Prompt",
    shortTitle: "CMD",
    description: "Classic Windows Command Prompt (cmd.exe)",
    category: "shell",
    commandName: "cmd.exe",
    icon: (size = 14) => <Terminal size={size} className="text-slate-300" />,
  },
  {
    id: "wsl",
    title: "WSL (Linux)",
    shortTitle: "WSL",
    description: "Windows Subsystem for Linux (Bash / Ubuntu)",
    category: "shell",
    commandName: "wsl.exe",
    icon: (size = 14) => <Layers size={size} className="text-sage" />,
  },
  {
    id: "gitbash",
    title: "Git Bash",
    shortTitle: "Git Bash",
    description: "Git for Windows Bash terminal environment (bash.exe)",
    category: "shell",
    commandName: "bash.exe",
    icon: (size = 14) => <Terminal size={size} className="text-amber-300" />,
  },
  {
    id: "node",
    title: "Node.js REPL",
    shortTitle: "Node.js",
    description: "Interactive JavaScript / Node.js runtime environment",
    category: "dev",
    commandName: "node",
    icon: (size = 14) => <Code2 size={size} className="text-emerald-400" />,
  },
  {
    id: "python",
    title: "Python REPL",
    shortTitle: "Python",
    description: "Interactive Python shell interpreter (python / py)",
    category: "dev",
    commandName: "python",
    icon: (size = 14) => <Code2 size={size} className="text-yellow-300" />,
  },
  {
    id: "antigravity",
    title: "Antigravity CLI",
    shortTitle: "Antigravity",
    description: "Google Antigravity (agy) interactive AI coding agent",
    category: "ai",
    commandName: "agy",
    icon: (size = 14) => <Sparkles size={size} className="text-sage-light" />,
  },
  {
    id: "claude",
    title: "Claude Code",
    shortTitle: "Claude",
    description: "Anthropic Claude Code interactive terminal assistant",
    category: "ai",
    commandName: "claude",
    icon: (size = 14) => <Bot size={size} className="text-orange-400" />,
  },
  {
    id: "codex",
    title: "OpenAI Codex",
    shortTitle: "Codex",
    description: "OpenAI Codex agentic terminal assistant & sandbox",
    category: "ai",
    commandName: "codex",
    icon: (size = 14) => <BrainCircuit size={size} className="text-emerald-400" />,
  },
  {
    id: "grok",
    title: "xAI Grok Build",
    shortTitle: "Grok",
    description: "xAI Grok interactive builder with parallel subagents",
    category: "ai",
    commandName: "grok",
    icon: (size = 14) => <Rocket size={size} className="text-rose-400" />,
  },
  {
    id: "opencode",
    title: "OpenCode CLI",
    shortTitle: "OpenCode",
    description: "Open-source model-agnostic terminal AI agent (75+ LLMs)",
    category: "ai",
    commandName: "opencode",
    icon: (size = 14) => <Boxes size={size} className="text-cyan-400" />,
  },
  {
    id: "copilot",
    title: "GitHub Copilot CLI",
    shortTitle: "Copilot",
    description: "GitHub Copilot CLI shell command assistance",
    category: "ai",
    commandName: "gh copilot",
    icon: (size = 14) => <Bot size={size} className="text-sky-400" />,
  },
  {
    id: "kilo",
    title: "Kilo CLI",
    shortTitle: "Kilo",
    description: "Kilo lightweight terminal editor / coding agent",
    category: "ai",
    commandName: "kilo",
    icon: (size = 14) => <Zap size={size} className="text-yellow-400" />,
  },
  {
    id: "ollama",
    title: "Ollama CLI",
    shortTitle: "Ollama",
    description: "Run local models (Llama 3, DeepSeek, Qwen) in shell",
    category: "ai",
    commandName: "ollama",
    icon: (size = 14) => <Server size={size} className="text-teal-400" />,
  },
];
