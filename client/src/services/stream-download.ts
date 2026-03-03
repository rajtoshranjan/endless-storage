const SW_PATH = '/download-sw.js';
const DOWNLOAD_PREFIX = '/download-stream/';

let swRegistered = false;

/** Register the download Service Worker (idempotent). */
export async function registerDownloadSW(): Promise<void> {
  if (swRegistered) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await navigator.serviceWorker.ready;
    swRegistered = true;
  } catch (err) {
    console.warn('Failed to register download SW:', err);
  }
}

export interface StreamWriter {
  /** Write a chunk. The underlying ArrayBuffer is transferred (zero-copy). */
  write(chunk: Uint8Array): void;
  /** Signal that all data has been written. */
  close(): void;
  /** Abort the download. */
  abort(): void;
}

export interface StreamDownloadOptions {
  filename: string;
  filesize?: number;
  mimetype?: string;
  onCancel?: () => void;
}

/**
 * Opens a streaming download via the Service Worker.
 * Returns a writer you can push chunks into — they stream directly to disk.
 */
export async function createStreamDownload(
  options: StreamDownloadOptions,
): Promise<StreamWriter> {
  await registerDownloadSW();

  const registration = await navigator.serviceWorker.ready;
  const sw = registration.active;

  if (!sw) {
    throw new Error('Download Service Worker is not active');
  }

  const id = crypto.randomUUID();
  const channel = new MessageChannel();

  // Listen for the 'cancelled' event from the SW (when user cancels in browser)
  channel.port1.addEventListener('message', (event) => {
    if (event.data?.type === 'cancelled' && options.onCancel) {
      options.onCancel();
    }
  });
  channel.port1.start();

  // Tell the SW to prepare a ReadableStream for this download.
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Service Worker did not respond in time')),
      5000,
    );

    const readyListener = (event: MessageEvent) => {
      if (event.data?.type === 'ready') {
        clearTimeout(timeout);
        channel.port1.removeEventListener('message', readyListener);
        resolve();
      }
    };
    channel.port1.addEventListener('message', readyListener);

    sw.postMessage(
      {
        type: 'start-download',
        id,
        filename: options.filename,
        filesize: options.filesize,
        mimetype: options.mimetype,
        port: channel.port2,
      },
      [channel.port2],
    );
  });

  // Trigger the native download by navigating a hidden iframe to the SW URL.
  const iframe = document.createElement('iframe');
  iframe.hidden = true;
  iframe.src = `${DOWNLOAD_PREFIX}${id}`;
  document.body.appendChild(iframe);

  return {
    write(chunk: Uint8Array) {
      // Transfer the ArrayBuffer to avoid copying (zero-copy send).
      channel.port1.postMessage({ type: 'chunk', chunk: chunk.buffer }, [
        chunk.buffer,
      ]);
    },
    close() {
      channel.port1.postMessage({ type: 'end' });
      // Clean up the iframe after a delay to ensure the download starts.
      setTimeout(() => iframe.remove(), 10_000);
    },
    abort() {
      channel.port1.postMessage({ type: 'abort' });
      iframe.remove();
    },
  };
}

/** Check whether SW-based streaming is available. */
export function isStreamDownloadSupported(): boolean {
  return 'serviceWorker' in navigator;
}
