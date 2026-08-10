use serd::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
   name: String,
   path: String,
   size_bytes: u64,
   kind: FileKind;
  modifiedAt: string;
  owner: string;
  children?: FileRecord[];
}