import { Cloud, CloudOff, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  ScrollArea,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui';
import { toast } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';
import {
  handleResponseErrorMessage,
  useConnectGoogleDrive,
  useDisconnectStorageAccount,
  useGetGoogleAuthUrl,
  useGetStorageAccounts,
  StorageAccountData,
} from '../../services/apis';

const PROVIDER_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  google_drive: {
    label: 'Google Drive',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  onedrive: {
    label: 'OneDrive',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  dropbox: {
    label: 'Dropbox',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
};

export function StorageSection() {
  const popupRef = useRef<Window | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    data: storageAccountsResponse,
    isLoading,
    refetch: refetchAccounts,
  } = useGetStorageAccounts();

  const { mutate: getGoogleAuthUrl } = useGetGoogleAuthUrl();
  const { mutate: connectGoogleDrive } = useConnectGoogleDrive();
  const { mutate: disconnectAccount } = useDisconnectStorageAccount();

  const storageAccounts = storageAccountsResponse?.data || [];

  const handleOAuthMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'oauth-callback') return;

      setIsConnecting(false);

      if (event.data.error) {
        toast({
          title: 'Connection failed',
          description: 'Failed to connect Google Drive. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (event.data.code) {
        connectGoogleDrive(
          { code: event.data.code },
          {
            onSuccess: () => {
              refetchAccounts();
              toast({
                title: 'Connected!',
                description: 'Google Drive has been connected successfully.',
              });
            },
            onError: (error) => {
              handleResponseErrorMessage(error);
            },
          },
        );
      }
    },
    [connectGoogleDrive, refetchAccounts],
  );

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

  const handleConnectGoogleDrive = () => {
    setIsConnecting(true);
    getGoogleAuthUrl(undefined, {
      onSuccess: (response) => {
        const url = response.data.url;
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        popupRef.current = window.open(
          url,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
        );

        const pollTimer = setInterval(() => {
          if (popupRef.current?.closed) {
            clearInterval(pollTimer);
            setIsConnecting(false);
          }
        }, 500);
      },
      onError: (error) => {
        setIsConnecting(false);
        handleResponseErrorMessage(error);
      },
    });
  };

  const handleDisconnect = (account: StorageAccountData) => {
    disconnectAccount(account.id, {
      onSuccess: () => {
        refetchAccounts();
        toast({
          title: 'Disconnected',
          description: `${PROVIDER_META[account.provider]?.label || account.provider} has been disconnected.`,
        });
      },
      onError: (error) => {
        handleResponseErrorMessage(error);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cloud Storage</h2>
          <p className="text-sm text-muted-foreground">
            Connect storage providers to store your files
          </p>
        </div>
        <Button
          onClick={handleConnectGoogleDrive}
          disabled={isConnecting}
          size="sm"
          className="gap-2 rounded-full px-4"
        >
          {isConnecting ? (
            <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Connect
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm">Connected Accounts</CardTitle>
          <CardDescription>
            {storageAccounts.length > 0
              ? `${storageAccounts.length} account${storageAccounts.length > 1 ? 's' : ''} connected`
              : 'No accounts connected yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : storageAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CloudOff className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  No storage connected
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  Connect Google Drive to start uploading files
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectGoogleDrive}
                disabled={isConnecting}
                className="mt-1 gap-2"
              >
                <Cloud className="size-3.5" />
                Connect Google Drive
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100dvh-32rem)] w-full md:h-[calc(100dvh-26rem)]">
              {storageAccounts.map((account) => {
                const meta = PROVIDER_META[account.provider] || {
                  label: account.provider,
                  color: 'text-muted-foreground',
                  bg: 'bg-muted',
                };
                return (
                  <div
                    key={account.id}
                    className="group mb-2 flex items-center justify-between rounded-lg border p-3 transition-all hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          'flex size-9 items-center justify-center rounded-full',
                          meta.bg,
                        )}
                      >
                        <Cloud className={cn('size-4', meta.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {account.providerEmail}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(account)}
                      className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                      Remove
                    </Button>
                  </div>
                );
              })}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
