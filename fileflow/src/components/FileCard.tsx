import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FileRecord } from "@/types/file";
import { FileIcon } from "./FileTable";

export function FileCard({ file, selected, onOpen, onSelect }: Readonly<{ file: FileRecord; selected: boolean; onOpen: () => void; onSelect: () => void }>) {
  return (
    <Card size="sm" className={selected ? "ring-2 ring-ring" : undefined} onClick={onSelect} onDoubleClick={onOpen}>
      <CardHeader>
        <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-muted">
          <FileIcon kind={file.kind} />
        </div>
        <CardTitle className="truncate">
          {file.name}
        </CardTitle>
        <CardDescription>
          {file.kind === "folder" ? `${file.children?.length ?? 0} items` : file.size}
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${file.name}`}><MoreHorizontal /></Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {file.kind === "folder" ? "Open folder" : "Open file"}
        </p>
      </CardContent>
    </Card>
  );
}
