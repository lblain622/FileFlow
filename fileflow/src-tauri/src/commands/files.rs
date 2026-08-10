use serde::Serialize;
use std::{
    fs::{self, OpenOptions},
    path::{Component, Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    name: String,
    path: String,
    is_directory: bool,
    size_bytes: u64,
    modified_at_ms: Option<u128>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskRoot {
    name: String,
    path: String,
    is_current: bool,
}

#[tauri::command]
pub fn list_disk_roots() -> Vec<DiskRoot> {
    let current = std::env::current_dir().unwrap_or_default();

    #[cfg(windows)]
    {
        (b'A'..=b'Z')
            .filter_map(|letter| {
                let path = format!("{}:\\", letter as char);
                Path::new(&path).is_dir().then(|| DiskRoot {
                    name: format!("Local Disk ({}:)", letter as char),
                    is_current: current.starts_with(&path),
                    path,
                })
            })
            .collect()
    }

    #[cfg(not(windows))]
    {
        let mut paths = vec![PathBuf::from("/")];
        for mount_parent in ["/Volumes", "/mnt", "/media"] {
            if let Ok(entries) = fs::read_dir(mount_parent) {
                paths.extend(
                    entries
                        .filter_map(Result::ok)
                        .map(|entry| entry.path())
                        .filter(|path| path.is_dir()),
                );
            }
        }
        paths.sort();
        paths.dedup();
        let current_root = paths
            .iter()
            .filter(|path| current.starts_with(path))
            .max_by_key(|path| path.components().count())
            .cloned();
        paths
            .into_iter()
            .map(|path| DiskRoot {
                name: if path == Path::new("/") {
                    "System Disk".into()
                } else {
                    path.file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .into_owned()
                },
                is_current: current_root.as_ref() == Some(&path),
                path: path.to_string_lossy().into_owned(),
            })
            .collect()
    }
}

#[tauri::command]
pub fn open_recycle_bin() -> Result<(), String> {
    #[cfg(windows)]
    let mut command = {
        let mut command = Command::new("explorer.exe");
        command.arg("shell:RecycleBinFolder");
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg("~/.Trash");
        command
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg("trash:///");
        command
    };
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open Recycle Bin: {error}"))
}

#[tauri::command]
pub fn open_file(app: AppHandle, root: String, path: String) -> Result<(), String> {
    let path = authorized_path(&root, &path)?;
    if !path.is_file() {
        return Err("The requested path is not a file".into());
    }
    app.opener()
        .open_path(path.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|error| format!("Could not open file: {error}"))
}

fn authorized_path(root: &str, path: &str) -> Result<PathBuf, String> {
    let root = fs::canonicalize(root)
        .map_err(|error| format!("Cannot access selected folder: {error}"))?;
    let path = fs::canonicalize(path).map_err(|error| format!("Cannot access path: {error}"))?;
    if !path.starts_with(&root) {
        return Err("The requested path is outside the selected folder".into());
    }
    Ok(path)
}

#[tauri::command]
pub fn list_directory(root: String, path: String) -> Result<Vec<DirectoryEntry>, String> {
    let path = authorized_path(&root, &path)?;
    if !path.is_dir() {
        return Err("The requested path is not a directory".into());
    }
    let mut entries = fs::read_dir(path)
        .map_err(|error| format!("Could not read directory: {error}"))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let metadata = entry.metadata().ok()?;
            let modified_at_ms = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis());
            Some(DirectoryEntry {
                name: entry.file_name().to_string_lossy().into_owned(),
                path: entry.path().to_string_lossy().into_owned(),
                is_directory: metadata.is_dir(),
                size_bytes: if metadata.is_file() {
                    metadata.len()
                } else {
                    0
                },
                modified_at_ms,
            })
        })
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| (!entry.is_directory, entry.name.to_lowercase()));
    Ok(entries)
}

#[tauri::command]
pub fn create_file(root: String, directory: String, name: String) -> Result<(), String> {
    let directory = authorized_path(&root, &directory)?;
    let name_path = Path::new(&name);
    if name.trim().is_empty()
        || name_path.components().count() != 1
        || !matches!(name_path.components().next(), Some(Component::Normal(_)))
    {
        return Err("Enter a valid file name without folder separators".into());
    }
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(directory.join(name))
        .map(|_| ())
        .map_err(|error| format!("Could not create file: {error}"))
}

#[tauri::command]
pub fn create_directory(root: String, directory: String, name: String) -> Result<(), String> {
    let directory = authorized_path(&root, &directory)?;
    let name_path = Path::new(&name);
    if name.trim().is_empty()
        || name_path.components().count() != 1
        || !matches!(name_path.components().next(), Some(Component::Normal(_)))
    {
        return Err("Enter a valid folder name without folder separators".into());
    }
    fs::create_dir(directory.join(name))
        .map_err(|error| format!("Could not create folder: {error}"))
}

#[tauri::command]
pub fn delete_entry(root: String, path: String) -> Result<(), String> {
    let root_path = fs::canonicalize(&root)
        .map_err(|error| format!("Cannot access selected folder: {error}"))?;
    let path = authorized_path(&root, &path)?;
    if path == root_path {
        return Err("The selected root folder cannot be deleted".into());
    }
    trash::delete(path).map_err(|error| format!("Could not move item to Recycle Bin: {error}"))
}

#[tauri::command]
pub fn hello_from_rust() -> String {
    "Hello from Rust".to_string()
}

#[cfg(test)]
mod tests {
    use super::{create_file, list_directory};
    use std::{fs, process, time::SystemTime};

    fn fixture() -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or_default();
        let path = std::env::temp_dir().join(format!("fileflow-{}-{nonce}", process::id()));
        fs::create_dir(&path).expect("temporary fixture should be created");
        path
    }

    #[test]
    fn creates_and_lists_a_file() {
        let root = fixture();
        let root_string = root.to_string_lossy().into_owned();
        create_file(root_string.clone(), root_string.clone(), "notes.txt".into())
            .expect("file should be created");
        let entries = list_directory(root_string.clone(), root_string.clone())
            .expect("directory should be listed");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "notes.txt");
        fs::remove_file(root.join("notes.txt")).expect("temporary file should be removed");
        fs::remove_dir(root).expect("temporary fixture should be removed");
    }

    #[test]
    fn rejects_names_that_escape_the_selected_directory() {
        let root = fixture();
        let root_string = root.to_string_lossy().into_owned();
        let result = create_file(root_string.clone(), root_string, "../outside.txt".into());
        assert!(result.is_err());
        fs::remove_dir(root).expect("temporary fixture should be removed");
    }
}
