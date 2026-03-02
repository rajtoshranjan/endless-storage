// Server response types
export type FileDataFromServer = {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
  modified_at: string;
};

export type SharedFileDataFromServer = {
  shared_by_name: string;
  shared_by_email: string;
  can_download: boolean;
  file: FileDataFromServer;
};

export type FileShareDataFromServer = {
  id: string;
  file: string;
  user: string;
  can_download: boolean;
  file_name: string;
  shared_with_name: string;
  shared_with_email: string;
};

export type FileShareLinkDataFromServer = {
  id: string;
  file: string;
  slug: string;
  expires_at: string;
};

// Client types (camelCase)
export type FileData = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  modifiedAt: string;
};

export type SharedFileData = {
  sharedByName: string;
  sharedByEmail: string;
  canDownload: boolean;
  file: FileData;
};

export type ShareFileResponseData = {
  id: string;
  file: string;
  user: string;
  canDownload: boolean;
  fileName: string;
  sharedWithName: string;
  sharedWithEmail: string;
};

export type ShareWithUserPayload = {
  file: string;
  email: string;
  canDownload: boolean;
};

export type GenerateShareLinkPayload = {
  file: string; // file id
  expiresAt: string;
};

export type ShareLinkResponse = {
  id: string;
  file: string;
  slug: string;
  expiresAt: string;
};

export type UploadFilePayload = {
  file: File;
  onProgress?: (progress: number) => void;
};
