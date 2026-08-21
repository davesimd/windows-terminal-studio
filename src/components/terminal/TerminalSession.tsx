import { useState, useRef, useCallback } from "react";
import { 
  Terminal as TermIcon, 
  Bot, 
  Zap, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  X, 
  Cpu,
  BrainCircuit,
  Rocket,
  Boxes,
  Server,
  Layers,
  Code2,
  ArrowLeftRight,
  ChevronDown
} from "lucide-react";
import XTermInstance, { XTermHandle } from "./XTermInstance";
import MoveWorkspaceDropdown from "./MoveWorkspaceDropdown";
import TerminalActionsDropdown from "./TerminalActionsDropdown";
import { WorkspaceSummary } from "../../types/workspace";
import { AppType } from "../../types/analytics";

export interface TerminalData {
  id: string;
  title: string;
  appType: 
    | "powershell" 
    | "cmd" 
    | "wsl" 
    | "gitbash"
    | "antigravity" 
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
  promptDelayMs?: number; // 0 = adaptive settling, >0 = explicit delay ms, -1 = manual only
}

interface TerminalSessionProps {
  session: TerminalData;
  isFocused?: boolean;
  onFocus?: (id: string) => void;
  isMaximized: boolean;
  onMaximizeToggle: (id: string) => void;
  onClose: (id: string) => void;
  onRestart: (id: string) => void;
  onSessionActivity?: (id: string) => void;
  availableWorkspaces?: WorkspaceSummary[];
  currentWorkspaceId?: string;
  onMoveToWorkspace?: (terminalId: string, targetWorkspaceId: string | "new", switchNow: boolean) => void;
  onSendToScratchpad?: (title: string, content: string, targetAgent?: AppType, targetWsId?: string, switchNow?: boolean) => void;
}

export default function TerminalSession({
  session,
  isFocused = false,
  onFocus,
  isMaximized,
  onMaximizeToggle,
  onClose,
  onRestart,
  onSessionActivity,
  availableWorkspaces = [],
  currentWorkspaceId = "",
  onMoveToWorkspace,
  onSendToScratchpad,
}: TerminalSessionProps) {
  const [hasRecentActivity, setHasRecentActivity] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [pastedRecently, setPastedRecently] = useState(false);
  const [sentToScratchpadRecently, setSentToScratchpadRecently] = useState(false);
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const actionsAnchorRef = useRef<HTMLDivElement>(null);
  const moveAnchorRef = useRef<HTMLDivElement>(null);
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

  const handleCopyClick = useCallback(async () => {
    if (xtermRef.current) {
      const ok = await xtermRef.current.copySelection();
      if (ok) {
        setCopiedRecently(true);
        window.setTimeout(() => setCopiedRecently(false), 1200);
      }
    }
  }, []);

  const handlePasteClick = useCallback(async () => {
    if (xtermRef.current) {
      const ok = await xtermRef.current.pasteClipboard();
      if (ok) {
        setPastedRecently(true);
        window.setTimeout(() => setPastedRecently(false), 1200);
      }
    }
  }, []);

  const handleSendToScratchpadClick = useCallback(() => {
    let content = "";
    let title = `${session.title} Note`;
    if (xtermRef.current?.hasSelection()) {
      content = xtermRef.current.getSelectionText();
      title = `${session.title} (Selection)`;
    } else if (xtermRef.current) {
      content = xtermRef.current.getBufferText();
      title = `${session.title} Output`;
    }

    const markdownContent = `# Terminal Output: ${session.title}\n- **Captured**: ${new Date().toLocaleString()}\n- **Workspace**: ${currentWorkspaceId || "Default"}\n- **PID**: ${session.pid || "N/A"}\n- **Directory**: \`${session.cwd || "~"}\`\n\n\`\`\`\n${content || "(No terminal output captured)"}\n\`\`\``;

    setSentToScratchpadRecently(true);
    window.setTimeout(() => setSentToScratchpadRecently(false), 1500);

    onSendToScratchpad?.(title, markdownContent, session.appType, currentWorkspaceId, true);
  }, [session, currentWorkspaceId, onSendToScratchpad]);

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
    <div 
      className={`terminal-card ${isMaximized ? "maximized" : ""} ${isFocused ? "focused" : ""}`}
      onMouseDown={() => onFocus?.(session.id)}
    >
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

          {/* More Actions Dropdown (Copy, Paste, Send to Scratchpad, Restart Session) - FIRST OPTION ON LEFT */}
          <div className="terminal-actions-anchor" ref={actionsAnchorRef}>
            <button
              className={`term-btn ${isActionsDropdownOpen ? "active" : ""}`}
              title="More Actions (Copy, Paste, Scratchpad, Restart)"
              onClick={() => {
                setIsActionsDropdownOpen((prev) => !prev);
                setIsMoveMenuOpen(false);
              }}
            >
              <ChevronDown 
                size={13} 
                className={isActionsDropdownOpen ? "rotate-180 transition-transform duration-150" : "transition-transform duration-150"} 
              />
            </button>

            <TerminalActionsDropdown
              session={session}
              isOpen={isActionsDropdownOpen}
              onClose={() => setIsActionsDropdownOpen(false)}
              anchorRef={actionsAnchorRef}
              onCopy={handleCopyClick}
              onPaste={handlePasteClick}
              onRestart={onRestart}
              onSendToScratchpad={onSendToScratchpad ? handleSendToScratchpadClick : undefined}
              copiedRecently={copiedRecently}
              pastedRecently={pastedRecently}
              sentToScratchpadRecently={sentToScratchpadRecently}
            />
          </div>

          {/* Switch / Move to Workspace Button */}
          {onMoveToWorkspace && (
            <div className="move-workspace-anchor" ref={moveAnchorRef}>
              <button 
                className={`term-btn ${isMoveMenuOpen ? "active" : ""}`}
                title="Switch / Move terminal to another workspace"
                onClick={() => {
                  setIsMoveMenuOpen((prev) => !prev);
                  setIsActionsDropdownOpen(false);
                }}
              >
                <ArrowLeftRight size={13} />
              </button>

              <MoveWorkspaceDropdown
                session={session}
                currentWorkspaceId={currentWorkspaceId || ""}
                availableWorkspaces={availableWorkspaces || []}
                isOpen={isMoveMenuOpen}
                onClose={() => setIsMoveMenuOpen(false)}
                anchorRef={moveAnchorRef}
                onMoveToWorkspace={(targetWsId, switchNow) => {
                  onMoveToWorkspace(session.id, targetWsId, switchNow);
                }}
              />
            </div>
          )}

          <div className="terminal-header-divider" />

          {/* Maximize / Restore Button */}
          <button 
            className="term-btn" 
            title={isMaximized ? "Restore Grid" : "Maximize"}
            onClick={() => onMaximizeToggle(session.id)}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Close Button */}
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
          isFocused={isFocused}
          onActivity={triggerActivity}
          onRestart={onRestart}
          onSendToScratchpad={(title, content) => onSendToScratchpad?.(title, content, session.appType, currentWorkspaceId, true)}
        />
      </div>
    </div>
  );
}
