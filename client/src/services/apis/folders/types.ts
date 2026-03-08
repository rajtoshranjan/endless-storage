export type FolderDataFromServer = {
  id: string;
  name: string;
  created_at: string;
  modified_at: string;
};

export type FolderData = {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
};

export type CreateFolderPayload = {
  name: string;
  parentId?: string | null;
};

export type RenameFolderPayload = {
  name: string;
};

export type MoveFolderPayload = {
  parentId?: string | null;
};
