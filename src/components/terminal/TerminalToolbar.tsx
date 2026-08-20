import { useMemo } from "react";
import { 
  Plus, 
  Columns3, 
  Rows3, 
  Grid2X2, 
  Square, 
  Radio, 
  Trash2, 
  RotateCcw, 
  SlidersHorizontal
} from "lucide-react";
import { TerminalData } from "./TerminalSession";
import { AppType } from "../../types/analytics";
import { ALL_PRESET_DEFINITIONS } from "../../constants/presets";
import { DEFAULT_PINNED_PRESETS } from "../../types/settings";

export type GridLayoutMode = "side-by-side" | "stacked" | "grid" | "focus";

interface TerminalToolbarProps {
  terminals: TerminalData[];
  gridLayout: GridLayoutMode;
  onSetGridLayout: (layout: GridLayoutMode) => void;
  onOpenLaunchModal: () => void;
  onQuickSpawn: (appType: TerminalData["appType"]) => void;
  onOpenBroadcastModal: () => void;
  onKillAll: () => void;
  onResetPaneSizes?: () => void;
  isCustomSizes?: boolean;
  pinnedPresets?: AppType[];
  onOpenCustomizePresets?: () => void;
  visibleAgents?: Record<string, boolean>;
}

export default function TerminalToolbar({
  terminals,
  gridLayout,
  onSetGridLayout,
  onOpenLaunchModal,
  onQuickSpawn,
  onOpenBroadcastModal,
  onKillAll,
  onResetPaneSizes,
  isCustomSizes,
  pinnedPresets = DEFAULT_PINNED_PRESETS,
  onOpenCustomizePresets,
  visibleAgents,
}: TerminalToolbarProps) {
  // Active preset definitions derived from pinned IDs (filtered by visibility)
  const activePresets = useMemo(() => {
    const activeIds = pinnedPresets && pinnedPresets.length > 0 ? pinnedPresets : DEFAULT_PINNED_PRESETS;
    return activeIds
      .filter((id) => (visibleAgents?.[id] ?? true))
      .map((id) => ALL_PRESET_DEFINITIONS.find((p) => p.id === id))
      .filter(Boolean) as typeof ALL_PRESET_DEFINITIONS;
  }, [pinnedPresets, visibleAgents]);

  return (
    <div className="terminal-toolbar">
      {/* Left side: Launch Buttons */}
      <div className="toolbar-left">
        <button className="btn-primary" onClick={onOpenLaunchModal}>
          <Plus size={15} />
          <span>Launch / Add</span>
        </button>

        {/* Dynamic Quick Launch Shortcuts */}
        <div className="quick-presets">
          {activePresets.map((preset) => (
            <button
              key={preset.id}
              className="btn-quick-preset"
              title={`Quick launch ${preset.title} (${preset.description})`}
              onClick={() => onQuickSpawn(preset.id as TerminalData["appType"])}
            >
              {preset.icon(14)}
              <span>{preset.shortTitle}</span>
            </button>
          ))}

          {/* Customize / Pin Presets Button */}
          {onOpenCustomizePresets && (
            <button
              type="button"
              className="btn-customize-presets"
              title="Customize pinned quick presets in toolbar"
              onClick={onOpenCustomizePresets}
            >
              <SlidersHorizontal size={13} />
              <span className="btn-customize-label">Pin Presets</span>
            </button>
          )}
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
            {/* Equalize / Reset Panes button */}
            {onResetPaneSizes && terminals.length > 1 && (gridLayout === "side-by-side" || gridLayout === "stacked") && (
              <button 
                className={`btn-toolbar-action ${isCustomSizes ? "active-reset" : ""}`}
                title="Reset all terminal panes to equal width/height"
                onClick={onResetPaneSizes}
              >
                <RotateCcw size={13} />
                <span>Reset Sizes</span>
              </button>
            )}

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
