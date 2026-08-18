use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};

const STATE_FILE: &str = "automation.json";
const SETTLE_TIME_MS: u128 = 10_000;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationRule {
    pub id: String,
    pub name: String,
    pub match_type: String,
    pub match_value: String,
    pub destination: String,
    pub enabled: bool,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveHistoryEntry {
    pub id: String,
    pub rule_name: String,
    pub source: String,
    pub destination: String,
    pub moved_at_ms: u128,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub undone_at_ms: Option<u128>,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AutomationData {
    rules: Vec<AutomationRule>,
    history: Vec<MoveHistoryEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationState {
    downloads_path: String,
    rules: Vec<AutomationRule>,
    history: Vec<MoveHistoryEntry>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    moved: usize,
    errors: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposedMove {
    source: String,
    destination: String,
    rule_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewResult {
    moves: Vec<ProposedMove>,
    errors: Vec<String>,
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Could not locate FileFlow's data folder: {error}"))?;
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Could not create FileFlow's data folder: {error}"))?;
    Ok(directory.join(STATE_FILE))
}

fn load_data(app: &AppHandle) -> Result<AutomationData, String> {
    let path = state_path(app)?;
    if !path.exists() {
        return Ok(AutomationData::default());
    }
    let json = fs::read_to_string(path)
        .map_err(|error| format!("Could not read automation settings: {error}"))?;
    serde_json::from_str(&json)
        .map_err(|error| format!("Could not parse automation settings: {error}"))
}

fn save_data(app: &AppHandle, data: &AutomationData) -> Result<(), String> {
    let path = state_path(app)?;
    let json = serde_json::to_vec_pretty(data)
        .map_err(|error| format!("Could not encode automation settings: {error}"))?;
    fs::write(path, json).map_err(|error| format!("Could not save automation settings: {error}"))
}

fn downloads_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .download_dir()
        .map_err(|error| format!("Could not locate the Downloads folder: {error}"))
}

fn matches_rule(path: &Path, rule: &AutomationRule) -> bool {
    let value = rule.match_value.trim().to_lowercase();
    if value.is_empty() {
        return false;
    }
    match rule.match_type.as_str() {
        "extension" => path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case(value.trim_start_matches('.'))),
        "nameContains" => path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.to_lowercase().contains(&value)),
        _ => false,
    }
}

fn is_settled(path: &Path) -> bool {
    let temporary = ["crdownload", "download", "part", "partial", "tmp"];
    if path
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| {
            temporary
                .iter()
                .any(|item| value.eq_ignore_ascii_case(item))
        })
    {
        return false;
    }
    path.metadata()
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|modified| SystemTime::now().duration_since(modified).ok())
        .is_some_and(|age| age.as_millis() >= SETTLE_TIME_MS)
}

fn plan_downloads(
    downloads: &Path,
    rules: &[AutomationRule],
    require_settled: bool,
) -> Result<PreviewResult, String> {
    let downloads_canonical = fs::canonicalize(downloads)
        .map_err(|error| format!("Could not access Downloads: {error}"))?;
    let entries =
        fs::read_dir(downloads).map_err(|error| format!("Could not monitor Downloads: {error}"))?;
    let mut moves = Vec::new();
    let mut errors = Vec::new();

    for entry in entries.filter_map(Result::ok) {
        let source = entry.path();
        if !source.is_file() || (require_settled && !is_settled(&source)) {
            continue;
        }
        let Some(rule) = rules
            .iter()
            .find(|rule| rule.enabled && matches_rule(&source, rule))
        else {
            continue;
        };
        let destination_directory = match fs::canonicalize(&rule.destination) {
            Ok(path) if path.is_dir() => path,
            _ => {
                errors.push(format!("{}: destination is unavailable", rule.name));
                continue;
            }
        };
        if destination_directory == downloads_canonical {
            continue;
        }
        let Some(file_name) = source.file_name() else {
            continue;
        };
        let destination = destination_directory.join(file_name);
        if destination.exists() {
            errors.push(format!(
                "{} already exists in {}",
                file_name.to_string_lossy(),
                rule.destination
            ));
            continue;
        }
        moves.push(ProposedMove {
            source: source.to_string_lossy().into_owned(),
            destination: destination.to_string_lossy().into_owned(),
            rule_name: rule.name.clone(),
        });
    }
    Ok(PreviewResult { moves, errors })
}

#[tauri::command]
pub fn get_automation_state(app: AppHandle) -> Result<AutomationState, String> {
    let data = load_data(&app)?;
    Ok(AutomationState {
        downloads_path: downloads_path(&app)?.to_string_lossy().into_owned(),
        rules: data.rules,
        history: data.history,
    })
}

#[tauri::command]
pub fn save_automation_rules(app: AppHandle, rules: Vec<AutomationRule>) -> Result<(), String> {
    for rule in &rules {
        if rule.name.trim().is_empty() || rule.match_value.trim().is_empty() {
            return Err("Every rule needs a name and a value to match".into());
        }
        if !matches!(rule.match_type.as_str(), "extension" | "nameContains") {
            return Err("A rule has an unsupported match type".into());
        }
        let destination = Path::new(&rule.destination);
        if !destination.is_dir() {
            return Err(format!(
                "Destination is not an accessible folder: {}",
                rule.destination
            ));
        }
    }
    let mut data = load_data(&app)?;
    data.rules = rules;
    save_data(&app, &data)
}

#[tauri::command]
pub fn scan_downloads(app: AppHandle) -> Result<ScanResult, String> {
    let downloads = downloads_path(&app)?;
    let mut data = load_data(&app)?;
    let mut moved = 0;
    let preview = plan_downloads(&downloads, &data.rules, true)?;
    let mut errors = preview.errors;

    for planned in preview.moves {
        let source = PathBuf::from(&planned.source);
        let destination = PathBuf::from(&planned.destination);
        match fs::rename(&source, &destination) {
            Ok(()) => {
                let timestamp = now_ms();
                data.history.insert(
                    0,
                    MoveHistoryEntry {
                        id: format!("{timestamp}-{}", data.history.len()),
                        rule_name: planned.rule_name,
                        source: source.to_string_lossy().into_owned(),
                        destination: destination.to_string_lossy().into_owned(),
                        moved_at_ms: timestamp,
                        undone_at_ms: None,
                    },
                );
                moved += 1;
            }
            Err(error) => errors.push(format!("Could not move {}: {error}", source.display())),
        }
    }
    data.history.truncate(500);
    save_data(&app, &data)?;
    Ok(ScanResult { moved, errors })
}

#[tauri::command]
pub fn preview_downloads(app: AppHandle) -> Result<PreviewResult, String> {
    let data = load_data(&app)?;
    plan_downloads(&downloads_path(&app)?, &data.rules, true)
}

fn undo_move(entry: &mut MoveHistoryEntry) -> Result<(), String> {
    if entry.undone_at_ms.is_some() {
        return Err("This move has already been undone".into());
    }
    let source = Path::new(&entry.source);
    let destination = Path::new(&entry.destination);
    if !destination.is_file() {
        return Err("The moved file is no longer at its destination".into());
    }
    if source.exists() {
        return Err("The original location already contains an item with this name".into());
    }
    fs::rename(destination, source).map_err(|error| format!("Could not undo move: {error}"))?;
    entry.undone_at_ms = Some(now_ms());
    Ok(())
}

#[tauri::command]
pub fn undo_automated_move(app: AppHandle, history_id: String) -> Result<(), String> {
    let mut data = load_data(&app)?;
    let entry = data
        .history
        .iter_mut()
        .find(|entry| entry.id == history_id)
        .ok_or("History entry was not found")?;
    undo_move(entry)?;
    save_data(&app, &data)
}

#[cfg(test)]
mod tests {
    use super::{matches_rule, plan_downloads, undo_move, AutomationRule, MoveHistoryEntry};
    use std::{
        fs,
        path::Path,
        process,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn fixture() -> std::path::PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let path =
            std::env::temp_dir().join(format!("fileflow-automation-{}-{nonce}", process::id()));
        fs::create_dir(&path).expect("fixture should be created");
        path
    }

    fn rule(name: &str, match_type: &str, value: &str, destination: &Path) -> AutomationRule {
        AutomationRule {
            id: name.into(),
            name: name.into(),
            match_type: match_type.into(),
            match_value: value.into(),
            destination: destination.to_string_lossy().into_owned(),
            enabled: true,
        }
    }

    #[test]
    fn matches_extensions_and_names_case_insensitively() {
        assert!(matches_rule(
            Path::new("Quarterly-INVOICE.PDF"),
            &rule("PDF", "extension", ".pdf", Path::new("."))
        ));
        assert!(matches_rule(
            Path::new("Quarterly-INVOICE.PDF"),
            &rule("Invoice", "nameContains", "invoice", Path::new("."))
        ));
    }

    #[test]
    fn preview_uses_first_matching_rule_without_moving_file() {
        let root = fixture();
        let downloads = root.join("downloads");
        let first = root.join("first");
        let second = root.join("second");
        for path in [&downloads, &first, &second] {
            fs::create_dir(path).unwrap();
        }
        let source = downloads.join("invoice.pdf");
        fs::write(&source, "content").unwrap();
        let rules = [
            rule("Invoices", "nameContains", "invoice", &first),
            rule("PDFs", "extension", "pdf", &second),
        ];

        let preview = plan_downloads(&downloads, &rules, false).unwrap();
        assert_eq!(preview.moves.len(), 1);
        assert_eq!(preview.moves[0].rule_name, "Invoices");
        assert_eq!(
            Path::new(&preview.moves[0].destination),
            fs::canonicalize(&first).unwrap().join("invoice.pdf")
        );
        assert!(source.is_file(), "dry-run must not move the source");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn preview_reports_destination_collisions() {
        let root = fixture();
        let downloads = root.join("downloads");
        let destination = root.join("destination");
        fs::create_dir(&downloads).unwrap();
        fs::create_dir(&destination).unwrap();
        fs::write(downloads.join("report.pdf"), "new").unwrap();
        fs::write(destination.join("report.pdf"), "existing").unwrap();

        let preview = plan_downloads(
            &downloads,
            &[rule("PDFs", "extension", "pdf", &destination)],
            false,
        )
        .unwrap();
        assert!(preview.moves.is_empty());
        assert_eq!(preview.errors.len(), 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn undo_restores_a_move_and_rejects_a_second_undo() {
        let root = fixture();
        let source = root.join("downloads.txt");
        let destination = root.join("organized.txt");
        fs::write(&destination, "content").unwrap();
        let mut entry = MoveHistoryEntry {
            id: "move-1".into(),
            rule_name: "Text".into(),
            source: source.to_string_lossy().into_owned(),
            destination: destination.to_string_lossy().into_owned(),
            moved_at_ms: 1,
            undone_at_ms: None,
        };

        undo_move(&mut entry).unwrap();
        assert!(source.is_file());
        assert!(entry.undone_at_ms.is_some());
        assert!(undo_move(&mut entry).is_err());
        fs::remove_dir_all(root).unwrap();
    }
}
