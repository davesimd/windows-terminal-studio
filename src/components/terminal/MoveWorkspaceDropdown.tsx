import { useRef, useEffect } from "react";
import { 
  Folder, 
  FolderPlus, 
  ArrowRight, 
  ArrowLeftRight, 
  Layers
} from "lucide-react";
import { WorkspaceSummary } from "../../types/workspace";
import { TerminalData } from "./TerminalSession";

interface MoveWorkspaceDropdownProps {
  session: TerminalData;
  currentWorkspaceId: string;
  availableWorkspaces: WorkspaceSummary[];
  isOpen: boolean;
  onClose: () => void;
  onMoveToWorkspace: (targetWsId: string | "new", switchNow: boolean) => void;
}

export default function MoveWorkspaceDropdown({
  session,
  currentWorkspaceId,
  availableWorkspaces,
  isOpen,
  onClose,
  onMoveToWorkspace,
}: MoveWorkspaceDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const otherWorkspaces = availableWorkspaces.filter((w) => w.id !== currentWorkspaceId);

  const handleSelectWorkspace = (targetId: string) => {
    onMoveToWorkspace(targetId, true);
    onClose();
  };

  const handleCreateNew = () => {
    onMoveToWorkspace("new", true);
    onClose();
  };

  return (
    <div className="move-workspace-popover animate-fade" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="move-popover-header">
        <div className="move-popover-title-row">
          <ArrowLeftRight size={14} className="text-sage" />
          <span className="move-popover-title">Switch to Workspace</span>
        </div>
        <span className="move-popover-sub">
          Transfer &quot;{session.title}&quot; to destination workspace
        </span>
      </div>

      {/* Workspace list */}
      <div className="move-popover-list">
        {otherWorkspaces.length === 0 ? (
          <div className="move-popover-empty">
            <Layers size={20} className="text-slate-500 mb-1" />
            <span className="font-medium text-slate-300">No other workspaces open</span>
            <span className="text-muted text-xs">Create a new workspace below to transfer this terminal.</span>
          </div>
        ) : (
          otherWorkspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              className="move-workspace-item-btn"
              onClick={() => handleSelectWorkspace(ws.id)}
              title={`Switch terminal to ${ws.name}`}
            >
              <div className="ws-item-info">
                <div className="ws-folder-icon-box">
                  <Folder size={15} className="text-sage" />
                </div>
                <div className="ws-item-texts">
                  <span className="ws-item-name" title={ws.name}>{ws.name}</span>
                  <span className="ws-item-terms">
                    {ws.terminalCount} {ws.terminalCount === 1 ? "terminal" : "terminals"}
                  </span>
                </div>
              </div>

              <div className="ws-item-action-pill">
                <span>Switch</span>
                <ArrowRight size={13} className="action-arrow" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* Divider */}
      <div className="move-popover-divider" />

      {/* New workspace option */}
      <div className="move-popover-footer">
        <button
          type="button"
          className="btn-move-new"
          onClick={handleCreateNew}
          title="Create a new workspace and switch this terminal there"
        >
          <FolderPlus size={15} className="text-sage" />
          <span>New Workspace</span>
          <ArrowRight size={13} className="ml-auto text-slate-400 action-arrow" />
        </button>
      </div>
    </div>
  );
}
