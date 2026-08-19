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
    let pty_system = native_pty_system();

    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Determine actual executable and args
    let mut cmd = CommandBuilder::new(&shell);
    if let Some(ref arg_list) = args {
        for arg in arg_list {
            cmd.arg(arg);
        }
    }

    if let Some(ref dir) = cwd {
        if !dir.trim().is_empty() {
            cmd.cwd(dir);
        }
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell '{}': {}", shell, e))?;

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
        shell,
        cwd,
        pid,
        status: "Running".to_string(),
    };

    // Background thread to read stdout/stderr from PTY and emit to frontend
    let app_clone = app.clone();
    let term_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
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

    let mut sessions = state.sessions.lock().unwrap();
    sessions.insert(id, session);

    Ok(terminal_info)
}

#[tauri::command]
pub async fn write_terminal(
    state: State<'_, TerminalManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        let mut writer = session.writer.lock().unwrap();
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Flush failed: {}", e))?;
        Ok(())
    } else {
        Err(format!("Terminal session '{}' not found", id))
    }
}

#[tauri::command]
pub async fn resize_terminal(
    state: State<'_, TerminalManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    if let Some(session) = sessions.get(&id) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize failed: {}", e))?;
        Ok(())
    } else {
        Err(format!("Terminal session '{}' not found", id))
    }
}

#[tauri::command]
pub async fn kill_terminal(
    state: State<'_, TerminalManager>,
    id: String,
) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap();
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
        Ok(())
    } else {
        Err(format!("Terminal session '{}' not found", id))
    }
}

#[tauri::command]
pub async fn list_terminals(
    state: State<'_, TerminalManager>,
) -> Result<Vec<TerminalInfo>, String> {
    let sessions = state.sessions.lock().unwrap();
    let list = sessions.values().map(|s| s.info.clone()).collect();
    Ok(list)
}
