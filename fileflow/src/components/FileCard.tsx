import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileRecord } from "@/types/file";
import { FileContextActions } from "./FileContextActions";
import { FileIcon } from "./FileTable";

type Props = {
  file: FileRecord;
  selected: boolean;
  favorite: boolean;
  onOpen: () => void;
  onOpenWith?: () => void;
  onMove?: () => void;
  onSelect: () => void;
  onFavorite: () => void;
  onExtract?: () => void;
  onDelete?: () => void;
};
export function FileCard({
  file,
  selected,
  favorite,
  onOpen,
  onOpenWith,
  onMove,
  onSelect,
  onFavorite,
  onExtract,
  onDelete,
}: Readonly<Props>) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <Card
            size="sm"
            className={selected ? "ring-2 ring-ring" : undefined}
            onClick={onSelect}
            onContextMenu={onSelect}
            onDoubleClick={onOpen}
          />
        }
      >
        <CardHeader>
          <div className="mb-5 flex size-11 items-center justify-center overflow-hidden rounded-lg bg-muted">
            <FileIcon kind={file.kind} path={file.path} large />
          </div>
          <CardTitle className="truncate">{file.name}</CardTitle>
          <CardDescription>
            {file.kind === "folder" ? "Folder" : file.size}
          </CardDescription>
          <CardAction onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Actions for ${file.name}`}
                  />
                }
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={onOpen}>
                    {file.kind === "folder" ? "Open folder" : "Open"}
                  </DropdownMenuItem>
                  {file.kind !== "folder" && onOpenWith ? (
                    <DropdownMenuItem onClick={onOpenWith}>
                      Open with…
                    </DropdownMenuItem>
                  ) : null}
                  {onExtract && file.name.toLowerCase().endsWith(".zip") ? (
                    <DropdownMenuItem onClick={onExtract}>
                      Extract here
                    </DropdownMenuItem>
                  ) : null}
                  {onMove ? (
                    <DropdownMenuItem onClick={onMove}>
                      Move to…
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={onFavorite}>
                    {favorite ? "Remove from favorites" : "Add to favorites"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {onDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={onDelete}
                      >
                        Move to Recycle Bin
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {favorite
              ? "Favorite"
              : file.kind === "folder"
                ? "Open folder"
                : "Open file"}
          </p>
        </CardContent>
      </ContextMenuTrigger>
      <FileContextActions
        file={file}
        favorite={favorite}
        onOpen={onOpen}
        onOpenWith={onOpenWith}
        onMove={onMove}
        onExtract={onExtract}
        onFavorite={onFavorite}
        onDelete={onDelete}
      />
    </ContextMenu>
  );
}
