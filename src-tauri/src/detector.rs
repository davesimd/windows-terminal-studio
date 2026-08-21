use std::collections::HashMap;
use std::env;
use std::path::{Path, PathBuf};

/// Check whether a given CLI binary name is available in PATH or common Windows install locations.
pub fn is_executable_available(bin_name: &str) -> bool {
    // 1. Direct path check if bin_name already contains path separators
    let path = Path::new(bin_name);
    if path.is_file() {
        return true;
    }

    // 2. Check standard Windows extensions
    #[cfg(windows)]
    let extensions = vec!["", ".exe", ".cmd", ".bat", ".ps1"];
    #[cfg(not(windows))]
    let extensions = vec!["", ".sh"];

    // 3. Inspect PATH environment variable
    if let Some(path_var) = env::var_os("PATH") {
        for split_path in env::split_paths(&path_var) {
            for ext in &extensions {
                let candidate = split_path.join(format!("{}{}", bin_name, ext));
                if candidate.is_file() {
                    return true;
                }
            }
        }
    }

    // 4. Windows-specific fallback locations for popular dev tools & AI agents
    #[cfg(windows)]
    {
        if let Ok(userprofile) = env::var("USERPROFILE") {
            let appdata_npm = PathBuf::from(&userprofile).join("AppData").join("Roaming").join("npm");
            let localappdata_programs = PathBuf::from(&userprofile).join("AppData").join("Local").join("Programs");

            for ext in &extensions {
                let npm_candidate = appdata_npm.join(format!("{}{}", bin_name, ext));
                if npm_candidate.is_file() {
                    return true;
                }
            }

            if bin_name == "ollama" {
                let ollama_local = localappdata_programs.join("Ollama").join("ollama.exe");
                if ollama_local.is_file() {
                    return true;
                }
            }

            if bin_name == "agy" {
                let agy_user = PathBuf::from(&userprofile).join(".antigravity").join("bin").join("agy.cmd");
                if agy_user.is_file() {
                    return true;
                }
            }
        }

        // Check C:\Program Files
        if bin_name == "ollama" && Path::new(r"C:\Program Files\Ollama\ollama.exe").is_file() {
            return true;
        }
        if bin_name == "bash" {
            if Path::new(r"C:\Program Files\Git\bin\bash.exe").is_file() 
                || Path::new(r"C:\Program Files\Git\usr\bin\bash.exe").is_file() {
                return true;
            }
        }
        if bin_name == "wsl" && Path::new(r"C:\Windows\System32\wsl.exe").is_file() {
            return true;
        }
        if bin_name == "powershell" && Path::new(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe").is_file() {
            return true;
        }
        if bin_name == "cmd" && Path::new(r"C:\Windows\System32\cmd.exe").is_file() {
            return true;
        }
    }

    false
}

/// Detect presence of all supported AI coding agents and shells.
#[tauri::command]
pub fn detect_installed_tools() -> HashMap<String, bool> {
    let mut results = HashMap::new();

    // AI Agents
    results.insert("antigravity".to_string(), is_executable_available("agy"));
    results.insert("claude".to_string(), is_executable_available("claude"));
    results.insert("codex".to_string(), is_executable_available("codex"));
    results.insert("grok".to_string(), is_executable_available("grok"));
    results.insert("opencode".to_string(), is_executable_available("opencode"));
    results.insert("copilot".to_string(), is_executable_available("gh") || is_executable_available("copilot"));
    results.insert("kilo".to_string(), is_executable_available("kilo"));
    results.insert("ollama".to_string(), is_executable_available("ollama"));

    // Shells & Dev Runtimes
    results.insert("powershell".to_string(), is_executable_available("powershell") || is_executable_available("pwsh"));
    results.insert("cmd".to_string(), is_executable_available("cmd"));
    results.insert("wsl".to_string(), is_executable_available("wsl"));
    results.insert("gitbash".to_string(), is_executable_available("bash"));
    results.insert("node".to_string(), is_executable_available("node"));
    results.insert("python".to_string(), is_executable_available("python") || is_executable_available("python3") || is_executable_available("py"));

    results
}
