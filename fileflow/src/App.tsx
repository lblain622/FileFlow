import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  FolderOpen,
  Grid2X2,
  List,
  Plus,
  RefreshCw,
} from "lucide-react";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileCard } from "@/components/FileCard";
import FileTable from "@/components/FileTable";
import SearchBar from "@/components/SearchBar";
import Sidebar, { type QuickView } from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import AppearanceSettings from "@/features/settings/AppearanceSettings";
import AutomationPage from "@/features/automation/AutomationPage";
import {
  applyTheme,
  getStoredTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/features/settings/theme";
import {
  createDirectory,
  createFile,
  deleteEntry,
  extractZip,
  getSystemStatus,
  helloFromRust,
  listDirectory,
  listDiskRoots,
  listSystemLocations,
  moveEntry,
  openLocalFile,
  openRecycleBin,
  openWith,
  type DirectoryEntry,
  type DiskRoot,
  type SystemLocation,
} from "@/lib/backend";
import type { FileKind, FileRecord } from "@/types/file";

type View = "list" | "grid";
type CreateKind = "file" | "folder";
const imageExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
]);
const archiveExtensions = new Set(["zip", "rar", "7z", "tar", "gz"]);
const basename = (path: string) => {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
};
const kindFor = (entry: DirectoryEntry): FileKind => {
  if (entry.isDirectory) return "folder";
  const parts = entry.name.split(".");
  const extension = parts[parts.length - 1]?.toLowerCase() ?? "";
  return imageExtensions.has(extension)
    ? "image"
    : archiveExtensions.has(extension)
      ? "archive"
      : "document";
};
const formatSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KB`
      : bytes < 1073741824
        ? `${(bytes / 1048576).toFixed(1)} MB`
        : `${(bytes / 1073741824).toFixed(1)} GB`;
const toFileRecord = (
  entry: DirectoryEntry,
  authorizedRoot: string,
): FileRecord => ({
  id: entry.path,
  path: entry.path,
  authorizedRoot,
  name: entry.name,
  kind: kindFor(entry),
  size: entry.isDirectory ? undefined : formatSize(entry.sizeBytes),
  modifiedAt: entry.modifiedAtMs
    ? new Date(entry.modifiedAtMs).toLocaleString()
    : "Unknown",
  owner: "You",
});
const FAVORITES_KEY = "fileflow.favorites.v1";
const getStoredFavorites = (): FileRecord[] => {
  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([]);
  const [favorites, setFavorites] = useState<FileRecord[]>(getStoredFavorites);
  const [quickView, setQuickView] = useState<QuickView>("home");
  const [disks, setDisks] = useState<DiskRoot[]>([]);
  const [locations, setLocations] = useState<SystemLocation[]>([]);
  const [rootPath, setRootPath] = useState<string>();
  const [directoryPath, setDirectoryPath] = useState<string>();
  const [selected, setSelected] = useState<FileRecord>();
  const [pendingDelete, setPendingDelete] = useState<FileRecord>();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [page, setPage] = useState<"files" | "automation" | "settings">("files");
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [backendStatus, setBackendStatus] = useState<string>();
  const [backendError, setBackendError] = useState<string>();
  const [operationError, setOperationError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<CreateKind>("file");
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string>();
  const visibleFiles = useMemo(() => {
    const source =
      quickView === "recent"
        ? recentFiles
        : quickView === "favorites"
          ? favorites
          : files;
    const normalized = query.trim().toLowerCase();
    return normalized
      ? source.filter((file) => file.name.toLowerCase().includes(normalized))
      : source;
  }, [favorites, files, query, quickView, recentFiles]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    let active = true;
    Promise.all([
      helloFromRust(),
      getSystemStatus(),
      listDiskRoots(),
      listSystemLocations(),
    ])
      .then(async ([greeting, status, detectedDisks, detectedLocations]) => {
        if (!active) return;
        setBackendStatus(`${greeting} · ${status}`);
        setDisks(detectedDisks);
        setLocations(detectedLocations);
        const home = detectedLocations.find(
          (location) => location.kind === "home",
        );
        const fallbackDisk =
          detectedDisks.find((disk) => disk.isCurrent) ?? detectedDisks[0];
        const initialRoot = home?.rootPath ?? fallbackDisk?.path;
        const initialPath = home?.path ?? fallbackDisk?.path;
        if (!initialRoot || !initialPath) return;
        const entries = await listDirectory(initialRoot, initialPath);
        if (!active) return;
        setFiles(entries.map((entry) => toFileRecord(entry, initialRoot)));
        setRootPath(initialRoot);
        setDirectoryPath(initialPath);
      })
      .catch((error: unknown) => {
        if (active)
          setBackendError(
            error instanceof Error ? error.message : String(error),
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const loadFolder = async (root: string, path: string) => {
    try {
      const entries = await listDirectory(root, path);
      setFiles(entries.map((entry) => toFileRecord(entry, root)));
      setRootPath(root);
      setDirectoryPath(path);
      setQuickView("home");
      setPage("files");
      setSelected(undefined);
      setQuery("");
      setOperationError(undefined);
    } catch (error) {
      setOperationError(String(error));
    }
  };
  const chooseFolder = async () => {
    const path = await openFolderDialog({
      directory: true,
      multiple: false,
      title: "Choose a folder for FileFlow",
    });
    if (typeof path === "string") await loadFolder(path, path);
  };
  const rootForPath = (path: string) => {
    const currentRootMatches =
      rootPath && path.toLowerCase().startsWith(rootPath.toLowerCase())
        ? rootPath
        : undefined;
    const disk = [...disks]
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) => path.toLowerCase().startsWith(item.path.toLowerCase()));
    return currentRootMatches ?? disk?.path;
  };
  const openEntry = (file: FileRecord) => {
    if (!file.path) return;
    setRecentFiles((current) =>
      [file, ...current.filter((item) => item.path !== file.path)].slice(0, 30),
    );
    const root = file.authorizedRoot ?? rootForPath(file.path);
    if (!root) {
      setOperationError("The file's disk is not currently available");
      return;
    }
    if (file.kind === "folder") void loadFolder(root, file.path);
    else
      void openLocalFile(root, file.path).catch((error: unknown) =>
        setOperationError(String(error)),
      );
  };
  const openEntryWith = (file: FileRecord) => {
    if (!file.path || file.kind === "folder") return;
    const root = file.authorizedRoot ?? rootForPath(file.path);
    if (!root) {
      setOperationError("The file's disk is not currently available");
      return;
    }
    void openWith(root, file.path).catch((error: unknown) =>
      setOperationError(String(error)),
    );
  };
  const toggleFavorite = (file: FileRecord) => {
    setFavorites((current) =>
      current.some((item) => item.path === file.path)
        ? current.filter((item) => item.path !== file.path)
        : [file, ...current],
    );
  };
  const isFavorite = (file: FileRecord) =>
    favorites.some((item) => item.path === file.path);
  const selectQuickView = (next: QuickView) => {
    setQuickView(next);
    setPage("files");
    setSelected(undefined);
    setQuery("");
  };
  const goUp = () => {
    if (!rootPath || !directoryPath || directoryPath === rootPath) return;
    const separatorIndex = Math.max(
      directoryPath.lastIndexOf("\\"),
      directoryPath.lastIndexOf("/"),
    );
    void loadFolder(rootPath, directoryPath.slice(0, separatorIndex));
  };
  const showCreate = (kind: CreateKind) => {
    setCreateKind(kind);
    setNewName("");
    setCreateError(undefined);
    setCreateOpen(true);
  };
  const createEntry = async () => {
    if (!rootPath || !directoryPath) return;
    try {
      if (createKind === "file")
        await createFile(rootPath, directoryPath, newName);
      else await createDirectory(rootPath, directoryPath, newName);
      setCreateOpen(false);
      await loadFolder(rootPath, directoryPath);
    } catch (error) {
      setCreateError(String(error));
    }
  };
  const removeEntry = async () => {
    if (!pendingDelete?.path || !rootPath || !directoryPath) return;
    try {
      await deleteEntry(rootPath, pendingDelete.path);
      setPendingDelete(undefined);
      await loadFolder(rootPath, directoryPath);
    } catch (error) {
      setPendingDelete(undefined);
      setOperationError(String(error));
    }
  };
  const extractArchive = async (file: FileRecord) => {
    if (!file.path || !rootPath || !directoryPath) return;
    try {
      await extractZip(rootPath, file.path);
      await loadFolder(rootPath, directoryPath);
    } catch (error) {
      setOperationError(String(error));
    }
  };
  const moveFile = async (file: FileRecord) => {
    if (!file.path || !rootPath || !directoryPath) return;
    const destination = await openFolderDialog({
      directory: true,
      multiple: false,
      title: `Move ${file.name} to…`,
    });
    if (typeof destination !== "string") return;
    try {
      await moveEntry(rootPath, file.path, destination);
      setFavorites((current) =>
        current.filter((item) => item.path !== file.path),
      );
      setRecentFiles((current) =>
        current.filter((item) => item.path !== file.path),
      );
      await loadFolder(rootPath, directoryPath);
    } catch (error) {
      setOperationError(String(error));
    }
  };

  return (
    <div className="flex h-screen min-h-[640px] overflow-hidden bg-muted/30">
      <Sidebar
        disks={disks}
        locations={locations}
        activePath={directoryPath}
        activeRoot={rootPath}
        quickView={quickView}
        page={page}
        onOpenDisk={(path) => void loadFolder(path, path)}
        onOpenLocation={(location) =>
          void loadFolder(location.rootPath, location.path)
        }
        onQuickView={selectQuickView}
        onOpenRecycleBin={() =>
          void openRecycleBin().catch((error: unknown) =>
            setOperationError(String(error)),
          )
        }
        onChooseFolder={() => void chooseFolder()}
        onPageChange={setPage}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {page === "settings" ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-background p-6 lg:p-8">
            <AppearanceSettings theme={theme} onThemeChange={setTheme} />
          </div>
        ) : page === "automation" ? (
          <AutomationPage />
        ) : (
          <>
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
              <SearchBar value={query} onChange={setQuery} />
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => void chooseFolder()}>
                  <FolderOpen data-icon="inline-start" />
                  {rootPath ? "Change folder" : "Choose folder"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Refresh folder"
                  disabled={!directoryPath || quickView !== "home"}
                  onClick={() => {
                    if (rootPath && directoryPath)
                      void loadFolder(rootPath, directoryPath);
                  }}
                >
                  <RefreshCw />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        disabled={!directoryPath || quickView !== "home"}
                      />
                    }
                  >
                    <Plus data-icon="inline-start" />
                    New
                    <ChevronDown data-icon="inline-end" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => showCreate("file")}>
                        New file
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => showCreate("folder")}>
                        New folder
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 lg:p-8">
              {!rootPath || !directoryPath ? (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderOpen />
                    </EmptyMedia>
                    <EmptyTitle>Choose a local folder</EmptyTitle>
                    <EmptyDescription>
                      FileFlow only shows and changes files inside the folder
                      you explicitly select.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={() => void chooseFolder()}>
                      Choose folder
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem>
                            <BreadcrumbPage>
                              {quickView === "home"
                                ? directoryPath
                                : "Quick access"}
                            </BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                      <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                          {quickView === "recent"
                            ? "Recent"
                            : quickView === "favorites"
                              ? "Favorites"
                              : basename(directoryPath)}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {visibleFiles.length}{" "}
                          {visibleFiles.length === 1 ? "item" : "items"}
                          {query ? ` matching “${query}”` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          quickView !== "home" || directoryPath === rootPath
                        }
                        onClick={goUp}
                      >
                        <ArrowUp data-icon="inline-start" />
                        Up
                      </Button>
                      <ToggleGroup
                        value={[view]}
                        onValueChange={(value) => {
                          const next = value[0] as View | undefined;
                          if (next) setView(next);
                        }}
                        variant="outline"
                        spacing={0}
                        aria-label="Change file view"
                      >
                        <ToggleGroupItem value="list" aria-label="List view">
                          <List />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="grid" aria-label="Grid view">
                          <Grid2X2 />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                  {operationError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {operationError}
                    </p>
                  ) : null}
                  {visibleFiles.length ? (
                    view === "list" ? (
                      <FileTable
                        files={visibleFiles}
                        selectedId={selected?.id}
                        onOpen={openEntry}
                        onOpenWith={openEntryWith}
                        onMove={quickView === "home" ? moveFile : undefined}
                        onSelect={setSelected}
                        onExtract={
                          quickView === "home" ? extractArchive : undefined
                        }
                        onDelete={
                          quickView === "home" ? setPendingDelete : undefined
                        }
                        onFavorite={toggleFavorite}
                        isFavorite={isFavorite}
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                        {visibleFiles.map((file) => (
                          <FileCard
                            key={file.id}
                            file={file}
                            selected={selected?.id === file.id}
                            favorite={isFavorite(file)}
                            onOpen={() => openEntry(file)}
                            onOpenWith={
                              file.kind !== "folder"
                                ? () => openEntryWith(file)
                                : undefined
                            }
                            onMove={
                              quickView === "home"
                                ? () => void moveFile(file)
                                : undefined
                            }
                            onSelect={() => setSelected(file)}
                            onFavorite={() => toggleFavorite(file)}
                            onExtract={
                              quickView === "home"
                                ? () => void extractArchive(file)
                                : undefined
                            }
                            onDelete={
                              quickView === "home"
                                ? () => setPendingDelete(file)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <Empty className="border">
                      <EmptyHeader>
                        <EmptyTitle>
                          {query
                            ? "No matching files"
                            : quickView === "favorites"
                              ? "No favorites yet"
                              : quickView === "recent"
                                ? "No recent files yet"
                                : "This folder is empty"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {query
                            ? "Try a different search."
                            : quickView === "favorites"
                              ? "Add files or folders from their action menu."
                              : quickView === "recent"
                                ? "Files and folders you open will appear here."
                                : "Create a file or folder to get started."}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </>
              )}
            </section>
            <StatusBar
              selectionLabel={
                selected
                  ? `${selected.name} selected`
                  : `${visibleFiles.length} items`
              }
              backendStatus={backendStatus}
              backendError={backendError}
            />
          </>
        )}
      </main>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new {createKind}</DialogTitle>
            <DialogDescription>
              It will be created in{" "}
              {directoryPath ? basename(directoryPath) : "the current folder"}.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={Boolean(createError)}>
              <FieldLabel htmlFor="new-entry-name">
                {createKind === "file" ? "File" : "Folder"} name
              </FieldLabel>
              <Input
                id="new-entry-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={createKind === "file" ? "notes.txt" : "New folder"}
                aria-invalid={Boolean(createError)}
              />
              <FieldError>{createError}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter showCloseButton>
            <Button
              disabled={!newName.trim()}
              onClick={() => void createEntry()}
            >
              Create {createKind}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move “{pendingDelete?.name}” to the Recycle Bin?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You can restore it later from the operating system’s Recycle Bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void removeEntry()}
            >
              Move to Recycle Bin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
