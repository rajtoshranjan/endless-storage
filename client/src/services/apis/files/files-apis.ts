import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ApiResponse } from '../types';
import api from '../setup';
import { apiDataResponseMapper } from '../utils';
import {
  FileData,
  FileDataFromServer,
  SharedFileData,
  SharedFileDataFromServer,
  UploadFilePayload,
} from './types';

// API Functions
export const getFilesRequest = async (): Promise<ApiResponse<FileData[]>> => {
  const response = await api.get<
    FileDataFromServer[],
    ApiResponse<FileDataFromServer[]>
  >('/files/');

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

export const uploadFileRequest = async (
  payload: UploadFilePayload,
): Promise<ApiResponse<FileData>> => {
  // Step 1: Init upload — server creates pending File, returns upload URL
  const initResponse = await api.post<
    { upload_url: string; file_id: string },
    ApiResponse<{ upload_url: string; file_id: string }>
  >('/files/init-upload/', {
    file_name: payload.file.name,
    file_size: payload.file.size,
    mime_type: payload.file.type || 'application/octet-stream',
  });

  const { upload_url: uploadUrl, file_id: fileId } = initResponse.data;

  // Step 2: Upload file directly to Google Drive
  const uploadResponse = await axios.put(uploadUrl, payload.file, {
    headers: {
      'Content-Type': payload.file.type || 'application/octet-stream',
    },
    onUploadProgress: (progressEvent) => {
      if (payload.onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        payload.onProgress(percentCompleted);
      }
    },
  });

  const externalFileId = uploadResponse.data.id;

  // Step 3: Confirm upload — server updates the File record
  const confirmResponse = await api.post<
    FileDataFromServer,
    ApiResponse<FileDataFromServer>
  >('/files/confirm-upload/', {
    file_id: fileId,
    external_file_id: externalFileId,
  });

  return {
    ...confirmResponse,
    data: apiDataResponseMapper<FileDataFromServer, FileData>(
      confirmResponse.data,
    ),
  };
};

export const deleteFileRequest = async (
  fileId: string,
): Promise<ApiResponse<void>> => {
  return api.delete(`/files/${fileId}/`);
};

export const downloadFileRequest = async (fileId: string): Promise<void> => {
  // 1. Get short-lived download token
  const response = await api.get<
    { token: string },
    ApiResponse<{ token: string }>
  >(`/files/${fileId}/generate_download_token/`);

  // 2. Trigger native browser download using tokenized URL
  const token = response.data.token;

  // Format the download URL cleanly against the configured API base URL
  const baseUrl = api.defaults.baseURL?.replace(/\/+$/, '') || '';
  const downloadUrl = `${baseUrl}/files/${fileId}/download/?token=${token}`;

  // Use a temporary anchor to trigger the native browser download prompt
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = ''; // Browser will infer from Content-Disposition header
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Hooks
export const useGetFiles = (driveId: string, enabled: boolean = true) =>
  useQuery({
    queryKey: ['files', driveId],
    queryFn: getFilesRequest,
    enabled,
  });

export const useGetSharedFiles = (enabled: boolean = true) =>
  useQuery({
    queryKey: ['shared-files'],
    queryFn: getSharedFilesRequest,
    enabled,
  });

export const useUploadFile = () =>
  useMutation({
    mutationFn: uploadFileRequest,
  });

export const useDeleteFile = () =>
  useMutation({
    mutationFn: deleteFileRequest,
  });

export const useDownloadFile = () =>
  useMutation({
    mutationFn: downloadFileRequest,
  });
