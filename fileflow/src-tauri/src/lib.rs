mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn system_status() -> String {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    format!("Operating System: {}, Architecture: {}", os, arch)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            system_status,
            commands::files::hello_from_rust,
            commands::files::list_disk_roots,
            commands::files::open_recycle_bin,
            commands::files::open_file,
            commands::files::list_directory,
            commands::files::create_file,
            commands::files::create_directory,
            commands::files::delete_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
