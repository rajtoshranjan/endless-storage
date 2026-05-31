import { Cloud, CloudOff, ChevronDown, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ScrollArea,
} from '../../components/ui';
import { toast } from '../../hooks/use-toast';
import { cn, formatBytes } from '../../lib/utils';
import {
  handleResponseErrorMessage,
  useConnectStorageAccount,
  useDisconnectStorageAccount,
  useGetOAuthUrl,
  useGetStorageAccounts,
  StorageAccountData,
} from '../../services/apis';
import { StorageProvider } from '../../services/apis/storage/types';

// ---------------------------------------------------------------------------
// Provider metadata
// ---------------------------------------------------------------------------

const PROVIDER_META: Record<
  StorageProvider,
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

const ALL_PROVIDERS: StorageProvider[] = [
  'google_drive',
  'onedrive',
  'dropbox',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StorageSection() {
  const popupRef = useRef<Window | null>(null);
  const connectingProviderRef = useRef<StorageProvider | null>(null);
  const [connectingProvider, setConnectingProvider] =
    useState<StorageProvider | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] =
    useState<StorageAccountData | null>(null);

  const {
    data: storageAccountsResponse,
    isLoading,
    refetch: refetchAccounts,
  } = useGetStorageAccounts();

  const { mutate: getOAuthUrl } = useGetOAuthUrl();
  const { mutate: connectStorageAccount } = useConnectStorageAccount();
  const { mutate: disconnectAccount, isPending: isDisconnecting } =
    useDisconnectStorageAccount();

  const responseData = storageAccountsResponse?.data;
  const storageAccounts = responseData?.accounts ?? [];
  const quota = responseData?.quota;

  const handleOAuthMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'oauth-callback') return;

      const provider = connectingProviderRef.current;
      connectingProviderRef.current = null;
      setConnectingProvider(null);

      if (event.data.error || !event.data.code || !provider) {
        if (event.data.error) {
          toast({
            title: 'Connection failed',
            description: `Failed to connect ${PROVIDER_META[provider ?? 'google_drive']?.label}. Please try again.`,
            variant: 'destructive',
          });
        }
        return;
      }

      const label = PROVIDER_META[provider].label;
      connectStorageAccount(
        { provider, code: event.data.code as string },
        {
          onSuccess: () => {
            refetchAccounts();
            toast({
              title: 'Connected!',
              description: `${label} has been connected successfully.`,
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onError: (error: any) => handleResponseErrorMessage(error),
        },
      );
    },
    [connectStorageAccount, refetchAccounts],
  );

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

  const openOAuthPopup = (url: string, provider: StorageProvider) => {
    const width = 500;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    popupRef.current = window.open(
      url,
      `${provider}-oauth`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );
    const pollTimer = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(pollTimer);
        connectingProviderRef.current = null;
        setConnectingProvider(null);
      }
    }, 500);
  };

  const handleConnectProvider = (provider: StorageProvider) => {
    connectingProviderRef.current = provider;
    setConnectingProvider(provider);

    getOAuthUrl(provider, {
      onSuccess: (response) => openOAuthPopup(response.data.url, provider),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        connectingProviderRef.current = null;
        setConnectingProvider(null);
        handleResponseErrorMessage(error);
      },
    });
  };

  const handleDisconnect = (account: StorageAccountData) => {
    disconnectAccount(account.id, {
      onSuccess: () => {
        refetchAccounts();
        setAccountToDisconnect(null);
        toast({
          title: 'Disconnected',
          description: `${PROVIDER_META[account.provider]?.label ?? account.provider} has been disconnected.`,
        });
      },
      onError: (error) => handleResponseErrorMessage(error),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Linked Storage</h2>
          <p className="text-sm text-muted-foreground">
            Connect your cloud drives and turn them into one limitless storage
            system
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={connectingProvider !== null}
            >
              {connectingProvider ? (
                <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Cloud className="size-3.5" />
              )}
              {connectingProvider
                ? `Connecting ${PROVIDER_META[connectingProvider].label}…`
                : 'Connect'}
              {!connectingProvider && <ChevronDown className="size-3" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ALL_PROVIDERS.map((provider) => {
              const meta = PROVIDER_META[provider];
              return (
                <DropdownMenuItem
                  key={provider}
                  onClick={() => handleConnectProvider(provider)}
                >
                  <div
                    className={cn(
                      'mr-2 flex size-5 items-center justify-center rounded-full',
                      meta.bg,
                    )}
                  >
                    <Cloud className={cn('size-3', meta.color)} />
                  </div>
                  {meta.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <CardTitle className="text-sm">Connected Accounts</CardTitle>
              <CardDescription>
                {storageAccounts.length > 0
                  ? `${storageAccounts.length} account${storageAccounts.length > 1 ? 's' : ''} connected`
                  : 'No accounts connected yet'}
              </CardDescription>
            </div>
            {quota && quota.limit > 0 && (
              <div className="flex flex-col gap-1.5 text-left md:min-w-64 md:text-right">
                <div className="flex justify-between gap-4 text-xs">
                  <span className="font-medium text-foreground">
                    Storage Usage
                  </span>
                  <span className="text-muted-foreground">
                    {formatBytes(quota.usage)} / {formatBytes(quota.limit)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                    style={{
                      width: `${Math.min(100, (quota.usage / quota.limit) * 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-0.5 text-right text-[10px] text-muted-foreground">
                  {formatBytes(quota.remaining)} available
                </div>
              </div>
            )}
          </div>
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
                  Connect Google Drive, OneDrive, or Dropbox to start uploading
                  files
                </p>
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {ALL_PROVIDERS.map((provider) => {
                  const meta = PROVIDER_META[provider];
                  return (
                    <Button
                      key={provider}
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectProvider(provider)}
                      disabled={connectingProvider !== null}
                      className="gap-1.5"
                    >
                      <Cloud className={cn('size-3.5', meta.color)} />
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100dvh-32rem)] w-full md:h-[calc(100dvh-27rem)]">
              {storageAccounts.map((account) => {
                const meta = PROVIDER_META[account.provider] ?? {
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
                      onClick={() => setAccountToDisconnect(account)}
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

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={!!accountToDisconnect}
        onOpenChange={(open) => {
          if (!isDisconnecting && !open) setAccountToDisconnect(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect{' '}
              <span className="font-semibold">
                {accountToDisconnect &&
                  (PROVIDER_META[accountToDisconnect.provider]?.label ??
                    accountToDisconnect.provider)}
                {accountToDisconnect?.providerEmail
                  ? ` (${accountToDisconnect.providerEmail})`
                  : ''}
              </span>
              ? Once disconnected, you won&apos;t be able to use this storage
              account for uploads or downloads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDisconnecting}
              onClick={(e) => {
                e.preventDefault();
                if (accountToDisconnect) handleDisconnect(accountToDisconnect);
              }}
              className="min-w-[100px]"
              loading={isDisconnecting}
            >
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
