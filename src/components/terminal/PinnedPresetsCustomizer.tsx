import { useState, useMemo } from "react";
import { 
  Check, 
  Sparkles, 
  Terminal, 
  RotateCcw, 
  Search, 
  CheckCheck, 
  Code2, 
  Square, 
  X 
} from "lucide-react";
import { AppType } from "../../types/analytics";
import { ALL_PRESET_DEFINITIONS } from "../../constants/presets";
import { DEFAULT_PINNED_PRESETS } from "../../types/settings";

interface PinnedPresetsCustomizerProps {
  pinnedPresets: AppType[];
  onUpdatePinnedPresets: (pinned: AppType[]) => void;
  visibleAgents?: Record<string, boolean>;
  detectedAgents?: Record<string, boolean>;
  maxGridHeight?: string;
}

export default function PinnedPresetsCustomizer({
  pinnedPresets = [],
  onUpdatePinnedPresets,
  visibleAgents,
  detectedAgents = {},
  maxGridHeight,
}: PinnedPresetsCustomizerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "ai" | "dev" | "shell">("all");

  const isPresetActive = (id: AppType) => {
    return visibleAgents ? (visibleAgents[id] !== false) : true;
  };

  // Only consider presets that are active/visible in Settings
  const activePresetDefinitions = useMemo(() => {
    return ALL_PRESET_DEFINITIONS.filter((p) => isPresetActive(p.id));
  }, [visibleAgents]);

  const aiCount = useMemo(() => activePresetDefinitions.filter((p) => p.category === "ai").length, [activePresetDefinitions]);
  const devCount = useMemo(() => activePresetDefinitions.filter((p) => p.category === "dev").length, [activePresetDefinitions]);
  const shellCount = useMemo(() => activePresetDefinitions.filter((p) => p.category === "shell").length, [activePresetDefinitions]);

  const filteredPresets = useMemo(() => {
    return activePresetDefinitions.filter((p) => {
      const matchesCategory = activeCategory === "all" || p.category === activeCategory;
      const q = (searchQuery || "").trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.shortTitle.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activePresetDefinitions, activeCategory, searchQuery]);

  const handleToggle = (id: AppType) => {
    const current = pinnedPresets || [];
    if (current.includes(id)) {
      onUpdatePinnedPresets(current.filter((item) => item !== id));
    } else {
      onUpdatePinnedPresets([...current, id]);
    }
  };

  const handleSelectInstalled = () => {
    const installed = activePresetDefinitions.filter((p) => {
      if (p.category === "shell") return true;
      return !!(detectedAgents && detectedAgents[p.id]);
    }).map((p) => p.id);
    onUpdatePinnedPresets(installed);
  };

  const handleSelectAll = () => {
    onUpdatePinnedPresets(activePresetDefinitions.map((p) => p.id));
  };

  const handleUnselectAll = () => {
    onUpdatePinnedPresets([]);
  };

  const handleResetDefaults = () => {
    onUpdatePinnedPresets(DEFAULT_PINNED_PRESETS.filter(isPresetActive));
  };

  return (
    <div className="pinned-presets-customizer-component">
      {/* Top Bar: Search & Category Filter */}
      <div className="customize-modal-controls">
        <div className="customize-search-box">
          <Search size={13} className="text-slate-400" />
          <input
            type="text"
            placeholder="Filter tools (Codex, Grok, Claude, WSL, Node...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="btn-input-clear" onClick={() => setSearchQuery("")}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="customize-category-tabs">
          <button
            type="button"
            className={`category-tab-btn ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            All ({activePresetDefinitions.length})
          </button>
          {aiCount > 0 && (
            <button
              type="button"
              className={`category-tab-btn ${activeCategory === "ai" ? "active" : ""}`}
              onClick={() => setActiveCategory("ai")}
            >
              <Sparkles size={12} />
              <span>AI Agents ({aiCount})</span>
            </button>
          )}
          {devCount > 0 && (
            <button
              type="button"
              className={`category-tab-btn ${activeCategory === "dev" ? "active" : ""}`}
              onClick={() => setActiveCategory("dev")}
            >
              <Code2 size={12} />
              <span>Runtimes ({devCount})</span>
            </button>
          )}
          {shellCount > 0 && (
            <button
              type="button"
              className={`category-tab-btn ${activeCategory === "shell" ? "active" : ""}`}
              onClick={() => setActiveCategory("shell")}
            >
              <Terminal size={12} />
              <span>Shells ({shellCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Helpers */}
      <div className="customize-action-helpers mt-2 mb-2">
        <span className="pinned-count-indicator">
          <strong>{(pinnedPresets || []).length}</strong> of {activePresetDefinitions.length} pinned
        </span>

        <div className="helper-buttons-row">
          <button type="button" className="btn-helper-action" onClick={handleSelectInstalled}>
            <Check size={12} className="text-emerald-400" />
            <span>Pin Installed</span>
          </button>
          <button type="button" className="btn-helper-action" onClick={handleSelectAll}>
            <CheckCheck size={12} />
            <span>Select All</span>
          </button>
          <button type="button" className="btn-helper-action" onClick={handleUnselectAll}>
            <Square size={12} className="text-slate-400" />
            <span>Unselect All</span>
          </button>
          <button type="button" className="btn-helper-action" onClick={handleResetDefaults}>
            <RotateCcw size={12} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Presets Toggle Grid */}
      <div 
        className="customize-presets-grid"
        style={maxGridHeight ? { maxHeight: maxGridHeight } : undefined}
      >
        {filteredPresets.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", padding: "28px 12px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
            No active tools matching your search filter.
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isPinned = (pinnedPresets || []).includes(preset.id);
            const isInstalled = preset.category === "shell" || !!(detectedAgents && detectedAgents[preset.id]);

            return (
              <div
                key={preset.id}
                className={`customize-preset-card ${isPinned ? "pinned" : ""}`}
                onClick={() => handleToggle(preset.id)}
              >
                <div className="customize-card-left">
                  <div className="customize-card-icon">
                    {preset.icon(16)}
                  </div>
                  <div className="customize-card-text">
                    <div className="customize-card-title-row">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="customize-card-title">{preset.title}</span>
                        {isInstalled && (
                          <span className="installed-dot-small" title="Installed on PATH" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`customize-category-badge ${preset.category}`}>
                          {preset.category === "ai" ? "AI" : preset.category === "dev" ? "Dev" : "Shell"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`pin-toggle-checkbox ${isPinned ? "checked" : ""}`}>
                  {isPinned ? <Check size={13} className="text-white" /> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
