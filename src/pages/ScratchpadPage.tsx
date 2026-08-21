import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Rocket,
  FileText,
  Pin,
  Download,
  Search,
  BookOpen,
  Columns,
  Eye,
  Edit3,
  FolderPlus,
  Folder,
  ArrowRight,
  Undo2,
  Redo2,
  RotateCcw,
  ArchiveRestore,
  History,
  Compass,
  X,
} from "lucide-react";
import { ScratchpadItem, DeletedScratchpadItem, INITIAL_SCRATCHPAD } from "../types/scratchpad";
import { WorkspaceData } from "../types/workspace";
import { DirectoryTemplate } from "../types/settings";
import { ALL_PRESET_DEFINITIONS } from "../constants/presets";
import { AppType } from "../types/analytics";

interface ScratchpadPageProps {
  scratchpads: ScratchpadItem[];
  activePadId: string;
  onSelectPad: (id: string) => void;
  onCreatePad: () => void;
  onUpdatePad: (id: string, patch: Partial<ScratchpadItem>) => void;
  onDeletePad: (id: string) => void;
  onDuplicatePad: (id: string) => void;
  deletedScratchpads?: DeletedScratchpadItem[];
  onRestorePad?: (id: string) => void;
  onPermanentDeletePad?: (id: string) => void;
  onClearDeletedPads?: () => void;
  workspaces: WorkspaceData[];
  activeWorkspaceId: string;
  onSpawnAgent: (config: {
    agentType: AppType;
    prompt: string;
    targetWorkspaceId: string | "new";
    newWorkspaceName?: string;
    autoSend: boolean;
    cwd?: string;
  }) => void;
  directoryTemplates?: DirectoryTemplate[];
  defaultCwd?: string;
  visibleAgents?: Record<string, boolean>;
}

type ViewMode = "split" | "editor" | "preview";

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const SCRATCHPAD_VIEW_MODE_KEY = "desktop_studio_scratchpad_view_mode_v1";

export default function ScratchpadPage({
  scratchpads,
  activePadId,
  onSelectPad,
  onCreatePad,
  onUpdatePad,
  onDeletePad,
  onDuplicatePad,
  deletedScratchpads = [],
  onRestorePad,
  onPermanentDeletePad,
  onClearDeletedPads,
  workspaces,
  activeWorkspaceId,
  onSpawnAgent,
  directoryTemplates = [],
  defaultCwd = "",
  visibleAgents,
}: ScratchpadPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(SCRATCHPAD_VIEW_MODE_KEY);
      if (saved === "editor" || saved === "split" || saved === "preview") {
        return saved;
      }
    } catch {
      // ignore
    }
    return "split";
  });

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(SCRATCHPAD_VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [isDeletedHistoryOpen, setIsDeletedHistoryOpen] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [toast, setToast] = useState<ToastState | null>(null);

  // Spawn agent modal parameters
  const [selectedAgent, setSelectedAgent] = useState<AppType>("antigravity");
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(activeWorkspaceId || "ws_default");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [customCwd, setCustomCwd] = useState<string>(defaultCwd || "");

  // Active scratchpad item
  const activePad = useMemo(() => {
    return scratchpads.find((p) => p.id === activePadId) || scratchpads[0] || INITIAL_SCRATCHPAD;
  }, [scratchpads, activePadId]);

  // Local editor content buffer for smooth typing and debounced saving
  const [contentBuffer, setContentBuffer] = useState(activePad?.content || "");
  const [titleBuffer, setTitleBuffer] = useState(activePad?.title || "");
  const saveTimeoutRef = useRef<number | null>(null);

  // Undo / Redo history state
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const lastSnapshotContentRef = useRef<string>(activePad?.content || "");
  const snapshotTimerRef = useRef<number | null>(null);

  // Keep buffer in sync when switching scratchpads
  useEffect(() => {
    if (activePad) {
      setContentBuffer(activePad.content);
      setTitleBuffer(activePad.title);
      setSaveStatus("saved");
      undoStackRef.current = [];
      redoStackRef.current = [];
      lastSnapshotContentRef.current = activePad.content;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [activePad?.id]);

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) => {
    setToast({ message, actionLabel, onAction });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  };

  const pushUndoSnapshot = (prevText: string) => {
    if (undoStackRef.current.length > 80) {
      undoStackRef.current.shift();
    }
    undoStackRef.current.push(prevText);
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const handleUndo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(contentBuffer);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    lastSnapshotContentRef.current = prev;
    setContentBuffer(prev);
    onUpdatePad(activePad.id, { content: prev, updatedAt: Date.now() });
    showToast("Undo applied");
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(contentBuffer);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    lastSnapshotContentRef.current = next;
    setContentBuffer(next);
    onUpdatePad(activePad.id, { content: next, updatedAt: Date.now() });
    showToast("Redo applied");
  };

  // Keyboard shortcut listener for textarea (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z / Tab)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (isCtrlOrCmd && !e.altKey) {
      // Ctrl+Z or Cmd+Z
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      // Ctrl+Y (Redo)
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        handleRedo();
        return;
      }
    }

    // Tab key indentation support in prompt editor
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = contentBuffer.substring(0, start) + "  " + contentBuffer.substring(end);
      handleContentChange(newVal);
      window.requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  // Debounced auto-save and undo snapshot capture handler
  const handleContentChange = (newVal: string) => {
    // Capture snapshot for undo if meaningful change has occurred
    if (snapshotTimerRef.current) {
      window.clearTimeout(snapshotTimerRef.current);
    }
    const currentBase = lastSnapshotContentRef.current;
    if (Math.abs(newVal.length - currentBase.length) >= 2 || newVal.endsWith("\n")) {
      snapshotTimerRef.current = window.setTimeout(() => {
        pushUndoSnapshot(currentBase);
        lastSnapshotContentRef.current = newVal;
      }, 600);
    }

    setContentBuffer(newVal);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      onUpdatePad(activePad.id, { content: newVal, updatedAt: Date.now() });
      setSaveStatus("saved");
    }, 450);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitleBuffer(newTitle);
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      onUpdatePad(activePad.id, { title: newTitle || "Untitled Prompt", updatedAt: Date.now() });
      setSaveStatus("saved");
    }, 450);
  };

  // Copy entire prompt to clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(contentBuffer);
      setCopiedRecently(true);
      showToast("Prompt copied to clipboard");
      window.setTimeout(() => setCopiedRecently(false), 1800);
    } catch {
      showToast("Failed to copy prompt");
    }
  };

  // Export current prompt as a markdown file
  const handleExportMarkdown = () => {
    const filename = `${(titleBuffer || "scratchpad_prompt").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    const blob = new Blob([contentBuffer], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`);
  };

  // Delete scratchpad with immediate Undo toast action
  const handleDeleteWithUndo = (pad: ScratchpadItem) => {
    onDeletePad(pad.id);
    showToast(
      `Deleted "${pad.title || "Untitled"}"`,
      "Undo",
      () => {
        onRestorePad?.(pad.id);
      }
    );
  };

  // Calculate stats: words, chars, lines, token estimate
  const stats = useMemo(() => {
    const text = contentBuffer || "";
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.length ? text.split("\n").length : 0;
    const estimatedTokens = Math.ceil(chars / 3.9);
    return { chars, words, lines, estimatedTokens };
  }, [contentBuffer]);

  // Filtered scratchpad list
  const filteredPads = useMemo(() => {
    let list = [...scratchpads];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
      );
    }
    // Sort: pinned first, then by updatedAt descending
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [scratchpads, searchQuery]);

  // Available agent presets (respecting visibility if configured)
  const availableAgentPresets = useMemo(() => {
    return ALL_PRESET_DEFINITIONS.filter(
      (p) => (p.category === "ai" || p.category === "shell") && (visibleAgents?.[p.id] ?? true)
    );
  }, [visibleAgents]);

  const handleOpenSpawnModal = () => {
    setSelectedWorkspace(activeWorkspaceId || (workspaces[0]?.id ?? "ws_default"));
    setNewWorkspaceName(`Workspace ${workspaces.length + 1} (${activePad.title.slice(0, 16)})`);
    // Pre-populate with defaultCwd if available
    setCustomCwd(defaultCwd || "");
    setIsSpawnModalOpen(true);
  };

  const handleExecuteSpawn = () => {
    if (!contentBuffer.trim()) {
      showToast("Prompt is empty");
      return;
    }

    onSpawnAgent({
      agentType: selectedAgent,
      prompt: contentBuffer,
      targetWorkspaceId: selectedWorkspace,
      newWorkspaceName: selectedWorkspace === "new" ? newWorkspaceName : undefined,
      autoSend: true,
      cwd: customCwd.trim() || undefined,
    });

    setIsSpawnModalOpen(false);
  };

  // Format relative timestamp
  const formatTimeAgo = (ts?: number) => {
    if (!ts) return "";
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  // Simple, fast client-side Markdown rendering without external heavy dependencies
  const renderMarkdown = (text: string) => {
    if (!text || !text.trim()) {
      return (
        <div className="pad-preview-empty">
          <BookOpen size={28} className="text-slate-600 mb-2 opacity-60" />
          <span className="text-slate-400 font-medium">Empty Prompt Draft</span>
          <span className="text-slate-600 text-xs mt-1">Live Markdown preview will appear here as you type in the editor...</span>
        </div>
      );
    }

    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLang = "";

    lines.forEach((line, idx) => {
      // Code block start / end
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          const codeText = codeBlockContent.join("\n");
          elements.push(
            <div key={`code-${idx}`} className="md-code-block-wrapper">
              <div className="md-code-block-header">
                <span className="md-code-lang">{codeBlockLang || "code"}</span>
                <button
                  className="md-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(codeText);
                    showToast("Code copied to clipboard");
                  }}
                  title="Copy code"
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="md-code-content">
                <code>{codeText}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockContent = [];
          codeBlockLang = "";
        } else {
          inCodeBlock = true;
          codeBlockLang = line.trim().replace(/^```/, "").trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={`h1-${idx}`} className="md-h1">
            {formatInlineMarkdown(line.replace(/^# /, ""))}
          </h1>
        );
        return;
      }
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${idx}`} className="md-h2">
            {formatInlineMarkdown(line.replace(/^## /, ""))}
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${idx}`} className="md-h3">
            {formatInlineMarkdown(line.replace(/^### /, ""))}
          </h3>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
        elements.push(<hr key={`hr-${idx}`} className="md-hr" />);
        return;
      }

      // Blockquotes
      if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={`bq-${idx}`} className="md-blockquote">
            {formatInlineMarkdown(line.replace(/^> /, ""))}
          </blockquote>
        );
        return;
      }

      // Task lists
      if (line.trim().startsWith("- [ ] ")) {
        elements.push(
          <div key={`task-${idx}`} className="md-task-item unchecked">
            <span className="md-checkbox-box" />
            <span>{formatInlineMarkdown(line.trim().replace(/^- \[ \] /, ""))}</span>
          </div>
        );
        return;
      }
      if (line.trim().startsWith("- [x] ") || line.trim().startsWith("- [X] ")) {
        elements.push(
          <div key={`task-${idx}`} className="md-task-item checked">
            <span className="md-checkbox-box checked">✓</span>
            <span className="line-through text-slate-400">
              {formatInlineMarkdown(line.trim().replace(/^- \[[xX]\] /, ""))}
            </span>
          </div>
        );
        return;
      }

      // Bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        elements.push(
          <li key={`li-${idx}`} className="md-list-item">
            {formatInlineMarkdown(line.trim().replace(/^[-*] /, ""))}
          </li>
        );
        return;
      }

      // Empty line
      if (line.trim() === "") {
        elements.push(<div key={`br-${idx}`} className="md-empty-line" />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${idx}`} className="md-p">
          {formatInlineMarkdown(line)}
        </p>
      );
    });

    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre key="unclosed-code" className="md-code-content">
          <code>{codeBlockContent.join("\n")}</code>
        </pre>
      );
    }

    return elements;
  };

  // Inline formatting for **bold**, *italic*, `code`, and links
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={`b-${match.index}`} className="md-bold">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={`i-${match.index}`} className="md-italic">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code key={`c-${match.index}`} className="md-inline-code">
            {token.slice(1, -1)}
          </code>
        );
      }
      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="scratchpad-page-root">
      {/* Scratchpad Sidebar List */}
      <aside className="scratchpad-sidebar">
        <div className="scratchpad-sidebar-header">
          <div className="scratchpad-brand-title">
            <Edit3 size={16} className="text-sage" />
            <span>Scratchpads</span>
            <span className="scratchpad-count-badge">{scratchpads.length}</span>
          </div>

          <div className="sidebar-header-actions">
            <button
              className="btn-new-pad"
              onClick={onCreatePad}
              title="Create new scratchpad"
            >
              <Plus size={14} />
              <span>New Pad</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="scratchpad-search-container">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Search prompts & plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="scratchpad-search-input"
          />
        </div>

        {/* Scratchpads List */}
        <div className="scratchpad-items-list">
          {filteredPads.length === 0 ? (
            <div className="scratchpad-empty-filter">
              <FileText size={24} className="text-slate-600 mb-2" />
              <span>No scratchpads found</span>
            </div>
          ) : (
            filteredPads.map((pad) => {
              const isActive = pad.id === activePad.id;
              const wordCount = pad.content.trim() ? pad.content.trim().split(/\s+/).length : 0;
              const tokenEstimate = Math.ceil(pad.content.length / 3.9);

              return (
                <div
                  key={pad.id}
                  className={`scratchpad-list-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectPad(pad.id)}
                >
                  <div className="pad-item-header">
                    <div className="pad-item-title-row">
                      {pad.pinned && (
                        <Pin size={11} className="text-amber-400 fill-amber-400 mr-1 shrink-0" />
                      )}
                      <span className="pad-item-title" title={pad.title}>
                        {pad.title || "Untitled Prompt"}
                      </span>
                    </div>

                    <div className="pad-item-actions">
                      <button
                        className={`pad-icon-btn ${pad.pinned ? "active-pin" : ""}`}
                        title={pad.pinned ? "Unpin scratchpad" : "Pin to top"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdatePad(pad.id, { pinned: !pad.pinned });
                        }}
                      >
                        <Pin size={12} />
                      </button>
                      <button
                        className="pad-icon-btn"
                        title="Duplicate scratchpad"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePad(pad.id);
                        }}
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        className="pad-icon-btn delete"
                        title="Delete scratchpad"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWithUndo(pad);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="pad-item-snippet">
                    {pad.content.slice(0, 85).replace(/[#*`\n]/g, " ") || "Empty draft..."}
                  </div>

                  <div className="pad-item-footer">
                    <span className="pad-time">{formatTimeAgo(pad.updatedAt)}</span>
                    <span className="pad-stats-pill">
                      {wordCount}w • ~{tokenEstimate} tok
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Trash Quick Link */}
        {deletedScratchpads.length > 0 && (
          <div className="scratchpad-sidebar-footer">
            <button
              className="btn-open-trash-bar"
              onClick={() => setIsDeletedHistoryOpen(true)}
            >
              <History size={12} className="text-slate-400" />
              <span>Deleted History ({deletedScratchpads.length})</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Scratchpad Workspace */}
      <section className="scratchpad-main-area">
        {/* Top Control Header */}
        <header className="scratchpad-editor-header">
          <div className="pad-title-input-wrapper">
            <input
              type="text"
              className="pad-title-input"
              value={titleBuffer}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Prompt / Plan Title..."
            />
            <div className="pad-save-indicator">
              <span className={`save-dot ${saveStatus}`} />
              <span>{saveStatus === "saving" ? "Auto-saving..." : "Auto-saved"}</span>
            </div>
          </div>

          <div className="pad-header-tools">
            {/* Undo / Redo Action Group */}
            <div className="pad-undo-redo-group">
              <button
                className={`pad-history-btn ${!canUndo ? "disabled" : ""}`}
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} />
              </button>
              <button
                className={`pad-history-btn ${!canRedo ? "disabled" : ""}`}
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
              >
                <Redo2 size={13} />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="pad-view-toggle-group">
              <button
                className={`pad-view-btn ${viewMode === "editor" ? "active" : ""}`}
                onClick={() => handleViewModeChange("editor")}
                title="Editor Only"
              >
                <Edit3 size={13} />
                <span>Editor</span>
              </button>
              <button
                className={`pad-view-btn ${viewMode === "split" ? "active" : ""}`}
                onClick={() => handleViewModeChange("split")}
                title="Side-by-Side Split View"
              >
                <Columns size={13} />
                <span>Split</span>
              </button>
              <button
                className={`pad-view-btn ${viewMode === "preview" ? "active" : ""}`}
                onClick={() => handleViewModeChange("preview")}
                title="Markdown Preview"
              >
                <Eye size={13} />
                <span>Preview</span>
              </button>
            </div>

            {/* Copy Prompt */}
            <button
              className="btn-header-action"
              onClick={handleCopyPrompt}
              title="Copy entire prompt to clipboard"
            >
              {copiedRecently ? (
                <Check size={13} className="text-sage" />
              ) : (
                <Copy size={13} />
              )}
              <span>{copiedRecently ? "Copied" : "Copy"}</span>
            </button>

            {/* Export Markdown */}
            <button
              className="btn-header-action"
              onClick={handleExportMarkdown}
              title="Export as Markdown (.md)"
            >
              <Download size={13} />
              <span>Export</span>
            </button>

            {/* Primary Action: Spawn Agent */}
            <button
              className="btn-spawn-agent-primary"
              onClick={handleOpenSpawnModal}
              title="Launch AI Agent with this prompt"
            >
              <Sparkles size={14} className="text-sage-light" />
              <span>Spawn Agent</span>
            </button>
          </div>
        </header>

        {/* Editor & Preview Workspace Container */}
        <div className={`scratchpad-content-body view-${viewMode}`}>
          {/* Editor Column */}
          {(viewMode === "editor" || viewMode === "split") && (
            <div className="pad-editor-column">
              <textarea
                className="pad-textarea"
                value={contentBuffer}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleEditorKeyDown}
                placeholder="Write your prompt, agent mission directive, or complex plan here in Markdown..."
                spellCheck={false}
              />
            </div>
          )}

          {/* Markdown Preview Column */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div className="pad-preview-column">
              <div className="pad-markdown-rendered">
                {renderMarkdown(contentBuffer)}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status & Token Estimation Bar */}
        <footer className="scratchpad-status-bar">
          <div className="status-stats-left">
            <span className="stat-item">
              <strong>{stats.words}</strong> words
            </span>
            <span className="stat-divider">•</span>
            <span className="stat-item">
              <strong>{stats.chars}</strong> characters
            </span>
            <span className="stat-divider">•</span>
            <span className="stat-item">
              <strong>{stats.lines}</strong> lines
            </span>
            <span className="stat-divider">•</span>
            <span className="stat-item token-badge" title="Estimated tokens (GPT/Claude/Gemini ~3.9 chars/token)">
              <Sparkles size={11} className="mr-1 text-sage" />
              <strong>~{stats.estimatedTokens}</strong> tokens
            </span>
          </div>
        </footer>
      </section>

      {/* Spawn Agent Modal Dialog */}
      {isSpawnModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSpawnModalOpen(false)}>
          <div className="spawn-agent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-badge">
                  <Sparkles size={18} className="text-sage" />
                </div>
                <div className="modal-title-text-group">
                  <h3>Spawn Agent with Scratchpad Prompt</h3>
                  <p>Dispatch prompt instructions to an interactive AI agent CLI or shell environment.</p>
                </div>
              </div>

              {/* Live Prompt Info Pill */}
              <div className="modal-header-stats-pill">
                <span className="pill-title" title={activePad.title}>{activePad.title}</span>
                <span className="pill-sep">•</span>
                <span>{stats.words} words</span>
                <span className="pill-sep">•</span>
                <span className="text-sage">~{stats.estimatedTokens} tokens</span>
              </div>
            </div>

            <div className="modal-body spacious-modal-body">
              <div className="modal-columns-layout">
                {/* Column 1: Agent Selector */}
                <div className="modal-column agent-column">
                  <div className="modal-column-header">
                    <label className="modal-label">1. Select AI Agent / Shell</label>
                    <span className="modal-col-count">{availableAgentPresets.length} available</span>
                  </div>

                  <div className="agent-selection-grid">
                    {availableAgentPresets.map((agent) => {
                      const isSelected = selectedAgent === agent.id;

                      return (
                        <div
                          key={agent.id}
                          className={`agent-card-option ${isSelected ? "selected" : ""}`}
                          onClick={() => setSelectedAgent(agent.id)}
                        >
                          <div className="agent-card-icon">{agent.icon(16)}</div>
                          <div className="agent-card-info">
                            <div className="agent-card-title">
                              <span>{agent.shortTitle}</span>
                            </div>
                            <div className="agent-card-desc">{agent.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Workspace Association & Working Directory */}
                <div className="modal-column workspace-column">
                  <div className="modal-column-header">
                    <label className="modal-label">2. Target Workspace</label>
                  </div>

                  <div className="workspace-target-selector">
                    {workspaces.map((ws) => (
                      <label
                        key={ws.id}
                        className={`ws-target-option ${selectedWorkspace === ws.id ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="target_ws"
                          value={ws.id}
                          checked={selectedWorkspace === ws.id}
                          onChange={() => setSelectedWorkspace(ws.id)}
                        />
                        <Folder size={14} className="text-slate-400" />
                        <span className="ws-target-name">{ws.name}</span>
                        <span className="ws-term-pill">{ws.terminals.length} terminal{ws.terminals.length !== 1 ? "s" : ""}</span>
                      </label>
                    ))}

                    <label
                      className={`ws-target-option new-ws-option ${selectedWorkspace === "new" ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="target_ws"
                        value="new"
                        checked={selectedWorkspace === "new"}
                        onChange={() => setSelectedWorkspace("new")}
                      />
                      <FolderPlus size={14} className="text-sage" />
                      <span className="ws-target-name font-medium text-sage">
                        + Create New Workspace
                      </span>
                    </label>
                  </div>

                  {selectedWorkspace === "new" && (
                    <div className="new-ws-name-field">
                      <label className="modal-sublabel">New Workspace Name</label>
                      <input
                        type="text"
                        className="modal-text-input"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="e.g. Prompt Plan Workspace"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Section 3: Working Directory Selector */}
                  <div className="cwd-selector-section">
                    <div className="modal-column-header">
                      <label className="modal-label">3. Working Directory</label>
                    </div>

                    <div className="cwd-input-wrapper">
                      <Folder size={14} className="cwd-leading-icon" />
                      <input
                        type="text"
                        className="modal-text-input cwd-input"
                        placeholder={defaultCwd ? `Default: ${defaultCwd}` : "e.g. C:\\projects\\my-app (~ for default)"}
                        value={customCwd}
                        onChange={(e) => setCustomCwd(e.target.value)}
                      />
                      {customCwd && (
                        <button
                          type="button"
                          className="btn-cwd-clear"
                          onClick={() => setCustomCwd("")}
                          title="Reset to default directory (~)"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Directory Templates Dropdown / Quick Presets */}
                    {directoryTemplates.length > 0 && (
                      <div className="modal-directory-templates">
                        <span className="templates-mini-label">
                          <Compass size={11} />
                          <span>Presets:</span>
                        </span>
                        <div className="modal-template-chips">
                          {directoryTemplates.map((tmpl) => {
                            const isSelected = customCwd === tmpl.path;
                            return (
                              <button
                                key={tmpl.id}
                                type="button"
                                className={`modal-template-chip ${isSelected ? "active" : ""}`}
                                onClick={() => setCustomCwd(tmpl.path)}
                                title={tmpl.path || "Default User Home"}
                              >
                                <Folder size={11} className={isSelected ? "text-sage" : "text-slate-400"} />
                                <span>{tmpl.name}</span>
                                {isSelected && <Check size={10} className="text-sage" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-secondary"
                onClick={() => setIsSpawnModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-modal-primary"
                onClick={handleExecuteSpawn}
              >
                <Rocket size={14} />
                <span>Launch in Workspace</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted Scratchpads History Modal */}
      {isDeletedHistoryOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeletedHistoryOpen(false)}>
          <div className="deleted-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon-badge">
                  <History size={18} className="text-sage" />
                </div>
                <div>
                  <h3>Recently Deleted Scratchpads</h3>
                  <p>Restore accidentally deleted scratchpad drafts and plans.</p>
                </div>
              </div>

              {deletedScratchpads.length > 0 && onClearDeletedPads && (
                <button
                  className="btn-clear-trash"
                  onClick={onClearDeletedPads}
                  title="Permanently remove all deleted items"
                >
                  <Trash2 size={12} />
                  <span>Empty History</span>
                </button>
              )}
            </div>

            <div className="modal-body deleted-history-body">
              {deletedScratchpads.length === 0 ? (
                <div className="deleted-empty-state">
                  <ArchiveRestore size={32} className="text-slate-600 mb-2" />
                  <span className="text-slate-400 font-medium">No Deleted Scratchpads</span>
                  <span className="text-slate-600 text-xs mt-1">Scratchpads you delete will appear here so you can easily recover them.</span>
                </div>
              ) : (
                <div className="deleted-pads-list">
                  {deletedScratchpads.map((item) => (
                    <div key={item.id} className="deleted-pad-row">
                      <div className="deleted-pad-info">
                        <div className="deleted-pad-title">{item.title || "Untitled Prompt"}</div>
                        <div className="deleted-pad-snippet">
                          {item.content.slice(0, 110).replace(/[#*`\n]/g, " ") || "Empty draft..."}
                        </div>
                        <div className="deleted-pad-meta">
                          <span>Deleted {formatTimeAgo(item.deletedAt)}</span>
                          <span>•</span>
                          <span>{item.content.trim() ? item.content.trim().split(/\s+/).length : 0} words</span>
                        </div>
                      </div>

                      <div className="deleted-pad-actions">
                        <button
                          className="btn-restore-pad"
                          onClick={() => {
                            onRestorePad?.(item.id);
                            showToast(`Restored "${item.title || "Untitled"}"`);
                          }}
                          title="Restore scratchpad"
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>

                        <button
                          className="btn-perm-delete"
                          onClick={() => {
                            onPermanentDeletePad?.(item.id);
                            showToast("Permanently removed");
                          }}
                          title="Delete permanently"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-modal-secondary"
                onClick={() => setIsDeletedHistoryOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toast notification with optional action button */}
      {toast && (
        <div className="scratchpad-toast">
          <div className="toast-content-group">
            <Sparkles size={13} className="text-sage-light shrink-0" />
            <span>{toast.message}</span>
          </div>
          {toast.actionLabel && toast.onAction && (
            <button
              className="toast-action-btn"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
