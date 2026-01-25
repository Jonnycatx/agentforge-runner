#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod tasks;
mod scheduler;
mod credentials;
mod triggers;

use std::process::{Command, Stdio, Child};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State, AppHandle};
use serde::{Deserialize, Serialize};

// Application state
pub struct AppState {
    pub db: Arc<Mutex<database::Database>>,
    pub python_process: Arc<Mutex<Option<Child>>>,
    pub scheduler: Arc<Mutex<scheduler::Scheduler>>,
}

// Agent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub id: Option<String>,
    pub name: String,
    pub goal: String,
    pub personality: String,
    pub provider: String,
    pub model: String,
    pub temperature: f32,
    pub tools: Vec<String>,
    pub autonomy_level: u8, // 1-4
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            id: None,
            name: "AI Assistant".to_string(),
            goal: "Help users with various tasks".to_string(),
            personality: "You are a helpful, friendly AI assistant.".to_string(),
            provider: "ollama".to_string(),
            model: "llama3.2".to_string(),
            temperature: 0.7,
            tools: vec![],
            autonomy_level: 2,
        }
    }
}

fn get_python_path() -> PathBuf {
    let resource_path = std::env::current_exe()
        .expect("Failed to get executable path")
        .parent()
        .expect("Failed to get parent directory")
        .join("resources")
        .join("python");
    
    resource_path.join("agent_server.py")
}

fn spawn_python_backend() -> Option<Child> {
    let python_script = get_python_path();
    
    if python_script.exists() {
        #[cfg(target_os = "windows")]
        let python_cmd = "python";
        
        #[cfg(not(target_os = "windows"))]
        let python_cmd = "python3";
        
        match Command::new(python_cmd)
            .arg(&python_script)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(child) => {
                println!("Python backend started with PID: {}", child.id());
                Some(child)
            }
            Err(e) => {
                eprintln!("Failed to start Python backend: {}", e);
                None
            }
        }
    } else {
        eprintln!("Python script not found at {:?}", python_script);
        None
    }
}

// ============================================================================
// TAURI COMMANDS - Task Management
// ============================================================================

#[tauri::command]
async fn create_task(
    state: State<'_, AppState>,
    agent_id: String,
    task_type: String,
    input: serde_json::Value,
    scheduled_at: Option<String>,
) -> Result<tasks::Task, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_task(&agent_id, &task_type, input, scheduled_at)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_tasks(
    state: State<'_, AppState>,
    agent_id: Option<String>,
    status: Option<String>,
) -> Result<Vec<tasks::Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_tasks(agent_id.as_deref(), status.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_task(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<Option<tasks::Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_status(
    state: State<'_, AppState>,
    task_id: String,
    status: String,
    result: Option<serde_json::Value>,
    error: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_task_status(&task_id, &status, result, error)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn cancel_task(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_task_status(&task_id, "cancelled", None, None)
        .map_err(|e| e.to_string())
}

// ============================================================================
// TAURI COMMANDS - Scheduling
// ============================================================================

#[tauri::command]
async fn create_schedule(
    state: State<'_, AppState>,
    agent_id: String,
    name: String,
    cron_expr: Option<String>,
    run_at: Option<String>,
    task_type: String,
    task_input: serde_json::Value,
) -> Result<scheduler::Schedule, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_schedule(&agent_id, &name, cron_expr.as_deref(), run_at.as_deref(), &task_type, task_input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_schedules(
    state: State<'_, AppState>,
    agent_id: Option<String>,
) -> Result<Vec<scheduler::Schedule>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_schedules(agent_id.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_schedule(
    state: State<'_, AppState>,
    schedule_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_schedule(&schedule_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn toggle_schedule(
    state: State<'_, AppState>,
    schedule_id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.toggle_schedule(&schedule_id, enabled).map_err(|e| e.to_string())
}

// ============================================================================
// TAURI COMMANDS - Credentials
// ============================================================================

#[tauri::command]
async fn store_credential(
    service: String,
    key: String,
    value: String,
) -> Result<(), String> {
    credentials::store_credential(&service, &key, &value)
}

#[tauri::command]
async fn get_credential(
    service: String,
    key: String,
) -> Result<Option<String>, String> {
    credentials::get_credential(&service, &key)
}

#[tauri::command]
async fn delete_credential(
    service: String,
    key: String,
) -> Result<(), String> {
    credentials::delete_credential(&service, &key)
}

// ============================================================================
// TAURI COMMANDS - Triggers
// ============================================================================

#[tauri::command]
async fn create_trigger(
    state: State<'_, AppState>,
    agent_id: String,
    name: String,
    trigger_type: String,
    config: serde_json::Value,
    task_type: String,
    task_input: serde_json::Value,
) -> Result<triggers::Trigger, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_trigger(&agent_id, &name, &trigger_type, config, &task_type, task_input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_triggers(
    state: State<'_, AppState>,
    agent_id: Option<String>,
) -> Result<Vec<triggers::Trigger>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_triggers(agent_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_trigger(
    state: State<'_, AppState>,
    trigger_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_trigger(&trigger_id).map_err(|e| e.to_string())
}

// ============================================================================
// TAURI COMMANDS - Activity & Logs
// ============================================================================

#[tauri::command]
async fn get_activity_log(
    state: State<'_, AppState>,
    agent_id: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<tasks::ActivityLogEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_activity_log(agent_id.as_deref(), limit.unwrap_or(50))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_task_stats(
    state: State<'_, AppState>,
    agent_id: Option<String>,
) -> Result<tasks::TaskStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_task_stats(agent_id.as_deref()).map_err(|e| e.to_string())
}

// ============================================================================
// TAURI COMMANDS - Autonomy & Approvals
// ============================================================================

#[tauri::command]
async fn get_pending_approvals(
    state: State<'_, AppState>,
) -> Result<Vec<tasks::ApprovalRequest>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_pending_approvals().map_err(|e| e.to_string())
}

#[tauri::command]
async fn approve_action(
    state: State<'_, AppState>,
    approval_id: String,
    approved: bool,
    modified_input: Option<serde_json::Value>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.process_approval(&approval_id, approved, modified_input)
        .map_err(|e| e.to_string())
}

// ============================================================================
// TAURI COMMANDS - Agent Management
// ============================================================================

#[tauri::command]
async fn save_agent(
    state: State<'_, AppState>,
    config: AgentConfig,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.save_agent(&config).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_agents(
    state: State<'_, AppState>,
) -> Result<Vec<AgentConfig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_agents().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_agent(
    state: State<'_, AppState>,
    agent_id: String,
) -> Result<Option<AgentConfig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_agent(&agent_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_agent(
    state: State<'_, AppState>,
    agent_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_agent(&agent_id).map_err(|e| e.to_string())
}

// ============================================================================
// MAIN
// ============================================================================

fn main() {
    // Initialize database
    let db_path = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("agentforge")
        .join("runner.db");
    
    // Ensure directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    
    let db = database::Database::new(&db_path)
        .expect("Failed to initialize database");
    
    // Spawn Python backend
    let python_process = spawn_python_backend();
    
    // Initialize scheduler
    let scheduler = scheduler::Scheduler::new();
    
    // Create app state
    let state = AppState {
        db: Arc::new(Mutex::new(db)),
        python_process: Arc::new(Mutex::new(python_process)),
        scheduler: Arc::new(Mutex::new(scheduler)),
    };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(state)
        .setup(|app| {
            // Handle .agentforge file argument
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = &args[1];
                if file_path.ends_with(".agentforge") {
                    if let Ok(contents) = std::fs::read_to_string(file_path) {
                        app.emit("load-agent", contents).ok();
                    }
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Tasks
            create_task,
            get_tasks,
            get_task,
            update_task_status,
            cancel_task,
            // Schedules
            create_schedule,
            get_schedules,
            delete_schedule,
            toggle_schedule,
            // Credentials
            store_credential,
            get_credential,
            delete_credential,
            // Triggers
            create_trigger,
            get_triggers,
            delete_trigger,
            // Activity
            get_activity_log,
            get_task_stats,
            // Approvals
            get_pending_approvals,
            approve_action,
            // Agents
            save_agent,
            get_agents,
            get_agent,
            delete_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
