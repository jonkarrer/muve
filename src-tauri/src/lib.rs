mod commands;

use commands::AppState;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| dirs_home().unwrap_or_else(|| "/".to_string()));

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            cwd: Mutex::new(cwd),
            session_id: Mutex::new(None),
            is_running: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_cwd,
            commands::set_cwd,
            commands::list_directory,
            commands::read_file,
            commands::send_message,
            commands::is_agent_running,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Muve");
}

fn dirs_home() -> Option<String> {
    std::env::var("HOME").ok()
}
