import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FileRecord } from "@/types/file";
import { FileIcon } from "./FileTable";

type Props = { file: FileRecord; selected: boolean; favorite: boolean; onOpen: () => void; onSelect: () => void; onFavorite: () => void; onDelete?: () => void };
export function FileCard({ file, selected, favorite, onOpen, onSelect, onFavorite, onDelete }: Readonly<Props>) {
  return <Card size="sm" className={selected ? "ring-2 ring-ring" : undefined} onClick={onSelect} onDoubleClick={onOpen}><CardHeader><div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-muted"><FileIcon kind={file.kind} /></div><CardTitle className="truncate">{file.name}</CardTitle><CardDescription>{file.kind === "folder" ? "Folder" : file.size}</CardDescription><CardAction onClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label={`Actions for ${file.name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem><DropdownMenuItem onClick={onFavorite}>{favorite ? "Remove from favorites" : "Add to favorites"}</DropdownMenuItem></DropdownMenuGroup>{onDelete ? <><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem variant="destructive" onClick={onDelete}>Move to Recycle Bin</DropdownMenuItem></DropdownMenuGroup></> : null}</DropdownMenuContent></DropdownMenu></CardAction></CardHeader><CardContent><p className="text-xs text-muted-foreground">{favorite ? "Favorite" : file.kind === "folder" ? "Open folder" : "Open file"}</p></CardContent></Card>;
}
