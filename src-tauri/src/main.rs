// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_preset_file(filename: String, content: String) -> Result<String, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    let mut target_dir = PathBuf::from(&home).join("Downloads");
    if !target_dir.exists() {
        target_dir = PathBuf::from(&home);
    }

    let file_path = target_dir.join(&filename);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_preset_file])
        .run(tauri::generate_context!())
        .expect("error while running PlayMusic application");
}
