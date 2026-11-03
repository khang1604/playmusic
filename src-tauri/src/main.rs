// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_preset_file(default_filename: String, content: String) -> Result<Option<String>, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    let downloads = PathBuf::from(&home).join("Downloads");
    let starting_dir = if downloads.exists() {
        downloads
    } else {
        PathBuf::from(&home)
    };

    let file = rfd::FileDialog::new()
        .set_title("Chọn nơi lưu file cấu hình Show (Preset)")
        .set_directory(&starting_dir)
        .set_file_name(&default_filename)
        .add_filter("PlayMusic Preset (*.json)", &["json"])
        .save_file();

    match file {
        Some(path) => {
            fs::write(&path, content).map_err(|e| format!("Không thể ghi file: {}", e))?;
            Ok(Some(path.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn read_audio_file(file_path: String) -> Result<Vec<u8>, String> {
    fs::read(&file_path).map_err(|e| format!("Failed to read file {}: {}", file_path, e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![save_preset_file, read_audio_file])
        .run(tauri::generate_context!())
        .expect("error while running PlayMusic application");
}
