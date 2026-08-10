import { ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import type { FileRecord } from "@/types/file";

type Props = { file: FileRecord; favorite: boolean; onOpen: () => void; onOpenWith?: () => void; onMove?: () => void; onExtract?: () => void; onFavorite: () => void; onDelete?: () => void };
export function FileContextActions({ file, favorite, onOpen, onOpenWith, onMove, onExtract, onFavorite, onDelete }: Readonly<Props>) {
  return <ContextMenuContent><ContextMenuGroup>
    <ContextMenuItem onClick={onOpen}>{file.kind === "folder" ? "Open folder" : "Open"}</ContextMenuItem>
    {file.kind !== "folder" && onOpenWith ? <ContextMenuItem onClick={onOpenWith}>Open with…</ContextMenuItem> : null}
    {onExtract && file.name.toLowerCase().endsWith(".zip") ? <ContextMenuItem onClick={onExtract}>Extract here</ContextMenuItem> : null}
    {onMove ? <ContextMenuItem onClick={onMove}>Move to…</ContextMenuItem> : null}
    <ContextMenuItem onClick={onFavorite}>{favorite ? "Remove from favorites" : "Add to favorites"}</ContextMenuItem>
  </ContextMenuGroup>{onDelete ? <><ContextMenuSeparator /><ContextMenuGroup><ContextMenuItem variant="destructive" onClick={onDelete}>Move to Recycle Bin</ContextMenuItem></ContextMenuGroup></> : null}</ContextMenuContent>;
}
