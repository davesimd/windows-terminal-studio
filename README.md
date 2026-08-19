# Windows Terminal Studio ⚡

A modern, high-performance multi-workspace terminal and developer studio for Windows built with **Tauri v2**, **Rust (ConPTY)**, **React 19**, and **TypeScript**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-0078d7.svg)
![Rust](https://img.shields.io/badge/rust-2021-orange.svg)
![React](https://img.shields.io/badge/react-19-61dafb.svg)

---

## 🌟 Key Features

* **Multi-Workspace Hub:** Organize CLI workflows across isolated, renameable workspaces. Background processes stay active and streaming seamlessly when switching between workspaces.
* **Native Windows ConPTY Engine:** Powered by Rust's `portable-pty` and asynchronous Tokio multi-threaded channels for native terminal speed and ANSI/VT100 rendering.
* **AI CLI & Shell Quick Presets:** 1-click quick-spawning for **Kilo CLI**, **Gemini CLI**, **Claude Code**, **PowerShell**, **CMD**, and **WSL**.
* **Dynamic Grid Layouts:** Flexible split arrangements including **Side-by-Side (Columns)**, **Stacked (Rows)**, **2x2 Matrix Grid**, and **Single Tabbed Focus View**.
* **Maximized Mode Top Tab Bar:** Fullscreen a single terminal pane while keeping track of all background terminals with active status indicators and a restore button.
* **Input Broadcasting:** Broadcast commands simultaneously across all active terminal sessions in a workspace.
* **Working Directory Templates & Presets:** Define custom directory bookmarks, 1-click launch chips, and a global default starting folder.
* **Runtime Telemetry & Analytics Dashboard:** Real-time uptime clocks, tool usage allocation charts, and historical session logs with JSON/CSV export.
* **Persistence & Recovery:** Automatically restores workspace tabs, layout arrangements, and custom terminal configurations across app launches.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, XTerm.js / ANSI Parsers
* **Backend:** Tauri v2, Rust (ConPTY, `portable-pty`, Tokio)
* **Toolchain:** `x86_64-pc-windows-gnu` / WinLibs UCRT

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Rust](https://www.rust-lang.org/) (stable)
* Windows 10/11 with ConPTY support

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/davesimd/windows-terminal-studio.git
cd windows-terminal-studio

# Install dependencies
npm install

# Run in live development mode
npm run tauri dev
```

### Building Release Executables

```bash
# Build standalone .exe, NSIS setup installer, and MSI package
npm run tauri build
```

The output executables will be located in:
* Standalone `.exe`: `src-tauri/target/release/windows_application.exe`
* NSIS Setup: `src-tauri/target/release/bundle/nsis/windows_application_0.1.0_x64-setup.exe`
* MSI: `src-tauri/target/release/bundle/msi/windows_application_0.1.0_x64_en-US.msi`

---

## 📄 License

MIT License. Open source for all developers.
