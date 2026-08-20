# Windows Terminal Studio: Architecture, Gotchas & Troubleshooting Guide

This document records the architectural decisions, root causes of system-level issues encountered on Windows, and best practices implemented to prevent regressions.

---

## 1. Process Spawning & PTY Architecture

### The `0xc0000142` (`STATUS_DLL_INIT_FAILED`) Error

#### Symptoms
Whenever `powershell.exe` or `cmd.exe` was spawned inside a terminal pane, Windows presented a system error dialog:
> **powershell.exe - Application Error**  
> *The application was unable to start correctly (0xc0000142). Click OK to close the application.*

#### Root Causes Identified
1. **Unsorted Environment Block in `portable-pty`**:
   - `portable-pty` (0.8.x) stores process environment variables in a Rust `HashMap<EnvKey, EnvEntry>`.
   - When generating the environment block for Win32 `CreateProcessW`, it iterates over `self.envs.values()`. Because Rust's `HashMap` has non-deterministic, randomized bucket ordering, the environment block passed to `CreateProcessW` is **unsorted**.
   - Win32 `CreateProcessW` specification requires environment blocks to be **strictly sorted in alphabetical/case-insensitive Unicode order**.
   - In applications hosting Microsoft Edge WebView2 (which injects 40+ environment variables), `ntdll.dll` / `clr.dll` attempts a binary search on the environment block during process startup. When binary search fails on an unsorted block, .NET CLR initialization aborts with `STATUS_DLL_INIT_FAILED (0xc0000142)`.

2. **Parent Process Working Directory Contamination**:
   - When no explicit `cwd` was provided to the spawned shell, it defaulted to the application directory (`src-tauri/target/debug`).
   - Windows DLL search order caused `powershell.exe` to attempt loading DLLs (such as `WebView2Loader.dll` or MinGW runtime DLLs) from the build directory rather than `System32`.

#### Permanent Solution: Pure Native Windows ConPTY
In [`src-tauri/src/terminal.rs`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src-tauri/src/terminal.rs), we replaced `portable-pty` with a direct, native Windows PseudoConsole (ConPTY) implementation using `windows-sys`:
- Directly invokes `CreatePseudoConsole`, `CreatePipe`, and `CreateProcessW`.
- Passes `lpEnvironment = NULL` to `CreateProcessW`, instructing the Windows kernel to inherit the OS's native, pre-sorted environment block.
- Explicitly sets working directory fallback to `%USERPROFILE%` (`C:\Users\<username>`).

---

## 2. Windows Common Controls & Manifests (`TaskDialogIndirect`)

### The Entry Point Not Found Error

#### Symptoms
On launching the executable, Windows showed:
> **windows_application.exe - Entry Point Not Found**  
> *The procedure entry point `TaskDialogIndirect` could not be located in the dynamic link library `windows_application.exe`.*

#### Root Cause
- Modern Windows UI frameworks, Tauri, and Edge WebView2 require **Microsoft Windows Common Controls Version 6** (`comctl32.dll` v6.0).
- If the application binary lacks an embedded Common-Controls 6 manifest, Windows defaults to loading the legacy Common Controls v5 (`comctl32.dll` v5.82 from `System32`), which does not export `TaskDialogIndirect`.

#### Solution
In [`src-tauri/build.rs`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src-tauri/build.rs), explicitly embed the Microsoft Windows Common-Controls 6.0 manifest:
```rust
fn main() {
    let mut windows_attributes = tauri_build::WindowsAttributes::new();
    windows_attributes = windows_attributes.app_manifest(r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
</assembly>
"#);
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows_attributes))
        .expect("failed to run tauri-build");
}
```

---

## 3. Subsystem Console Window Prevention

### Symptoms
Booting `windows_application.exe` opened an empty `cmd.exe`/`conhost.exe` console window alongside the GUI. Closing the console window terminated the GUI.

### Root Cause
In `main.rs`, the subsystem directive was conditional:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
```
In debug builds (`cargo build` without `--release`), Windows treated the application as a console subsystem app.

### Solution
In [`src-tauri/src/main.rs`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src-tauri/src/main.rs):
```rust
#![windows_subsystem = "windows"]
```
Applied unconditionally across all build configurations.

---

## 4. Multi-Terminal Layout & Resizing

### Symptoms
When a second terminal was spawned in a workspace, text output was rendered in only a very narrow left portion of the terminal pane (~80 columns) rather than expanding across the available width.

### Root Cause
In [`XTermInstance.tsx`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src/components/terminal/XTermInstance.tsx), a `ResizeObserver` was instantiated, but `resizeObserver.observe(containerRef.current)` was never invoked. Consequently:
- Layout resizing (50/50 splits, maximize, grid adjustments) never triggered `fitAddon.fit()`.
- The backend ConPTY dimensions were never updated via `resize_terminal`.

### Solution
1. Attached `resizeObserver.observe(containerRef.current)`.
2. Added a post-reflow layout fit timeout (`window.setTimeout(..., 60)`) on initial mount.

---

## 5. Workspace Switching & Session Persistence

### Symptoms
Switching between workspace tabs terminated active processes and re-spawned all terminals, causing session resets and process storms.

### Root Cause
In [`App.tsx`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src/App.tsx), inactive workspace components were conditionally unmounted (`if (!isVisible) return null;`).

### Solution
Workspaces are preserved in the DOM using CSS display toggles:
```tsx
<div style={{ display: isVisible ? "flex" : "none", height: "100%", width: "100%" }}>
  <WorkspacePage workspace={ws} ... />
</div>
```

---

## 6. Process Lifecycle & Cleanup

### Best Practices Implemented
1. **Child Process Tree Termination**:
   - Simply calling `.kill()` on a parent process on Windows does not terminate its spawned child tree (e.g. `conhost.exe`, CLI agent sub-processes).
   - In [`terminal.rs`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src-tauri/src/terminal.rs), every session termination executes:
     ```rust
     taskkill /F /T /PID <pid>
     ```
2. **App Exit Lifecycle Hooks**:
   - In [`lib.rs`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src-tauri/src/lib.rs), Tauri's `RunEvent::Exit` and `RunEvent::ExitRequested` handlers call `kill_all_terminals` to ensure zero orphaned background processes remain when the application closes.
3. **Safe Boot Defaults**:
   - In [`src/types/settings.ts`](file:///c:/Users/daves/.gemini/antigravity-ide/scratch/windows_application/src/types/settings.ts), `restoreTerminalsOnLaunch` is set to `false` by default to prevent process storms on boot.
   - Emergency "Kill All Processes" button added in Settings.

---

## 7. Interactive Agent Tool Spawning

### Pattern Implemented
Instead of passing `-NoExit -Command <agent>` directly to `powershell.exe` (which can cause early command parsing errors before PTY initialization), we:
1. Boot the shell in clean interactive mode (`powershell.exe -NoLogo`).
2. Stream the startup command (e.g. `agy\r`, `claude\r`, `codex\r`) directly into the active PTY input stream once the connection is established.
3. If an agent process finishes or is stopped with `Ctrl+C`, the session remains cleanly at the shell prompt without crashing the pane.
