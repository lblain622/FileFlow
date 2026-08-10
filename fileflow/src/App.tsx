import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Grid2X2, List, Plus, Upload } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import FileTable from "@/components/FileTable";
import { FileCard } from "@/components/FileCard";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import AppearanceSettings from "@/features/settings/AppearanceSettings";
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY, type Theme } from "@/features/settings/theme";
import { fileTree, findFile, findPath, type FileRecord } from "@/types/file";

type View = "list" | "grid";

export default function App() {
  const [currentId, setCurrentId] = useState(fileTree.id);
  const [selected, setSelected] = useState<FileRecord>();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [page, setPage] = useState<"files" | "settings">("files");
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const current = findFile(fileTree, currentId) ?? fileTree;
  const path = findPath(fileTree, current.id);
  const files = useMemo(() => (current.children ?? []).filter((file) => file.name.toLowerCase().includes(query.toLowerCase())), [current, query]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  const navigate = (id: string) => { setPage("files"); setCurrentId(id); setSelected(undefined); setQuery(""); };
  const open = (file: FileRecord) => { if (file.kind === "folder") navigate(file.id); else setSelected(file); };

  return (
    <div className="flex h-screen min-h-[640px] overflow-hidden bg-muted/30">
      <Sidebar root={fileTree} currentId={currentId} page={page} onNavigate={navigate} onPageChange={setPage} />
      <main className="flex min-w-0 flex-1 flex-col">
        {page === "files" ? <><header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-6">
          <SearchBar value={query} onChange={setQuery} />
          <div className="flex items-center gap-2"><Button variant="outline" className="max-sm:hidden"><Upload data-icon="inline-start" />Upload</Button><DropdownMenu><DropdownMenuTrigger render={<Button />}><Plus data-icon="inline-start" />New<ChevronDown data-icon="inline-end" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem>New folder</DropdownMenuItem><DropdownMenuItem>New document</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu></div>
        </header>
        <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6 lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2"><Breadcrumb><BreadcrumbList>{path.map((part, index) => <span className="contents" key={part.id}><BreadcrumbItem>{index === path.length - 1 ? <BreadcrumbPage>{part.name}</BreadcrumbPage> : <BreadcrumbLink render={<button onClick={() => navigate(part.id)} />}>{part.name}</BreadcrumbLink>}</BreadcrumbItem>{index < path.length - 1 ? <BreadcrumbSeparator /> : null}</span>)}</BreadcrumbList></Breadcrumb><div><h1 className="text-2xl font-semibold tracking-tight">{current.name}</h1><p className="mt-1 text-sm text-muted-foreground">{files.length} {files.length === 1 ? "item" : "items"}{query ? ` matching “${query}”` : ""}</p></div></div>
            <ToggleGroup value={[view]} onValueChange={(value) => { const next = value[0] as View | undefined; if (next) setView(next); }} variant="outline" spacing={0} aria-label="Change file view"><ToggleGroupItem value="list" aria-label="List view"><List /></ToggleGroupItem><ToggleGroupItem value="grid" aria-label="Grid view"><Grid2X2 /></ToggleGroupItem></ToggleGroup>
          </div>
          {files.length ? view === "list" ? <FileTable files={files} selectedId={selected?.id} onOpen={open} onSelect={setSelected} /> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{files.map((file) => <FileCard key={file.id} file={file} selected={selected?.id === file.id} onOpen={() => open(file)} onSelect={() => setSelected(file)} />)}</div> : <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-background p-12 text-center"><h2 className="font-medium">No files found</h2><p className="mt-1 text-sm text-muted-foreground">Try another search or add something new.</p></div>}
        </section>
        <footer className="flex h-10 shrink-0 items-center justify-between border-t bg-background px-6 text-xs text-muted-foreground"><span>{selected ? `${selected.name} selected` : `${files.length} items`}</span><span>All files are up to date</span></footer></> : <div className="min-h-0 flex-1 overflow-y-auto bg-background p-6 lg:p-8"><AppearanceSettings theme={theme} onThemeChange={setTheme} /></div>}
      </main>
    </div>
  );
}
