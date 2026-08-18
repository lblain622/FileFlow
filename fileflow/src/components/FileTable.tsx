import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Archive, FileText, Folder, Image, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FileKind, FileRecord } from "@/types/file";
import { FileContextActions } from "./FileContextActions";

const icons: Record<FileKind, typeof Folder> = {
  folder: Folder,
  document: FileText,
  image: Image,
  archive: Archive,
};
type Props = {
  files: FileRecord[];
  selectedId?: string;
  onOpen: (file: FileRecord) => void;
  onOpenWith?: (file: FileRecord) => void;
  onMove?: (file: FileRecord) => void;
  onSelect: (file: FileRecord) => void;
  onExtract?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  onFavorite: (file: FileRecord) => void;
  isFavorite: (file: FileRecord) => boolean;
};
export function FileIcon({ kind, path, large = false }: Readonly<{ kind: FileKind; path?: string; large?: boolean }>) {
  const [failedPath, setFailedPath] = useState<string>();
  if (kind === "image" && path && failedPath !== path) {
    return (
      <img
        src={convertFileSrc(path)}
        alt=""
        className={large ? "size-11 rounded-lg object-cover" : "size-6 rounded object-cover"}
        loading="lazy"
        onError={() => setFailedPath(path)}
      />
    );
  }
  const Icon = icons[kind];
  return <Icon className="text-muted-foreground" aria-hidden="true" />;
}

export default function FileTable({
  files,
  selectedId,
  onOpen,
  onOpenWith,
  onMove,
  onSelect,
  onExtract,
  onDelete,
  onFavorite,
  isFavorite,
}: Readonly<Props>) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[48%] pl-4">Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last modified</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <ContextMenu key={file.id}>
              <ContextMenuTrigger
                render={
                  <TableRow
                    data-state={selectedId === file.id ? "selected" : undefined}
                    onClick={() => onSelect(file)}
                    onContextMenu={() => onSelect(file)}
                    onDoubleClick={() => onOpen(file)}
                    className="cursor-default"
                  />
                }
              >
                <TableCell className="pl-4">
                  <button
                    type="button"
                    className="flex max-w-full items-center gap-3 font-medium"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(file);
                    }}
                  >
                    <FileIcon kind={file.kind} path={file.path} />
                    <span className="truncate">{file.name}</span>
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.owner}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.modifiedAt}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.kind === "folder" ? "—" : file.size}
                </TableCell>
                <TableCell
                  className="w-12"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${file.name}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onOpen(file)}>
                          {file.kind === "folder" ? "Open folder" : "Open"}
                        </DropdownMenuItem>
                        {file.kind !== "folder" && onOpenWith ? (
                          <DropdownMenuItem onClick={() => onOpenWith(file)}>
                            Open with…
                          </DropdownMenuItem>
                        ) : null}
                        {onExtract &&
                        file.name.toLowerCase().endsWith(".zip") ? (
                          <DropdownMenuItem onClick={() => onExtract(file)}>
                            Extract here
                          </DropdownMenuItem>
                        ) : null}
                        {onMove ? (
                          <DropdownMenuItem onClick={() => onMove(file)}>
                            Move to…
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => onFavorite(file)}>
                          {isFavorite(file)
                            ? "Remove from favorites"
                            : "Add to favorites"}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      {onDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDelete(file)}
                            >
                              Move to Recycle Bin
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </ContextMenuTrigger>
              <FileContextActions
                file={file}
                favorite={isFavorite(file)}
                onOpen={() => onOpen(file)}
                onOpenWith={onOpenWith ? () => onOpenWith(file) : undefined}
                onMove={onMove ? () => onMove(file) : undefined}
                onExtract={onExtract ? () => onExtract(file) : undefined}
                onFavorite={() => onFavorite(file)}
                onDelete={onDelete ? () => onDelete(file) : undefined}
              />
            </ContextMenu>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
