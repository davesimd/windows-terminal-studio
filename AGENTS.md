# Windows Terminal Studio — AI Agent Guidelines

Welcome to the **Windows Terminal Studio** repository. This document provides core development standards, architectural references, and UI behavior rules that all AI agents and contributors must follow.

---

## 1. Reference Documentation

Before implementing new features or making architectural changes, consult the relevant reference documents in the [`references/`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/references/) directory:

- **[references/modal_guidelines_and_patterns.md](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/references/modal_guidelines_and_patterns.md)**:
  - Modal & dialog architecture, standard component boilerplates, keyboard interaction patterns, and accessibility checklist.

- **[references/windows_terminal_architecture_and_troubleshooting.md](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/references/windows_terminal_architecture_and_troubleshooting.md)**:
  - Native Windows ConPTY process spawning (`STATUS_DLL_INIT_FAILED / 0xc0000142` prevention and environment block sorting rules).
  - Common Controls v6 manifest embedding for `TaskDialogIndirect`.
  - Windows window state persistence (maximizing, resizing, multi-monitor bounds).

---

## 2. Core UI & Component Rules

### Modals and Dialog Overlays
- **Mandatory Escape Key Dismissal**: Every modal, drawer, or dialog overlay **MUST support the `Escape` key** for closing. Attach a `keydown` listener for `e.key === "Escape"` with proper cleanup in `useEffect`. Refer to [`references/modal_guidelines_and_patterns.md`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/references/modal_guidelines_and_patterns.md).
- **Backdrop Dismissal**: Clicking the backdrop (`.modal-backdrop`) must dismiss the modal; the inner container must call `e.stopPropagation()`.
- **Close Button**: Include a top-right `<X />` close button with an accessible label.

### Terminal & Backend Architecture
- The frontend is built using **React 18**, **TypeScript**, and **Tailwind CSS**.
- The backend is a **Tauri 1.x** application with native Windows ConPTY integration in `src-tauri/src/terminal.rs`.
- Terminal emulation uses **xterm.js** with fit, webgl/canvas, and custom keyboard / clipboard handlers.
