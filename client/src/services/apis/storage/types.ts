export type StorageProvider = 'google_drive';

// Server response types
export type StorageAccountDataFromServer = {
  id: string;
  provider: StorageProvider;
  provider_email: string;
  is_active: boolean;
  created_at: string;
};

// Client types (camelCase)
export type StorageAccountData = {
  id: string;
  provider: StorageProvider;
  providerEmail: string;
  isActive: boolean;
  createdAt: string;
};

export type GoogleAuthUrlResponse = {
  url: string;
  state: string;
};

export type GoogleCallbackPayload = {
  code: string;
};
