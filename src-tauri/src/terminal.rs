use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::io::{Read, Write};
use std::os::windows::ffi::OsStrExt;
use std::os::windows::io::FromRawHandle;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::{mem, ptr};
use tauri::{AppHandle, Emitter, State};

use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
use windows_sys::Win32::System::Console::{
    ClosePseudoConsole, CreatePseudoConsole, ResizePseudoConsole, COORD, HPCON,
};
use windows_sys::Win32::System::Pipes::CreatePipe;
use windows_sys::Win32::System::Threading::{
    CreateProcessW, DeleteProcThreadAttributeList, InitializeProcThreadAttributeList,
    TerminateProcess, UpdateProcThreadAttribute, EXTENDED_STARTUPINFO_PRESENT,
    PROCESS_INFORMATION, PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE, STARTUPINFOEXW,
};

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
    pub hpcon: HPCON,
    pub h_process: HANDLE,
    pub writer: Arc<Mutex<std::fs::File>>,
    pub is_running: Arc<AtomicBool>,
}

unsafe impl Send for TerminalSession {}
unsafe impl Sync for TerminalSession {}

pub struct TerminalManager {
    pub sessions: Mutex<HashMap<String, TerminalSession>>,
}

impl Default for TerminalManager {
    fn default() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(Some(0)).collect()
}

pub fn terminate_session(session: TerminalSession) {
    session.is_running.store(false, Ordering::SeqCst);
    unsafe {
        if !session.h_process.is_null() {
            let _ = TerminateProcess(session.h_process, 1);
            let _ = CloseHandle(session.h_process);
        }
        if session.hpcon != 0 {
            ClosePseudoConsole(session.hpcon);
        }
    }
    if let Some(pid) = session.info.pid {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let _ = std::process::Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &pid.to_string()])
                .creation_flags(CREATE_NO_WINDOW)
                .output();
        }
    }
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
    // Clean up any existing session with this ID before spawning a new one
    {
        if let Ok(mut sessions) = state.sessions.lock() {
            if let Some(old_session) = sessions.remove(&id) {
                terminate_session(old_session);
            }
        }
    }

    let initial_cols = cols.unwrap_or(80).max(10) as i16;
    let initial_rows = rows.unwrap_or(24).max(5) as i16;

    let resolved_shell = if shell.trim().is_empty() {
        "powershell.exe".to_string()
    } else {
        shell.trim().to_string()
    };

    let mut full_cmd_line = resolved_shell.clone();
    if let Some(ref arg_list) = args {
        for arg in arg_list {
            full_cmd_line.push(' ');
            if arg.contains(' ') && !arg.starts_with('"') {
                full_cmd_line.push('"');
                full_cmd_line.push_str(arg);
                full_cmd_line.push('"');
            } else {
                full_cmd_line.push_str(arg);
            }
        }
    }

    let target_dir = if let Some(ref dir) = cwd {
        let trimmed = dir.trim();
        if !trimmed.is_empty() && std::path::Path::new(trimmed).is_dir() {
            trimmed.to_string()
        } else {
            std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
        }
    } else {
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\".to_string())
    };

    let mut in_read: HANDLE = ptr::null_mut();
    let mut in_write: HANDLE = ptr::null_mut();
    let mut out_read: HANDLE = ptr::null_mut();
    let mut out_write: HANDLE = ptr::null_mut();

    let mut hpcon: HPCON = 0;
    let pid: u32;
    let h_proc: HANDLE;

    unsafe {
        if CreatePipe(&mut in_read, &mut in_write, ptr::null_mut(), 0) == 0 {
            return Err("Failed to create input pipe for PTY".to_string());
        }
        if CreatePipe(&mut out_read, &mut out_write, ptr::null_mut(), 0) == 0 {
            CloseHandle(in_read);
            CloseHandle(in_write);
            return Err("Failed to create output pipe for PTY".to_string());
        }

        let hr = CreatePseudoConsole(
            COORD {
                X: initial_cols,
                Y: initial_rows,
            },
            in_read,
            out_write,
            0,
            &mut hpcon,
        );

        if hr != 0 {
            CloseHandle(in_read);
            CloseHandle(in_write);
            CloseHandle(out_read);
            CloseHandle(out_write);
            return Err(format!("CreatePseudoConsole failed: HRESULT 0x{:X}", hr));
        }

        // Parent does not need these ends once pseudo console is created
        CloseHandle(in_read);
        CloseHandle(out_write);

        let mut attr_size = 0usize;
        InitializeProcThreadAttributeList(ptr::null_mut(), 1, 0, &mut attr_size);
        let mut attr_buffer = vec![0u8; attr_size];
        let attr_list = attr_buffer.as_mut_ptr() as *mut _;
        InitializeProcThreadAttributeList(attr_list, 1, 0, &mut attr_size);

        UpdateProcThreadAttribute(
            attr_list,
            0,
            PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE as usize,
            hpcon as *const _,
            mem::size_of::<HPCON>(),
            ptr::null_mut(),
            ptr::null_mut(),
        );

        let mut si_ex: STARTUPINFOEXW = mem::zeroed();
        si_ex.StartupInfo.cb = mem::size_of::<STARTUPINFOEXW>() as u32;
        si_ex.lpAttributeList = attr_list;

        let mut pi: PROCESS_INFORMATION = mem::zeroed();
        let mut cmd_wide = to_wide(&full_cmd_line);
        let cwd_wide = to_wide(&target_dir);

        // Pass NULL for lpEnvironment to ensure 100% native Windows pre-sorted environment inheritance
        let success = CreateProcessW(
            ptr::null(),
            cmd_wide.as_mut_ptr(),
            ptr::null_mut(),
            ptr::null_mut(),
            0,
            EXTENDED_STARTUPINFO_PRESENT,
            ptr::null_mut(), // NULL = native environment block!
            cwd_wide.as_ptr(),
            &mut si_ex.StartupInfo,
            &mut pi,
        );

        DeleteProcThreadAttributeList(attr_list);

        if success == 0 {
            let err = std::io::Error::last_os_error();
            CloseHandle(in_write);
            CloseHandle(out_read);
            ClosePseudoConsole(hpcon);
            return Err(format!("Failed to spawn process '{}': {}", full_cmd_line, err));
        }

        CloseHandle(pi.hThread);
        pid = pi.dwProcessId;
        h_proc = pi.hProcess;
    }

    let is_running = Arc::new(AtomicBool::new(true));
    let is_running_clone = Arc::clone(&is_running);

    let writer = unsafe { std::fs::File::from_raw_handle(in_write as _) };
    let mut reader = unsafe { std::fs::File::from_raw_handle(out_read as _) };

    let app_clone = app.clone();
    let term_id = id.clone();

    // Background thread to stream PTY output to frontend xterm instance
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        while is_running_clone.load(Ordering::Relaxed) {
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

    let terminal_info = TerminalInfo {
        id: id.clone(),
        title,
        shell: resolved_shell,
        cwd: Some(target_dir),
        pid: Some(pid),
        status: "Running".to_string(),
    };

    let session = TerminalSession {
        info: terminal_info.clone(),
        hpcon,
        h_process: h_proc,
        writer: Arc::new(Mutex::new(writer)),
        is_running,
    };

    if let Ok(mut sessions) = state.sessions.lock() {
        sessions.insert(id, session);
    }

    Ok(terminal_info)
}

#[tauri::command]
pub async fn write_terminal(
    state: State<'_, TerminalManager>,
    id: String,
    data: String,
) -> Result<(), String> {
    let session_writer = {
        let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions
            .get(&id)
            .map(|s| Arc::clone(&s.writer))
            .ok_or_else(|| format!("Terminal '{}' not found", id))?
    };

    let mut writer = session_writer.lock().map_err(|e| e.to_string())?;
    writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to terminal: {}", e))?;
    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn resize_terminal(
    state: State<'_, TerminalManager>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let hpcon = {
        let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions
            .get(&id)
            .map(|s| s.hpcon)
            .ok_or_else(|| format!("Terminal '{}' not found", id))?
    };

    if hpcon != 0 {
        unsafe {
            let _ = ResizePseudoConsole(
                hpcon,
                COORD {
                    X: cols.max(10) as i16,
                    Y: rows.max(5) as i16,
                },
            );
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn kill_terminal(
    state: State<'_, TerminalManager>,
    id: String,
) -> Result<(), String> {
    let session = {
        let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
        sessions.remove(&id)
    };

    if let Some(session) = session {
        terminate_session(session);
    }

    Ok(())
}

#[tauri::command]
pub async fn kill_all_terminals(
    state: State<'_, TerminalManager>,
) -> Result<(), String> {
    if let Ok(mut sessions) = state.sessions.lock() {
        for (_, session) in sessions.drain() {
            terminate_session(session);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn list_terminals(
    state: State<'_, TerminalManager>,
) -> Result<Vec<TerminalInfo>, String> {
    if let Ok(sessions) = state.sessions.lock() {
        let list = sessions.values().map(|s| s.info.clone()).collect();
        Ok(list)
    } else {
        Ok(Vec::new())
    }
}
