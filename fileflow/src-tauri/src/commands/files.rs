use serd::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileRecord {
   name: String,
   path: String,
   size_bytes: u64,
}