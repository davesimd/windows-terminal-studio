import { useState, useMemo } from "react";
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Terminal, 
  Folder, 
  Sparkles, 
  Bot, 
  Zap, 
  Clock, 
  Search, 
  Layers, 
  FolderOpen,
  BrainCircuit,
  Rocket,
  Boxes,
  Server,
  Code2
} from "lucide-react";
import { ClosedWorkspaceData, WorkspaceData } from "../../types/workspace";
import { HistoricalSession } from "../../types/analytics";

interface HomeRecentHistoryProps {
  closedWorkspaces: ClosedWorkspaceData[];
  sessionHistory: HistoricalSession[];
  activeWorkspaces: WorkspaceData[];
  onReopenWorkspace: (closedWs: ClosedWorkspaceData) => void;
  onResumeSession: (session: HistoricalSession) => void;
  onDeleteClosedWorkspace: (id: string) => void;
  onClearClosedWorkspaces: () => void;
  onClearSessionHistory: () => void;
}

export default function HomeRecentHistory({
  closedWorkspaces,
  sessionHistory,
  activeWorkspaces,
  onReopenWorkspace,
  onResumeSession,
  onDeleteClosedWorkspace,
  onClearClosedWorkspaces,
  onClearSessionHistory,
}: HomeRecentHistoryProps) {
  const [activeTab, setActiveTab] = useState<"workspaces" | "sessions">("workspaces");
  const [sessionFilter, setSessionFilter] = useState<"all" | "closed" | "running">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Format relative time (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diff < 60) return "Just now";
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  // Format duration in minutes and seconds
  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "--";
    const s = Math.max(0, Math.floor(seconds));
    if (s < 60) return `${s}s`;
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    if (mins < 60) return `${mins}m ${rem}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  // Helper for app type icons
  const getAppIcon = (appType: string) => {
    switch (appType) {
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
      case "wsl":
        return <Terminal size={14} className="text-blue-400" />;
      case "gitbash":
        return <Terminal size={14} className="text-amber-400" />;
      case "node":
        return <Code2 size={14} className="text-emerald-400" />;
      case "python":
        return <Code2 size={14} className="text-yellow-300" />;
      default:
        return <Terminal size={14} className="text-sage" />;
    }
  };

  // Active terminal IDs
  const activeTermIds = useMemo(() => {
    const ids = new Set<string>();
    activeWorkspaces.forEach((ws) => ws.terminals.forEach((t) => ids.add(t.id)));
    return ids;
  }, [activeWorkspaces]);

  // Combine telemetry history and active terminals
  const allSessionsCombined = useMemo(() => {
    const now = Date.now();
    const activeList: HistoricalSession[] = [];
    activeWorkspaces.forEach((ws) => {
      ws.terminals.forEach((term) => {
        const started = term.startedAt || now;
        activeList.push({
          id: term.id,
          workspaceId: ws.id,
          workspaceName: ws.name,
          title: term.title,
          appType: term.appType,
          shellOrCommand: term.shellOrCommand,
          cwd: term.cwd,
          startedAt: started,
          durationSeconds: (now - started) / 1000,
          status: "running",
          outputChunksCount: term.outputChunksCount || 0,
        });
      });
    });

    const inactiveList = sessionHistory.filter((s) => !activeTermIds.has(s.id));
    return [...activeList, ...inactiveList].sort((a, b) => b.startedAt - a.startedAt);
  }, [activeWorkspaces, sessionHistory, activeTermIds]);

  // Filtered closed workspaces
  const filteredClosedWorkspaces = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return closedWorkspaces;
    return closedWorkspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.defaultCwd && w.defaultCwd.toLowerCase().includes(q)) ||
        w.terminals.some((t) => t.title?.toLowerCase().includes(q) || t.shellOrCommand.toLowerCase().includes(q))
    );
  }, [closedWorkspaces, searchQuery]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    let list = allSessionsCombined;
    if (sessionFilter === "closed") {
      list = list.filter((s) => s.status === "exited" || !activeTermIds.has(s.id));
    } else if (sessionFilter === "running") {
      list = list.filter((s) => s.status === "running" && activeTermIds.has(s.id));
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.appType.toLowerCase().includes(q) ||
        s.shellOrCommand.toLowerCase().includes(q) ||
        s.workspaceName.toLowerCase().includes(q) ||
        (s.cwd && s.cwd.toLowerCase().includes(q))
    );
  }, [allSessionsCombined, sessionFilter, activeTermIds, searchQuery]);

  return (
    <div className="home-section-card">
      <div className="home-section-header">
        <div className="home-section-title-wrap">
          <div className="home-section-icon">
            <History size={16} className="text-sage" />
          </div>
          <div>
            <h3 className="home-section-title">Recent History & Session Recovery</h3>
            <p className="home-section-desc">
              Reopen recently closed workspaces or resume previous terminal sessions with preserved settings
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="home-history-tabs">
          <button 
            className={`home-history-tab ${activeTab === "workspaces" ? "active" : ""}`}
            onClick={() => setActiveTab("workspaces")}
          >
            <Layers size={13} />
            <span>Closed Workspaces</span>
            {closedWorkspaces.length > 0 && (
              <span className="home-tab-badge">{closedWorkspaces.length}</span>
            )}
          </button>

          <button 
            className={`home-history-tab ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            <Terminal size={13} />
            <span>Recent Sessions</span>
            {allSessionsCombined.length > 0 && (
              <span className="home-tab-badge">{allSessionsCombined.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Toolbar: Search and Filter Actions */}
      <div className="home-history-toolbar">
        <div className="home-history-search">
          <Search size={14} className="text-muted" />
          <input
            type="text"
            placeholder={
              activeTab === "workspaces"
                ? "Search closed workspaces by name or folder..."
                : "Search recent sessions by title, command, or app..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>

        <div className="home-history-right-controls">
          {activeTab === "sessions" && (
            <div className="session-status-filter-pills">
              <button
                className={`filter-pill ${sessionFilter === "all" ? "active" : ""}`}
                onClick={() => setSessionFilter("all")}
              >
                All ({allSessionsCombined.length})
              </button>
              <button
                className={`filter-pill ${sessionFilter === "closed" ? "active" : ""}`}
                onClick={() => setSessionFilter("closed")}
              >
                Closed ({sessionHistory.filter(s => !activeTermIds.has(s.id)).length})
              </button>
              <button
                className={`filter-pill ${sessionFilter === "running" ? "active" : ""}`}
                onClick={() => setSessionFilter("running")}
              >
                Running ({activeTermIds.size})
              </button>
            </div>
          )}

          {activeTab === "workspaces" ? (
            closedWorkspaces.length > 0 && (
              <button 
                className="btn-ghost btn-sm text-red"
                onClick={onClearClosedWorkspaces}
                title="Clear all closed workspace records"
              >
                <Trash2 size={13} />
                <span>Clear History</span>
              </button>
            )
          ) : (
            sessionHistory.length > 0 && (
              <button 
                className="btn-ghost btn-sm text-red"
                onClick={onClearSessionHistory}
                title="Clear all session records"
              >
                <Trash2 size={13} />
                <span>Clear History</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Tab 1: Closed Workspaces View */}
      {activeTab === "workspaces" && (
        <div className="home-history-content">
          {filteredClosedWorkspaces.length === 0 ? (
            <div className="home-history-empty">
              <Layers size={28} className="text-muted" />
              <h4>No Closed Workspaces Recorded</h4>
              <p>
                {searchQuery
                  ? "No closed workspaces match your search query."
                  : "When you delete or close a workspace from the sidebar, a full snapshot is saved here so you can reopen all its terminals and layout with 1 click."}
              </p>
            </div>
          ) : (
            <div className="home-closed-ws-grid">
              {filteredClosedWorkspaces.map((ws) => (
                <div key={ws.id} className="home-closed-ws-card">
                  <div className="home-closed-ws-top">
                    <div className="home-closed-ws-name-row">
                      <FolderOpen size={16} className="text-sage" />
                      <h4 className="home-closed-ws-name">{ws.name}</h4>
                    </div>

                    <div className="home-closed-ws-meta">
                      <Clock size={11} className="text-muted" />
                      <span>{formatRelativeTime(ws.closedAt)}</span>
                    </div>
                  </div>

                  <div className="home-closed-ws-details">
                    <div className="home-closed-ws-info-row">
                      <div className="home-closed-ws-app-icons">
                        {ws.terminals.slice(0, 3).map((t, idx) => (
                          <span key={idx} className="closed-ws-app-avatar" title={t.title || t.shellOrCommand}>
                            {getAppIcon(t.appType)}
                          </span>
                        ))}
                        <span className="closed-ws-term-count">
                          {ws.terminals.length} terminal{ws.terminals.length !== 1 ? "s" : ""}
                        </span>
                        <span className="closed-ws-layout-text">• {ws.gridLayout}</span>
                      </div>

                      {ws.defaultCwd && (
                        <div className="home-closed-ws-cwd" title={ws.defaultCwd}>
                          <Folder size={11} className="text-muted" />
                          <span>{ws.defaultCwd}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="home-closed-ws-actions">
                    <button
                      className="btn-ghost btn-sm text-muted"
                      onClick={() => onDeleteClosedWorkspace(ws.id)}
                      title="Remove this workspace from history"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      className="btn-primary btn-sm reopen-btn"
                      onClick={() => onReopenWorkspace(ws)}
                    >
                      <RotateCcw size={13} />
                      <span>Reopen Workspace</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recent Sessions View */}
      {activeTab === "sessions" && (
        <div className="home-history-content">
          {filteredSessions.length === 0 ? (
            <div className="home-history-empty">
              <Terminal size={28} className="text-muted" />
              <h4>No Sessions Recorded</h4>
              <p>
                {searchQuery
                  ? "No sessions match your search query."
                  : "All running and closed terminal sessions appear here. You can resume any exited session with 1 click."}
              </p>
            </div>
          ) : (
            <div className="home-sessions-table-wrap">
              <table className="home-sessions-table">
                <thead>
                  <tr>
                    <th>Session / Process</th>
                    <th>Status</th>
                    <th>Workspace</th>
                    <th>Working Directory</th>
                    <th>Duration</th>
                    <th>Timestamp</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => {
                    const isRunning = session.status === "running" && activeTermIds.has(session.id);
                    return (
                      <tr key={session.id} className="home-session-row">
                        <td className="session-title-cell">
                          <div className="session-title-wrap">
                            <div className="session-icon-box">
                              {getAppIcon(session.appType)}
                            </div>
                            <div>
                              <span className="session-main-title">{session.title}</span>
                              <span className="session-command-sub">{session.shellOrCommand}</span>
                            </div>
                          </div>
                        </td>

                        <td className="session-status-cell">
                          <span className={`session-status-badge ${isRunning ? "running" : "exited"}`}>
                            {isRunning ? (
                              <>
                                <span className="status-live-dot" />
                                <span>Running</span>
                              </>
                            ) : (
                              <span>Exited</span>
                            )}
                          </span>
                        </td>

                        <td className="session-ws-cell">
                          <span className="session-ws-badge">{session.workspaceName}</span>
                        </td>

                        <td className="session-cwd-cell">
                          <div className="session-cwd-wrap" title={session.cwd || "Default User Directory"}>
                            <Folder size={11} className="text-muted" />
                            <span>{session.cwd || "~ (Home)"}</span>
                          </div>
                        </td>

                        <td className="session-duration-cell">
                          <span className="session-dur-text">{formatDuration(session.durationSeconds)}</span>
                        </td>

                        <td className="session-ended-cell">
                          <span className="session-ended-text">
                            {formatRelativeTime(session.endedAt || session.startedAt)}
                          </span>
                        </td>

                        <td className="session-actions-cell text-right">
                          <button
                            className="btn-primary btn-sm resume-session-btn"
                            title="Resume / re-launch this session"
                            onClick={() => onResumeSession(session)}
                          >
                            <RotateCcw size={12} />
                            <span>{isRunning ? "Duplicate" : "Resume"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
