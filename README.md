# Windows Terminal Studio ⚡

A modern, high-performance multi-workspace terminal and developer studio for Windows built with **Tauri v2**, **Rust (ConPTY)**, **React 19**, and **TypeScript**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-0078d7.svg)
![Rust](https://img.shields.io/badge/rust-2021-orange.svg)
![React](https://img.shields.io/badge/react-19-61dafb.svg)
![Release](https://img.shields.io/badge/release-v0.1.0-emerald.svg)

---

## 📥 Direct Downloads (Latest Windows Release)

You can download and run the latest compiled Windows application directly without needing a development environment:

| Package | Format | Direct Download Link |
| :--- | :--- | :--- |
| **🚀 Windows Setup Installer** | `.exe` (NSIS) | [**Download Setup Installer (.exe)**](https://github.com/davesimd/windows-terminal-studio/raw/main/releases/windows_application_0.1.0_x64-setup.exe) |
| **📦 Standalone Portable Executable** | `.exe` | [**Download Standalone App (.exe)**](https://github.com/davesimd/windows-terminal-studio/raw/main/releases/windows_application.exe) |
| **💿 Windows MSI Installer** | `.msi` | [**Download MSI Package (.msi)**](https://github.com/davesimd/windows-terminal-studio/raw/main/releases/windows_application_0.1.0_x64_en-US.msi) |

---

## 🌟 Key Features

* **Multi-Workspace Hub:** Organize CLI workflows across isolated, renameable workspaces. Background processes stay active and streaming seamlessly when switching between workspaces or pages.
* **Native Windows ConPTY Engine:** Powered by Rust's `portable-pty` and asynchronous multi-threaded channels for native terminal speed, UTF-8 streaming, and full ANSI color rendering.
* **AI Developer Agent Presets:** 1-click quick-launch presets for **Claude Code**, **Google Antigravity CLI (`agy`)**, **Kilo CLI**, **PowerShell**, **CMD**, and **WSL**.
* **Interactive Drag Split Resizers:** Single-axis drag handles for **Side-by-Side (Columns)** and **Stacked (Rows)** layouts with a **Reset Sizes** equalize button.
* **Maximized Mode Top Tab Bar:** Fullscreen a single terminal pane while keeping track of all background terminals with live activity dot indicators.
* **Input Broadcasting:** Broadcast commands simultaneously across all active terminal sessions in a workspace.
* **Working Directory Templates & Presets:** Define custom directory bookmarks, 1-click launch chips, and a global default starting folder.
* **Sub-Nav Categorized Settings:** Multi-panel settings hub for session recovery, directory presets, shell defaults, and JSON backups.
* **Runtime Telemetry & Analytics Dashboard:** Real-time uptime clocks, tool usage charts, and historical session logs with JSON/CSV export.
* **Persistence & Recovery:** Automatically restores workspace tabs, layout arrangements, and custom terminal configurations across app launches.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, XTerm.js
* **Backend:** Tauri v2, Rust (ConPTY, `portable-pty`, Tokio)
* **Toolchain:** `x86_64-pc-windows-gnu` / WinLibs UCRT

---

## 🚀 Getting Started (Development)

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

---

## 📄 License

MIT License. Open source for all developers.
