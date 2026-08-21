import { useState, useRef, useCallback } from "react";
import { 
  Terminal as TermIcon, 
  Bot, 
  Zap, 
  Sparkles, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  X, 
  Cpu,
  Copy,
  ClipboardPaste,
  Check,
  BrainCircuit,
  Rocket,
  Boxes,
  Server,
  Layers,
  Code2,
  ArrowLeftRight
} from "lucide-react";
import XTermInstance, { XTermHandle } from "./XTermInstance";
import MoveWorkspaceDropdown from "./MoveWorkspaceDropdown";
import { WorkspaceSummary } from "../../types/workspace";

export interface TerminalData {
  id: string;
  title: string;
  appType: 
    | "powershell" 
    | "cmd" 
    | "wsl" 
    | "gitbash"
    | "antigravity" 
    | "gemini" 
    | "claude" 
    | "codex"
    | "grok"
    | "opencode"
    | "copilot"
    | "kilo" 
    | "ollama"
    | "node"
    | "python"
    | "custom";
  shellOrCommand: string;
  args?: string[];
  cwd?: string;
  pid?: number;
  status: "running" | "idle" | "exited";
  lastActiveAt?: number;
  startedAt?: number;
  outputChunksCount?: number;
  initialPrompt?: string;
  autoSendPrompt?: boolean;
}

interface TerminalSessionProps {
  session: TerminalData;
  isMaximized: boolean;
  onMaximizeToggle: (id: string) => void;
  onClose: (id: string) => void;
  onRestart: (id: string) => void;
  onSessionActivity?: (id: string) => void;
  availableWorkspaces?: WorkspaceSummary[];
  currentWorkspaceId?: string;
  onMoveToWorkspace?: (terminalId: string, targetWorkspaceId: string | "new", switchNow: boolean) => void;
}

export default function TerminalSession({
  session,
  isMaximized,
  onMaximizeToggle,
  onClose,
  onRestart,
  onSessionActivity,
  availableWorkspaces = [],
  currentWorkspaceId = "",
  onMoveToWorkspace,
}: TerminalSessionProps) {
  const [hasRecentActivity, setHasRecentActivity] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [pastedRecently, setPastedRecently] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const xtermRef = useRef<XTermHandle>(null);


  const activityTimeoutRef = useRef<number | null>(null);

  const triggerActivity = useCallback(() => {
    if (!activityTimeoutRef.current) {
      setHasRecentActivity(true);
      onSessionActivity?.(session.id);
      activityTimeoutRef.current = window.setTimeout(() => {
        setHasRecentActivity(false);
        activityTimeoutRef.current = null;
      }, 1000);
    }
  }, [onSessionActivity, session.id]);

  const handleCopyClick = async () => {
    if (xtermRef.current) {
      const ok = await xtermRef.current.copySelection();
      if (ok) {
        setCopiedRecently(true);
        setTimeout(() => setCopiedRecently(false), 1200);
      }
    }
  };

  const handlePasteClick = async () => {
    if (xtermRef.current) {
      const ok = await xtermRef.current.pasteClipboard();
      if (ok) {
        setPastedRecently(true);
        setTimeout(() => setPastedRecently(false), 1200);
      }
    }
  };

  const getAppIcon = () => {
    switch (session.appType) {
      case "codex":
        return <BrainCircuit size={14} className="text-emerald-400" />;
      case "grok":
        return <Rocket size={14} className="text-rose-400" />;
      case "claude":
        return <Bot size={14} className="text-orange-400" />;
      case "antigravity":
        return <Sparkles size={14} className="text-sage-light" />;
      case "opencode":
        return <Boxes size={14} className="text-cyan-400" />;
      case "gemini":
        return <Sparkles size={14} className="text-blue-400" />;
      case "copilot":
        return <Bot size={14} className="text-sky-400" />;
      case "kilo":
        return <Zap size={14} className="text-yellow-400" />;
      case "ollama":
        return <Server size={14} className="text-teal-400" />;
      case "gitbash":
        return <TermIcon size={14} className="text-amber-300" />;
      case "wsl":
        return <Layers size={14} className="text-sage" />;
      case "cmd":
        return <TermIcon size={14} className="text-slate-300" />;
      case "custom":
        return <Code2 size={14} className="text-purple-400" />;
      default:
        return <TermIcon size={14} className="text-sage" />;
    }
  };

  return (
    <div className={`terminal-card ${isMaximized ? "maximized" : ""}`}>
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-header-left">
          <div className={`app-type-badge ${session.appType}`}>
            {getAppIcon()}
            <span>{session.title}</span>
          </div>

          {session.pid && (
            <span className="pid-badge">
              <Cpu size={11} />
              PID: {session.pid}
            </span>
          )}

          {session.cwd && (
            <span className="cwd-badge" title={session.cwd}>
              {session.cwd}
            </span>
          )}
        </div>

        <div className="terminal-header-right">
          {/* Activity pulse */}
          <span 
            className={`activity-dot ${hasRecentActivity ? "active" : ""}`} 
            title={hasRecentActivity ? "Active output" : "Idle"}
          />

          {/* Quick Clipboard Copy Button */}
          <button
            className="term-btn"
            title="Copy Selection (Ctrl+C / Ctrl+Shift+C)"
            onClick={handleCopyClick}
          >
            {copiedRecently ? (
              <Check size={13} className="text-sage" />
            ) : (
              <Copy size={13} />
            )}
          </button>

          {/* Quick Clipboard Paste Button */}
          <button
            className="term-btn"
            title="Paste from Clipboard (Ctrl+V)"
            onClick={handlePasteClick}
          >
            {pastedRecently ? (
              <Check size={13} className="text-sage" />
            ) : (
              <ClipboardPaste size={13} />
            )}
          </button>

          <div className="terminal-header-divider" />

          {/* Switch / Move to Workspace Button */}
          {onMoveToWorkspace && (
            <div className="move-workspace-anchor">
              <button 
                className={`term-btn ${isMoveMenuOpen ? "active" : ""}`}
                title="Switch / Move terminal to another workspace"
                onClick={() => setIsMoveMenuOpen(!isMoveMenuOpen)}
              >
                <ArrowLeftRight size={13} />
              </button>

              <MoveWorkspaceDropdown
                session={session}
                currentWorkspaceId={currentWorkspaceId || ""}
                availableWorkspaces={availableWorkspaces || []}
                isOpen={isMoveMenuOpen}
                onClose={() => setIsMoveMenuOpen(false)}
                onMoveToWorkspace={(targetWsId, switchNow) => {
                  onMoveToWorkspace(session.id, targetWsId, switchNow);
                }}
              />
            </div>
          )}

          {/* Action buttons */}
          <button 
            className="term-btn" 
            title="Restart Session"
            onClick={() => onRestart(session.id)}
          >
            <RotateCw size={13} />
          </button>

          <button 
            className="term-btn" 
            title={isMaximized ? "Restore Grid" : "Maximize"}
            onClick={() => onMaximizeToggle(session.id)}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button 
            className="term-btn close-btn" 
            title="Close Terminal"
            onClick={() => onClose(session.id)}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Canvas */}
      <div className="terminal-body">
        <XTermInstance 
          ref={xtermRef}
          session={session} 
          onActivity={triggerActivity}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
}
