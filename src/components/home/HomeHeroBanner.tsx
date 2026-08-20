import { Plus, Terminal, Activity, Layers, Sparkles } from "lucide-react";
import { WorkspaceData } from "../../types/workspace";

interface HomeHeroBannerProps {
  workspaces: WorkspaceData[];
  onNewWorkspace: () => void;
}

export default function HomeHeroBanner({
  workspaces,
  onNewWorkspace,
}: HomeHeroBannerProps) {
  // Aggregate live metrics
  const totalWorkspaces = workspaces.length;
  const totalTerminals = workspaces.reduce((acc, w) => acc + w.terminals.length, 0);
  const activeTerminals = workspaces.reduce((acc, w) => {
    const now = Date.now();
    const count = w.terminals.filter(
      (t) => t.lastActiveAt && now - t.lastActiveAt < 5000
    ).length;
    return acc + count;
  }, 0);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="home-hero-card">
      <div className="home-hero-left">
        <div className="home-hero-badge">
          <Sparkles size={13} className="text-sage-light" />
          <span>Mission Control & Workbench</span>
        </div>
        <h1 className="home-hero-title">
          {getGreeting()}, <span className="home-hero-highlight">Developer</span>
        </h1>
        <p className="home-hero-subtitle">
          Manage your active terminal workspaces, spawn AI coding agents, and restore previous workflows with a single click.
        </p>

        {/* Live Quick Counters */}
        <div className="home-hero-stats">
          <div className="home-hero-stat-pill">
            <Layers size={13} className="text-sage" />
            <span className="stat-value">{totalWorkspaces}</span>
            <span className="stat-label">Workspace{totalWorkspaces !== 1 ? "s" : ""}</span>
          </div>

          <div className="home-hero-stat-pill">
            <Terminal size={13} className="text-sage" />
            <span className="stat-value">{totalTerminals}</span>
            <span className="stat-label">Terminal{totalTerminals !== 1 ? "s" : ""}</span>
          </div>

          <div className="home-hero-stat-pill active-glow">
            <Activity size={13} className="text-green" />
            <span className="stat-value">{activeTerminals}</span>
            <span className="stat-label">Active Now</span>
          </div>
        </div>
      </div>

      <div className="home-hero-right">
        <button className="btn-primary home-new-ws-btn" onClick={onNewWorkspace}>
          <Plus size={16} />
          <span>New Workspace</span>
        </button>
      </div>
    </div>
  );
}
