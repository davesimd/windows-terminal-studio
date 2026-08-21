import { useRef, useEffect } from "react";
import { 
  Copy, 
  ClipboardPaste, 
  RotateCw, 
  Check,
  FileText
} from "lucide-react";
import { TerminalData } from "./TerminalSession";

interface TerminalActionsDropdownProps {
  session: TerminalData;
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  onCopy: () => void;
  onPaste: () => void;
  onRestart: (id: string) => void;
  onSendToScratchpad?: () => void;
  copiedRecently?: boolean;
  pastedRecently?: boolean;
  sentToScratchpadRecently?: boolean;
}

export default function TerminalActionsDropdown({
  session,
  isOpen,
  onClose,
  anchorRef,
  onCopy,
  onPaste,
  onRestart,
  onSendToScratchpad,
  copiedRecently,
  pastedRecently,
  sentToScratchpadRecently,
}: TerminalActionsDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef?.current && anchorRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape key (Mandatory modal/dropdown rule)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="terminal-actions-popover animate-fade" 
      ref={menuRef} 
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="terminal-actions-item-btn"
        onClick={() => {
          onCopy();
          onClose();
        }}
      >
        {copiedRecently ? (
          <Check size={13} className="text-sage" />
        ) : (
          <Copy size={13} />
        )}
        <span className="flex-1">Copy Selection</span>
        <span className="item-shortcut">Ctrl+C</span>
      </button>

      <button
        type="button"
        className="terminal-actions-item-btn"
        onClick={() => {
          onPaste();
          onClose();
        }}
      >
        {pastedRecently ? (
          <Check size={13} className="text-sage" />
        ) : (
          <ClipboardPaste size={13} />
        )}
        <span className="flex-1">Paste Clipboard</span>
        <span className="item-shortcut">Ctrl+V</span>
      </button>

      {onSendToScratchpad && (
        <button
          type="button"
          className="terminal-actions-item-btn"
          onClick={() => {
            onSendToScratchpad();
            onClose();
          }}
        >
          {sentToScratchpadRecently ? (
            <Check size={13} className="text-sage" />
          ) : (
            <FileText size={13} className="text-amber-400" />
          )}
          <span className="flex-1">Send to Scratchpad</span>
          <span className="item-shortcut">Prompt</span>
        </button>
      )}

      <div className="terminal-actions-divider" />

      <button
        type="button"
        className="terminal-actions-item-btn text-rose-300 hover:text-rose-200"
        onClick={() => {
          onRestart(session.id);
          onClose();
        }}
      >
        <RotateCw size={13} />
        <span className="flex-1">Restart Session</span>
        <span className="item-shortcut">Re-spawn</span>
      </button>
    </div>
  );
}
