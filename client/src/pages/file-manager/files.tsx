import { FileX } from 'lucide-react';
import { useState } from 'react';
import { isNil } from 'lodash';
import {
  ScrollArea,
  Spinner,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui';
import { toast } from '../../hooks/use-toast';
import {
  FileData,
  handleResponseErrorMessage,
  useDeleteFile,
  useDownloadFile,
  useGetFiles,
  useGetSharedFiles,
} from '../../services/apis';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';
import { PageHeader } from '../../components/layout';
import { FileCard } from './file-card';
import { FilePermissionsDialog } from './file-permissions-dialog';
import { FileShareDialog } from './file-share-dialog';
import { FileUpload } from './file-upload';

type FileManagementPageProps = {
  fileType?: 'drive' | 'shared';
};

export function FileManagementPage({
  fileType = 'drive',
}: FileManagementPageProps) {
  const { activeDriveId, canManageFiles } = useAppSelector(selectActiveDrive);

  // States.
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<FileData | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);

  // Queries.
  const {
    data: filesResponse,
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useGetFiles(
    activeDriveId ?? '',
    fileType === 'drive' && !isNil(activeDriveId),
  );

  const { data: sharedFilesResponse, isLoading: isLoadingSharedFiles } =
    useGetSharedFiles(fileType === 'shared');

  const { mutate: deleteFile } = useDeleteFile();
  const { mutate: downloadFile } = useDownloadFile();

  // Constants
  const sharedFiles =
    sharedFilesResponse?.data.map(({ file, canDownload }) => ({
      ...file,
      canDownload,
    })) || [];

  // Handlers.
  const handleShare = (file: FileData) => {
    setActiveFile(file);
    setIsShareModalOpen(true);
  };

  const handleDownload = (file: FileData) => {
    downloadFile(file.id, {
      onError: (error) => {
        handleResponseErrorMessage(error);
      },
    });
  };

  const handleDelete = (file: FileData) => {
    deleteFile(file.id, {
      onSuccess: () => {
        refetchFiles();
        setFileToDelete(null);
        toast({
          title: 'File deleted successfully',
          description: file.name,
        });
      },
      onError: (error) => {
        handleResponseErrorMessage(error);
      },
    });
  };

  const handleManagePermissions = (file: FileData) => {
    setActiveFile(file);
    setIsPermissionsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={fileType === 'drive' ? 'My Files' : 'Shared with Me'}
        description={
          fileType === 'drive'
            ? "View and manage your drive's files and documents"
            : 'Access files that others have shared with you'
        }
      />

      <ScrollArea className="h-[calc(100dvh-14rem)] w-full  md:h-[calc(100dvh-16rem)]">
        <div className="w-full py-4">
          {/* Drive Files */}
          {fileType === 'drive' && (
            <>
              {isLoadingFiles ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : filesResponse?.data.length === 0 ? (
                <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-8 p-8 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileX className="size-5" />
                    <span>No files found</span>
                  </div>
                  {canManageFiles && (
                    <FileUpload
                      onFileUploadSuccess={refetchFiles}
                      className="w-full max-w-sm"
                    />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {canManageFiles && (
                    <FileUpload onFileUploadSuccess={refetchFiles} />
                  )}
                  {filesResponse?.data.map((file) => {
                    return (
                      <FileCard
                        key={file.id}
                        file={file}
                        onShare={() => handleShare(file)}
                        onDelete={() => setFileToDelete(file)}
                        onDownload={() => handleDownload(file)}
                        onManagePermissions={() =>
                          handleManagePermissions(file)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Shared Files */}
          {fileType === 'shared' && (
            <>
              {isLoadingSharedFiles ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : sharedFiles.length === 0 ? (
                <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-8 p-8 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileX className="size-5" />
                    <span>No shared files found</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {sharedFiles.map((file) => {
                    return (
                      <FileCard
                        key={file.id}
                        file={file}
                        onDownload={() => handleDownload(file)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <FileShareDialog
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        file={activeFile}
      />
      <FilePermissionsDialog
        open={isPermissionsModalOpen}
        onOpenChange={setIsPermissionsModalOpen}
        file={activeFile}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={() => setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold">{fileToDelete?.name}</span>? Once
              deleted, you won&apos;t be able to recover this file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && handleDelete(fileToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
