use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TerminalInfo {
    pub id: String,
    pub title: String,
    pub shell: String,
    pub cwd: Option<String>,
    pub pid: Option<u32>,
    pub status: String,
}

pub struct TerminalSession {
    pub info: TerminalInfo,
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Box<dyn portable_pty::Child + Send + Sync>,
}

#[derive(Default)]
pub struct TerminalManager {
    pub sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

#[tauri::command]
pub async fn spawn_terminal(
    app: AppHandle,
    state: State<'_, TerminalManager>,
    id: String,
    title: String,
    shell: String,
    args: Option<Vec<String>>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<TerminalInfo, String> {
    // If a session with this ID already exists, kill it cleanly first
    {
        let mut sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
        if let Some(mut old_session) = sessions.remove(&id) {
            let _ = old_session.child.kill();
        }
    }

    let pty_system = native_pty_system();

    let size = PtySize {
        rows: rows.unwrap_or(24).max(5),
        cols: cols.unwrap_or(80).max(10),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY subsystem: {}", e))?;

    // Determine actual executable and arguments
    let effective_shell = if shell.trim().is_empty() {
        "powershell.exe".to_string()
    } else {
        shell.clone()
    };

    let mut cmd = CommandBuilder::new(&effective_shell);
    if let Some(ref arg_list) = args {
        for arg in arg_list {
            cmd.arg(arg);
        }
    }

    if let Some(ref dir) = cwd {
        let trimmed = dir.trim();
        if !trimmed.is_empty() {
            let path = std::path::Path::new(trimmed);
            if path.exists() && path.is_dir() {
                cmd.cwd(trimmed);
            }
        }
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell '{}': {}", effective_shell, e))?;

    let pid = child.process_id();
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

    let terminal_info = TerminalInfo {
        id: id.clone(),
        title,
        shell: effective_shell,
        cwd,
        pid,
        status: "Running".to_string(),
    };

    // Background thread to read stdout/stderr from PTY and emit to frontend
    let app_clone = app.clone();
    let term_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut reader = reader;
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_clone.emit(&format!("term-exit-{}", term_id), ());
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(&format!("term-output-{}", term_id), data);
                }
                Err(_) => {
                    let _ = app_clone.emit(&format!("term-exit-{}", term_id), ());
                    break;
                }
            }
        }
    });

    let session = TerminalSession {
        info: terminal_info.clone(),
        master: pair.master,
        writer: Arc::new(Mutex::new(writer)),
        child,
    };

    let mut sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    sessions.insert(id, session);

    Ok(terminal_info)
}

#[tauri::command]
pub async fn write_terminal(
    state: State<'_, TerminalManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(session) = sessions.get(&id) {
        if let Ok(mut writer) = session.writer.lock() {
            let _ = writer.write_all(data.as_bytes());
            let _ = writer.flush();
            Ok(())
        } else {
            Err("Writer mutex poisoned".to_string())
        }
    } else {
        // Return Ok if session already exited gracefully rather than panicking/throwing
        Ok(())
    }
}

#[tauri::command]
pub async fn resize_terminal(
    state: State<'_, TerminalManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(session) = sessions.get(&id) {
        let _ = session.master.resize(PtySize {
            rows: rows.max(5),
            cols: cols.max(10),
            pixel_width: 0,
            pixel_height: 0,
        });
        Ok(())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub async fn kill_terminal(
    state: State<'_, TerminalManager>,
    id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
        Ok(())
    } else {
        Ok(())
    }
}

#[tauri::command]
pub async fn list_terminals(
    state: State<'_, TerminalManager>,
) -> Result<Vec<TerminalInfo>, String> {
    let sessions = state.sessions.lock().map_err(|e| format!("Lock error: {}", e))?;
    let list = sessions.values().map(|s| s.info.clone()).collect();
    Ok(list)
}
