import { 
  Layers, 
  Terminal, 
  ArrowUpRight, 
  Plus, 
  Sparkles, 
  Bot, 
  Zap, 
  LayoutGrid, 
  Columns, 
  Rows, 
  Maximize2,
  BrainCircuit,
  Rocket,
  Boxes,
  Code2
} from "lucide-react";
import { WorkspaceData, WorkspaceActivityState } from "../../types/workspace";

interface HomeWorkspaceFleetProps {
  workspaces: WorkspaceData[];
  onNavigateToWorkspace: (workspaceId: string) => void;
  onSpawnInWorkspace: (workspaceId: string) => void;
  onNewWorkspace: () => void;
}

export default function HomeWorkspaceFleet({
  workspaces,
  onNavigateToWorkspace,
  onSpawnInWorkspace,
  onNewWorkspace,
}: HomeWorkspaceFleetProps) {
  // Helper to compute activity status
  const getWorkspaceActivityState = (ws: WorkspaceData): WorkspaceActivityState => {
    if (ws.terminals.length === 0) return "empty";
    const now = Date.now();
    const hasActive = ws.terminals.some(
      (t) => t.lastActiveAt && now - t.lastActiveAt < 4000
    );
    return hasActive ? "active" : "idle";
  };

  // Helper for layout icons
  const getLayoutIcon = (layout: WorkspaceData["gridLayout"]) => {
    switch (layout) {
      case "side-by-side":
        return <Columns size={12} />;
      case "stacked":
        return <Rows size={12} />;
      case "grid":
        return <LayoutGrid size={12} />;
      case "focus":
        return <Maximize2 size={12} />;
      default:
        return <Columns size={12} />;
    }
  };

  // Helper for terminal app icons
  const getAppIcon = (appType: string) => {
    switch (appType) {
      case "antigravity":
        return <Sparkles size={12} className="text-sage-light" />;
      case "claude":
        return <Bot size={12} className="text-orange-400" />;
      case "codex":
        return <BrainCircuit size={12} className="text-emerald-400" />;
      case "grok":
        return <Rocket size={12} className="text-rose-400" />;
      case "opencode":
        return <Boxes size={12} className="text-cyan-400" />;
      case "kilo":
        return <Zap size={12} className="text-yellow-400" />;
      case "wsl":
        return <Layers size={12} className="text-blue-400" />;
      case "gitbash":
        return <Terminal size={12} className="text-amber-300" />;
      case "node":
        return <Code2 size={12} className="text-emerald-400" />;
      case "python":
        return <Code2 size={12} className="text-yellow-300" />;
      case "cmd":
        return <Terminal size={12} className="text-slate-300" />;
      case "custom":
        return <Code2 size={12} className="text-purple-400" />;
      default:
        return <Terminal size={12} className="text-sage" />;
    }
  };

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <div className="home-section-title-wrap">
          <div className="home-section-icon">
            <Layers size={16} className="text-sage" />
          </div>
          <div>
            <h3 className="home-section-title">Live Workspace Fleet</h3>
            <p className="home-section-desc">
              Real-time monitoring of all active workspaces and running processes
            </p>
          </div>
        </div>

        <button className="btn-secondary btn-sm" onClick={onNewWorkspace}>
          <Plus size={13} />
          <span>New Workspace</span>
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="home-empty-fleet">
          <Layers size={28} className="text-muted" />
          <h4>No Active Workspaces</h4>
          <p>Create your first workspace to start running terminal sessions and AI agents.</p>
          <button className="btn-primary" onClick={onNewWorkspace}>
            <Plus size={14} />
            <span>Create Workspace</span>
          </button>
        </div>
      ) : (
        <div className="home-fleet-grid">
          {workspaces.map((ws) => {
            const state = getWorkspaceActivityState(ws);
            return (
              <div 
                key={ws.id} 
                className={`home-fleet-card ${state}`}
                onClick={() => onNavigateToWorkspace(ws.id)}
              >
                <div className="home-fleet-card-top">
                  <div className="home-fleet-card-title-box">
                    <div className="ws-status-dot-wrapper">
                      <span className={`ws-status-dot ${state}`} />
                    </div>
                    <span className="home-fleet-card-name" title={ws.name}>{ws.name}</span>
                  </div>

                  <div className="home-fleet-badges">
                    <span className="home-fleet-layout-badge" title={`Layout: ${ws.gridLayout}`}>
                      {getLayoutIcon(ws.gridLayout)}
                      <span>{ws.gridLayout}</span>
                    </span>

                    <span className={`home-fleet-state-pill ${state}`}>
                      {state === "active" ? "Active" : state === "idle" ? "Idle" : "Empty"}
                    </span>
                  </div>
                </div>

                {/* Terminals icon avatars summary */}
                <div className="home-fleet-body">
                  {ws.terminals.length === 0 ? (
                    <div className="home-fleet-no-terms">
                      <span>No active terminals</span>
                    </div>
                  ) : (
                    <div className="home-fleet-icons-row">
                      <div className="home-fleet-app-icons">
                        {ws.terminals.slice(0, 5).map((t, idx) => (
                          <span 
                            key={t.id || idx} 
                            className="fleet-app-avatar" 
                            title={`${t.title || t.shellOrCommand} (${t.appType})`}
                          >
                            {getAppIcon(t.appType)}
                          </span>
                        ))}
                        {ws.terminals.length > 5 && (
                          <span className="fleet-more-badge">+{ws.terminals.length - 5}</span>
                        )}
                      </div>
                      <span className="fleet-term-summary">
                        {ws.terminals.length} process{ws.terminals.length !== 1 ? "es" : ""} running
                      </span>
                    </div>
                  )}
                </div>

                {/* Card footer actions */}
                <div className="home-fleet-footer">
                  <span className="home-fleet-cwd-text" title={ws.defaultCwd || "~"}>
                    {ws.defaultCwd || "Default path (~)"}
                  </span>

                  <div className="home-fleet-footer-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="home-fleet-action-btn"
                      title="Spawn terminal in this workspace"
                      onClick={() => onSpawnInWorkspace(ws.id)}
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                    <button 
                      className="home-fleet-action-btn primary"
                      title="Switch to this workspace"
                      onClick={() => onNavigateToWorkspace(ws.id)}
                    >
                      <span>Jump In</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
