import { useMutation } from '@tanstack/react-query';
import { ApiResponse } from '../types';
import api from '../setup';
import { DownloadPlanResponse } from './types';

const MAX_PARALLEL_DOWNLOADS = 6;

export type DownloadFileParams = {
  fileId: string;
  onProgress?: (progress: number) => void;
  onChunkProgress?: (completedChunks: number, totalChunks: number) => void;
};

/**
 * Downloads a file by fetching chunks directly from cloud storage.
 *
 * Strategy 1 (Chrome/Edge): Uses the File System Access API for zero-memory
 * streaming directly to disk — chunks are written sequentially.
 *
 * Strategy 2 (fallback): Downloads chunks in parallel as Blobs, then
 * concatenates and triggers a classic download link.
 */
export const downloadFileRequest = async ({
  fileId,
  onProgress,
  onChunkProgress,
}: DownloadFileParams): Promise<void> => {
  // 1. Get download plan with per-chunk direct URLs + access tokens.
  const planResponse = await api.get<
    DownloadPlanResponse,
    ApiResponse<DownloadPlanResponse>
  >(`/files/${fileId}/download-plan/`);

  const { file_name, file_size, mime_type, chunks } = planResponse.data;
  let loadedBytes = 0;

  // Helper: fetch a single chunk directly from cloud storage.
  const fetchChunk = (index: number) =>
    fetch(chunks[index].download_url, {
      headers: { Authorization: `Bearer ${chunks[index].access_token}` },
    });

  // Strategy 1: File System Access API (memory-efficient streaming)
  if ('showSaveFilePicker' in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: file_name,
        types: [
          {
            description: 'File',
            accept: { [mime_type || 'application/octet-stream']: [] },
          },
        ],
      });

      const writable = await handle.createWritable();

      // Download chunks sequentially (must write in order).
      for (let i = 0; i < chunks.length; i++) {
        const response = await fetchChunk(i);
        if (!response.ok) {
          await writable.abort();
          throw new Error(`Failed to download chunk ${i}: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          await writable.abort();
          throw new Error(`No response body for chunk ${i}`);
        }

        // Stream directly to disk — zero memory buffering.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          await writable.write(value);
          loadedBytes += value.length;

          if (onProgress && file_size) {
            onProgress(Math.round((loadedBytes * 100) / file_size));
          }
        }

        if (onChunkProgress) {
          onChunkProgress(i + 1, chunks.length);
        }
      }

      await writable.close();

      return;
    } catch (err) {
      // User cancelled the save dialog.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      // If File System API fails for other reasons, fall through to blob fallback.
      console.warn('File System Access API failed, falling back to blob:', err);
    }
  }

  // Strategy 2: Parallel blob download (fallback).
  const chunkBlobs: (Blob | null)[] = new Array(chunks.length).fill(null);
  const active = new Set<Promise<void>>();
  let completedChunksCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const downloadChunk = async (index: number) => {
      const response = await fetchChunk(index);
      if (!response.ok) {
        throw new Error(
          `Failed to download chunk ${index}: ${response.status}`,
        );
      }
      chunkBlobs[index] = await response.blob();
      completedChunksCount++;
      if (onChunkProgress) {
        onChunkProgress(completedChunksCount, chunks.length);
      }
      if (onProgress) {
        onProgress(Math.round((completedChunksCount * 100) / chunks.length));
      }
    };

    const p: Promise<void> = downloadChunk(i).finally(() => active.delete(p));
    active.add(p);

    if (active.size >= MAX_PARALLEL_DOWNLOADS) {
      await Promise.race(active);
    }
  }

  await Promise.all(active);

  // Combine chunks in order and trigger browser download.
  const finalBlob = new Blob(chunkBlobs as Blob[], {
    type: mime_type || 'application/octet-stream',
  });
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file_name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Hook.
export const useDownloadFile = () =>
  useMutation({
    mutationFn: downloadFileRequest,
  });
