export type AppType = 
  | "powershell" 
  | "cmd" 
  | "wsl" 
  | "gitbash"
  | "antigravity" 
  | "gemini" 
  | "claude" 
  | "codex"
  | "grok"
  | "opencode"
  | "copilot"
  | "kilo" 
  | "ollama"
  | "node"
  | "python"
  | "custom";

export interface HistoricalSession {
  id: string;
  workspaceId: string;
  workspaceName: string;
  title: string;
  appType: AppType;
  shellOrCommand: string;
  cwd?: string;
  pid?: number;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  status: "running" | "idle" | "exited";
  outputChunksCount: number;
}

export interface ToolUsageStat {
  appType: AppType;
  title: string;
  count: number;
  totalDurationSeconds: number;
  percentage: number;
}
