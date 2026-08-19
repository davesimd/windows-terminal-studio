import { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Clock, 
  Terminal as TermIcon, 
  Folder, 
  Sparkles, 
  Zap, 
  Bot, 
  ArrowUpRight, 
  Download, 
  Trash2, 
  Search, 
  Cpu, 
  Layers
} from "lucide-react";
import { WorkspaceData } from "../types/workspace";
import { HistoricalSession, ToolUsageStat } from "../types/analytics";

interface AnalyticsPageProps {
  workspaces: WorkspaceData[];
  sessionHistory: HistoricalSession[];
  onNavigateToWorkspace: (workspaceId: string) => void;
  onClearHistory: () => void;
}

export default function AnalyticsPage({
  workspaces,
  sessionHistory,
  onNavigateToWorkspace,
  onClearHistory,
}: AnalyticsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTool, setFilterTool] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick every second for real-time uptime computation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds into readable duration (e.g., "1h 24m 30s", "2m 15s", or "45s")
  const formatDuration = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    if (s < 60) return `${s}s`;
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins < 60) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Combine currently active terminals and closed historical sessions
  const allSessions = useMemo(() => {
    const activeMap = new Map<string, boolean>();

    // Current active terminals from workspaces
    const currentActive: HistoricalSession[] = [];
    workspaces.forEach((ws) => {
      ws.terminals.forEach((term) => {
        activeMap.set(term.id, true);
        const started = term.startedAt || now;
        const dur = Math.max(0, (now - started) / 1000);
        currentActive.push({
          id: term.id,
          workspaceId: ws.id,
          workspaceName: ws.name,
          title: term.title,
          appType: term.appType,
          shellOrCommand: term.shellOrCommand,
          cwd: term.cwd,
          pid: term.pid,
          startedAt: started,
          status: term.status || "running",
          outputChunksCount: term.outputChunksCount || 0,
          durationSeconds: dur,
        });
      });
    });

    // History sessions not currently in active
    const historical = sessionHistory
      .filter((h) => !activeMap.has(h.id))
      .map((h) => {
        const ended = h.endedAt || now;
        const dur = Math.max(0, (ended - h.startedAt) / 1000);
        return {
          ...h,
          durationSeconds: h.durationSeconds !== undefined ? h.durationSeconds : dur,
        };
      });

    return [...currentActive, ...historical].sort((a, b) => b.startedAt - a.startedAt);
  }, [workspaces, sessionHistory, now]);

  // Aggregate high-level KPIs
  const totalActiveTerminals = workspaces.reduce((sum, w) => sum + w.terminals.length, 0);
  const totalSpawnedCount = allSessions.length;
  const totalCombinedRuntimeSeconds = allSessions.reduce(
    (sum, s) => sum + (s.durationSeconds || 0),
    0
  );
  const totalOutputChunks = allSessions.reduce(
    (sum, s) => sum + (s.outputChunksCount || 0),
    0
  );
  const activeWorkspacesCount = workspaces.filter((w) => w.terminals.length > 0).length;

  // Tool usage distribution stats
  const toolStats: ToolUsageStat[] = useMemo(() => {
    const counts: Record<string, { count: number; totalDuration: number; title: string }> = {};

    allSessions.forEach((s) => {
      const type = s.appType;
      if (!counts[type]) {
        counts[type] = { count: 0, totalDuration: 0, title: s.title };
      }
      counts[type].count += 1;
      counts[type].totalDuration += s.durationSeconds || 0;
    });

    const total = allSessions.length || 1;
    return Object.entries(counts).map(([type, val]) => ({
      appType: type as ToolUsageStat["appType"],
      title: type.toUpperCase(),
      count: val.count,
      totalDurationSeconds: val.totalDuration,
      percentage: Math.round((val.count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [allSessions]);

  // Workspace allocation stats
  const workspaceStats = useMemo(() => {
    return workspaces.map((ws) => {
      const wsSessions = allSessions.filter((s) => s.workspaceId === ws.id);
      const totalDur = wsSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      return {
        id: ws.id,
        name: ws.name,
        activeCount: ws.terminals.length,
        totalSessions: wsSessions.length,
        totalDurationSeconds: totalDur,
      };
    });
  }, [workspaces, allSessions]);

  // Filtered session list for the table
  const filteredSessions = useMemo(() => {
    return allSessions.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.cwd && s.cwd.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.pid && s.pid.toString().includes(searchQuery));

      const matchesTool = filterTool === "all" || s.appType === filterTool;
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;

      return matchesSearch && matchesTool && matchesStatus;
    });
  }, [allSessions, searchQuery, filterTool, filterStatus]);

  // Export Telemetry as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          totalSessions: allSessions.length,
          kpis: {
            activeTerminals: totalActiveTerminals,
            totalCombinedRuntime: formatDuration(totalCombinedRuntimeSeconds),
            totalOutputChunks,
          },
          toolDistribution: toolStats,
          sessions: allSessions,
        },
        null,
        2
      )
    );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workspace_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Telemetry as CSV
  const handleExportCSV = () => {
    const headers = ["Session ID", "Title", "App Type", "Workspace", "PID", "Status", "Duration (s)", "Started At", "CWD"];
    const rows = allSessions.map((s) => [
      s.id,
      `"${s.title.replace(/"/g, '""')}"`,
      s.appType,
      `"${s.workspaceName.replace(/"/g, '""')}"`,
      s.pid || "",
      s.status,
      Math.round(s.durationSeconds || 0),
      new Date(s.startedAt).toISOString(),
      `"${(s.cwd || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `workspace_telemetry_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getToolIcon = (appType: string) => {
    switch (appType) {
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
    <div className="analytics-hub animate-fade">
      {/* Top Export Controls */}
      <div className="analytics-header">
        <div className="analytics-header-actions">
          <button className="btn-export" onClick={handleExportJSON} title="Export telemetry as JSON">
            <Download size={13} />
            <span>Export JSON</span>
          </button>
          <button className="btn-export" onClick={handleExportCSV} title="Export telemetry as CSV">
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          {sessionHistory.length > 0 && (
            <button className="btn-clear-history" onClick={onClearHistory} title="Clear exited session logs">
              <Trash2 size={13} />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-badge emerald">
            <Activity size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Terminals</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{totalActiveTerminals}</span>
              <span className="kpi-subtext">running live</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-badge indigo">
            <Layers size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Spawned</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{totalSpawnedCount}</span>
              <span className="kpi-subtext">all-time sessions</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-badge blue">
            <Clock size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Combined Runtime</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{formatDuration(totalCombinedRuntimeSeconds)}</span>
              <span className="kpi-subtext">aggregate uptime</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-badge amber">
            <Folder size={18} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Active Workspaces</span>
            <div className="kpi-value-row">
              <span className="kpi-value">
                {activeWorkspacesCount} <span className="text-slate-500 font-normal">/ {workspaces.length}</span>
              </span>
              <span className="kpi-subtext">with running tasks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Tool Distribution & Workspace Time Allocation */}
      <div className="analytics-middle-grid">
        {/* Tool Distribution Card */}
        <div className="analytics-card">
          <div className="card-header">
            <div className="card-header-left">
              <Cpu size={16} className="text-indigo-400" />
              <h3>Application & Shell Distribution</h3>
            </div>
            <span className="card-tag">{toolStats.length} tools used</span>
          </div>

          <div className="tool-distribution-list">
            {toolStats.length === 0 ? (
              <div className="empty-analytics-msg">No tools launched yet.</div>
            ) : (
              toolStats.map((tool) => (
                <div key={tool.appType} className="tool-stat-row">
                  <div className="tool-stat-header">
                    <div className="tool-name-icon">
                      {getToolIcon(tool.appType)}
                      <span className="tool-name">{tool.appType.toUpperCase()}</span>
                    </div>
                    <div className="tool-meta">
                      <span className="tool-duration">{formatDuration(tool.totalDurationSeconds)}</span>
                      <span className="tool-count">{tool.count} session{tool.count > 1 ? "s" : ""}</span>
                      <span className="tool-pct">{tool.percentage}%</span>
                    </div>
                  </div>

                  <div className="stat-progress-track">
                    <div
                      className={`stat-progress-fill ${tool.appType}`}
                      style={{ width: `${Math.max(tool.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace Allocation Card */}
        <div className="analytics-card">
          <div className="card-header">
            <div className="card-header-left">
              <Folder size={16} className="text-amber-400" />
              <h3>Workspace Uptime & Allocation</h3>
            </div>
            <span className="card-tag">{workspaces.length} workspaces</span>
          </div>

          <div className="workspace-alloc-list">
            {workspaceStats.map((ws) => {
              const maxDur = Math.max(...workspaceStats.map((w) => w.totalDurationSeconds), 1);
              const pct = Math.round((ws.totalDurationSeconds / maxDur) * 100);

              return (
                <div key={ws.id} className="workspace-alloc-item">
                  <div className="ws-alloc-header">
                    <div className="ws-alloc-title-group">
                      <span className="ws-alloc-name">{ws.name}</span>
                      {ws.activeCount > 0 ? (
                        <span className="badge-active-tag">🟢 {ws.activeCount} active</span>
                      ) : (
                        <span className="badge-idle-tag">⚪ idle</span>
                      )}
                    </div>
                    <div className="ws-alloc-right">
                      <span className="ws-alloc-dur">{formatDuration(ws.totalDurationSeconds)}</span>
                      <button
                        className="btn-jump-ws"
                        onClick={() => onNavigateToWorkspace(ws.id)}
                        title="Jump to this workspace"
                      >
                        <ArrowUpRight size={12} />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>

                  <div className="stat-progress-track">
                    <div
                      className="stat-progress-fill workspace-bar"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live & Historical Sessions Table */}
      <div className="analytics-table-container">
        <div className="table-toolbar">
          <div className="table-title-group">
            <h3>Terminal Sessions & History</h3>
            <span className="table-count-badge">{filteredSessions.length} sessions</span>
          </div>

          <div className="table-filter-controls">
            {/* Search Input */}
            <div className="table-search-box">
              <Search size={13} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search session, PID, path..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tool Filter */}
            <select
              className="table-select-filter"
              value={filterTool}
              onChange={(e) => setFilterTool(e.target.value)}
            >
              <option value="all">All Tools</option>
              <option value="powershell">PowerShell</option>
              <option value="kilo">Kilo CLI</option>
              <option value="gemini">Gemini CLI</option>
              <option value="claude">Claude Code</option>
              <option value="cmd">CMD</option>
              <option value="wsl">WSL</option>
            </select>

            {/* Status Filter */}
            <select
              className="table-select-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="running">Running / Active</option>
              <option value="idle">Idle</option>
              <option value="exited">Exited</option>
            </select>
          </div>
        </div>

        <div className="table-scroll-wrapper">
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>Application</th>
                <th>Session Title</th>
                <th>Workspace</th>
                <th>PID</th>
                <th>Live Uptime</th>
                <th>Status</th>
                <th>Working Directory</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-table-row">
                    No terminal sessions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isRunning = s.status === "running";
                  return (
                    <tr key={s.id} className={`telemetry-row ${s.status}`}>
                      <td>
                        <div className="table-app-cell">
                          {getToolIcon(s.appType)}
                          <span className="app-badge-text">{s.appType}</span>
                        </div>
                      </td>

                      <td className="font-medium text-slate-200">
                        {s.title}
                      </td>

                      <td>
                        <span className="ws-chip">
                          <Folder size={11} className="text-slate-400" />
                          {s.workspaceName}
                        </span>
                      </td>

                      <td>
                        {s.pid ? (
                          <span className="pid-chip">
                            <Cpu size={10} />
                            {s.pid}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td>
                        <span className={`uptime-text ${isRunning ? "running" : ""}`}>
                          {formatDuration(s.durationSeconds || 0)}
                        </span>
                      </td>

                      <td>
                        {isRunning ? (
                          <span className="status-pill active">
                            <span className="dot pulse" />
                            Running
                          </span>
                        ) : s.status === "idle" ? (
                          <span className="status-pill idle">
                            <span className="dot" />
                            Idle
                          </span>
                        ) : (
                          <span className="status-pill exited">
                            <span className="dot" />
                            Exited
                          </span>
                        )}
                      </td>

                      <td className="cwd-cell" title={s.cwd || "Default user home"}>
                        {s.cwd || "~"}
                      </td>

                      <td className="text-right">
                        {isRunning ? (
                          <button
                            className="btn-table-action"
                            onClick={() => onNavigateToWorkspace(s.workspaceId)}
                            title="Focus this terminal in its workspace"
                          >
                            <ArrowUpRight size={12} />
                            <span>Jump</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
