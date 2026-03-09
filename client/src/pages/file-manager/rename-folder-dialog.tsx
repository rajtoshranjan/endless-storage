import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '../../components/ui';
import {
  FolderData,
  handleResponseErrorMessage,
  useRenameFolder,
} from '../../services/apis';
import { toast } from '../../hooks';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderData | null;
  onSuccess: () => void;
};

type FormValues = { name: string };

export const RenameFolderDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  folder,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>();
  const { mutate: renameFolder, isPending } = useRenameFolder();

  useEffect(() => {
    if (folder) reset({ name: folder.name });
  }, [folder, reset]);

  const onSubmit = (values: FormValues) => {
    if (!folder) return;
    renameFolder(
      { id: folder.id, name: values.name },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
          toast({ title: 'Folder renamed successfully' });
        },
        onError: (error) => handleResponseErrorMessage(error, setError),
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
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rename-folder">Folder name</Label>
            <Input
              id="rename-folder"
              {...register('name', { required: 'Folder name is required' })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
