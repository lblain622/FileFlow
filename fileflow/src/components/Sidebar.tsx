import { Clock3, FolderOpen, HardDrive, Home, Settings, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiskRoot } from "@/lib/backend";

export type QuickView = "home" | "recent" | "favorites";
type Props = { disks: DiskRoot[]; activeRoot?: string; quickView: QuickView; page: "files" | "settings"; onOpenDisk: (path: string) => void; onQuickView: (view: QuickView) => void; onOpenRecycleBin: () => void; onChooseFolder: () => void; onPageChange: (page: "files" | "settings") => void; };

export default function Sidebar({ disks, activeRoot, quickView, page, onOpenDisk, onQuickView, onOpenRecycleBin, onChooseFolder, onPageChange }: Readonly<Props>) {
  return <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar max-md:hidden">
    <div className="flex h-16 items-center gap-2 px-5 font-semibold"><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FolderOpen /></div>FileFlow</div>
    <div className="px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick access</div>
    <nav className="flex flex-col gap-1 px-3" aria-label="Quick access"><Button variant={page === "files" && quickView === "home" ? "secondary" : "ghost"} className="justify-start" onClick={() => onQuickView("home")}><Home data-icon="inline-start" />Home</Button><Button variant={page === "files" && quickView === "recent" ? "secondary" : "ghost"} className="justify-start" onClick={() => onQuickView("recent")}><Clock3 data-icon="inline-start" />Recent</Button><Button variant={page === "files" && quickView === "favorites" ? "secondary" : "ghost"} className="justify-start" onClick={() => onQuickView("favorites")}><Star data-icon="inline-start" />Favorites</Button><Button variant="ghost" className="justify-start" onClick={onOpenRecycleBin}><Trash2 data-icon="inline-start" />Recycle Bin</Button></nav>
    <div className="px-5 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Disks</div>
    <ScrollArea className="min-h-0 flex-1 px-3"><nav className="flex flex-col gap-1" aria-label="Detected disks">{disks.map((disk) => <Button key={disk.path} variant={page === "files" && quickView === "home" && activeRoot === disk.path ? "secondary" : "ghost"} className="justify-start" onClick={() => onOpenDisk(disk.path)}><HardDrive data-icon="inline-start" /><span className="truncate">{disk.name}</span></Button>)}</nav></ScrollArea>
    <nav className="flex flex-col gap-1 px-3 pb-3" aria-label="Other locations"><Button variant="outline" className="justify-start" onClick={onChooseFolder}><FolderOpen data-icon="inline-start" />Choose folder</Button><Button variant={page === "settings" ? "secondary" : "ghost"} className="justify-start" onClick={() => onPageChange("settings")}><Settings data-icon="inline-start" />Settings</Button></nav>
  </aside>;
}
