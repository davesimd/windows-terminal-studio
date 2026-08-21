import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { SearchAddon } from "@xterm/addon-search";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Copy, Clipboard, Check, MousePointerClick, Eraser, RotateCw, ArrowLeftRight, Search, FileText, Sparkles } from "lucide-react";
import { TerminalData } from "./TerminalSession";
import TerminalSearchBar, { SearchOptionsState } from "./TerminalSearchBar";
import "@xterm/xterm/css/xterm.css";

export interface XTermHandle {
  copySelection: () => Promise<boolean>;
  pasteClipboard: () => Promise<boolean>;
  selectAll: () => void;
  clear: () => void;
  hasSelection: () => boolean;
  getSelectionText: () => string;
  getBufferText: (maxLines?: number) => string;
  focus: () => void;
  sendPrompt: (customPrompt?: string, autoSend?: boolean) => void;
  openSearch: () => void;
}

interface XTermInstanceProps {
  session: TerminalData;
  isFocused?: boolean;
  onActivity?: () => void;
  onRestart?: (id: string) => void;
  onOpenMoveMenu?: () => void;
  onSendToScratchpad?: (title: string, content: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
}

const SAGE_TERMINAL_THEME = {
  background: "#0a0a0a",
  foreground: "#e2e8f0",
  cursor: "#9fb4a5",
  cursorAccent: "#0a0a0a",
  selectionBackground: "rgba(126, 145, 131, 0.45)",
  selectionInactiveBackground: "rgba(126, 145, 131, 0.30)",
  black: "#151617",
  red: "#f87171",
  green: "#7e9183",
  yellow: "#eab308",
  blue: "#8fa89b",
  magenta: "#b3c7b9",
  cyan: "#a3c4bc",
  white: "#f1f5f9",
  brightBlack: "#4b5563",
  brightRed: "#ef4444",
  brightGreen: "#9fb4a5",
  brightYellow: "#facc15",
  brightBlue: "#a8bcad",
  brightMagenta: "#cbd5e1",
  brightCyan: "#c4dad2",
  brightWhite: "#ffffff",
};

const GOLD_TERMINAL_THEME = {
  background: "#0a0a0a",
  foreground: "#e2e8f0",
  cursor: "#dfc99c",
  cursorAccent: "#0a0a0a",
  selectionBackground: "rgba(197, 160, 89, 0.45)",
  selectionInactiveBackground: "rgba(197, 160, 89, 0.30)",
  black: "#151617",
  red: "#f87171",
  green: "#c5a059",
  yellow: "#e5cca0",
  blue: "#d4b373",
  magenta: "#e5cca0",
  cyan: "#dcc28f",
  white: "#f1f5f9",
  brightBlack: "#4b5563",
  brightRed: "#ef4444",
  brightGreen: "#dfc99c",
  brightYellow: "#facc15",
  brightBlue: "#edd6aa",
  brightMagenta: "#f4e4c7",
  brightCyan: "#faeedb",
  brightWhite: "#ffffff",
};

// High-contrast search match decorations for unmistakable visibility
const SEARCH_DECORATIONS = {
  activeMatchBackground: "#f59e0b", // Vivid bright amber-gold
  activeMatchBorder: "#ffffff",     // Glowing crisp border around current match
  activeMatchColorOverviewRuler: "transparent",
  matchBackground: "#334155",       // Clear slate contrast background for all other matches
  matchBorder: "#64748b",           // Subtle slate border
  matchOverviewRuler: "transparent",
};

function getActiveTerminalTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  return current === "gold" ? GOLD_TERMINAL_THEME : SAGE_TERMINAL_THEME;
}

interface CachedTerminalSession {
  term: Terminal;
  fitAddon: FitAddon;
  searchAddon?: SearchAddon;
  element: HTMLDivElement;
  unlistenOutput?: () => void;
  unlistenExit?: () => void;
  isNativePty: boolean;
  onActivity?: () => void;
  onExit?: () => void;
}

const terminalSessionCache = new Map<string, CachedTerminalSession>();

// Format prompt from scratchpad / settings into a single command line so that ConPTY / CLI shells don't execute line-by-line
export function formatPromptAsSingleCommandLine(prompt: string): string {
  if (!prompt) return "";
  return prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
}

// Strip ANSI escape codes and control characters for stream text analysis
export function cleanTerminalOutput(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// Export helper to explicitly dispose and destroy a terminal when closed by the user
export function disposeTerminalInstance(id: string) {
  const cached = terminalSessionCache.get(id);
  if (cached) {
    if (cached.unlistenOutput) cached.unlistenOutput();
    if (cached.unlistenExit) cached.unlistenExit();
    try {
      cached.term.dispose();
    } catch {
      // ignore
    }
    terminalSessionCache.delete(id);
  }
}

export function disposeAllTerminalInstances() {
  for (const [, cached] of terminalSessionCache.entries()) {
    if (cached.unlistenOutput) cached.unlistenOutput();
    if (cached.unlistenExit) cached.unlistenExit();
    try {
      cached.term.dispose();
    } catch {
      // ignore
    }
  }
  terminalSessionCache.clear();
}

const XTermInstance = forwardRef<XTermHandle, XTermInstanceProps>(({
  session,
  isFocused = false,
  onActivity,
  onRestart,
  onOpenMoveMenu,
  onSendToScratchpad,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const isDisposedRef = useRef(false);
  const isNativePtyRef = useRef(false);

  // Auto-focus terminal when marked as active/focused
  useEffect(() => {
    if (isFocused) {
      termRef.current?.focus();
      const t1 = window.setTimeout(() => {
        if (!isDisposedRef.current) {
          termRef.current?.focus();
        }
      }, 50);
      const t2 = window.setTimeout(() => {
        if (!isDisposedRef.current) {
          termRef.current?.focus();
        }
      }, 150);
      const t3 = window.setTimeout(() => {
        if (!isDisposedRef.current) {
          termRef.current?.focus();
        }
      }, 300);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }
  }, [isFocused]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    hasSelection: false,
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [matchResult, setMatchResult] = useState<{ resultIndex: number; resultCount: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 1800);
  }, []);

  // Copy selected text in terminal to system clipboard
  const copySelection = useCallback(async (): Promise<boolean> => {
    if (!termRef.current) return false;
    const selected = termRef.current.getSelection();
    if (selected) {
      try {
        await navigator.clipboard.writeText(selected);
        showToast("Copied to clipboard");
        return true;
      } catch (err) {
        console.error("Clipboard copy error:", err);
      }
    }
    return false;
  }, [showToast]);

  const doSanitizedPaste = useCallback((rawText: string): boolean => {
    if (!termRef.current || isDisposedRef.current) return false;

    // Strip trailing line breaks (\r, \n, \r\n) so the pasted command is NEVER automatically executed
    const sanitized = rawText.replace(/[\r\n]+$/, "");
    if (!sanitized) return false;

    termRef.current.paste(sanitized);
    termRef.current.focus();
    showToast("Pasted from clipboard");
    return true;
  }, [showToast]);

  const pasteClipboard = useCallback(async (): Promise<boolean> => {
    if (!termRef.current || isDisposedRef.current) return false;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        return doSanitizedPaste(text);
      }
    } catch (err) {
      console.error("Clipboard paste error:", err);
    }
    return false;
  }, [doSanitizedPaste]);

  const selectAll = useCallback(() => {
    if (termRef.current) {
      termRef.current.selectAll();
      termRef.current.focus();
    }
  }, []);

  const clear = useCallback(() => {
    if (termRef.current) {
      termRef.current.clear();
      termRef.current.focus();
      showToast("Terminal buffer cleared");
    }
  }, [showToast]);

  const hasSelection = useCallback((): boolean => {
    return Boolean(termRef.current?.hasSelection());
  }, []);

  const focus = useCallback(() => {
    termRef.current?.focus();
  }, []);

  const sendPrompt = useCallback((customPrompt?: string, autoSend?: boolean) => {
    const promptText = customPrompt || session.initialPrompt;
    if (!promptText) return;
    const formatted = formatPromptAsSingleCommandLine(promptText);
    if (!formatted) return;
    const shouldAutoSend = autoSend !== undefined ? autoSend : (session.autoSendPrompt !== false);
    const dataToSend = shouldAutoSend ? `${formatted}\r` : formatted;

    if (isNativePtyRef.current) {
      invoke("write_terminal", { id: session.id, data: dataToSend }).catch((err) => {
        console.error("Failed to write prompt:", err);
      });
    } else if (termRef.current) {
      termRef.current.write(formatted + (shouldAutoSend ? "\r\n" : ""));
    }
    showToast(shouldAutoSend ? "Prompt dispatched to terminal" : "Prompt placed in terminal buffer");
  }, [session.id, session.initialPrompt, session.autoSendPrompt, showToast]);

  const handleFindNext = useCallback((query: string, options: SearchOptionsState, incremental: boolean = true) => {
    if (!searchAddonRef.current || !query) return;
    if (options.regex) {
      try {
        new RegExp(query);
      } catch {
        setMatchResult({ resultIndex: -1, resultCount: 0 });
        return;
      }
    }
    try {
      const found = searchAddonRef.current.findNext(query, {
        caseSensitive: options.caseSensitive,
        wholeWord: options.wholeWord,
        regex: options.regex,
        incremental,
        decorations: SEARCH_DECORATIONS,
      });
      if (!found) {
        setMatchResult({ resultIndex: -1, resultCount: 0 });
      }
    } catch (err) {
      console.warn("Search findNext error:", err);
      setMatchResult({ resultIndex: -1, resultCount: 0 });
    }
  }, []);

  const handleFindPrevious = useCallback((query: string, options: SearchOptionsState) => {
    if (!searchAddonRef.current || !query) return;
    if (options.regex) {
      try {
        new RegExp(query);
      } catch {
        setMatchResult({ resultIndex: -1, resultCount: 0 });
        return;
      }
    }
    try {
      const found = searchAddonRef.current.findPrevious(query, {
        caseSensitive: options.caseSensitive,
        wholeWord: options.wholeWord,
        regex: options.regex,
        decorations: SEARCH_DECORATIONS,
      });
      if (!found) {
        setMatchResult({ resultIndex: -1, resultCount: 0 });
      }
    } catch (err) {
      console.warn("Search findPrevious error:", err);
      setMatchResult({ resultIndex: -1, resultCount: 0 });
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    try {
      if (searchAddonRef.current) {
        searchAddonRef.current.clearDecorations();
        searchAddonRef.current.clearActiveDecoration();
      }
      termRef.current?.clearSelection();
    } catch (err) {
      console.warn("Search clear error:", err);
    }
    setMatchResult(null);
  }, []);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const getSelectionText = useCallback((): string => {
    if (!termRef.current) return "";
    return termRef.current.getSelection() || "";
  }, []);

  const getBufferText = useCallback((maxLines?: number): string => {
    if (!termRef.current) return "";
    const buffer = termRef.current.buffer.active;
    const lines: string[] = [];
    const start = maxLines ? Math.max(0, buffer.length - maxLines) : 0;
    for (let i = start; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    return lines.join("\n");
  }, []);

  useImperativeHandle(ref, () => ({
    copySelection,
    pasteClipboard,
    selectAll,
    clear,
    hasSelection,
    getSelectionText,
    getBufferText,
    focus,
    sendPrompt,
    openSearch,
  }));

  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  const lastDimensionsRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });
  const resizeDebounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    isDisposedRef.current = false;

    let cached = terminalSessionCache.get(session.id);
    let term: Terminal;
    let fitAddon: FitAddon;
    let searchAddon: SearchAddon;
    let termDomElement: HTMLDivElement;

    const performFitAndResize = (forceSync: boolean = false) => {
      if (isDisposedRef.current || !containerRef.current || !termRef.current || !fitAddonRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width < 60 || rect.height < 30) {
        return;
      }

      try {
        fitAddonRef.current.fit();
        termRef.current.refresh(0, termRef.current.rows - 1);
        const cols = termRef.current.cols;
        const rows = termRef.current.rows;

        if (cols < 20 || rows < 4) {
          return;
        }

        if (cols === lastDimensionsRef.current.cols && rows === lastDimensionsRef.current.rows && !forceSync) {
          return;
        }

        if (forceSync) {
          if (resizeDebounceTimerRef.current) {
            window.clearTimeout(resizeDebounceTimerRef.current);
            resizeDebounceTimerRef.current = null;
          }
          lastDimensionsRef.current = { cols, rows };
          invoke("resize_terminal", { id: session.id, cols, rows }).catch(() => {});
        } else {
          if (resizeDebounceTimerRef.current) {
            window.clearTimeout(resizeDebounceTimerRef.current);
          }
          resizeDebounceTimerRef.current = window.setTimeout(() => {
            if (!isDisposedRef.current && termRef.current) {
              lastDimensionsRef.current = { cols, rows };
              invoke("resize_terminal", { id: session.id, cols, rows }).catch(() => {});
            }
          }, 80);
        }
      } catch {
        // ignore
      }
    };

    const bindCustomKeyHandler = (t: Terminal) => {
      t.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if (e.type !== "keydown") return true;
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "c" || e.key === "C")) {
          if (t.hasSelection()) {
            copySelection();
            return false;
          }
          return true;
        }
        if ((isCtrlOrCmd && e.shiftKey && (e.key === "c" || e.key === "C")) || (isCtrlOrCmd && !e.shiftKey && e.key === "Insert")) {
          if (t.hasSelection()) copySelection();
          return false;
        }
        if ((isCtrlOrCmd && (e.key === "v" || e.key === "V")) || (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === "Insert")) {
          e.preventDefault();
          pasteClipboard();
          return false;
        }
        if (isCtrlOrCmd && e.shiftKey && (e.key === "a" || e.key === "A")) {
          t.selectAll();
          return false;
        }
        if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "f" || e.key === "F")) {
          e.preventDefault();
          e.stopPropagation();
          setIsSearchOpen(true);
          return false;
        }
        return true;
      });
    };

    let searchResultsDisposable: { dispose: () => void } | null = null;

    if (cached) {
      term = cached.term;
      fitAddon = cached.fitAddon;
      cached.onActivity = () => onActivityRef.current?.();

      searchAddon = cached.searchAddon || new SearchAddon();
      if (!cached.searchAddon) {
        try {
          term.loadAddon(searchAddon);
          cached.searchAddon = searchAddon;
        } catch {}
      }
      try {
        searchResultsDisposable = searchAddon.onDidChangeResults((e) => {
          if (!isDisposedRef.current) {
            if (e && typeof e.resultCount === "number") {
              setMatchResult({ resultIndex: e.resultIndex, resultCount: e.resultCount });
            } else {
              setMatchResult(null);
            }
          }
        });
      } catch {}
      searchAddonRef.current = searchAddon;
      termDomElement = cached.element;
      termRef.current = term;
      fitAddonRef.current = fitAddon;
      isNativePtyRef.current = cached.isNativePty;

      term.options.theme = getActiveTerminalTheme();
      if (!containerRef.current.contains(termDomElement)) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(termDomElement);
      }

      bindCustomKeyHandler(term);
      performFitAndResize(true);

      window.setTimeout(() => {
        if (!isDisposedRef.current && termRef.current && fitAddonRef.current) {
          try {
            fitAddonRef.current.fit();
            termRef.current.refresh(0, termRef.current.rows - 1);
            termRef.current.scrollToBottom();
            termRef.current.focus();
            const cols = termRef.current.cols;
            const rows = termRef.current.rows;
            invoke("resize_terminal", { id: session.id, cols, rows }).catch(() => {});
          } catch {}
        }
      }, 60);
    } else {
      term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
        theme: getActiveTerminalTheme(),
        allowTransparency: true,
      });

      fitAddon = new FitAddon();
      searchAddon = new SearchAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.loadAddon(new ClipboardAddon());
      try { 
        term.loadAddon(searchAddon);
        searchResultsDisposable = searchAddon.onDidChangeResults((e) => {
          if (!isDisposedRef.current) {
            if (e && typeof e.resultCount === "number") {
              setMatchResult({ resultIndex: e.resultIndex, resultCount: e.resultCount });
            } else {
              setMatchResult(null);
            }
          }
        });
      } catch {}
      searchAddonRef.current = searchAddon;

      termDomElement = document.createElement("div");
      termDomElement.className = "xterm-session-inner-wrapper";
      termDomElement.style.width = "100%";
      termDomElement.style.height = "100%";

      term.open(termDomElement);
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(termDomElement);

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      bindCustomKeyHandler(term);
      performFitAndResize(false);
      term.focus();

      const sessionCacheEntry: CachedTerminalSession = {
        term,
        fitAddon,
        searchAddon,
        element: termDomElement,
        isNativePty: false,
        onActivity: () => onActivityRef.current?.(),
      };
      terminalSessionCache.set(session.id, sessionCacheEntry);

      const setupNativePty = async () => {
        let initialPromptSent = false;
        let promptTimer: number | null = null;
        let safetyFallbackTimer: number | null = null;
        let accumulatedRawOutput = "";
        const isAiAgent = ["antigravity", "claude", "codex", "grok", "opencode", "copilot", "kilo", "ollama"].includes(session.appType);
        const isManualMode = session.promptDelayMs === -1;
        const hasExplicitDelay = typeof session.promptDelayMs === "number" && session.promptDelayMs > 0;
        const spawnStartTime = Date.now();

        const sendPromptIfReady = () => {
          if (initialPromptSent || !session.initialPrompt || isDisposedRef.current || isManualMode) return;
          initialPromptSent = true;
          if (promptTimer) {
            window.clearTimeout(promptTimer);
            promptTimer = null;
          }
          if (safetyFallbackTimer) {
            window.clearTimeout(safetyFallbackTimer);
            safetyFallbackTimer = null;
          }
          const formatted = formatPromptAsSingleCommandLine(session.initialPrompt);
          if (!formatted) return;
          const dataToSend = session.autoSendPrompt !== false ? `${formatted}\r` : formatted;
          invoke("write_terminal", { id: session.id, data: dataToSend }).catch((err) => {
            console.error("Failed to write initial prompt:", err);
          });
        };

        const evaluateReadinessAndSchedule = (newPayload: string) => {
          if (initialPromptSent || !session.initialPrompt || isDisposedRef.current || isManualMode) return;
          if (promptTimer) window.clearTimeout(promptTimer);

          accumulatedRawOutput = (accumulatedRawOutput + newPayload).slice(-4096);
          const cleanText = cleanTerminalOutput(accumulatedRawOutput).trim();
          const elapsed = Date.now() - spawnStartTime;

          // If user specified an explicit positive delay, honor it with a short settling buffer
          if (hasExplicitDelay) {
            const explicitDelay = session.promptDelayMs!;
            const nextDelay = Math.max(Math.max(0, explicitDelay - elapsed), 400);
            promptTimer = window.setTimeout(() => sendPromptIfReady(), nextDelay);
            return;
          }

          // Non-AI shells (PowerShell, CMD, Bash, WSL)
          if (!isAiAgent) {
            const isShellPromptReady = /(?:[A-Z]:\\[^\n\r]*>|PS\s+[^\n\r]*>|[$#>]\s*$)/.test(cleanText);
            const minGrace = isShellPromptReady ? 200 : 400;
            const settling = isShellPromptReady ? 150 : 300;
            const nextDelay = Math.max(Math.max(0, minGrace - elapsed), settling);
            promptTimer = window.setTimeout(() => sendPromptIfReady(), nextDelay);
            return;
          }

          // AI Agent Adaptive Readiness Analysis
          const isActivelyAuthenticating = /(?:authenticat|signing in|logging in|validating|refreshing token|checking auth|connecting\.\.\.|initializing\.\.\.|loading workspace|fetching token|please wait)/i.test(cleanText);
          const hasAccountConfirmed = /(?:logged in as|authenticated|account confirmed|session active|welcome to antigravity|welcome to claude|model:|ready)/i.test(cleanText);
          const hasInteractivePromptMarker = /(?:[❯›>]\s*$|\?\s*$|type a message|what would you like|enter a prompt|input:|\bask a question)/i.test(cleanText);

          let minGracePeriodMs = 3800; // Base safe minimum grace for cloud auth check
          let quietSettlingDurationMs = 1200; // Require 1.2s silence after last chunk

          if (isActivelyAuthenticating) {
            // Still in the middle of authentication / token refresh
            minGracePeriodMs = 5500;
            quietSettlingDurationMs = 1500;
          } else if (hasAccountConfirmed && hasInteractivePromptMarker) {
            // Account is confirmed AND prompt cursor is active
            minGracePeriodMs = 1200;
            quietSettlingDurationMs = 400;
          } else if (hasInteractivePromptMarker) {
            // Prompt cursor detected
            minGracePeriodMs = 2500;
            quietSettlingDurationMs = 600;
          }

          const nextDelay = Math.max(Math.max(0, minGracePeriodMs - elapsed), quietSettlingDurationMs);
          promptTimer = window.setTimeout(() => sendPromptIfReady(), nextDelay);
        };

        try {
          const unlistenOutput = await listen<string>(`term-output-${session.id}`, (event) => {
            sessionCacheEntry.term.write(event.payload);
            sessionCacheEntry.onActivity?.();
            evaluateReadinessAndSchedule(event.payload);
          });
          sessionCacheEntry.unlistenOutput = unlistenOutput;

          const unlistenExit = await listen(`term-exit-${session.id}`, () => {
            if (promptTimer) window.clearTimeout(promptTimer);
            if (safetyFallbackTimer) window.clearTimeout(safetyFallbackTimer);
            sessionCacheEntry.term.writeln("\r\n\x1b[33m[Process exited]\x1b[0m");
            sessionCacheEntry.onExit?.();
          });
          sessionCacheEntry.unlistenExit = unlistenExit;

          // Set fallback safety timer to ensure prompt isn't stalled indefinitely if agent output is completely silent
          if (session.initialPrompt && !isManualMode) {
            const maxSafetyTimeout = hasExplicitDelay ? session.promptDelayMs! + 1200 : (isAiAgent ? 10000 : 3500);
            safetyFallbackTimer = window.setTimeout(() => {
              sendPromptIfReady();
            }, maxSafetyTimeout);
          }

          term.onData((data) => {
            invoke("write_terminal", { id: session.id, data }).catch(() => {});
          });

          await invoke("spawn_terminal", {
            id: session.id,
            title: session.title,
            shell: session.shellOrCommand || "powershell.exe",
            args: session.args || null,
            cwd: session.cwd || null,
            cols: term.cols || 80,
            rows: term.rows || 24,
          });

          sessionCacheEntry.isNativePty = true;
          isNativePtyRef.current = true;
        } catch (err: any) {
          sessionCacheEntry.isNativePty = false;
          isNativePtyRef.current = false;
        }
      };

      setupNativePty();
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 80 && entry.contentRect.height > 40) {
        performFitAndResize(false);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Schedule progressive layout fits to handle animation settling and font rendering
    const rafId = requestAnimationFrame(() => {
      performFitAndResize(false);
    });

    const fitTimeout1 = window.setTimeout(() => {
      performFitAndResize(true);
      if (isFocused) {
        termRef.current?.focus();
      }
    }, 60);

    const fitTimeout2 = window.setTimeout(() => {
      performFitAndResize(true);
      if (isFocused) {
        termRef.current?.focus();
      }
    }, 180);

    // Theme change observer to dynamically re-color running terminal
    const themeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "data-theme") {
          if (termRef.current && !isDisposedRef.current) {
            termRef.current.options.theme = getActiveTerminalTheme();
          }
        }
      }
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const containerEl = containerRef.current;
    const handleContainerKeyDownCapture = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if ((isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "k" || e.key === "K")) ||
          (isCtrlOrCmd && e.shiftKey && (e.key === "p" || e.key === "P"))) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("open-command-palette"));
        return;
      }
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchOpen(true);
      }
    };
    if (containerEl) {
      containerEl.addEventListener("keydown", handleContainerKeyDownCapture, true);
    }

    return () => {
      isDisposedRef.current = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(fitTimeout1);
      window.clearTimeout(fitTimeout2);
      if (resizeDebounceTimerRef.current) {
        window.clearTimeout(resizeDebounceTimerRef.current);
        resizeDebounceTimerRef.current = null;
      }
      resizeObserver.disconnect();
      themeObserver.disconnect();
      if (containerEl) {
        containerEl.removeEventListener("keydown", handleContainerKeyDownCapture, true);
      }
      if (searchResultsDisposable) {
        try {
          searchResultsDisposable.dispose();
        } catch {
          // ignore
        }
      }
      // NOTE: Do not kill process or dispose terminal here; keep alive in cache
    };
  }, [session.id]);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(e.clientX, rect.right - 180);
    const y = Math.min(e.clientY, rect.bottom - 160);

    const hasSel = Boolean(termRef.current?.hasSelection());

    setContextMenu({
      visible: true,
      x: Math.max(rect.left, x),
      y: Math.max(rect.top, y),
      hasSelection: hasSel,
    });
  };

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleClickOutside = () => closeContextMenu();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("contextmenu", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("contextmenu", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.visible, closeContextMenu]);

  return (
    <div 
      ref={containerRef} 
      className="xterm-instance-container"
      onClick={() => {
        termRef.current?.focus();
      }}
      onContextMenu={handleContextMenu}
      onPaste={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = e.clipboardData?.getData("text/plain");
        if (text) {
          doSanitizedPaste(text);
        } else {
          pasteClipboard();
        }
      }}
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="terminal-feedback-toast animate-fade">
          <Check size={12} className="text-sage" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Context Menu */}
      {contextMenu.visible && (
        <div
          className="terminal-context-menu animate-fade"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            position: "fixed",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={`terminal-context-menu-item ${!contextMenu.hasSelection ? "disabled" : ""}`}
            onClick={() => {
              if (contextMenu.hasSelection) {
                copySelection();
              }
              closeContextMenu();
            }}
            disabled={!contextMenu.hasSelection}
          >
            <Copy size={13} />
            <span className="item-label">Copy</span>
            <span className="item-shortcut">Ctrl+C</span>
          </button>

          <button
            type="button"
            className="terminal-context-menu-item"
            onClick={() => {
              pasteClipboard();
              closeContextMenu();
            }}
          >
            <Clipboard size={13} />
            <span className="item-label">Paste</span>
            <span className="item-shortcut">Ctrl+V</span>
          </button>

          <div className="terminal-context-menu-divider" />

          <button
            type="button"
            className="terminal-context-menu-item"
            onClick={() => {
              selectAll();
              closeContextMenu();
            }}
          >
            <MousePointerClick size={13} />
            <span className="item-label">Select All</span>
            <span className="item-shortcut">Ctrl+Shift+A</span>
          </button>

          <button
            type="button"
            className="terminal-context-menu-item"
            onClick={() => {
              clear();
              closeContextMenu();
            }}
          >
            <Eraser size={13} />
            <span className="item-label">Clear Screen</span>
          </button>

          <div className="terminal-context-menu-divider" />

          <button
            type="button"
            className="terminal-context-menu-item"
            onClick={() => {
              setIsSearchOpen(true);
              closeContextMenu();
            }}
          >
            <Search size={13} className="text-sage" />
            <span className="item-label">Find in Terminal...</span>
            <span className="item-shortcut">Ctrl+F</span>
          </button>

          {onSendToScratchpad && (
            <>
              <div className="terminal-context-menu-divider" />
              {contextMenu.hasSelection && (
                <button
                  type="button"
                  className="terminal-context-menu-item"
                  onClick={() => {
                    const text = getSelectionText();
                    if (text) {
                      onSendToScratchpad(
                        `${session.title} (Selection)`,
                        `# Terminal Selection: ${session.title}\n- **Captured**: ${new Date().toLocaleString()}\n- **PID**: ${session.pid || "N/A"}\n- **Directory**: \`${session.cwd || "~"}\`\n\n\`\`\`\n${text}\n\`\`\``
                      );
                    }
                    closeContextMenu();
                  }}
                >
                  <Sparkles size={13} className="text-sage" />
                  <span className="item-label">Send Selection to Scratchpad</span>
                </button>
              )}
              <button
                type="button"
                className="terminal-context-menu-item"
                onClick={() => {
                  const text = getBufferText();
                  onSendToScratchpad(
                    `${session.title} Buffer`,
                    `# Terminal Buffer: ${session.title}\n- **Captured**: ${new Date().toLocaleString()}\n- **Directory**: \`${session.cwd || "~"}\`\n- **PID**: ${session.pid || "N/A"}\n\n\`\`\`\n${text}\n\`\`\``
                  );
                  closeContextMenu();
                }}
              >
                <FileText size={13} className="text-sage" />
                <span className="item-label">Send Full Buffer to Scratchpad</span>
              </button>
            </>
          )}

          {onRestart && (
            <>
              <div className="terminal-context-menu-divider" />
              <button
                type="button"
                className="terminal-context-menu-item"
                onClick={() => {
                  onRestart(session.id);
                  closeContextMenu();
                }}
              >
                <RotateCw size={13} />
                <span className="item-label">Restart Session</span>
              </button>
            </>
          )}

          {onOpenMoveMenu && (
            <>
              <div className="terminal-context-menu-divider" />
              <button
                type="button"
                className="terminal-context-menu-item"
                onClick={() => {
                  closeContextMenu();
                  onOpenMoveMenu();
                }}
              >
                <ArrowLeftRight size={13} className="text-sage" />
                <span className="item-label">Switch to Workspace...</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* In-Terminal Floating Search Bar */}
      <TerminalSearchBar
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false);
          handleClearSearch();
          termRef.current?.focus();
        }}
        onFindNext={handleFindNext}
        onFindPrevious={handleFindPrevious}
        onClearSearch={handleClearSearch}
        matchResult={matchResult}
      />
    </div>
  );
});

export default XTermInstance;
