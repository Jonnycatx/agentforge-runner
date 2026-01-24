// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

struct AppState {
    python_process: Mutex<Option<std::process::Child>>,
    config_path: Mutex<Option<PathBuf>>,
}

fn get_python_command() -> String {
    // Try python3 first, then python
    if Command::new("python3").arg("--version").output().is_ok() {
        "python3".to_string()
    } else {
        "python".to_string()
    }
}

fn spawn_python_backend(config_path: Option<&str>) -> Result<std::process::Child, String> {
    let python = get_python_command();
    
    // Get the path to the bundled Python script
    let script_path = if cfg!(debug_assertions) {
        // Development: use local path
        PathBuf::from("src-tauri/resources/python/agent_runner.py")
    } else {
        // Production: use bundled resource
        let exe_dir = env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Failed to get exe directory")?
            .to_path_buf();
        
        #[cfg(target_os = "macos")]
        let script_path = exe_dir.join("../Resources/python/agent_runner.py");
        
        #[cfg(target_os = "windows")]
        let script_path = exe_dir.join("resources/python/agent_runner.py");
        
        #[cfg(target_os = "linux")]
        let script_path = exe_dir.join("resources/python/agent_runner.py");
        
        script_path
    };

    let mut cmd = Command::new(&python);
    cmd.arg(&script_path);
    
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
    
    cmd.stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start Python backend: {}", e))
}

#[tauri::command]
fn get_config_path(state: tauri::State<AppState>) -> Option<String> {
    state.config_path.lock().ok()
        .and_then(|guard| guard.as_ref().map(|p| p.to_string_lossy().to_string()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            python_process: Mutex::new(None),
            config_path: Mutex::new(None),
        })
        .setup(|app| {
            let state = app.state::<AppState>();
            
            // Check for file association argument (double-clicked .agentforge file)
            let config_path = env::args().nth(1).and_then(|arg| {
                if arg.ends_with(".agentforge") {
                    Some(arg)
                } else {
                    None
                }
            });
            
            // Store config path
            if let Some(ref path) = config_path {
                if let Ok(mut guard) = state.config_path.lock() {
                    *guard = Some(PathBuf::from(path));
                }
            }
            
            // Spawn Python backend
            match spawn_python_backend(config_path.as_deref()) {
                Ok(child) => {
                    if let Ok(mut guard) = state.python_process.lock() {
                        *guard = Some(child);
                    }
                    println!("Python backend started successfully");
                }
                Err(e) => {
                    eprintln!("Failed to start Python backend: {}", e);
                }
            }
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill Python process when window closes
                let state = window.state::<AppState>();
                if let Ok(mut guard) = state.python_process.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_config_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
