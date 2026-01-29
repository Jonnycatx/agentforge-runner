// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{Emitter, Manager};
use tauri::path::BaseDirectory;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tiny_http::{Header, Method, Response, Server, StatusCode};
use keyring::Entry;

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

#[tauri::command]
fn save_brain_conversation(
    brain_path: String,
    agent_name: String,
    date_folder: String,
    file_name: String,
    contents: String,
) -> Result<(), String> {
    if brain_path.trim().is_empty() {
        return Err("Brain folder path is missing.".to_string());
    }
    let safe_agent = agent_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>();
    let base = PathBuf::from(brain_path);
    let target = base
        .join("AgentForge Brain")
        .join(safe_agent)
        .join("conversations")
        .join(date_folder);
    fs::create_dir_all(&target).map_err(|e| format!("Failed to create brain folder: {e}"))?;
    let file_path = target.join(file_name);
    fs::write(&file_path, contents).map_err(|e| format!("Failed to write brain file: {e}"))?;
    Ok(())
}

#[derive(Serialize, Deserialize)]
struct MemoryEntry {
    id: String,
    role: String,
    content: String,
    timestamp: String,
    #[serde(rename = "conversationId")]
    conversation_id: String,
}

#[derive(Serialize)]
struct MemoryMatch {
    content: String,
    role: String,
    timestamp: String,
}

#[derive(Serialize, Deserialize)]
struct AuditEntry {
    action: String,
    detail: String,
    timestamp: String,
    #[serde(rename = "conversationId")]
    conversation_id: String,
}

fn sanitize_agent_name(agent_name: &str) -> String {
    agent_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {e}"))?;
    }
    Ok(())
}

fn mcp_settings_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("mcp-settings.json"))
}

struct AppState {
    run_in_background: Mutex<bool>,
}

const KEYCHAIN_SERVICE: &str = "AgentForge Runner";

fn keychain_entry(key: &str) -> Result<Entry, keyring::Error> {
    Entry::new(KEYCHAIN_SERVICE, key)
}

#[tauri::command]
fn set_secret(key: String, value: String) -> Result<(), String> {
    let entry = keychain_entry(&key).map_err(|e| format!("Failed to open keychain: {e}"))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Failed to save secret: {e}"))
}

#[tauri::command]
fn get_secret(key: String) -> Result<Option<String>, String> {
    let entry = keychain_entry(&key).map_err(|e| format!("Failed to open keychain: {e}"))?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(format!("Failed to read secret: {err}")),
    }
}

#[tauri::command]
fn delete_secret(key: String) -> Result<(), String> {
    let entry = keychain_entry(&key).map_err(|e| format!("Failed to open keychain: {e}"))?;
    match entry.delete_password() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(format!("Failed to delete secret: {err}")),
    }
}

#[tauri::command]
fn set_run_in_background(state: tauri::State<AppState>, enabled: bool) -> Result<(), String> {
    let mut value = state
        .run_in_background
        .lock()
        .map_err(|_| "Failed to update background setting".to_string())?;
    *value = enabled;
    Ok(())
}

#[tauri::command]
fn set_mcp_settings(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let Some(path) = mcp_settings_path(&app) else {
        return Err("Failed to resolve MCP settings path.".to_string());
    };
    ensure_parent_dir(&path)?;
    fs::write(&path, contents).map_err(|e| format!("Failed to write MCP settings: {e}"))?;
    Ok(())
}

fn read_mcp_settings(path: &Path) -> Value {
    let contents = fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string());
    serde_json::from_str(&contents).unwrap_or_else(|_| json!({}))
}

fn build_mcp_tools(settings: &Value) -> Vec<Value> {
    let tools = settings.get("tools").and_then(|v| v.as_object());
    let is_enabled = |key: &str| tools.and_then(|t| t.get(key)).and_then(|v| v.as_bool()).unwrap_or(false);

    let mut list = Vec::new();
    if is_enabled("googleDrive") {
        list.push(json!({
            "name": "google_drive",
            "description": "Access files in Google Drive",
        }));
    }
    if is_enabled("localFiles") {
        list.push(json!({
            "name": "local_files",
            "description": "Read and write local files in the brain folder",
        }));
    }
    if is_enabled("browser") {
        list.push(json!({
            "name": "browser",
            "description": "Browser automation and web actions",
        }));
    }
    if is_enabled("terminal") {
        list.push(json!({
            "name": "terminal",
            "description": "Run approved terminal commands",
        }));
    }
    list
}

fn start_mcp_server(app: &tauri::AppHandle) {
    let Some(settings_path) = mcp_settings_path(app) else {
        return;
    };
    let _ = ensure_parent_dir(&settings_path);

    thread::spawn(move || {
        let Ok(server) = Server::http("127.0.0.1:8787") else {
            return;
        };

        for request in server.incoming_requests() {
            let url = request.url().to_string();
            let method = request.method().clone();
            let settings = read_mcp_settings(&settings_path);
            let tools = build_mcp_tools(&settings);

            let (status, body) = match (method, url.as_str()) {
                (Method::Get, "/mcp/health") => (StatusCode(200), json!({ "ok": true })),
                (Method::Get, "/mcp/tools") => (StatusCode(200), json!({ "tools": tools })),
                (Method::Post, "/mcp/call") => (
                    StatusCode(501),
                    json!({ "error": "MCP call not implemented yet." }),
                ),
                _ => (StatusCode(404), json!({ "error": "Not found" })),
            };

            let response = Response::from_string(body.to_string())
                .with_status_code(status)
                .with_header(
                    Header::from_bytes("Content-Type", "application/json").unwrap(),
                )
                .with_header(
                    Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap(),
                );
            let _ = request.respond(response);
        }
    });
}
#[tauri::command]
fn append_memory_entry(
    brain_path: String,
    agent_name: String,
    entry: String,
) -> Result<(), String> {
    let entry: MemoryEntry =
        serde_json::from_str(&entry).map_err(|e| format!("Invalid memory entry: {e}"))?;
    if brain_path.trim().is_empty() {
        return Err("Brain folder path is missing.".to_string());
    }
    let safe_agent = sanitize_agent_name(&agent_name);
    let base = PathBuf::from(brain_path);
    let target = base
        .join("AgentForge Brain")
        .join(safe_agent)
        .join("memory");
    fs::create_dir_all(&target).map_err(|e| format!("Failed to create memory folder: {e}"))?;
    let file_path = target.join("memory.jsonl");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| format!("Failed to open memory file: {e}"))?;
    let line = serde_json::to_string(&entry).map_err(|e| format!("Failed to serialize entry: {e}"))?;
    writeln!(file, "{line}").map_err(|e| format!("Failed to write memory entry: {e}"))?;
    Ok(())
}

#[tauri::command]
fn query_memory_entries(
    brain_path: String,
    agent_name: String,
    query: String,
    limit: usize,
) -> Result<Vec<MemoryMatch>, String> {
    if brain_path.trim().is_empty() {
        return Err("Brain folder path is missing.".to_string());
    }
    let safe_agent = sanitize_agent_name(&agent_name);
    let base = PathBuf::from(brain_path);
    let file_path = base
        .join("AgentForge Brain")
        .join(safe_agent)
        .join("memory")
        .join("memory.jsonl");

    let contents = fs::read_to_string(&file_path).unwrap_or_default();
    let tokens: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .filter(|token| token.len() > 2)
        .map(|token| token.to_string())
        .collect();

    if tokens.is_empty() {
        return Ok(vec![]);
    }

    let mut scored: Vec<(i32, MemoryEntry)> = Vec::new();
    for line in contents.lines() {
        let Ok(entry) = serde_json::from_str::<MemoryEntry>(line) else { continue };
        let haystack = entry.content.to_lowercase();
        let mut score = 0;
        for token in &tokens {
            if haystack.contains(token) {
                score += 1;
            }
        }
        if score > 0 {
            scored.push((score, entry));
        }
    }

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    let results = scored
        .into_iter()
        .take(limit.max(1))
        .map(|(_, entry)| MemoryMatch {
            content: entry.content,
            role: entry.role,
            timestamp: entry.timestamp,
        })
        .collect::<Vec<_>>();
    Ok(results)
}

#[tauri::command]
fn append_audit_entry(
    brain_path: String,
    agent_name: String,
    entry: String,
) -> Result<(), String> {
    let entry: AuditEntry =
        serde_json::from_str(&entry).map_err(|e| format!("Invalid audit entry: {e}"))?;
    if brain_path.trim().is_empty() {
        return Err("Brain folder path is missing.".to_string());
    }
    let safe_agent = sanitize_agent_name(&agent_name);
    let base = PathBuf::from(brain_path);
    let target = base
        .join("AgentForge Brain")
        .join(safe_agent)
        .join("audit");
    fs::create_dir_all(&target).map_err(|e| format!("Failed to create audit folder: {e}"))?;
    let file_path = target.join("audit.jsonl");
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| format!("Failed to open audit file: {e}"))?;
    let line = serde_json::to_string(&entry).map_err(|e| format!("Failed to serialize entry: {e}"))?;
    writeln!(file, "{line}").map_err(|e| format!("Failed to write audit entry: {e}"))?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            save_brain_conversation,
            append_memory_entry,
            query_memory_entries,
            append_audit_entry,
            set_mcp_settings,
            set_secret,
            get_secret,
            delete_secret,
            set_run_in_background
        ])
        .setup(|app| {
            // Handle deep links (agentforge:// URLs)
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            app.manage(AppState {
                run_in_background: Mutex::new(false),
            });

            let app_handle = app.handle();

            // Start the local Python backend
            spawn_backend(&app_handle);
            start_mcp_server(&app_handle);

            // Handle file-open at app launch (e.g., double-click .agentforge file)
            if let Some(path) = std::env::args().skip(1).find(|arg| arg.ends_with(".agentforge"))
            {
                try_load_agent_file(&app_handle, &path);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let should_hide = window
                    .state::<AppState>()
                    .run_in_background
                    .lock()
                    .map(|guard| *guard)
                    .unwrap_or(false);
                if should_hide {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
