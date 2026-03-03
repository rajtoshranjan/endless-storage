import { Plus } from 'lucide-react';
import React from 'react';
import { handleResponseErrorMessage, useUploadFile } from '../../services/apis';
import { toast } from '../../hooks';
import { cn } from '../../lib/utils';
import { useAppDispatch } from '../../store/hooks';
import {
  addTransferJob,
  setTransferStatus,
  updateTransferChunkProgress,
  updateTransferProgress,
} from '../../store/slices';

export type FileUploadProps = {
  onFileUploadSuccess: () => void;
  className?: string;
};

export const FileUpload = ({
  onFileUploadSuccess,
  className,
}: FileUploadProps) => {
  const dispatch = useAppDispatch();
  const { mutateAsync: uploadFileAsync } = useUploadFile();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);

    files.forEach(async (file, index) => {
      // Create a more unique ID to avoid collisions on quick multi-selects
      const jobId = `${file.name}-${Date.now()}-${index}`;

      // Add job to Redux (totalChunks starts at 1, updated via onChunkProgress)
      dispatch(
        addTransferJob({
          id: jobId,
          fileName: file.name,
          totalChunks: 1,
          type: 'upload',
        }),
      );

      try {
        await uploadFileAsync({
          file,
          onProgress: (progress) => {
            dispatch(updateTransferProgress({ id: jobId, progress }));
          },
          onChunkProgress: (completedChunks, totalChunks) => {
            dispatch(
              updateTransferChunkProgress({
                id: jobId,
                completedChunks,
                totalChunks,
              }),
            );
          },
        });

        dispatch(setTransferStatus({ id: jobId, status: 'success' }));
        onFileUploadSuccess();
      } catch (error: any) {
        dispatch(setTransferStatus({ id: jobId, status: 'error' }));
        if (error.meta?.status_code === 409) {
          toast({
            title: 'File already exists',
            description: `A file with the name ${file.name} already exists`,
            variant: 'destructive',
          });
        } else {
          handleResponseErrorMessage(error);
        }
      }
    });

    e.target.value = '';
  };

  return (
    <div className={cn('relative', className)}>
      <div className="group rounded-lg border-2 border-dashed border-muted-foreground/25 bg-card p-3 transition-all hover:border-primary/50 hover:bg-accent hover:shadow-lg">
        <label
          htmlFor="file-upload"
          className="flex cursor-pointer flex-col items-center justify-center"
        >
          <div className="mb-2 flex size-8 items-center justify-center rounded-full border-2 border-muted-foreground/25 bg-background/50 group-hover:border-primary/50">
            <Plus className="size-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="space-y-0.5 text-center">
            <h3 className="text-sm font-medium group-hover:text-primary">
              New File
            </h3>
            <p className="text-[11px] text-muted-foreground group-hover:text-primary/80">
              Click to browse files
            </p>
          </div>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};
