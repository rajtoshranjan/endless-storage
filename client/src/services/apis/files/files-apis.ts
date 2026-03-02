import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ApiResponse } from '../types';
import api from '../setup';
import { apiDataResponseMapper } from '../utils';
import {
  ConfirmChunkResponse,
  FileData,
  FileDataFromServer,
  InitUploadResponse,
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
  const MAX_PARALLEL = 6;

  // Step 1: Init upload — server computes chunk allocation and returns upload URLs
  const initResponse = await api.post<
    InitUploadResponse,
    ApiResponse<InitUploadResponse>
  >('/files/init-upload/', {
    file_name: payload.file.name,
    file_size: payload.file.size,
    mime_type: payload.file.type || 'application/octet-stream',
  });

  const { file_id: fileId, chunks } = initResponse.data;
  const totalChunks = chunks.length;

  // Pre-compute byte offsets for each chunk
  const chunkOffsets: number[] = [];
  let runningOffset = 0;
  for (const chunk of chunks) {
    chunkOffsets.push(runningOffset);
    runningOffset += chunk.chunk_size;
  }

  // Track per-chunk progress for overall calculation
  const chunkProgressMap: Record<number, number> = {};
  let completedChunks = 0;

  const uploadChunk = async (index: number) => {
    const chunk = chunks[index];
    const offset = chunkOffsets[index];
    const blob = payload.file.slice(offset, offset + chunk.chunk_size);

    // Upload chunk directly to cloud storage
    const uploadResponse = await axios.put(chunk.upload_url, blob, {
      headers: {
        'Content-Type': payload.file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (payload.onProgress && progressEvent.total) {
          chunkProgressMap[index] = progressEvent.loaded / progressEvent.total;

          // Aggregate progress across all chunks (weighted by chunk size)
          const totalSize = payload.file.size;
          let weightedProgress = 0;
          for (let j = 0; j < totalChunks; j++) {
            const fraction = chunks[j].chunk_size / totalSize;
            weightedProgress += (chunkProgressMap[j] ?? 0) * fraction;
          }
          payload.onProgress(Math.min(Math.round(weightedProgress * 100), 99));
        }
      },
    });

    const externalChunkId = uploadResponse.data.id;

    // Confirm chunk with server
    await api.post<ConfirmChunkResponse, ApiResponse<ConfirmChunkResponse>>(
      `/files/${fileId}/confirm-chunk/`,
      {
        chunk_index: chunk.chunk_index,
        external_chunk_id: externalChunkId,
      },
    );

    completedChunks++;
    if (payload.onChunkProgress) {
      payload.onChunkProgress(completedChunks, totalChunks);
    }
  };

  // Step 2: Upload chunks with up to MAX_PARALLEL concurrent uploads
  const active = new Set<Promise<void>>();

  for (let i = 0; i < chunks.length; i++) {
    const p: Promise<void> = uploadChunk(i).finally(() => active.delete(p));
    active.add(p);

    // When we hit the concurrency limit, wait for one to finish
    if (active.size >= MAX_PARALLEL) {
      await Promise.race(active);
    }
  }

  // Wait for remaining uploads
  await Promise.all(active);

  // Final progress
  if (payload.onProgress) {
    payload.onProgress(100);
  }

  // Fetch final file data
  const fileResponse = await api.get<
    FileDataFromServer,
    ApiResponse<FileDataFromServer>
  >(`/files/${fileId}/`);

  return {
    ...initResponse,
    data: apiDataResponseMapper<FileDataFromServer, FileData>(
      fileResponse.data,
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
