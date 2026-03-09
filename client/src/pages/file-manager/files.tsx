import { FileX, FolderPlus } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isNil } from 'lodash';
import {
  ScrollArea,
  Spinner,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '../../components/ui';
import { toast } from '../../hooks';
import {
  FileData,
  FolderData,
  handleResponseErrorMessage,
  useDeleteFile,
  useDeleteFolder,
  useDownloadFile,
  useGetFiles,
  useGetFolderPath,
  useGetFolders,
  useGetSharedFiles,
} from '../../services/apis';
import { useAppSelector } from '../../store/hooks';
import { selectActiveDrive } from '../../store/slices';
import { PageHeader } from '../../components/layout';
import { FileCard } from './file-card';
import { FilePermissionsDialog } from './file-permissions-dialog';
import { FileShareDialog } from './file-share-dialog';
import { FileUpload } from './file-upload';
import { FolderBreadcrumb } from './folder-breadcrumb';
import { FolderCard } from './folder-card';
import { CreateFolderDialog } from './create-folder-dialog';
import { RenameFolderDialog } from './rename-folder-dialog';
import { MoveFolderDialog } from './move-folder-dialog';
import { MoveFileDialog } from './move-file-dialog';

type FileManagementPageProps = {
  fileType?: 'drive' | 'shared';
};

export function FileManagementPage({
  fileType = 'drive',
}: FileManagementPageProps) {
  const { activeDriveId, canManageFiles } = useAppSelector(selectActiveDrive);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is source of truth for current folder.
  const currentFolderId = searchParams.get('folder');

  // File states.
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<FileData | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);
  const [fileToMove, setFileToMove] = useState<FileData | null>(null);

  // Folder states.
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<FolderData | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderData | null>(null);
  const [folderToMove, setFolderToMove] = useState<FolderData | null>(null);

  // Queries.
  const {
    data: filesResponse,
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useGetFiles(
    activeDriveId ?? '',
    currentFolderId,
    fileType === 'drive' && !isNil(activeDriveId),
  );

  const { data: foldersResponse, refetch: refetchFolders } = useGetFolders(
    activeDriveId ?? '',
    currentFolderId,
    fileType === 'drive' && !isNil(activeDriveId),
  );

  // Fetch ancestor chain for breadcrumb — only needed when inside a folder.
  const { data: folderPathData } = useGetFolderPath(
    currentFolderId,
    fileType === 'drive' && !isNil(currentFolderId),
  );

  const { data: sharedFilesResponse, isLoading: isLoadingSharedFiles } =
    useGetSharedFiles(fileType === 'shared');

  const { mutate: deleteFile, isPending: isDeleting } = useDeleteFile();
  const { mutate: deleteFolder, isPending: isDeletingFolder } =
    useDeleteFolder();
  const { mutate: downloadFile } = useDownloadFile();

  // Derived data.
  const sharedFiles =
    sharedFilesResponse?.data.map(({ file, canDownload }) => ({
      ...file,
      canDownload,
    })) || [];

  const folders = foldersResponse?.data ?? [];
  const files = filesResponse?.data ?? [];
  const folderPath = folderPathData?.data ?? [];
  const isDriveEmpty = folders.length === 0 && files.length === 0;

  // File handlers.
  const handleShare = (file: FileData) => {
    setActiveFile(file);
    setIsShareModalOpen(true);
  };

  const handleDownload = (file: FileData) => {
    downloadFile(file.id, {
      onError: (error) => handleResponseErrorMessage(error),
    });
  };

  const handleDelete = (file: FileData) => {
    deleteFile(file.id, {
      onSuccess: () => {
        refetchFiles();
        setFileToDelete(null);
        toast({ title: 'File deleted successfully', description: file.name });
      },
      onError: (error) => handleResponseErrorMessage(error),
    });
  };

  const handleManagePermissions = (file: FileData) => {
    setActiveFile(file);
    setIsPermissionsModalOpen(true);
  };

  const handleMoveFile = () => {
    refetchFiles();
    setFileToMove(null);
  };

  // Folder navigation handlers — update the URL.
  const handleEnterFolder = (folder: FolderData) => {
    setSearchParams({ folder: folder.id });
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index === -1) {
      setSearchParams({});
    } else {
      setSearchParams({ folder: folderPath[index].id });
    }
  };

  const handleDeleteFolder = (folder: FolderData) => {
    deleteFolder(folder.id, {
      onSuccess: () => {
        refetchFolders();
        setFolderToDelete(null);
        toast({ title: 'Folder deleted', description: folder.name });
      },
      onError: (error) => {
        handleResponseErrorMessage(error);
        setFolderToDelete(null);
      },
    });
  };

  const handleFolderSuccess = () => {
    refetchFolders();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={fileType === 'drive' ? 'My Files' : 'Shared with Me'}
        description={
          fileType === 'shared'
            ? 'Access files that others have shared with you'
            : undefined
        }
      />

      <ScrollArea className="h-[calc(100dvh-14rem)] w-full  md:h-[calc(100dvh-16rem)]">
        <div className="w-full">
          {/* Drive Files */}
          {fileType === 'drive' && (
            <>
              {/* Toolbar: breadcrumb + new folder button — always visible */}
              <div className="mb-3 flex items-center justify-between">
                <FolderBreadcrumb
                  path={folderPath}
                  onNavigate={handleBreadcrumbNavigate}
                />
                {canManageFiles && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateFolderOpen(true)}
                    className="ml-auto gap-2"
                  >
                    <FolderPlus className="size-4" />
                    New Folder
                  </Button>
                )}
              </div>

              {isLoadingFiles ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : isDriveEmpty ? (
                <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-8 p-8 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileX className="size-5" />
                    <span>No files found</span>
                  </div>
                  {canManageFiles && (
                    <FileUpload
                      onFileUploadSuccess={refetchFiles}
                      folderId={currentFolderId}
                      className="w-full max-w-sm"
                    />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {canManageFiles && (
                    <FileUpload
                      onFileUploadSuccess={refetchFiles}
                      folderId={currentFolderId}
                    />
                  )}
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onClick={() => handleEnterFolder(folder)}
                      onRename={() => setFolderToRename(folder)}
                      onDelete={() => setFolderToDelete(folder)}
                      onMove={() => setFolderToMove(folder)}
                    />
                  ))}
                  {files.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onShare={() => handleShare(file)}
                      onDelete={() => setFileToDelete(file)}
                      onDownload={() => handleDownload(file)}
                      onManagePermissions={() => handleManagePermissions(file)}
                      onMove={() => setFileToMove(file)}
                    />
                  ))}
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
                  {sharedFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onDownload={() => handleDownload(file)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* File Dialogs */}
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

      {/* File Delete Confirmation Dialog */}
      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => {
          if (!isDeleting && !open) setFileToDelete(null);
        }}
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
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (fileToDelete) handleDelete(fileToDelete);
              }}
              className="min-w-[80px]"
              loading={isDeleting}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Delete Confirmation Dialog */}
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => {
          if (!isDeletingFolder && !open) setFolderToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the folder{' '}
              <span className="font-semibold">{folderToDelete?.name}</span>?
              This action cannot be undone. The folder must be empty to be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFolder}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeletingFolder}
              onClick={(e) => {
                e.preventDefault();
                if (folderToDelete) handleDeleteFolder(folderToDelete);
              }}
              className="min-w-[80px]"
              loading={isDeletingFolder}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move File Dialog */}
      <MoveFileDialog
        open={!!fileToMove}
        onOpenChange={(open) => {
          if (!open) setFileToMove(null);
        }}
        file={fileToMove}
        onSuccess={handleMoveFile}
      />

      {/* Folder Dialogs */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        parentId={currentFolderId}
        onSuccess={handleFolderSuccess}
      />
      <RenameFolderDialog
        open={!!folderToRename}
        onOpenChange={(open) => {
          if (!open) setFolderToRename(null);
        }}
        folder={folderToRename}
        onSuccess={handleFolderSuccess}
      />
      <MoveFolderDialog
        open={!!folderToMove}
        onOpenChange={(open) => {
          if (!open) setFolderToMove(null);
        }}
        folder={folderToMove}
        onSuccess={handleFolderSuccess}
      />
    </div>
  );
}
