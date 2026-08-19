import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface XTermInstanceProps {
  sessionId: string;
  onActivity?: () => void;
}

export default function XTermInstance({ sessionId, onActivity }: XTermInstanceProps) {
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

    // Initial fit
    try {
      fitAddon.fit();
    } catch {
      // ignore initial fit error before layout settles
    }

    let unlistenOutput: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    const setupTauri = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const { listen } = await import("@tauri-apps/api/event");

        // Send user typing from xterm to Rust PTY
        term.onData((data) => {
          invoke("write_terminal", { id: sessionId, data }).catch(() => {});
        });

        // Listen for output streaming from Rust backend
        unlistenOutput = await listen<string>(`term-output-${sessionId}`, (event) => {
          term.write(event.payload);
          onActivity?.();
        });

        // Listen for process exit
        unlistenExit = await listen(`term-exit-${sessionId}`, () => {
          term.writeln("\r\n\x1b[33m[Process completed]\x1b[0m");
        });

        // Send initial dimensions to backend
        if (term.cols && term.rows) {
          invoke("resize_terminal", {
            id: sessionId,
            cols: term.cols,
            rows: term.rows,
          }).catch(() => {});
        }
      } catch {
        // Fallback simulated browser terminal
        term.writeln("\x1b[36m⚡ Running in Web Preview Mode\x1b[0m");
        term.writeln("Interactive ConPTY available when running in Tauri.\r\n");
        term.write(`PS ${sessionId}> `);

        term.onData((data) => {
          if (data === "\r") {
            term.write(`\r\nPS ${sessionId}> `);
          } else if (data === "\u007F") {
            term.write("\b \b");
          } else {
            term.write(data);
          }
        });
      }
    };

    setupTauri();

    // Auto-fit on container resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          const cols = termRef.current.cols;
          const rows = termRef.current.rows;
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("resize_terminal", { id: sessionId, cols, rows }).catch(() => {});
          }).catch(() => {});
        } catch {
          // ignore layout transition errors
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      term.dispose();
    };
  }, [sessionId]);

  return <div ref={containerRef} className="xterm-instance-container" />;
}
