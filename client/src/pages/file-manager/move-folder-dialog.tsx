import { Check, Folder as FolderIcon } from 'lucide-react';
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui';
import {
  FolderData,
  handleResponseErrorMessage,
  useGetFolders,
  useMoveFolder,
} from '../../services/apis';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';
import { toast } from '../../hooks';
import { cn } from '../../lib/utils';

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
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const { data: foldersResponse } = useGetFolders(
    activeDriveId ?? '',
    null,
    open,
  );
  const { mutate: moveFolder, isPending } = useMoveFolder();

  const availableFolders = (foldersResponse?.data ?? []).filter(
    (f) => f.id !== folder?.id,
  );

  const handleMove = () => {
    if (!folder) return;
    moveFolder(
      { id: folder.id, parentId: selectedParentId },
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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move &quot;{folder?.name}&quot;</DialogTitle>
        </DialogHeader>
        <div className="max-h-60 space-y-1 overflow-y-auto py-2">
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
              selectedParentId === null && 'bg-accent',
            )}
            onClick={() => setSelectedParentId(null)}
          >
            {selectedParentId === null && <Check className="size-4 shrink-0" />}
            <span className={selectedParentId !== null ? 'pl-6' : ''}>
              Root (My Drive)
            </span>
          </button>
          {availableFolders.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                selectedParentId === f.id && 'bg-accent',
              )}
              onClick={() => setSelectedParentId(f.id)}
            >
              {selectedParentId === f.id ? (
                <Check className="size-4 shrink-0" />
              ) : (
                <FolderIcon className="size-4 shrink-0 text-yellow-500" />
              )}
              {f.name}
            </button>
          ))}
        </div>
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
