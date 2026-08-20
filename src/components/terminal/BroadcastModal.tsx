import { useState, useEffect } from "react";
import { X, Send, Radio } from "lucide-react";

interface BroadcastModalProps {
  isOpen: boolean;
  terminalCount: number;
  onClose: () => void;
  onBroadcast: (command: string) => void;
}

export default function BroadcastModal({
  isOpen,
  terminalCount,
  onClose,
  onBroadcast,
}: BroadcastModalProps) {
  const [command, setCommand] = useState("");

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

  const handleSend = () => {
    if (!command.trim()) return;
    onBroadcast(command);
    setCommand("");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-fade small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Radio size={18} className="text-purple-400" />
            <h3>Broadcast Command to All Terminals</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p className="broadcast-hint">
            This will send the exact text and an Enter keystroke to all <strong>{terminalCount}</strong> active terminal sessions.
          </p>

          <div className="form-group">
            <label>Command to Broadcast:</label>
            <input
              type="text"
              autoFocus
              className="modal-input"
              placeholder="e.g. git status, clear, npm test"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSend} disabled={!command.trim()}>
            <Send size={14} />
            <span>Broadcast Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
