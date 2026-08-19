export interface HistoricalSession {
  id: string;
  workspaceId: string;
  workspaceName: string;
  title: string;
  appType: "powershell" | "cmd" | "wsl" | "antigravity" | "gemini" | "claude" | "kilo" | "custom";
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
  appType: "powershell" | "cmd" | "wsl" | "antigravity" | "gemini" | "claude" | "kilo" | "custom";
  title: string;
  count: number;
  totalDurationSeconds: number;
  percentage: number;
}
