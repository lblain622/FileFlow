export type FileKind = "folder" | "document" | "image" | "archive";

export interface FileRecord {
  id: string;
  name: string;
  kind: FileKind;
  size?: string;
  modifiedAt: string;
  owner: string;
  children?: FileRecord[];
}

export const fileTree: FileRecord = {
  id: "my-files",
  name: "My files",
  kind: "folder",
  modifiedAt: "Today",
  owner: "You",
  children: [
    {
      id: "projects",
      name: "Projects",
      kind: "folder",
      modifiedAt: "Today, 10:42 AM",
      owner: "You",
      children: [
        { id: "fileflow", name: "FileFlow", kind: "folder", modifiedAt: "Today, 10:42 AM", owner: "You", children: [
          { id: "research", name: "Research notes.docx", kind: "document", size: "1.8 MB", modifiedAt: "Today, 9:18 AM", owner: "You" },
          { id: "wireframes", name: "Wireframes", kind: "folder", modifiedAt: "Yesterday", owner: "You", children: [
            { id: "dashboard", name: "Dashboard.png", kind: "image", size: "2.4 MB", modifiedAt: "Yesterday", owner: "You" },
          ] },
        ] },
        { id: "website", name: "Website refresh", kind: "folder", modifiedAt: "Aug 4, 2026", owner: "You", children: [] },
      ],
    },
    {
      id: "documents",
      name: "Documents",
      kind: "folder",
      modifiedAt: "Yesterday",
      owner: "You",
      children: [
        { id: "brief", name: "Product brief.pdf", kind: "document", size: "3.2 MB", modifiedAt: "Yesterday, 4:10 PM", owner: "You" },
        { id: "meeting", name: "Meeting notes.docx", kind: "document", size: "284 KB", modifiedAt: "Aug 5, 2026", owner: "You" },
      ],
    },
    { id: "photos", name: "Photos", kind: "folder", modifiedAt: "Aug 6, 2026", owner: "You", children: [
      { id: "launch", name: "Launch day.jpg", kind: "image", size: "4.7 MB", modifiedAt: "Aug 6, 2026", owner: "You" },
    ] },
    { id: "archive-folder", name: "Archive", kind: "folder", modifiedAt: "Jul 28, 2026", owner: "You", children: [
      { id: "backup", name: "Project backup.zip", kind: "archive", size: "18.4 MB", modifiedAt: "Jul 28, 2026", owner: "You" },
    ] },
    { id: "readme", name: "Getting started.pdf", kind: "document", size: "940 KB", modifiedAt: "Aug 2, 2026", owner: "You" },
  ],
};

export function findFile(root: FileRecord, id: string): FileRecord | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const match = findFile(child, id);
    if (match) return match;
  }
}

export function findPath(root: FileRecord, id: string): FileRecord[] {
  if (root.id === id) return [root];
  for (const child of root.children ?? []) {
    const path = findPath(child, id);
    if (path.length) return [root, ...path];
  }
  return [];
}
