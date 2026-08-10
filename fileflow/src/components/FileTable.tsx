import { Archive, FileText, Folder, Image, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FileKind, FileRecord } from "@/types/file";

const icons: Record<FileKind, typeof Folder> = { folder: Folder, document: FileText, image: Image, archive: Archive };
type Props = { files: FileRecord[]; selectedId?: string; onOpen: (file: FileRecord) => void; onSelect: (file: FileRecord) => void; onDelete?: (file: FileRecord) => void; onFavorite: (file: FileRecord) => void; isFavorite: (file: FileRecord) => boolean };

export function FileIcon({ kind }: Readonly<{ kind: FileKind }>) { const Icon = icons[kind]; return <Icon className="text-muted-foreground" aria-hidden="true" />; }

export default function FileTable({ files, selectedId, onOpen, onSelect, onDelete, onFavorite, isFavorite }: Readonly<Props>) {
  return <div className="overflow-hidden rounded-xl border bg-card"><Table>
    <TableHeader><TableRow><TableHead className="w-[48%] pl-4">Name</TableHead><TableHead>Owner</TableHead><TableHead>Last modified</TableHead><TableHead>Size</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
    <TableBody>{files.map((file) => <TableRow key={file.id} data-state={selectedId === file.id ? "selected" : undefined} onClick={() => onSelect(file)} onDoubleClick={() => onOpen(file)} className="cursor-default">
      <TableCell className="pl-4"><button className="flex max-w-full items-center gap-3 font-medium" onClick={(event) => { event.stopPropagation(); onOpen(file); }}><FileIcon kind={file.kind} /><span className="truncate">{file.name}</span></button></TableCell>
      <TableCell className="text-muted-foreground">{file.owner}</TableCell><TableCell className="text-muted-foreground">{file.modifiedAt}</TableCell><TableCell className="text-muted-foreground">{file.kind === "folder" ? "—" : file.size}</TableCell>
      <TableCell className="w-12" onClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${file.name}`} />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem onClick={() => onOpen(file)}>Open</DropdownMenuItem><DropdownMenuItem onClick={() => onFavorite(file)}>{isFavorite(file) ? "Remove from favorites" : "Add to favorites"}</DropdownMenuItem></DropdownMenuGroup>{onDelete ? <><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem variant="destructive" onClick={() => onDelete(file)}>Move to Recycle Bin</DropdownMenuItem></DropdownMenuGroup></> : null}</DropdownMenuContent></DropdownMenu></TableCell>
    </TableRow>)}</TableBody>
  </Table></div>;
}
