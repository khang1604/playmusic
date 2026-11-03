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
fn pick_preset_file() -> Result<Option<(String, String)>, String> {
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
        .set_title("Chọn file cấu hình Show (Preset)")
        .set_directory(&starting_dir)
        .add_filter("PlayMusic Preset (*.json)", &["json"])
        .pick_file();

    match file {
        Some(path) => {
            let content = fs::read_to_string(&path).map_err(|e| format!("Không thể đọc file: {}", e))?;
            let parent_dir = path
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            Ok(Some((content, parent_dir)))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn pick_audio_folder() -> Result<Option<String>, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    let downloads = PathBuf::from(&home).join("Downloads");
    let starting_dir = if downloads.exists() {
        downloads
    } else {
        PathBuf::from(&home)
    };

    let folder = rfd::FileDialog::new()
        .set_title("Chọn thư mục chứa file nhạc của Show")
        .set_directory(&starting_dir)
        .pick_folder();

    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn scan_folder_audio_files(folder_path: String) -> Result<Vec<(String, String)>, String> {
    let dir = std::path::Path::new(&folder_path);
    if !dir.is_dir() {
        return Err("Đường dẫn không phải là thư mục hợp lệ".to_string());
    }

    let mut results = Vec::new();
    let entries = fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();
                if ["mp3", "wav", "ogg", "flac", "m4a", "aac"].contains(&ext_lower.as_str()) {
                    if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
                        results.push((file_name.to_string(), path.to_string_lossy().to_string()));
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
fn read_audio_file(file_path: String) -> Result<Vec<u8>, String> {
    fs::read(&file_path).map_err(|e| format!("Failed to read file {}: {}", file_path, e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_preset_file,
            pick_preset_file,
            pick_audio_folder,
            scan_folder_audio_files,
            read_audio_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running PlayMusic application");
}
