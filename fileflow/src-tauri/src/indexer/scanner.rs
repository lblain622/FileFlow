use walkdir::WalkDir;

 fn scan_folder(path: &str) -> Vec<FileRecord> {
    let mut file_records = Vec::new();

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let metadata = entry.metadata().unwrap();
            let file_record = FileRecord {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path().to_string_lossy().to_string(),
                size_bytes: metadata.len(),
            };
            file_records.push(file_record);
        }
    }

    file_records
}

#[tauri::command]
pub fn scan_folder_command(path: String) -> Vec<FileRecord> {
 scan_folder(&path)
}