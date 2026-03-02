import { useEffect } from 'react';

/**
 * OAuth callback page that receives the authorization code from Google's
 * OAuth consent screen, sends it to the parent window, and closes itself.
 */
export function OAuthCallbackPage() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (window.opener) {
      if (code) {
        window.opener.postMessage(
          { type: 'oauth-callback', code },
          window.location.origin,
        );
      } else if (error) {
        window.opener.postMessage(
          { type: 'oauth-callback', error },
          window.location.origin,
        );
      }
      window.close();
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 text-lg font-medium">Connecting...</div>
        <p className="text-sm text-muted-foreground">
          This window will close automatically.
        </p>
      </div>
    </div>
  );
}
