import React from 'react';
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
  handleResponseErrorMessage,
  useCreateFolder,
} from '../../services/apis';
import { toast } from '../../hooks';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  onSuccess: () => void;
};

type FormValues = { name: string };

export const CreateFolderDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  parentId,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>();
  const { mutate: createFolder, isPending } = useCreateFolder();

  const onSubmit = (values: FormValues) => {
    createFolder(
      { name: values.name, parentId },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
          onSuccess();
          toast({ title: 'Folder created successfully' });
        },
        onError: (error) => handleResponseErrorMessage(error, setError),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!isPending) {
          reset();
          onOpenChange(o);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              placeholder="My Folder"
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
