import { 
  Plus, 
  Columns3, 
  Rows3, 
  Grid2X2, 
  Square, 
  Radio, 
  Trash2, 
  Zap, 
  Sparkles, 
  Bot, 
  Terminal
} from "lucide-react";
import { TerminalData } from "./TerminalSession";

export type GridLayoutMode = "side-by-side" | "stacked" | "grid" | "focus";

interface TerminalToolbarProps {
  terminals: TerminalData[];
  gridLayout: GridLayoutMode;
  onSetGridLayout: (layout: GridLayoutMode) => void;
  onOpenLaunchModal: () => void;
  onQuickSpawn: (appType: TerminalData["appType"]) => void;
  onOpenBroadcastModal: () => void;
  onKillAll: () => void;
}

export default function TerminalToolbar({
  terminals,
  gridLayout,
  onSetGridLayout,
  onOpenLaunchModal,
  onQuickSpawn,
  onOpenBroadcastModal,
  onKillAll,
}: TerminalToolbarProps) {
  return (
    <div className="terminal-toolbar">
      {/* Left side: Launch Buttons */}
      <div className="toolbar-left">
        <button className="btn-primary" onClick={onOpenLaunchModal}>
          <Plus size={15} />
          <span>Launch / Add Terminal</span>
        </button>

        {/* Quick launch presets */}
        <div className="quick-presets">
          <button 
            className="btn-quick-preset" 
            title="Quick launch PowerShell"
            onClick={() => onQuickSpawn("powershell")}
          >
            <Terminal size={14} className="text-indigo-400" />
            <span>PowerShell</span>
          </button>

          <button 
            className="btn-quick-preset" 
            title="Quick launch Kilo CLI"
            onClick={() => onQuickSpawn("kilo")}
          >
            <Zap size={14} className="text-yellow-400" />
            <span>Kilo</span>
          </button>

          <button 
            className="btn-quick-preset" 
            title="Quick launch Gemini CLI"
            onClick={() => onQuickSpawn("gemini")}
          >
            <Sparkles size={14} className="text-blue-400" />
            <span>Gemini</span>
          </button>

          <button 
            className="btn-quick-preset" 
            title="Quick launch Claude Code"
            onClick={() => onQuickSpawn("claude")}
          >
            <Bot size={14} className="text-orange-400" />
            <span>Claude</span>
          </button>
        </div>
      </div>

      {/* Right side: Layout & Management Controls */}
      <div className="toolbar-right">
        {/* Layout Switcher */}
        <div className="layout-picker">
          <button
            className={`layout-btn ${gridLayout === "side-by-side" ? "active" : ""}`}
            title="Side-by-Side View (All terminals in vertical columns)"
            onClick={() => onSetGridLayout("side-by-side")}
          >
            <Columns3 size={15} />
            <span className="layout-label">Side-by-Side</span>
          </button>
          <button
            className={`layout-btn ${gridLayout === "stacked" ? "active" : ""}`}
            title="Stacked View (All terminals stacked in rows)"
            onClick={() => onSetGridLayout("stacked")}
          >
            <Rows3 size={15} />
            <span className="layout-label">Stacked</span>
          </button>
          <button
            className={`layout-btn ${gridLayout === "grid" ? "active" : ""}`}
            title="2x2 Grid View"
            onClick={() => onSetGridLayout("grid")}
          >
            <Grid2X2 size={15} />
            <span className="layout-label">Grid</span>
          </button>
          <button
            className={`layout-btn ${gridLayout === "focus" ? "active" : ""}`}
            title="Single Focus View"
            onClick={() => onSetGridLayout("focus")}
          >
            <Square size={15} />
            <span className="layout-label">Focus</span>
          </button>
        </div>

        {/* Global Operations */}
        {terminals.length > 0 && (
          <div className="toolbar-actions">
            <button 
              className="btn-toolbar-action" 
              title="Broadcast input to all terminals"
              onClick={onOpenBroadcastModal}
            >
              <Radio size={14} />
              <span>Broadcast</span>
            </button>

            <button 
              className="btn-toolbar-action danger" 
              title="Close all active terminals"
              onClick={onKillAll}
            >
              <Trash2 size={14} />
              <span>Close All</span>
            </button>
          </div>
        )}

        {/* Active count badge */}
        <div className="active-sessions-pill">
          <span className="pill-dot"></span>
          <span>{terminals.length} Active</span>
        </div>
      </div>
    </div>
  );
}
