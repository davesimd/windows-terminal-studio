import { TerminalData } from "../components/terminal/TerminalSession";
import { GridLayoutMode } from "../components/terminal/TerminalToolbar";

export type WorkspaceActivityState = "active" | "idle" | "empty" | "exited";

export interface WorkspaceData {
  id: string;
  name: string;
  defaultCwd?: string;
  terminals: TerminalData[];
  gridLayout: GridLayoutMode;
  focusedId: string | null;
  maximizedId: string | null;
  createdAt: number;
}
