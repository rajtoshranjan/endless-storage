import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../setup';
import { apiDataResponseMapper } from '../utils';
import { ApiResponse } from '../types';
import {
  FolderData,
  FolderDataFromServer,
  CreateFolderPayload,
  RenameFolderPayload,
  MoveFolderPayload,
} from './types';

export const getFoldersRequest = async (
  parentId?: string | null,
): Promise<ApiResponse<FolderData[]>> => {
  const params = parentId ? { parent_id: parentId } : {};
  const response = await api.get<
    FolderDataFromServer[],
    ApiResponse<FolderDataFromServer[]>
  >('/files/folders/', { params });
  return {
    ...response,
    data: response.data.map((f) =>
      apiDataResponseMapper<FolderDataFromServer, FolderData>(f),
    ),
  };
};

export const createFolderRequest = async (
  payload: CreateFolderPayload,
): Promise<ApiResponse<FolderData>> => {
  const response = await api.post<
    FolderDataFromServer,
    ApiResponse<FolderDataFromServer>
  >('/files/folders/', {
    name: payload.name,
    parent_id: payload.parentId ?? null,
  });
  return {
    ...response,
    data: apiDataResponseMapper<FolderDataFromServer, FolderData>(
      response.data,
    ),
  };
};

export const renameFolderRequest = async ({
  id,
  name,
}: { id: string } & RenameFolderPayload): Promise<ApiResponse<FolderData>> => {
  const response = await api.patch<
    FolderDataFromServer,
    ApiResponse<FolderDataFromServer>
  >(`/files/folders/${id}/`, { name });
  return {
    ...response,
    data: apiDataResponseMapper<FolderDataFromServer, FolderData>(
      response.data,
    ),
  };
};

export const deleteFolderRequest = async (
  id: string,
): Promise<ApiResponse<void>> => {
  return api.delete(`/files/folders/${id}/`);
};

export const moveFolderRequest = async ({
  id,
  parentId,
}: { id: string } & MoveFolderPayload): Promise<ApiResponse<FolderData>> => {
  const response = await api.post<
    FolderDataFromServer,
    ApiResponse<FolderDataFromServer>
  >(`/files/folders/${id}/move/`, { parent_id: parentId ?? null });
  return {
    ...response,
    data: apiDataResponseMapper<FolderDataFromServer, FolderData>(
      response.data,
    ),
  };
};

export type FolderPathItem = { id: string; name: string };

export const getFolderPathRequest = async (
  folderId: string,
): Promise<ApiResponse<FolderPathItem[]>> => {
  return api.get(`/files/folders/${folderId}/path/`);
};

// Hooks
export const useGetFolderPath = (folderId: string | null, enabled = true) =>
  useQuery({
    queryKey: ['folder-path', folderId],
    queryFn: () => getFolderPathRequest(folderId!),
    enabled: enabled && !!folderId,
  });

export const useGetFolders = (
  driveId: string,
  parentId: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey: ['folders', driveId, parentId ?? 'root'],
    queryFn: () => getFoldersRequest(parentId),
    enabled,
  });

export const useCreateFolder = () =>
  useMutation({ mutationFn: createFolderRequest });

export const useRenameFolder = () =>
  useMutation({ mutationFn: renameFolderRequest });

export const useDeleteFolder = () =>
  useMutation({ mutationFn: deleteFolderRequest });

export const useMoveFolder = () =>
  useMutation({ mutationFn: moveFolderRequest });
