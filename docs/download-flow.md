# Download Service Worker Flow

## The Problem

This platform downloads the file chunks directly from the cloud storage and merge the same on the client to avoid the load on the backend server. This is efficient for small files, but for large files, it will consume a lot of memory and crash the browser. We need a way to fetch chunks directly from cloud storage and stream the data directly to the user's hard drive as it is downloaded, piece by piece.

## The Solution

We use a **Service Worker (SW)** to intercept a fake network request. When the browser makes a GET request to that fake URL, the SW responds with a `ReadableStream`. Our main JavaScript thread downloads the chunks and aggressively pipes them into that stream, causing the browser to save it native-style.

### End-to-End Download Flow

1. **Initialization**
   - Main thread calls `createStreamDownload`.
   - A `MessageChannel` is created to communicate directly between the main thread and the SW.
   - Main thread posts a `start-download` message to the SW with file metadata (name, size) and the `MessageChannel` port.

2. **Stream Setup**
   - The SW creates a new `ReadableStream` under a unique `id`.
   - The main thread creates a hidden `<iframe>` pointing to `/download-stream/{id}`.
   - The SW intercepts this navigation fetch, grabs the matching stream by `id`, and returns it as a native `Response` with `Content-Disposition: attachment`.
   - **Result:** The browser's native download manager pops up.

3. **Streaming Data (Zero-Copy Transfer)**
   - The main thread loops through the chunks provided by the backend, fetching them sequentially using standard `fetch`.
   - Each completed chunk creates a `Uint8Array`.
   - The main thread transfers this array to the SW via `port.postMessage({ type: 'chunk', chunk })`.
   - The SW takes the chunk and does `controller.enqueue(chunk)`, pushing it to the browser's download manager.

4. **Completion**
   - Once all chunks are fetched and sent to the SW, the main thread sends `{ type: 'end' }`.
   - The SW calls `controller.close()`, which tells the native download manager the file is complete.
   - The hidden `<iframe>` is removed.
