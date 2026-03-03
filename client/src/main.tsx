import { QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';
import App from './app';
import { Toaster } from './components/ui';
import { queryClient } from './services/apis';
import { registerDownloadSW } from './services/stream-download';

// Register the download Service Worker early so it's ready for first download.
registerDownloadSW();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
  </QueryClientProvider>,
);
