import {
  Folder as FolderIcon,
  MoreVertical,
  Pencil,
  Trash2,
  MoveRight,
} from 'lucide-react';
import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui';
import { formatDate, StringFormatter } from '../../lib/utils';
import { FolderData } from '../../services/apis';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';

type FolderCardProps = {
  folder: FolderData;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
};

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onClick,
  onRename,
  onDelete,
  onMove,
}) => {
  const { canManageFiles } = useAppSelector(selectActiveDrive);

  return (
    <button
      type="button"
      className="group relative w-full cursor-pointer rounded-lg border bg-card p-3 text-left transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="mb-2 flex size-8 items-center justify-center rounded-md border bg-yellow-50 dark:bg-yellow-900/20">
        <FolderIcon className="size-4 text-yellow-600 dark:text-yellow-400" />
      </div>

      <div className="space-y-0.5">
        <h3 className="text-sm font-medium" title={folder.name}>
          {StringFormatter.truncate(folder.name, 20)}
        </h3>
        <div className="text-[11px] text-muted-foreground">
          {formatDate(folder.createdAt)}
        </div>
      </div>

      {canManageFiles && (
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 p-0 opacity-100 group-hover:opacity-100 sm:opacity-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRename && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename();
                  }}
                  className="gap-2"
                >
                  <Pencil className="size-4" />
                  Rename
                </DropdownMenuItem>
              )}
              {onMove && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove();
                  }}
                  className="gap-2"
                >
                  <MoveRight className="size-4" />
                  Move
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </button>
  );
};
