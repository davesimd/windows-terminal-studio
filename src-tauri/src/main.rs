// Prevents additional console window on Windows in all build profiles
#![windows_subsystem = "windows"]

#[cfg(target_os = "windows")]
fn ensure_webview2_loader() {
    // Embed the 160KB official Microsoft WebView2Loader.dll directly into the binary
    const WEBVIEW2_LOADER_BYTES: &[u8] = include_bytes!("../WebView2Loader.dll");

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let loader_path = exe_dir.join("WebView2Loader.dll");
            if !loader_path.exists() {
                let _ = std::fs::write(&loader_path, WEBVIEW2_LOADER_BYTES);
            }
        }
    }
}

fn main() {
    #[cfg(target_os = "windows")]
    ensure_webview2_loader();

    windows_application_lib::run()
}
