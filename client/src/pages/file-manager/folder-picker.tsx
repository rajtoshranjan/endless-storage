import { ChevronRight, Folder as FolderIcon, Loader2 } from 'lucide-react';
import React from 'react';
import { FolderData, useGetFolders } from '../../services/apis';
import { FolderBreadcrumb } from './folder-breadcrumb';

export type PickerPathItem = { id: string; name: string };

type Props = {
  driveId: string;
  /** Folder ID to hide from the list (e.g. the folder being moved) */
  excludeFolderId?: string | null;
  /** The folder currently being browsed (null = root) */
  currentFolderId: string | null;
  /** Breadcrumb trail from root to currentFolder */
  path: PickerPathItem[];
  /** Called when the user navigates to a new location */
  onNavigate: (folderId: string | null, path: PickerPathItem[]) => void;
};

export const FolderPicker: React.FC<Props> = ({
  driveId,
  excludeFolderId,
  currentFolderId,
  path,
  onNavigate,
}) => {
  const { data: foldersResponse, isLoading } = useGetFolders(
    driveId,
    currentFolderId,
    true,
  );

  const folders = (foldersResponse?.data ?? []).filter(
    (f) => f.id !== excludeFolderId,
  );

  const navigateInto = (folder: FolderData) => {
    onNavigate(folder.id, [...path, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumb = (index: number) => {
    if (index === -1) {
      onNavigate(null, []);
    } else {
      const newPath = path.slice(0, index + 1);
      onNavigate(newPath[newPath.length - 1].id, newPath);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border px-2 py-1.5">
        <FolderBreadcrumb path={path} onNavigate={handleBreadcrumb} />
      </div>
      <div className="h-52 overflow-y-auto rounded-md border">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : folders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No subfolders here
          </div>
        ) : (
          <div className="p-1">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                onClick={() => navigateInto(folder)}
              >
                <FolderIcon className="size-4 shrink-0 text-yellow-500" />
                <span className="flex-1 truncate text-left">{folder.name}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
