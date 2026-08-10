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
export const listDiskRoots = () => invoke<DiskRoot[]>("list_disk_roots");
export const openRecycleBin = () => invoke<void>("open_recycle_bin");
export const openLocalFile = (root: string, path: string) => invoke<void>("open_file", { root, path });
export const listDirectory = (root: string, path: string) => invoke<DirectoryEntry[]>("list_directory", { root, path });
export const createFile = (root: string, directory: string, name: string) => invoke<void>("create_file", { root, directory, name });
export const createDirectory = (root: string, directory: string, name: string) => invoke<void>("create_directory", { root, directory, name });
export const deleteEntry = (root: string, path: string) => invoke<void>("delete_entry", { root, path });
