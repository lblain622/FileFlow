import { invoke } from "@tauri-apps/api/core";

export function greet(name: string) {
  return invoke<string>("greet", { name });
}

export function getSystemStatus() {
  return invoke<string>("system_status");
}

export function helloFromRust() {
  return invoke<string>("hello_from_rust");
}

export interface DirectoryEntry { name: string; path: string; isDirectory: boolean; sizeBytes: number; modifiedAtMs?: number; }
export interface DiskRoot { name: string; path: string; isCurrent: boolean; }
export type SystemLocationKind = "home" | "desktop" | "documents" | "downloads" | "pictures" | "music" | "videos";
export interface SystemLocation { kind: SystemLocationKind; name: string; path: string; rootPath: string; }
export const listDiskRoots = () => invoke<DiskRoot[]>("list_disk_roots");
export const listSystemLocations = () => invoke<SystemLocation[]>("list_system_locations");
export const openRecycleBin = () => invoke<void>("open_recycle_bin");
export const openLocalFile = (root: string, path: string) => invoke<void>("open_file", { root, path });
export const openWith = (root: string, path: string) => invoke<void>("open_with", { root, path });
export const moveEntry = (root: string, path: string, destination: string) => invoke<string>("move_entry", { root, path, destination });
export const extractZip = (root: string, path: string) => invoke<string>("extract_zip", { root, path });
export const listDirectory = (root: string, path: string) => invoke<DirectoryEntry[]>("list_directory", { root, path });
export const createFile = (root: string, directory: string, name: string) => invoke<void>("create_file", { root, directory, name });
export const createDirectory = (root: string, directory: string, name: string) => invoke<void>("create_directory", { root, directory, name });
export const deleteEntry = (root: string, path: string) => invoke<void>("delete_entry", { root, path });
