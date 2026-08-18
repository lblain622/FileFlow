use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    Folder,
    Document,
    Image,
    Archive,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub kind: FileKind,
    pub modified_at: String,
    pub owner: String,
    pub children: Option<Vec<FileRecord>>,
}