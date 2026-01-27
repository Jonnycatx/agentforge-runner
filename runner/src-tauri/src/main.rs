// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::process::{Command, Stdio};
use tauri::{Emitter, Manager};
use tauri::path::BaseDirectory;

fn emit_config(app: &tauri::AppHandle, config_json: String) {
    let _ = app.emit("agentforge://config", config_json);
}

fn try_load_agent_file(app: &tauri::AppHandle, path: &str) {
    if !path.ends_with(".agentforge") {
        return;
    }

    match fs::read_to_string(path) {
        Ok(contents) => emit_config(app, contents),
        Err(_) => {
            let _ = app.emit(
                "agentforge://error",
                format!("Failed to read agent file: {}", path),
            );
        }
    }
}

fn spawn_backend(app: &tauri::AppHandle) {
    let script_path = app
        .path()
        .resolve("python/agent_server.py", BaseDirectory::Resource)
        .or_else(|_| app.path().resolve("resources/python/agent_server.py", BaseDirectory::Resource))
        .ok();

    let Some(script_path) = script_path else {
        let _ = app.emit(
            "agentforge://error",
            "Backend script not found. Please reinstall AgentForge Runner.".to_string(),
        );
        return;
    };

    let python_candidates: Vec<&str> = if cfg!(target_os = "windows") {
        vec!["python.exe", "python"]
    } else {
        vec!["python3", "python"]
    };

    for python in python_candidates {
        let result = Command::new(python)
            .arg(&script_path)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

        if result.is_ok() {
            return;
        }
    }

    let _ = app.emit(
        "agentforge://error",
        "Python not found. Please install Python 3 to run the Runner backend.".to_string(),
    );
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Handle deep links (agentforge:// URLs)
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            let app_handle = app.handle();

            // Start the local Python backend
            spawn_backend(&app_handle);

            // Handle file-open at app launch (e.g., double-click .agentforge file)
            if let Some(path) = std::env::args().skip(1).find(|arg| arg.ends_with(".agentforge"))
            {
                try_load_agent_file(&app_handle, &path);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
