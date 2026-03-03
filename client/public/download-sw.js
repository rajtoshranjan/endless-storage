/* eslint-disable no-restricted-globals */
const DOWNLOAD_PREFIX = '/download-stream/';
const pendingDownloads = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener('message', (event) => {
  const { type, id, filename, filesize, mimetype, port } = event.data;

  if (type !== 'start-download') return;

  // Create a ReadableStream that is fed by the main thread via the port.
  const stream = new ReadableStream({
    start(controller) {
      port.onmessage = ({ data }) => {
        if (data.type === 'chunk') {
          try {
            controller.enqueue(new Uint8Array(data.chunk));
          } catch (e) {
            // If the browser canceled the native download, the stream is closed/errored.
            // enqueue() will throw a TypeError. Catch it and signal the main thread.
            port.postMessage({ type: 'cancelled' });
          }
        } else if (data.type === 'end') {
          try {
            controller.close();
          } catch (e) {
            /* ignore */
          }
        } else if (data.type === 'abort') {
          try {
            controller.error(new Error('Download aborted'));
          } catch (e) {
            /* ignore */
          }
        }
      };
    },
    cancel() {
      port.postMessage({ type: 'cancelled' });
    },
  });

  pendingDownloads.set(id, { stream, filename, filesize, mimetype });

  // Signal the main thread that we're ready to receive the fetch.
  port.postMessage({ type: 'ready' });
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.pathname.startsWith(DOWNLOAD_PREFIX)) return;

  const id = url.pathname.slice(DOWNLOAD_PREFIX.length);
  const download = pendingDownloads.get(id);

  if (!download) return;
  pendingDownloads.delete(id);

  const headers = new Headers({
    'Content-Type': download.mimetype || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(download.filename)}"`,
  });

  if (download.filesize) {
    headers.set('Content-Length', String(download.filesize));
  }

  event.respondWith(new Response(download.stream, { headers }));
});
