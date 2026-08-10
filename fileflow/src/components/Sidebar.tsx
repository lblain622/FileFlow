import { useState } from "react";
import { ChevronRight, FileClock, Folder, FolderOpen, HardDrive, Settings, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FileRecord } from "@/types/file";

type NavigationProps = { root: FileRecord; currentId: string; onNavigate: (id: string) => void };
type Props = NavigationProps & { page: "files" | "settings"; onPageChange: (page: "files" | "settings") => void };

function FolderNode({ root, node, currentId, onNavigate, depth = 0 }: NavigationProps & { node: FileRecord; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const folders = (node.children ?? []).filter((item) => item.kind === "folder");
  const active = node.id === currentId;

  return (
    <li>
      <div className="flex items-center" style={{ paddingLeft: `${depth * 12}px` }}>
        <Button variant="ghost" size="icon-xs" aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`} onClick={() => setExpanded((value) => !value)} disabled={!folders.length}>
          <ChevronRight className={cn("transition-transform", expanded && "rotate-90", !folders.length && "opacity-0")} />
        </Button>
        <Button variant={active ? "secondary" : "ghost"} size="sm" className="min-w-0 flex-1 justify-start" onClick={() => onNavigate(node.id)}>
          {expanded ? <FolderOpen data-icon="inline-start" /> : <Folder data-icon="inline-start" />}
          <span className="truncate">{node.name}</span>
        </Button>
      </div>
      {expanded && folders.length ? <ul>{folders.map((folder) => <FolderNode key={folder.id} root={root} node={folder} currentId={currentId} onNavigate={onNavigate} depth={depth + 1} />)}</ul> : null}
    </li>
  );
}

export default function Sidebar({ root, currentId, page, onNavigate, onPageChange }: Readonly<Props>) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar max-md:hidden">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold"><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><FolderOpen /></div>FileFlow</div>
      <nav className="flex flex-col gap-1 px-3 py-3" aria-label="File locations">
        <Button variant={page === "files" ? "secondary" : "ghost"} className="justify-start" onClick={() => onNavigate(root.id)}><HardDrive data-icon="inline-start" />My files</Button>
        <Button variant="ghost" className="justify-start"><FileClock data-icon="inline-start" />Recent</Button>
        <Button variant="ghost" className="justify-start"><Star data-icon="inline-start" />Starred</Button>
        <Button variant="ghost" className="justify-start"><Trash2 data-icon="inline-start" />Trash</Button>
      </nav>
      <div className="px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Folders</div>
      <ScrollArea className="min-h-0 flex-1 px-2"><ul className="flex flex-col gap-0.5"><FolderNode root={root} node={root} currentId={currentId} onNavigate={onNavigate} /></ul></ScrollArea>
      <nav className="px-3 pb-3" aria-label="Application settings"><Button variant={page === "settings" ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => onPageChange("settings")}><Settings data-icon="inline-start" />Settings</Button></nav>
      <div className="border-t p-4"><div className="mb-2 flex justify-between text-xs"><span>Storage</span><span className="text-muted-foreground">18.6 GB of 50 GB</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[37%] rounded-full bg-primary" /></div></div>
    </aside>
  );
}
