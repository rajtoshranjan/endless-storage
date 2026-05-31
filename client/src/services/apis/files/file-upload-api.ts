import axios, { isCancel } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { ApiResponse } from '../types';
import api from '../setup';
import { apiDataResponseMapper } from '../utils';
import {
  ConfirmChunkResponse,
  FileData,
  FileDataFromServer,
  InitUploadResponse,
  UploadFilePayload,
} from './types';

const MAX_PARALLEL_UPLOADS = 6;

// Global map to hold abort controllers for active uploads
const uploadControllers = new Map<string, AbortController>();

/**
 * Aborts an active upload job.
 */
export const abortUpload = (jobId: string) => {
  if (uploadControllers.has(jobId)) {
    uploadControllers.get(jobId)?.abort();
    uploadControllers.delete(jobId);
  }
};

/**
 * Uploads a file in parallel chunks to cloud storage.
 *
 * 1. Calls `/files/init-upload/` to get chunk allocation and direct upload URLs.
 * 2. Uploads chunks directly to cloud storage (up to MAX_PARALLEL_UPLOADS at once).
 * 3. Confirms each chunk with the server.
 * 4. Returns the final file data.
 */
export const uploadFileRequest = async (
  payload: UploadFilePayload & { jobId?: string },
): Promise<ApiResponse<FileData>> => {
  const controller = new AbortController();
  const signal = controller.signal;

  if (payload.jobId) {
    uploadControllers.set(payload.jobId, controller);
  }

  try {
    // Step 1: Init upload — server computes chunk allocation and returns upload URLs.
    const initResponse = await api.post<
      InitUploadResponse,
      ApiResponse<InitUploadResponse>
    >(
      '/files/init-upload/',
      {
        file_name: payload.file.name,
        file_size: payload.file.size,
        mime_type: payload.file.type || 'application/octet-stream',
        folder_id: payload.folderId ?? null,
      },
      { signal },
    );

    const { file_id: fileId, chunks } = initResponse.data;
    const totalChunks = chunks.length;

    // Pre-compute byte offsets for each chunk.
    const chunkOffsets: number[] = [];
    let runningOffset = 0;

    for (const chunk of chunks) {
      chunkOffsets.push(runningOffset);
      runningOffset += chunk.chunk_size;
    }

    // Track per-chunk progress for overall calculation.
    const chunkProgressMap: Record<number, number> = {};
    let completedChunks = 0;

    // Upload a single chunk to cloud storage and confirm with server.
    const uploadChunk = async (index: number) => {
      const chunk = chunks[index];
      const offset = chunkOffsets[index];
      const blob = payload.file.slice(offset, offset + chunk.chunk_size);

      // Upload chunk directly to cloud storage.
      const uploadResponse = await axios.request({
        method: chunk.upload_method,
        url: chunk.upload_url,
        data: blob,
        headers: {
          'Content-Type':
            chunk.content_type ||
            payload.file.type ||
            'application/octet-stream',
        },
        signal,
        onUploadProgress: (progressEvent) => {
          if (payload.onProgress && progressEvent.total) {
            chunkProgressMap[index] =
              progressEvent.loaded / progressEvent.total;

            // Aggregate progress across all chunks (weighted by chunk size).
            const totalSize = payload.file.size;
            let weightedProgress = 0;
            for (let j = 0; j < totalChunks; j++) {
              const fraction = chunks[j].chunk_size / totalSize;
              weightedProgress += (chunkProgressMap[j] ?? 0) * fraction;
            }
            payload.onProgress(
              Math.min(Math.round(weightedProgress * 100), 99),
            );
          }
        },
      });

      const externalChunkId = chunk.external_id || uploadResponse.data?.id;

      // Confirm chunk with server.
      await api.post<ConfirmChunkResponse, ApiResponse<ConfirmChunkResponse>>(
        `/files/${fileId}/confirm-chunk/`,
        {
          chunk_index: chunk.chunk_index,
          external_chunk_id: externalChunkId,
        },
        { signal },
      );

      completedChunks++;
      if (payload.onChunkProgress) {
        payload.onChunkProgress(completedChunks, totalChunks);
      }
    };

    try {
      const active = new Set<Promise<void>>();

      for (let i = 0; i < chunks.length; i++) {
        if (signal.aborted) break;

        const p: Promise<void> = uploadChunk(i).finally(() => active.delete(p));
        active.add(p);

        if (active.size >= MAX_PARALLEL_UPLOADS) {
          await Promise.race(active);
        }
      }

      await Promise.all(active);

      if (payload.onProgress) {
        payload.onProgress(100);
      }

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
    } catch (error: any) {
      if (isCancel(error) || signal.aborted || error.name === 'CanceledError') {
        // Clean up the incomplete file on the backend if upload was cancelled
        if (fileId) {
          await api.delete(`/files/${fileId}/`).catch(() => {
            // Ignore deletion errors on cleanup
          });
        }
        throw new Error('Upload cancelled');
      }
      throw error;
    }
  } finally {
    if (payload.jobId) {
      uploadControllers.delete(payload.jobId);
    }
  }
};

// Hook.
export const useUploadFile = () =>
  useMutation({
    mutationFn: uploadFileRequest,
  });
