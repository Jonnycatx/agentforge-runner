#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Command, Stdio};
use std::path::PathBuf;
use tauri::Manager;

fn get_python_path() -> PathBuf {
    let resource_path = std::env::current_exe()
        .expect("Failed to get executable path")
        .parent()
        .expect("Failed to get parent directory")
        .join("resources")
        .join("python");
    
    resource_path.join("agent_server.py")
}

fn spawn_python_backend() {
    let python_script = get_python_path();
    
    if python_script.exists() {
        #[cfg(target_os = "windows")]
        let python_cmd = "python";
        
        #[cfg(not(target_os = "windows"))]
        let python_cmd = "python3";
        
        match Command::new(python_cmd)
            .arg(&python_script)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(_) => println!("Python backend started"),
            Err(e) => eprintln!("Failed to start Python backend: {}", e),
        }
    } else {
        eprintln!("Python script not found at {:?}", python_script);
    }
}

fn main() {
    spawn_python_backend();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
