import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Copy, Clipboard, Check, MousePointerClick, Eraser, RotateCw, ArrowLeftRight } from "lucide-react";
import { TerminalData } from "./TerminalSession";
import "@xterm/xterm/css/xterm.css";

export interface XTermHandle {
  copySelection: () => Promise<boolean>;
  pasteClipboard: () => Promise<boolean>;
  selectAll: () => void;
  clear: () => void;
  hasSelection: () => boolean;
  focus: () => void;
}

interface XTermInstanceProps {
  session: TerminalData;
  onActivity?: () => void;
  onRestart?: (id: string) => void;
  onOpenMoveMenu?: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  hasSelection: boolean;
}

const XTermInstance = forwardRef<XTermHandle, XTermInstanceProps>(({ session, onActivity, onRestart, onOpenMoveMenu }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isDisposedRef = useRef(false);
  const isNativePtyRef = useRef(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    hasSelection: false,
  });

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 1800);
  }, []);

  // Copy selection to clipboard
  const copySelection = useCallback(async (): Promise<boolean> => {
    if (!termRef.current) return false;
    const selection = termRef.current.getSelection();
    if (selection && selection.length > 0) {
      try {
        await navigator.clipboard.writeText(selection);
        showToast("Copied to clipboard");
        return true;
      } catch {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = selection;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          showToast("Copied to clipboard");
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }, [showToast]);

  // Paste text from clipboard into terminal
  const pasteClipboard = useCallback(async (): Promise<boolean> => {
    if (!termRef.current || isDisposedRef.current) return false;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (isNativePtyRef.current) {
          await invoke("write_terminal", { id: session.id, data: text });
        } else {
          termRef.current.write(text);
        }
        showToast("Pasted from clipboard");
        return true;
      }
    } catch (err) {
      console.error("Clipboard paste error:", err);
    }
    return false;
  }, [session.id, showToast]);

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

  useImperativeHandle(ref, () => ({
    copySelection,
    pasteClipboard,
    selectAll,
    clear,
    hasSelection,
    focus,
  }));

const SAGE_TERMINAL_THEME = {
  background: "#0a0a0a",
  foreground: "#e2e8f0",
  cursor: "#9fb4a5",
  cursorAccent: "#0a0a0a",
  selectionBackground: "rgba(126, 145, 131, 0.30)",
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
  selectionBackground: "rgba(197, 160, 89, 0.30)",
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

function getActiveTerminalTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  return current === "gold" ? GOLD_TERMINAL_THEME : SAGE_TERMINAL_THEME;
}

  const copySelectionRef = useRef(copySelection);
  copySelectionRef.current = copySelection;

  const pasteClipboardRef = useRef(pasteClipboard);
  pasteClipboardRef.current = pasteClipboard;

  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    if (!containerRef.current) return;
    isDisposedRef.current = false;

    // Initialize xterm with dynamic theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      theme: getActiveTerminalTheme(),
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const clipboardAddon = new ClipboardAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(clipboardAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {
      // ignore
    }

    // Intercept keyboard shortcuts for copy / paste / select all
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type !== "keydown") return true;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. Standard Copy (Ctrl+C / Cmd+C):
      // If there is an active text selection, copy it to clipboard and prevent sending SIGINT (^C)
      if (isCtrlOrCmd && !e.shiftKey && !e.altKey && (e.key === "c" || e.key === "C")) {
        if (term.hasSelection()) {
          copySelectionRef.current();
          return false;
        }
        // No selection: let standard Ctrl+C pass through to interrupt the command
        return true;
      }

      // 2. Explicit Copy (Ctrl+Shift+C or Ctrl+Insert)
      if ((isCtrlOrCmd && e.shiftKey && (e.key === "c" || e.key === "C")) ||
          (isCtrlOrCmd && !e.shiftKey && e.key === "Insert")) {
        if (term.hasSelection()) {
          copySelectionRef.current();
        }
        return false;
      }

      // 3. Standard Paste (Ctrl+V / Cmd+V / Ctrl+Shift+V / Shift+Insert)
      if ((isCtrlOrCmd && (e.key === "v" || e.key === "V")) ||
          (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === "Insert")) {
        pasteClipboardRef.current();
        return false; // Prevent raw 0x16 character
      }

      // 4. Select All (Ctrl+Shift+A)
      if (isCtrlOrCmd && e.shiftKey && (e.key === "a" || e.key === "A")) {
        term.selectAll();
        return false;
      }

      return true;
    });

    let unlistenOutput: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    const setupNativePty = async () => {
      try {
        // 1. Listen for output streaming from Rust backend
        unlistenOutput = await listen<string>(`term-output-${session.id}`, (event) => {
          if (!isDisposedRef.current) {
            term.write(event.payload);
            onActivityRef.current?.();
          }
        });

        // 2. Listen for process exit
        unlistenExit = await listen(`term-exit-${session.id}`, () => {
          if (!isDisposedRef.current) {
            term.writeln("\r\n\x1b[33m[Process exited]\x1b[0m");
          }
        });

        // 3. Send user keystrokes from xterm to Rust PTY
        term.onData((data) => {
          if (!isDisposedRef.current) {
            invoke("write_terminal", { id: session.id, data }).catch(() => {});
          }
        });

        // 4. Spawn the actual native PTY process on the backend
        const effectiveShell = session.shellOrCommand || "powershell.exe";
        let effectiveArgs = session.args || null;
        let commandToSend: string | null = null;

        // If args contain "-Command", extract the command to send via PTY input for clean, non-crashing execution
        if (effectiveArgs && effectiveArgs.includes("-Command")) {
          const cmdIndex = effectiveArgs.indexOf("-Command");
          if (cmdIndex !== -1 && cmdIndex + 1 < effectiveArgs.length) {
            commandToSend = effectiveArgs.slice(cmdIndex + 1).join(" ");
          }
          effectiveArgs = ["-NoLogo"];
        }

        await invoke("spawn_terminal", {
          id: session.id,
          title: session.title,
          shell: effectiveShell,
          args: effectiveArgs,
          cwd: session.cwd || null,
          cols: term.cols || 80,
          rows: term.rows || 24,
        });

        isNativePtyRef.current = true;

        if (commandToSend) {
          window.setTimeout(() => {
            if (!isDisposedRef.current) {
              invoke("write_terminal", { id: session.id, data: commandToSend + "\r" }).catch(() => {});
            }
          }, 180);
        }
      } catch (err: any) {
        isNativePtyRef.current = false;
        // Fallback for browser preview mode or error display
        const errMsg = err?.toString() || "Unknown error";
        if (errMsg.includes("not found") || errMsg.includes("Failed to spawn")) {
          term.writeln(`\r\n\x1b[31m[Error launching shell]: ${errMsg}\x1b[0m\r\n`);
        } else {
          term.writeln("\x1b[36m⚡ Running in Web Preview Mode\x1b[0m");
          term.writeln("Interactive ConPTY available when running in Tauri native app.\r\n");
          term.write(`PS ${session.cwd || "~"}> `);

          term.onData((data) => {
            if (data === "\r") {
              term.write(`\r\nPS ${session.cwd || "~"}> `);
            } else if (data === "\u007F") {
              term.write("\b \b");
            } else {
              term.write(data);
            }
          });
        }
      }
    };

    setupNativePty();

    // Auto-fit on container resize observer with guard
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 50 && entry.contentRect.height > 50) {
        if (fitAddonRef.current && termRef.current && !isDisposedRef.current) {
          try {
            fitAddonRef.current.fit();
            const cols = termRef.current.cols;
            const rows = termRef.current.rows;
            invoke("resize_terminal", { id: session.id, cols, rows }).catch(() => {});
          } catch {
            // ignore layout transition errors
          }
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Schedule initial layout fit after DOM layout completes
    const initialFitTimeout = window.setTimeout(() => {
      if (fitAddonRef.current && termRef.current && !isDisposedRef.current) {
        try {
          fitAddonRef.current.fit();
          const cols = termRef.current.cols;
          const rows = termRef.current.rows;
          invoke("resize_terminal", { id: session.id, cols, rows }).catch(() => {});
        } catch {
          // ignore
        }
      }
    }, 60);

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

    return () => {
      isDisposedRef.current = true;
      window.clearTimeout(initialFitTimeout);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      invoke("kill_terminal", { id: session.id }).catch(() => {});
      term.dispose();
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
      onContextMenu={handleContextMenu}
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
    </div>
  );
});


export default XTermInstance;
