import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Search, 
  X, 
  Terminal, 
  Layers, 
  Sparkles, 
  Columns, 
  Rows, 
  Grid2X2, 
  Square,
  Maximize2, 
  Radio, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon, 
  Palette, 
  Plus, 
  Folder, 
  Home,
  CornerDownLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { ALL_PRESET_DEFINITIONS } from "../../constants/presets";
import { WorkspaceData } from "../../types/workspace";
import { DirectoryTemplate } from "../../types/settings";
import { AppType } from "../../types/analytics";

export type PaletteCategory = "all" | "presets" | "actions" | "workspaces" | "layouts" | "navigation" | "directories";

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  category: "presets" | "actions" | "workspaces" | "layouts" | "navigation" | "directories";
  categoryLabel: string;
  icon: React.ReactNode;
  shortcut?: string;
  badge?: string;
  detail?: string;
  onExecute: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceData[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onLaunchPreset: (presetId: AppType, targetWsId?: string) => void;
  onOpenCustomLaunchModal: () => void;
  onOpenBroadcastModal: () => void;
  onChangeLayout: (layout: "side-by-side" | "stacked" | "grid" | "focus") => void;
  onResetPaneSizes: () => void;
  onNavigateTab: (tab: "home" | "workspace" | "scratchpad" | "analytics" | "settings") => void;
  onToggleTheme: () => void;
  currentTheme: "sage" | "gold";
  directoryTemplates?: DirectoryTemplate[];
  visibleAgents?: Record<string, boolean>;
  onCreateScratchpad?: () => void;
}

const CATEGORY_TABS: { id: PaletteCategory; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All Commands", icon: <Filter size={12} /> },
  { id: "presets", label: "Presets & AI", icon: <Sparkles size={12} /> },
  { id: "actions", label: "Tools & Actions", icon: <Radio size={12} /> },
  { id: "workspaces", label: "Workspaces", icon: <Layers size={12} /> },
  { id: "layouts", label: "Layouts", icon: <Columns size={12} /> },
  { id: "navigation", label: "Studio Pages", icon: <Home size={12} /> },
  { id: "directories", label: "Directories", icon: <Folder size={12} /> },
];

export default function CommandPaletteModal({
  isOpen,
  onClose,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onLaunchPreset,
  onOpenCustomLaunchModal,
  onOpenBroadcastModal,
  onChangeLayout,
  onResetPaneSizes,
  onNavigateTab,
  onToggleTheme,
  currentTheme,
  directoryTemplates = [],
  visibleAgents = {},
  onCreateScratchpad,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PaletteCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active category tab into view when cycling with Tab / Shift+Tab
  useEffect(() => {
    if (!tabsContainerRef.current) return;
    const activeTabEl = tabsContainerRef.current.querySelector(`[data-tab-id="${selectedCategory}"]`) as HTMLElement;
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [selectedCategory]);

  // Mandatory Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus and reset query on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedCategory("all");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 40);
    }
  }, [isOpen]);

  // Build command actions catalogue
  const allActions = useMemo<CommandPaletteAction[]>(() => {
    const actions: CommandPaletteAction[] = [];

    // 1. Presets & Agents (filter by visibility if defined)
    ALL_PRESET_DEFINITIONS.forEach((preset) => {
      const isVisible = visibleAgents[preset.id] !== false;
      if (isVisible) {
        actions.push({
          id: `preset_${preset.id}`,
          title: `Launch ${preset.title}`,
          subtitle: preset.description,
          category: "presets",
          categoryLabel: "Presets & AI Agents",
          icon: preset.icon(16),
          shortcut: preset.commandName,
          badge: preset.category.toUpperCase(),
          detail: `Spawns ${preset.title} terminal session in active workspace`,
          onExecute: () => {
            onLaunchPreset(preset.id, activeWorkspaceId);
            onNavigateTab("workspace");
            onClose();
          },
        });
      }
    });

    // Custom process
    actions.push({
      id: "action_custom_process",
      title: "Launch Custom Command / Agent...",
      subtitle: "Configure custom executable, CLI flags, working folder and initial prompt",
      category: "presets",
      categoryLabel: "Presets & AI Agents",
      icon: <Sparkles size={16} className="text-sage" />,
      shortcut: "Custom",
      badge: "CONFIG",
      detail: "Opens wizard to spawn arbitrary binaries and CLI tools",
      onExecute: () => {
        onClose();
        onOpenCustomLaunchModal();
      },
    });

    // 2. Workspaces
    workspaces.forEach((ws) => {
      const isActive = ws.id === activeWorkspaceId;
      actions.push({
        id: `ws_${ws.id}`,
        title: `Switch to Workspace: ${ws.name}`,
        subtitle: `${ws.terminals.length} terminal${ws.terminals.length === 1 ? "" : "s"} running • Layout: ${ws.gridLayout || "side-by-side"}`,
        category: "workspaces",
        categoryLabel: "Workspaces",
        icon: <Layers size={16} className={isActive ? "text-sage" : "text-slate-400"} />,
        badge: isActive ? "ACTIVE" : undefined,
        detail: `Switch focus to "${ws.name}" (${ws.terminals.length} running processes)`,
        onExecute: () => {
          onSelectWorkspace(ws.id);
          onNavigateTab("workspace");
          onClose();
        },
      });
    });

    actions.push({
      id: "action_new_workspace",
      title: "Create New Workspace",
      subtitle: "Add an empty workspace to your fleet and navigate immediately",
      category: "workspaces",
      categoryLabel: "Workspaces",
      icon: <Plus size={16} className="text-sage" />,
      badge: "NEW",
      detail: "Creates a new isolated workspace tab in your fleet",
      onExecute: () => {
        onCreateWorkspace();
        onNavigateTab("workspace");
        onClose();
      },
    });

    // 3. Layouts
    actions.push({
      id: "layout_side_by_side",
      title: "Layout: Side-by-Side (Columns)",
      subtitle: "Arrange terminal panes in vertical columns across the workspace",
      category: "layouts",
      categoryLabel: "Workspace Layouts",
      icon: <Columns size={16} className="text-slate-300" />,
      shortcut: "Columns",
      detail: "Splits active workspace horizontally into vertical terminal columns",
      onExecute: () => {
        onChangeLayout("side-by-side");
        onNavigateTab("workspace");
        onClose();
      },
    });

    actions.push({
      id: "layout_stacked",
      title: "Layout: Stacked (Rows)",
      subtitle: "Arrange terminal panes in horizontal stacked rows",
      category: "layouts",
      categoryLabel: "Workspace Layouts",
      icon: <Rows size={16} className="text-slate-300" />,
      shortcut: "Rows",
      detail: "Splits active workspace vertically into horizontal stacked rows",
      onExecute: () => {
        onChangeLayout("stacked");
        onNavigateTab("workspace");
        onClose();
      },
    });

    actions.push({
      id: "layout_grid",
      title: "Layout: 2x2 Quadrant Grid",
      subtitle: "Arrange terminal panes in a 4-quadrant symmetric grid",
      category: "layouts",
      categoryLabel: "Workspace Layouts",
      icon: <Grid2X2 size={16} className="text-slate-300" />,
      shortcut: "Grid",
      detail: "Organizes up to 4 terminal panes into a 2x2 quadrant layout",
      onExecute: () => {
        onChangeLayout("grid");
        onNavigateTab("workspace");
        onClose();
      },
    });

    actions.push({
      id: "layout_focus",
      title: "Layout: Focus Mode (Single Active)",
      subtitle: "Focus single active terminal with top tab navigation bar",
      category: "layouts",
      categoryLabel: "Workspace Layouts",
      icon: <Square size={16} className="text-slate-300" />,
      shortcut: "Focus",
      detail: "Expands the active terminal to full workspace width with tabbed switching",
      onExecute: () => {
        onChangeLayout("focus");
        onNavigateTab("workspace");
        onClose();
      },
    });

    actions.push({
      id: "layout_reset_sizes",
      title: "Equalize / Reset Terminal Pane Sizes",
      subtitle: "Reset all drag-resized split panes to proportional equal dimensions",
      category: "layouts",
      categoryLabel: "Workspace Layouts",
      icon: <Maximize2 size={16} className="text-slate-300" />,
      shortcut: "Reset",
      detail: "Equalizes widths and heights across all active terminal panes",
      onExecute: () => {
        onResetPaneSizes();
        onClose();
      },
    });

    // 4. Tools & Actions
    actions.push({
      id: "action_broadcast",
      title: "Broadcast Input to All Terminals...",
      subtitle: "Send a command simultaneously to all running terminals in active workspace",
      category: "actions",
      categoryLabel: "Tools & Actions",
      icon: <Radio size={16} className="text-rose-400" />,
      shortcut: "Broadcast",
      detail: "Synchronized multi-session command execution modal",
      onExecute: () => {
        onClose();
        onOpenBroadcastModal();
      },
    });

    if (onCreateScratchpad) {
      actions.push({
        id: "action_create_scratchpad",
        title: "Create New Scratchpad Note",
        subtitle: "Start a blank prompt draft or snippet document in the Scratchpad",
        category: "actions",
        categoryLabel: "Tools & Actions",
        icon: <Plus size={16} className="text-amber-400" />,
        detail: "Creates a new scratchpad document and opens the editor",
        onExecute: () => {
          onCreateScratchpad();
          onNavigateTab("scratchpad");
          onClose();
        },
      });
    }

    actions.push({
      id: "action_toggle_theme",
      title: `Switch Theme to ${currentTheme === "sage" ? "Studio Gold" : "Sage Green"}`,
      subtitle: `Current active palette: ${currentTheme === "sage" ? "Sage Green (Default)" : "Studio Gold"}`,
      category: "actions",
      categoryLabel: "Tools & Actions",
      icon: <Palette size={16} className={currentTheme === "sage" ? "text-amber-400" : "text-sage"} />,
      shortcut: "Theme",
      badge: currentTheme.toUpperCase(),
      detail: `Toggles application accent palette between Sage Green and Studio Gold`,
      onExecute: () => {
        onToggleTheme();
        onClose();
      },
    });

    // 5. Studio Pages & Navigation
    actions.push({
      id: "nav_home",
      title: "Go to Home Dashboard",
      subtitle: "Fleet overview, quick launchpad, and recent session history",
      category: "navigation",
      categoryLabel: "Studio Pages",
      icon: <Home size={16} className="text-slate-400" />,
      detail: "Opens the Studio Home Hub and Fleet overview",
      onExecute: () => {
        onNavigateTab("home");
        onClose();
      },
    });

    actions.push({
      id: "nav_workspace",
      title: "Go to Active Workspace",
      subtitle: "Focus current terminal sessions and interactive command lines",
      category: "navigation",
      categoryLabel: "Studio Pages",
      icon: <Terminal size={16} className="text-sage" />,
      detail: "Opens the main multi-terminal workspace page",
      onExecute: () => {
        onNavigateTab("workspace");
        onClose();
      },
    });

    actions.push({
      id: "nav_scratchpad",
      title: "Go to Scratchpad & Notes",
      subtitle: "Prompt engineering notebook, Markdown live preview & AI agent launcher",
      category: "navigation",
      categoryLabel: "Studio Pages",
      icon: <FileText size={16} className="text-amber-400" />,
      detail: "Access notes, snippets, and prompt builder",
      onExecute: () => {
        onNavigateTab("scratchpad");
        onClose();
      },
    });

    actions.push({
      id: "nav_analytics",
      title: "Go to Runtime Telemetry & Analytics",
      subtitle: "View live session uptimes, tool distribution charts, and audit logs",
      category: "navigation",
      categoryLabel: "Studio Pages",
      icon: <BarChart3 size={16} className="text-cyan-400" />,
      detail: "Inspect execution metrics, session durations, and telemetry",
      onExecute: () => {
        onNavigateTab("analytics");
        onClose();
      },
    });

    actions.push({
      id: "nav_settings",
      title: "Go to Application Settings",
      subtitle: "Customize visible agents, themes, default folders, backups, and persistence",
      category: "navigation",
      categoryLabel: "Studio Pages",
      icon: <SettingsIcon size={16} className="text-slate-400" />,
      detail: "Open studio configuration and preferences",
      onExecute: () => {
        onNavigateTab("settings");
        onClose();
      },
    });

    // 5. Directory Templates
    directoryTemplates.forEach((tmpl) => {
      actions.push({
        id: `tmpl_${tmpl.id}`,
        title: `Open Terminal in "${tmpl.name}"`,
        subtitle: tmpl.path,
        category: "directories",
        categoryLabel: "Directory Bookmarks",
        icon: <Folder size={16} className="text-sage" />,
        shortcut: "Folder",
        detail: `Spawns default shell in path: ${tmpl.path}`,
        onExecute: () => {
          onLaunchPreset("powershell", activeWorkspaceId);
          onNavigateTab("workspace");
          onClose();
        },
      });
    });

    return actions;
  }, [
    workspaces,
    activeWorkspaceId,
    visibleAgents,
    currentTheme,
    directoryTemplates,
    onLaunchPreset,
    onSelectWorkspace,
    onCreateWorkspace,
    onChangeLayout,
    onResetPaneSizes,
    onNavigateTab,
    onToggleTheme,
    onOpenCustomLaunchModal,
    onOpenBroadcastModal,
    onClose,
  ]);

  // Filter actions based on category tab and search query
  const filteredActions = useMemo(() => {
    let list = allActions;

    // Filter by tab category if not 'all'
    if (selectedCategory !== "all") {
      list = list.filter((a) => a.category === selectedCategory);
    }

    if (!query.trim()) return list;

    const q = query.toLowerCase().trim();
    return list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        a.categoryLabel.toLowerCase().includes(q) ||
        (a.shortcut && a.shortcut.toLowerCase().includes(q)) ||
        (a.detail && a.detail.toLowerCase().includes(q))
    );
  }, [allActions, selectedCategory, query]);

  // Group filtered results by section for beautiful hierarchy
  const groupedSections = useMemo(() => {
    const map = new Map<string, { label: string; actions: CommandPaletteAction[] }>();
    filteredActions.forEach((action) => {
      const key = action.categoryLabel;
      if (!map.has(key)) {
        map.set(key, { label: key, actions: [] });
      }
      map.get(key)!.actions.push(action);
    });
    return Array.from(map.values());
  }, [filteredActions]);

  // Flattened array of actions to compute selectedIndex accurately across grouped rendering
  const flatActionList = useMemo(() => {
    return groupedSections.flatMap((s) => s.actions);
  }, [groupedSections]);

  // Reset selected index when query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, selectedCategory]);

  // Scroll selected item into view smoothly
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-flat-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatActionList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, flatActionList.length - 1)));
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Cycle category tabs with Tab / Shift+Tab
      const currentIndex = CATEGORY_TABS.findIndex((t) => t.id === selectedCategory);
      if (e.shiftKey) {
        const nextIdx = currentIndex > 0 ? currentIndex - 1 : CATEGORY_TABS.length - 1;
        setSelectedCategory(CATEGORY_TABS[nextIdx].id);
      } else {
        const nextIdx = currentIndex < CATEGORY_TABS.length - 1 ? currentIndex + 1 : 0;
        setSelectedCategory(CATEGORY_TABS[nextIdx].id);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatActionList[selectedIndex]) {
        flatActionList[selectedIndex].onExecute();
      }
    }
  };

  const activeSelectedAction = flatActionList[selectedIndex] || null;

  if (!isOpen) return null;

  let runningFlatIndex = 0;

  return (
    <div 
      className="command-palette-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
    >
      <div
        className="command-palette-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="command-palette-search-bar">
          <Search size={18} className="command-palette-search-icon" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, shell, workspace, or action..."
            className="command-palette-input"
            id="command-palette-title"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
                title="Clear input"
              >
                <X size={14} />
              </button>
            )}
            <span className="command-palette-esc-badge hidden sm:inline-block">
              ESC
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
              aria-label="Close command palette"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div ref={tabsContainerRef} className="command-palette-category-tabs">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.id;
            const count = tab.id === "all" 
              ? allActions.length 
              : allActions.filter((a) => a.category === tab.id).length;

            return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`command-palette-tab-btn ${isActive ? "active" : ""}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="command-palette-tab-count">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List Section */}
        <div 
          ref={listRef}
          className="command-palette-list custom-scrollbar"
        >
          {flatActionList.length === 0 ? (
            <div className="py-14 text-center text-slate-500">
              <Search size={32} className="mx-auto mb-2.5 opacity-25" />
              <p className="text-sm font-medium text-slate-400">No commands matching "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">Try searching for a preset name, workspace, or action</p>
            </div>
          ) : (
            groupedSections.map((section) => (
              <div key={section.label} className="command-palette-section">
                {/* Section Header */}
                <div className="command-palette-section-header">
                  <span>{section.label}</span>
                  <span className="command-palette-section-count">
                    {section.actions.length} {section.actions.length === 1 ? "action" : "actions"}
                  </span>
                </div>

                {/* Section Action Items */}
                <div className="flex flex-col gap-1">
                  {section.actions.map((action) => {
                    const itemFlatIndex = runningFlatIndex++;
                    const isSelected = itemFlatIndex === selectedIndex;

                    return (
                      <div
                        key={action.id}
                        data-flat-index={itemFlatIndex}
                        onClick={() => action.onExecute()}
                        onMouseEnter={() => setSelectedIndex(itemFlatIndex)}
                        className={`command-palette-item ${isSelected ? "selected" : ""}`}
                      >
                        {/* Left icon & labels */}
                        <div className="command-palette-item-left">
                          <div className="command-palette-item-icon">
                            {action.icon}
                          </div>
                          
                          <div className="command-palette-item-texts">
                            <div className="command-palette-item-title-row">
                              <span className="command-palette-item-title">{action.title}</span>
                              {action.badge && (
                                <span className={`command-palette-item-badge ${
                                  action.badge === "ACTIVE" ? "active-badge" : ""
                                }`}>
                                  {action.badge}
                                </span>
                              )}
                            </div>
                            {action.subtitle && (
                              <div className="command-palette-item-subtitle">
                                {action.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right tags & shortcuts */}
                        <div className="command-palette-item-right">
                          {action.shortcut && (
                            <span className="command-palette-shortcut-tag">
                              {action.shortcut}
                            </span>
                          )}

                          {isSelected && (
                            <span className="command-palette-run-badge">
                              <span>Run</span>
                              <CornerDownLeft size={11} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Action Details Bar */}
        {activeSelectedAction && activeSelectedAction.detail && (
          <div className="command-palette-detail-strip">
            <ChevronRight size={13} className="text-sage flex-shrink-0" />
            <span className="truncate">{activeSelectedAction.detail}</span>
          </div>
        )}

        {/* Bottom Footer Shortcuts */}
        <div className="command-palette-footer">
          <div className="flex items-center gap-3.5">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-300">↓</kbd>
              <span className="ml-0.5 text-slate-400">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-300">↵ Enter</kbd>
              <span className="ml-0.5 text-slate-400">Select</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-300">Tab</kbd>
              <span className="ml-0.5 text-slate-400">Filter category</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block"></span>
            <span>Studio Command Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}
