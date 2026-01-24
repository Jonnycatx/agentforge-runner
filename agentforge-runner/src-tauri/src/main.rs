// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use std::thread;
use tauri::{Manager, AppHandle};
use serde::{Deserialize, Serialize};

const BACKEND_PORT: u16 = 8765;

struct AppState {
    python_process: Mutex<Option<std::process::Child>>,
    config_path: Mutex<Option<PathBuf>>,
    backend_port: Mutex<u16>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BackendInfo {
    port: u16,
    config_path: Option<String>,
}

fn check_python_available() -> Option<String> {
    // Check for python3 first, then python
    for cmd in &["python3", "python"] {
        if let Ok(output) = Command::new(cmd).arg("--version").output() {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout);
                // Ensure it's Python 3.x
                if version.contains("Python 3") || String::from_utf8_lossy(&output.stderr).contains("Python 3") {
                    return Some(cmd.to_string());
                }
            }
        }
    }
    None
}

fn get_resource_path(app: &AppHandle) -> PathBuf {
    // In development, use local path
    if cfg!(debug_assertions) {
        PathBuf::from("resources/python")
    } else {
        // In production, use bundled resources
        app.path()
            .resource_dir()
            .expect("Failed to get resource dir")
            .join("resources/python")
    }
}

fn spawn_python_backend(app: &AppHandle, config_path: Option<&str>) -> Result<std::process::Child, String> {
    let python = check_python_available()
        .ok_or("Python 3 is not installed. Please install Python from python.org")?;
    
    let resource_path = get_resource_path(app);
    let script_path = resource_path.join("agent_runner.py");
    
    if !script_path.exists() {
        return Err(format!("Agent runner script not found at {:?}", script_path));
    }

    let mut cmd = Command::new(&python);
    cmd.arg(&script_path)
        .arg("--port")
        .arg(BACKEND_PORT.to_string());
    
    if let Some(config) = config_path {
        cmd.arg("--config").arg(config);
    }
    
    // Hide console window on Windows
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    
    // Redirect output to prevent zombie processes
    cmd.stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start Python backend: {}", e))
}

fn wait_for_backend(port: u16, max_retries: u32) -> bool {
    for _ in 0..max_retries {
        if let Ok(response) = ureq::get(&format!("http://127.0.0.1:{}/health", port))
            .timeout(Duration::from_secs(1))
            .call()
        {
            if response.status() == 200 {
                return true;
            }
        }
        thread::sleep(Duration::from_millis(500));
    }
    false
}

#[tauri::command]
fn get_backend_info(state: tauri::State<AppState>) -> BackendInfo {
    let port = state.backend_port.lock().map(|g| *g).unwrap_or(BACKEND_PORT);
    let config_path = state.config_path.lock().ok()
        .and_then(|guard| guard.as_ref().map(|p| p.to_string_lossy().to_string()));
    
    BackendInfo { port, config_path }
}

#[tauri::command]
fn check_python_installed() -> Result<String, String> {
    check_python_available()
        .ok_or_else(|| "Python 3 is not installed".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            python_process: Mutex::new(None),
            config_path: Mutex::new(None),
            backend_port: Mutex::new(BACKEND_PORT),
        })
        .setup(|app| {
            let state = app.state::<AppState>();
            let handle = app.handle().clone();
            
            // Check for config file from command line args
            // On Windows/Linux, args come directly; on macOS, handled by open-file event
            let config_path = env::args().skip(1).find(|arg| {
                arg.ends_with(".agentforge") && !arg.starts_with("-")
            });
            
            // Store config path
            if let Some(ref path) = config_path {
                if let Ok(mut guard) = state.config_path.lock() {
                    *guard = Some(PathBuf::from(path));
                }
            }
            
            // Check Python availability first
            if check_python_available().is_none() {
                // Emit error to frontend - Python not installed
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("python-missing", ());
                }
                return Ok(());
            }
            
            // Spawn Python backend
            match spawn_python_backend(&handle, config_path.as_deref()) {
                Ok(child) => {
                    if let Ok(mut guard) = state.python_process.lock() {
                        *guard = Some(child);
                    }
                    
                    // Wait for backend to be ready
                    let backend_ready = wait_for_backend(BACKEND_PORT, 20);
                    if !backend_ready {
                        eprintln!("Backend did not start in time");
                    }
                }
                Err(e) => {
                    eprintln!("Failed to start Python backend: {}", e);
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("backend-error", e);
                    }
                }
            }
            
            Ok(())
        })
        // Handle file open events (macOS)
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { .. } => {
                    // Kill Python process when window closes
                    let state = window.state::<AppState>();
                    if let Ok(mut guard) = state.python_process.lock() {
                        if let Some(ref mut child) = *guard {
                            let _ = child.kill();
                        }
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_info, check_python_installed])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
