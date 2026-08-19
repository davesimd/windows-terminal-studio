export interface DirectoryTemplate {
  id: string;
  name: string;
  path: string;
}

export interface AppSettings {
  autoRestoreWorkspaces: boolean;
  restoreTerminalsOnLaunch: boolean;
  persistWorkingDirectories: boolean;
  persistAnalyticsHistory: boolean;
  defaultLayout: "side-by-side" | "stacked" | "grid" | "focus";
  defaultShell: "powershell" | "cmd" | "wsl";
  defaultCwd?: string;
  directoryTemplates: DirectoryTemplate[];
}

export const DEFAULT_DIRECTORY_TEMPLATES: DirectoryTemplate[] = [
  { id: "tmpl_home", name: "User Home (~)", path: "" },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoRestoreWorkspaces: true,
  restoreTerminalsOnLaunch: true,
  persistWorkingDirectories: true,
  persistAnalyticsHistory: true,
  defaultLayout: "side-by-side",
  defaultShell: "powershell",
  defaultCwd: "",
  directoryTemplates: DEFAULT_DIRECTORY_TEMPLATES,
};
