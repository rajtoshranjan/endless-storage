import {
  Ban,
  Download,
  File as FileIcon,
  Info,
  MoreVertical,
  Share2,
  Trash2,
} from 'lucide-react';
import React from 'react';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui';
import { formatBytes, formatDate, StringFormatter } from '../../lib/utils';
import { FileData } from '../../services/apis';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';

type FileListData = FileData & {
  canDownload?: boolean;
  canShare?: boolean;
  canDelete?: boolean;
};

type FileCardProps = {
  file: FileListData;
  onShare?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  onManagePermissions?: () => void;
};

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'warning' | 'destructive' }
> = {
  pending: { label: 'Incomplete', variant: 'warning' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onShare,
  onDelete,
  onDownload,
  onManagePermissions,
}) => {
  // Selectors.
  const { canManageFiles } = useAppSelector(selectActiveDrive);

  // Conditions.
  const isComplete = file.status === 'uploaded';
  const canDownloadFile =
    isComplete && onDownload && file.canDownload !== false;
  const canShareFile =
    isComplete && canManageFiles && onShare && file.canShare !== false;
  const canDeleteFile = canManageFiles && onDelete && file.canDelete !== false;
  const canManagePermissions =
    isComplete &&
    canManageFiles &&
    onManagePermissions &&
    file.canShare !== false;

  const hasNoActions =
    !canDownloadFile &&
    !canShareFile &&
    !canDeleteFile &&
    !canManagePermissions;

  const statusBadge = STATUS_BADGE[file.status];

  return (
    <div
      key={file.id}
      className="group relative rounded-lg border bg-card p-3 transition-all hover:shadow-md"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md border bg-background/50">
          <FileIcon className="size-4 text-muted-foreground" />
        </div>
        {statusBadge && (
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        )}
      </div>

      <div className="space-y-0.5">
        <h3 className="text-sm font-medium" title={file.name}>
          {StringFormatter.truncate(file.name, 20)}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatBytes(file.size)}</span>
          <span>•</span>
          <span>{formatDate(file.createdAt)}</span>
        </div>
      </div>

      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 p-0 opacity-100 group-hover:opacity-100 sm:opacity-0"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasNoActions && (
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Ban className="size-4" />
                No actions allowed
              </div>
            )}
            {canDownloadFile && (
              <DropdownMenuItem onClick={onDownload} className="gap-2">
                <Download className="size-4" />
                Download
              </DropdownMenuItem>
            )}
            {canShareFile && (
              <DropdownMenuItem onClick={onShare} className="gap-2">
                <Share2 className="size-4" />
                Share
              </DropdownMenuItem>
            )}
            {canManagePermissions && (
              <DropdownMenuItem onClick={onManagePermissions} className="gap-2">
                <Info className="size-4" />
                Manage Access
              </DropdownMenuItem>
            )}
            {canDeleteFile && (
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
