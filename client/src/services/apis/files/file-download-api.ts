import { useMutation } from '@tanstack/react-query';
import api from '../setup';

/**
 * Triggers a browser-native file download.
 *
 * 1. Requests a one-time download token from the server (authenticated).
 * 2. Opens the download URL (containing the token) in a hidden iframe,
 *    letting the browser handle the download natively with its own
 *    progress bar.
 *
 * The one-time token expires after 60 seconds and is deleted after
 * a single use, so it cannot be reused if leaked.
 */
export const downloadFile = async (fileId: string): Promise<void> => {
  // Step 1: Get a one-time download token (this call is JWT-authenticated).
  const { data } = await api.get<{ download_url: string }>(
    `/files/${fileId}/download-token/`,
  );

  // Step 2: Navigate to the download URL via a hidden iframe.
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = data.download_url;
  document.body.appendChild(iframe);

  // Clean up the iframe after a delay.
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 60_000);
};

export const useDownloadFile = () =>
  useMutation({
    mutationFn: downloadFile,
  });
