import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui';
import {
  FolderData,
  handleResponseErrorMessage,
  useMoveFolder,
} from '../../services/apis';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';
import { toast } from '../../hooks';
import { FolderPicker, PickerPathItem } from './folder-picker';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderData | null;
  onSuccess: () => void;
};

export const MoveFolderDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  folder,
  onSuccess,
}) => {
  const { activeDriveId } = useAppSelector(selectActiveDrive);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<PickerPathItem[]>([]);
  const { mutate: moveFolder, isPending } = useMoveFolder();

  // Reset navigation when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentFolderId(null);
      setPath([]);
    }
  }, [open]);

  const handleNavigate = (
    folderId: string | null,
    newPath: PickerPathItem[],
  ) => {
    setCurrentFolderId(folderId);
    setPath(newPath);
  };

  const handleMove = () => {
    if (!folder) return;
    moveFolder(
      { id: folder.id, parentId: currentFolderId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
          toast({ title: 'Folder moved successfully' });
        },
        onError: (error) => handleResponseErrorMessage(error),
      },
    );
  };

  const destinationLabel =
    path.length > 0 ? path[path.length - 1].name : 'My Drive';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move &quot;{folder?.name}&quot;</DialogTitle>
          <DialogDescription>
            Browse to a destination folder, then click Move Here.
          </DialogDescription>
        </DialogHeader>

        <FolderPicker
          driveId={activeDriveId ?? ''}
          excludeFolderId={folder?.id}
          currentFolderId={currentFolderId}
          path={path}
          onNavigate={handleNavigate}
        />

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          <p className="flex-1 truncate text-xs text-muted-foreground">
            Moving to:{' '}
            <span className="font-medium text-foreground">
              {destinationLabel}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMove} loading={isPending}>
              Move Here
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
