import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TerminalData } from "./TerminalSession";
import "@xterm/xterm/css/xterm.css";

interface XTermInstanceProps {
  session: TerminalData;
  onActivity?: () => void;
}

export default function XTermInstance({ session, onActivity }: XTermInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize xterm with dark theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      theme: {
        background: "#0d1017",
        foreground: "#e2e8f0",
        cursor: "#818cf8",
        cursorAccent: "#0d1017",
        selectionBackground: "rgba(99, 102, 241, 0.3)",
        black: "#1e293b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#38bdf8",
        white: "#f8fafc",
        brightBlack: "#475569",
        brightRed: "#ef4444",
        brightGreen: "#22c55e",
        brightYellow: "#eab308",
        brightBlue: "#3b82f6",
        brightMagenta: "#a855f7",
        brightCyan: "#06b6d4",
        brightWhite: "#ffffff",
      },
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    try {
      fitAddon.fit();
    } catch {
      // ignore
    }

    let unlistenOutput: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;
    let isDisposed = false;

    const setupNativePty = async () => {
      try {
        // 1. Listen for output streaming from Rust backend
        unlistenOutput = await listen<string>(`term-output-${session.id}`, (event) => {
          if (!isDisposed) {
            term.write(event.payload);
            onActivity?.();
          }
        });

        // 2. Listen for process exit
        unlistenExit = await listen(`term-exit-${session.id}`, () => {
          if (!isDisposed) {
            term.writeln("\r\n\x1b[33m[Process exited]\x1b[0m");
          }
        });

        // 3. Send user keystrokes from xterm to Rust PTY
        term.onData((data) => {
          if (!isDisposed) {
            invoke("write_terminal", { id: session.id, data }).catch(() => {});
          }
        });

        // 4. Spawn the actual native PTY process on the backend
        await invoke("spawn_terminal", {
          id: session.id,
          title: session.title,
          shell: session.shellOrCommand || "powershell.exe",
          args: session.args || null,
          cwd: session.cwd || null,
          cols: term.cols || 80,
          rows: term.rows || 24,
        });

      } catch (err: any) {
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
        if (fitAddonRef.current && termRef.current && !isDisposed) {
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

    resizeObserver.observe(containerRef.current);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      invoke("kill_terminal", { id: session.id }).catch(() => {});
      term.dispose();
    };
  }, [session.id]);

  return <div ref={containerRef} className="xterm-instance-container" />;
}
