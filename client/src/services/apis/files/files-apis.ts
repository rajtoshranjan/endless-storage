import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../types';
import api from '../setup';
import { apiDataResponseMapper } from '../utils';
import {
  FileData,
  FileDataFromServer,
  SharedFileData,
  SharedFileDataFromServer,
} from './types';

// API Functions.
export const getFilesRequest = async (
  folderId?: string | null,
): Promise<ApiResponse<FileData[]>> => {
  const params = folderId ? { folder_id: folderId } : {};
  const response = await api.get<
    FileDataFromServer[],
    ApiResponse<FileDataFromServer[]>
  >('/files/', { params });

  return {
    ...response,
    data: response.data.map((file) =>
      apiDataResponseMapper<FileDataFromServer, FileData>(file),
    ),
  };
};

export const getSharedFilesRequest = async (): Promise<
  ApiResponse<SharedFileData[]>
> => {
  const response = await api.get<
    SharedFileDataFromServer[],
    ApiResponse<SharedFileDataFromServer[]>
  >('/files/shared/');

  return {
    ...response,
    data: response.data.map((file) =>
      apiDataResponseMapper<SharedFileDataFromServer, SharedFileData>(file),
    ),
  };
};

export const deleteFileRequest = async (
  fileId: string,
): Promise<ApiResponse<void>> => {
  return api.delete(`/files/${fileId}/`);
};

export const moveFileRequest = async ({
  fileId,
  folderId,
}: {
  fileId: string;
  folderId: string | null;
}): Promise<ApiResponse<FileData>> => {
  const response = await api.post<
    FileDataFromServer,
    ApiResponse<FileDataFromServer>
  >(`/files/${fileId}/move/`, { folder_id: folderId });
  return {
    ...response,
    data: apiDataResponseMapper<FileDataFromServer, FileData>(response.data),
  };
};

// Hooks.
export const useGetFiles = (
  driveId: string,
  folderId: string | null,
  enabled: boolean = true,
) =>
  useQuery({
    queryKey: ['files', driveId, folderId ?? 'root'],
    queryFn: () => getFilesRequest(folderId),
    enabled,
  });

export const useGetSharedFiles = (enabled: boolean = true) =>
  useQuery({
    queryKey: ['shared-files'],
    queryFn: getSharedFilesRequest,
    enabled,
  });

export const useDeleteFile = () =>
  useMutation({
    mutationFn: deleteFileRequest,
  });

export const useMoveFile = () =>
  useMutation({
    mutationFn: moveFileRequest,
  });
