import { useState, useEffect } from "react";
import { X, Pin } from "lucide-react";
import { AppType } from "../../types/analytics";
import { DEFAULT_PINNED_PRESETS } from "../../types/settings";
import PinnedPresetsCustomizer from "./PinnedPresetsCustomizer";

interface CustomizePresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedPresets: AppType[];
  onSavePinnedPresets: (pinned: AppType[]) => void;
  detectedAgents?: Record<string, boolean>;
  visibleAgents?: Record<string, boolean>;
}

export default function CustomizePresetsModal({
  isOpen,
  onClose,
  pinnedPresets,
  onSavePinnedPresets,
  detectedAgents = {},
  visibleAgents,
}: CustomizePresetsModalProps) {
  const isPresetActive = (id: AppType) => {
    return visibleAgents ? (visibleAgents[id] !== false) : true;
  };

  const [selectedIds, setSelectedIds] = useState<AppType[]>(() => {
    const initial = pinnedPresets && pinnedPresets.length > 0 ? pinnedPresets : DEFAULT_PINNED_PRESETS;
    return initial.filter((id) => (visibleAgents ? visibleAgents[id] !== false : true));
  });

  // Sync selected IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      const list = Array.isArray(pinnedPresets) && pinnedPresets.length > 0 ? pinnedPresets : DEFAULT_PINNED_PRESETS;
      setSelectedIds(list.filter((id) => (visibleAgents ? visibleAgents[id] !== false : true)));
    }
  }, [isOpen, pinnedPresets, visibleAgents]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePinnedPresets((selectedIds || []).filter(isPresetActive));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content customize-presets-modal animate-fade" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Pin size={17} className="text-sage" />
            <div>
              <h3>Customize Pinned Quick Presets</h3>
              <p className="modal-subtitle-text">
                Choose which active AI agents, runtimes, and shells appear in your workspace toolbar.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <PinnedPresetsCustomizer
            pinnedPresets={selectedIds}
            onUpdatePinnedPresets={setSelectedIds}
            visibleAgents={visibleAgents}
            detectedAgents={detectedAgents}
            maxGridHeight="48vh"
          />
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Pin size={14} />
            <span>Apply & Pin to Toolbar ({(selectedIds || []).length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
