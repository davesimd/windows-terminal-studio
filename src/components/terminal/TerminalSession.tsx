import { useState } from "react";
import { 
  Terminal as TermIcon, 
  Bot, 
  Zap, 
  Sparkles, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  X, 
  Cpu
} from "lucide-react";
import XTermInstance from "./XTermInstance";

export interface TerminalData {
  id: string;
  title: string;
  appType: "powershell" | "cmd" | "wsl" | "antigravity" | "gemini" | "claude" | "kilo" | "custom";
  shellOrCommand: string;
  args?: string[];
  cwd?: string;
  pid?: number;
  status: "running" | "idle" | "exited";
  lastActiveAt?: number;
  startedAt?: number;
  outputChunksCount?: number;
}

interface TerminalSessionProps {
  session: TerminalData;
  isMaximized: boolean;
  onMaximizeToggle: (id: string) => void;
  onClose: (id: string) => void;
  onRestart: (id: string) => void;
  onSessionActivity?: (id: string) => void;
}

export default function TerminalSession({
  session,
  isMaximized,
  onMaximizeToggle,
  onClose,
  onRestart,
  onSessionActivity,
}: TerminalSessionProps) {
  const [hasRecentActivity, setHasRecentActivity] = useState(false);

  const triggerActivity = () => {
    setHasRecentActivity(true);
    onSessionActivity?.(session.id);
    setTimeout(() => setHasRecentActivity(false), 800);
  };

  const getAppIcon = () => {
    switch (session.appType) {
      case "antigravity":
        return <Zap size={14} className="text-cyan-400" />;
      case "gemini":
        return <Sparkles size={14} className="text-blue-400" />;
      case "claude":
        return <Bot size={14} className="text-orange-400" />;
      case "kilo":
        return <Zap size={14} className="text-yellow-400" />;
      default:
        return <TermIcon size={14} className="text-indigo-400" />;
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
        <XTermInstance session={session} onActivity={triggerActivity} />
      </div>
    </div>
  );
}
