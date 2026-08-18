use serde::Serialize;
use std::{
    fs::{self, File, OpenOptions},
    io,
    path::{Component, Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryEntry {
    name: String,
    path: String,
    is_directory: bool,
    size_bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    modified_at_ms: Option<u128>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskRoot {
    name: String,
    path: String,
    is_current: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemLocation {
    kind: String,
    name: String,
    path: String,
    root_path: String,
}

#[tauri::command]
pub fn list_system_locations(app: AppHandle) -> Vec<SystemLocation> {
    let resolver = app.path();
    let Ok(home) = resolver.home_dir() else {
        return Vec::new();
    };
    let root_path = home.to_string_lossy().into_owned();
    [
        ("home", "Home", Some(home)),
        ("desktop", "Desktop", resolver.desktop_dir().ok()),
        ("documents", "Documents", resolver.document_dir().ok()),
        ("downloads", "Downloads", resolver.download_dir().ok()),
        ("pictures", "Pictures", resolver.picture_dir().ok()),
        ("music", "Music", resolver.audio_dir().ok()),
        ("videos", "Videos", resolver.video_dir().ok()),
    ]
    .into_iter()
    .filter_map(|(kind, name, path)| {
        let path = path?;
        path.is_dir().then(|| SystemLocation {
            kind: kind.into(),
            name: name.into(),
            path: path.to_string_lossy().into_owned(),
            root_path: root_path.clone(),
        })
    })
    .collect()
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

    #[cfg(windows)]
    {
        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .map(str::to_ascii_lowercase);
        if extension.as_deref() == Some("exe") {
            return Command::new(&path)
                .current_dir(path.parent().unwrap_or_else(|| Path::new(".")))
                .spawn()
                .map(|_| ())
                .map_err(|error| format!("Could not launch application: {error}"));
        }
        if matches!(extension.as_deref(), Some("url" | "lnk")) {
            return Command::new("explorer.exe")
                .arg(&path)
                .spawn()
                .map(|_| ())
                .map_err(|error| format!("Could not open shortcut: {error}"));
        }
    }

    app.opener()
        .open_path(path.to_string_lossy().into_owned(), None::<&str>)
        .map_err(|error| format!("Could not open file: {error}"))
}

#[tauri::command]
pub fn open_with(root: String, path: String) -> Result<(), String> {
    let path = authorized_path(&root, &path)?;
    if !path.is_file() {
        return Err("Only files can be opened with another application".into());
    }
    #[cfg(windows)]
    {
        Command::new("rundll32.exe")
            .arg("shell32.dll,OpenAs_RunDLL")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| format!("Could not show the Open with dialog: {error}"))
    }
    #[cfg(not(windows))]
    {
        Err("The native Open with chooser is currently available on Windows".into())
    }
}

#[tauri::command]
pub fn move_entry(root: String, path: String, destination: String) -> Result<String, String> {
    let root_path = fs::canonicalize(&root)
        .map_err(|error| format!("Cannot access selected folder: {error}"))?;
    let source = authorized_path(&root, &path)?;
    if source == root_path {
        return Err("The selected root folder cannot be moved".into());
    }
    let destination = fs::canonicalize(destination)
        .map_err(|error| format!("Cannot access destination folder: {error}"))?;
    if !destination.is_dir() {
        return Err("The selected destination is not a folder".into());
    }
    if source.is_dir() && destination.starts_with(&source) {
        return Err("A folder cannot be moved inside itself".into());
    }
    let file_name = source
        .file_name()
        .ok_or("The selected item has no file name")?;
    let target = destination.join(file_name);
    if target.exists() {
        return Err(format!(
            "An item named '{}' already exists in the destination",
            file_name.to_string_lossy()
        ));
    }
    fs::rename(&source, &target).map_err(|error| format!("Could not move item: {error}"))?;
    Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn extract_zip(root: String, path: String) -> Result<String, String> {
    const MAX_ENTRIES: usize = 100_000;
    const MAX_UNCOMPRESSED_BYTES: u64 = 4 * 1024 * 1024 * 1024;

    let archive_path = authorized_path(&root, &path)?;
    if !archive_path.is_file()
        || archive_path
            .extension()
            .and_then(|value| value.to_str())
            .map(str::to_ascii_lowercase)
            .as_deref()
            != Some("zip")
    {
        return Err("Only ZIP archives can be extracted".into());
    }
    let destination = archive_path.with_extension("");
    if destination.exists() {
        return Err(format!(
            "A file or folder named '{}' already exists",
            destination
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
        ));
    }

    let file = File::open(&archive_path)
        .map_err(|error| format!("Could not open ZIP archive: {error}"))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|error| format!("Could not read ZIP archive: {error}"))?;
    if archive.len() > MAX_ENTRIES {
        return Err("This ZIP archive contains too many entries".into());
    }
    let mut total_size = 0_u64;
    for index in 0..archive.len() {
        let entry = archive
            .by_index(index)
            .map_err(|error| format!("Could not read ZIP entry: {error}"))?;
        if entry.enclosed_name().is_none() {
            return Err("The ZIP archive contains an unsafe path".into());
        }
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("ZIP archives containing symbolic links are not supported".into());
        }
        total_size = total_size
            .checked_add(entry.size())
            .ok_or("The ZIP archive is too large")?;
        if total_size > MAX_UNCOMPRESSED_BYTES {
            return Err("The ZIP archive expands beyond the 4 GB safety limit".into());
        }
    }

    fs::create_dir(&destination)
        .map_err(|error| format!("Could not create extraction folder: {error}"))?;
    let extraction_result = (|| -> Result<(), String> {
        for index in 0..archive.len() {
            let mut entry = archive
                .by_index(index)
                .map_err(|error| format!("Could not read ZIP entry: {error}"))?;
            let relative_path = entry
                .enclosed_name()
                .ok_or("The ZIP archive contains an unsafe path")?;
            let output_path = destination.join(relative_path);
            if entry.is_dir() {
                fs::create_dir_all(&output_path)
                    .map_err(|error| format!("Could not create extracted folder: {error}"))?;
            } else {
                if let Some(parent) = output_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|error| format!("Could not create extracted folder: {error}"))?;
                }
                let mut output = OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&output_path)
                    .map_err(|error| format!("Could not create extracted file: {error}"))?;
                io::copy(&mut entry, &mut output)
                    .map_err(|error| format!("Could not extract file: {error}"))?;
            }
        }
        Ok(())
    })();
    if let Err(error) = extraction_result {
        let _ = fs::remove_dir_all(&destination);
        return Err(error);
    }
    Ok(destination.to_string_lossy().into_owned())
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
    use super::{create_file, extract_zip, list_directory, move_entry};
    use std::{fs, io::Write, process, time::SystemTime};

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

    #[test]
    fn extracts_zip_into_a_new_sibling_folder() {
        let root = fixture();
        let archive_path = root.join("notes.zip");
        let file = fs::File::create(&archive_path).expect("archive should be created");
        let mut archive = zip::ZipWriter::new(file);
        archive
            .start_file("nested/note.txt", zip::write::SimpleFileOptions::default())
            .expect("entry should be created");
        archive
            .write_all(b"hello")
            .expect("entry should be written");
        archive.finish().expect("archive should finish");

        let root_string = root.to_string_lossy().into_owned();
        extract_zip(
            root_string.clone(),
            archive_path.to_string_lossy().into_owned(),
        )
        .expect("archive should extract");
        assert_eq!(
            fs::read_to_string(root.join("notes/nested/note.txt")).expect("file should exist"),
            "hello"
        );
        assert!(extract_zip(root_string, archive_path.to_string_lossy().into_owned()).is_err());
        fs::remove_dir_all(root).expect("temporary fixture should be removed");
    }

    #[test]
    fn moves_an_item_without_overwriting() {
        let root = fixture();
        let destination = root.join("destination");
        fs::create_dir(&destination).expect("destination should be created");
        fs::write(root.join("move-me.txt"), "content").expect("source should be created");
        let root_string = root.to_string_lossy().into_owned();

        move_entry(
            root_string.clone(),
            root.join("move-me.txt").to_string_lossy().into_owned(),
            destination.to_string_lossy().into_owned(),
        )
        .expect("file should move");
        assert!(destination.join("move-me.txt").is_file());

        fs::write(root.join("move-me.txt"), "new").expect("second source should be created");
        assert!(move_entry(
            root_string,
            root.join("move-me.txt").to_string_lossy().into_owned(),
            destination.to_string_lossy().into_owned(),
        )
        .is_err());
        fs::remove_dir_all(root).expect("temporary fixture should be removed");
    }
}
