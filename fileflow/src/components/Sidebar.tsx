import {
  Clock3,
  FolderCog,
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  Home,
  Images,
  Monitor,
  Music2,
  Settings,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  DiskRoot,
  SystemLocation,
  SystemLocationKind,
} from "@/lib/backend";

export type QuickView = "home" | "recent" | "favorites";
type Props = {
  disks: DiskRoot[];
  locations: SystemLocation[];
  activePath?: string;
  activeRoot?: string;
  quickView: QuickView;
  page: "files" | "automation" | "settings";
  onOpenDisk: (path: string) => void;
  onOpenLocation: (location: SystemLocation) => void;
  onQuickView: (view: QuickView) => void;
  onOpenRecycleBin: () => void;
  onChooseFolder: () => void;
  onPageChange: (page: "files" | "automation" | "settings") => void;
};
const locationIcons: Record<SystemLocationKind, typeof Home> = {
  home: Home,
  desktop: Monitor,
  documents: FileText,
  downloads: Download,
  pictures: Images,
  music: Music2,
  videos: Video,
};

export default function Sidebar({
  disks,
  locations,
  activePath,
  activeRoot,
  quickView,
  page,
  onOpenDisk,
  onOpenLocation,
  onQuickView,
  onOpenRecycleBin,
  onChooseFolder,
  onPageChange,
}: Readonly<Props>) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar max-md:hidden">
      <div className="flex h-16 items-center gap-2 px-5 font-semibold">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FolderOpen />
        </div>
        FileFlow
      </div>
      <div className="px-5 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Quick access
      </div>
      <nav className="flex flex-col gap-1 px-3" aria-label="Quick access">
        <Button
          variant={
            page === "files" && quickView === "recent" ? "secondary" : "ghost"
          }
          className="justify-start"
          onClick={() => onQuickView("recent")}
        >
          <Clock3 data-icon="inline-start" />
          Recent
        </Button>
        <Button
          variant={
            page === "files" && quickView === "favorites"
              ? "secondary"
              : "ghost"
          }
          className="justify-start"
          onClick={() => onQuickView("favorites")}
        >
          <Star data-icon="inline-start" />
          Favorites
        </Button>
      </nav>
      <div className="px-5 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Folders
      </div>
      <nav className="flex flex-col gap-1 px-3" aria-label="System folders">
        {locations.map((location) => {
          const Icon = locationIcons[location.kind];
          return (
            <Button
              key={location.kind}
              variant={
                page === "files" &&
                quickView === "home" &&
                activePath === location.path
                  ? "secondary"
                  : "ghost"
              }
              className="justify-start"
              onClick={() => onOpenLocation(location)}
            >
              <Icon data-icon="inline-start" />
              <span className="truncate">{location.name}</span>
            </Button>
          );
        })}
      </nav>
      <div className="px-5 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Disks
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3">
        <nav className="flex flex-col gap-1" aria-label="Detected disks">
          {disks.map((disk) => (
            <Button
              key={disk.path}
              variant={
                page === "files" &&
                quickView === "home" &&
                activeRoot === disk.path &&
                activePath === disk.path
                  ? "secondary"
                  : "ghost"
              }
              className="justify-start"
              onClick={() => onOpenDisk(disk.path)}
            >
              <HardDrive data-icon="inline-start" />
              <span className="truncate">{disk.name}</span>
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <nav
        className="flex flex-col gap-1 px-3 pb-3"
        aria-label="Other locations"
      >
        <Button
          variant={page === "automation" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => onPageChange("automation")}
        >
          <FolderCog data-icon="inline-start" />
          Automation
        </Button>
        <Button
          variant="ghost"
          className="justify-start"
          onClick={onOpenRecycleBin}
        >
          <Trash2 data-icon="inline-start" />
          Recycle Bin
        </Button>
        <Button
          variant="outline"
          className="justify-start"
          onClick={onChooseFolder}
        >
          <FolderOpen data-icon="inline-start" />
          Choose folder
        </Button>
        <Button
          variant={page === "settings" ? "secondary" : "ghost"}
          className="justify-start"
          onClick={() => onPageChange("settings")}
        >
          <Settings data-icon="inline-start" />
          Settings
        </Button>
      </nav>
    </aside>
  );
}
