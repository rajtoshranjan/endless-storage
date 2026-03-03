import { useMutation } from '@tanstack/react-query';
import { ApiResponse } from '../types';
import api from '../setup';
import { createStreamDownload } from '../../../services/stream-download';
import { DownloadPlanResponse } from './types';

export type DownloadFileParams = {
  fileId: string;
  onProgress?: (progress: number) => void;
  onChunkProgress?: (completedChunks: number, totalChunks: number) => void;
};

/**
 * Downloads a file by fetching chunks directly from cloud storage.
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
  let lastReportedProgress = -1;

  // Create an abort controller to stop fetching if the user cancels the download.
  const abortController = new AbortController();

  // Helper: fetch a single chunk directly from cloud storage.
  const fetchChunk = (index: number) =>
    fetch(chunks[index].download_url, {
      headers: { Authorization: `Bearer ${chunks[index].access_token}` },
      signal: abortController.signal,
    });

  const streamChunk = async (
    index: number,
    onData: (value: Uint8Array) => void | Promise<void>,
  ) => {
    let response: Response;
    try {
      response = await fetchChunk(index);
    } catch (err: any) {
      if (err.name === 'AbortError') throw err; // Re-throw to propagate cancellation
      throw err;
    }

    if (!response.ok) {
      throw new Error(`Failed to download chunk ${index}: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error(`No response body for chunk ${index}`);
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let done, value;
      try {
        ({ done, value } = await reader.read());
      } catch (err: any) {
        if (err.name === 'AbortError') throw err; // Re-throw
        throw err;
      }

      if (done || !value) break;

      const chunkLength = value.length;
      await onData(value);
      loadedBytes += chunkLength;

      if (onProgress && file_size) {
        const currentProgress = Math.round((loadedBytes * 100) / file_size);
        if (currentProgress !== lastReportedProgress) {
          onProgress(currentProgress);
          lastReportedProgress = currentProgress;
        }
      }
    }

    if (onChunkProgress) {
      onChunkProgress(index + 1, chunks.length);
    }
  };

  try {
    const writer = await createStreamDownload({
      filename: file_name,
      filesize: file_size,
      mimetype: mime_type,
      onCancel: () => {
        // Stop any active or future fetch calls.
        abortController.abort();
      },
    });

    // Chunks must be written sequentially for the stream.
    for (let i = 0; i < chunks.length; i++) {
      if (abortController.signal.aborted) {
        throw new Error('Download cancelled');
      }
      await streamChunk(i, (value) => writer.write(value));
    }

    if (!abortController.signal.aborted) {
      writer.close();
    } else {
      throw new Error('Download cancelled');
    }
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message === 'Download cancelled') {
      throw new Error('Download cancelled');
    }
    throw err;
  }
};

// Hook.
export const useDownloadFile = () =>
  useMutation({
    mutationFn: downloadFileRequest,
  });
