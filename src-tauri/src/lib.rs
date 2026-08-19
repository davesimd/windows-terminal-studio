pub mod terminal;

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use terminal::{kill_terminal, list_terminals, resize_terminal, spawn_terminal, write_terminal, TerminalManager};

#[derive(Serialize, Deserialize)]
pub struct SystemStats {
    os: String,
    arch: String,
    timestamp: u64,
    app_version: String,
    status: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    if name.trim().is_empty() {
        "Hello! Welcome to your high-performance Windows desktop application.".to_string()
    } else {
        format!("Hello, {}! This message was processed by the compiled native Rust backend.", name)
    }
}

#[tauri::command]
fn get_system_stats() -> SystemStats {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    SystemStats {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        timestamp: now,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        status: "Operational (Native Rust Core)".to_string(),
    }
}

#[tauri::command]
fn run_benchmark(iterations: u32) -> String {
    let start = std::time::Instant::now();
    let mut sum: u64 = 0;
    for i in 0..iterations {
        sum = sum.wrapping_add(i as u64);
    }
    let duration = start.elapsed();
    format!(
        "Processed {} iterations in {:.2?} (Sum: {})",
        iterations, duration, sum
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(TerminalManager::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_stats,
            run_benchmark,
            spawn_terminal,
            write_terminal,
            resize_terminal,
            kill_terminal,
            list_terminals
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
