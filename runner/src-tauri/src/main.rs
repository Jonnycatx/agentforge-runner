// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use tauri::{Emitter, Event, Listener};

fn emit_config(app: &tauri::AppHandle, config_json: String) {
    let _ = app.emit("agentforge://config", config_json);
}

fn emit_deeplink(app: &tauri::AppHandle, url: String) {
    let _ = app.emit("agentforge://deeplink", url);
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

            // Handle file-open at app launch (e.g., double-click .agentforge file)
            if let Some(path) = std::env::args().skip(1).find(|arg| arg.ends_with(".agentforge"))
            {
                try_load_agent_file(&app_handle, &path);
            }

            // Listen for deep link events and forward to the frontend
            let deep_link_handle = app.handle();
            deep_link_handle.listen("deep-link://new-url", move |event: Event| {
                emit_deeplink(&deep_link_handle, event.payload().to_string());
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
