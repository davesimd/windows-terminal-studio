import { AppType } from "./analytics";

export type AppTheme = "sage" | "gold";

export interface DirectoryTemplate {
  id: string;
  name: string;
  path: string;
}

export interface AppSettings {
  theme?: AppTheme;
  autoRestoreWorkspaces: boolean;
  restoreTerminalsOnLaunch: boolean;
  persistWorkingDirectories: boolean;
  persistAnalyticsHistory: boolean;
  defaultLayout: "side-by-side" | "stacked" | "grid" | "focus";
  defaultShell: "powershell" | "cmd" | "wsl";
  defaultCwd?: string;
  directoryTemplates: DirectoryTemplate[];
  pinnedQuickPresets: AppType[];
  autoDetectAgentsOnBoot?: boolean;
  visibleAgents?: Record<string, boolean>;
  detectedAgents?: Record<string, boolean>;
}

export const DEFAULT_DIRECTORY_TEMPLATES: DirectoryTemplate[] = [
  { id: "tmpl_home", name: "User Home (~)", path: "" },
];

export const DEFAULT_PINNED_PRESETS: AppType[] = [
  "powershell",
  "codex",
  "grok",
  "claude",
  "antigravity",
  "opencode",
  "kilo",
];

export const DEFAULT_VISIBLE_AGENTS: Record<string, boolean> = {
  powershell: true,
  cmd: true,
  wsl: true,
  gitbash: true,
  antigravity: true,
  claude: true,
  codex: true,
  grok: true,
  opencode: true,
  gemini: true,
  copilot: true,
  kilo: true,
  ollama: true,
  node: true,
  python: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "sage",
  autoRestoreWorkspaces: true,
  restoreTerminalsOnLaunch: false,
  persistWorkingDirectories: true,
  persistAnalyticsHistory: true,
  defaultLayout: "side-by-side",
  defaultShell: "powershell",
  defaultCwd: "",
  directoryTemplates: DEFAULT_DIRECTORY_TEMPLATES,
  pinnedQuickPresets: DEFAULT_PINNED_PRESETS,
  autoDetectAgentsOnBoot: true,
  visibleAgents: DEFAULT_VISIBLE_AGENTS,
  detectedAgents: {},
};

