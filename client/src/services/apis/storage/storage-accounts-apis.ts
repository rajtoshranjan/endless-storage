import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiResponse } from '../types';
import api from '../setup';
import { apiDataResponseMapper } from '../utils';
import {
  GoogleAuthUrlResponse,
  GoogleCallbackPayload,
  StorageAccountData,
  StorageAccountDataFromServer,
  StorageAccountsListFromServer,
  StorageAccountsResponse,
} from './types';

// API Functions
export const getStorageAccountsRequest = async (): Promise<
  ApiResponse<StorageAccountsResponse>
> => {
  const response = await api.get<
    StorageAccountsListFromServer,
    ApiResponse<StorageAccountsListFromServer>
  >('/storage/');

  return {
    ...response,
    data: {
      quota: response.data.quota,
      accounts: response.data.accounts.map((account) =>
        apiDataResponseMapper<StorageAccountDataFromServer, StorageAccountData>(
          account,
        ),
      ),
    },
  };
};

export const disconnectStorageAccountRequest = async (
  id: string,
): Promise<ApiResponse<void>> => {
  return api.delete(`/storage/${id}/`);
};

export const getGoogleAuthUrlRequest = async (): Promise<
  ApiResponse<GoogleAuthUrlResponse>
> => {
  return api.get('/storage/google-auth-url/');
};

export const connectGoogleDriveRequest = async (
  payload: GoogleCallbackPayload,
): Promise<ApiResponse<StorageAccountData>> => {
  const response = await api.post<
    StorageAccountDataFromServer,
    ApiResponse<StorageAccountDataFromServer>
  >('/storage/google-callback/', payload);

  return {
    ...response,
    data: apiDataResponseMapper<
      StorageAccountDataFromServer,
      StorageAccountData
    >(response.data),
  };
};

// Hooks
export const useGetStorageAccounts = (enabled: boolean = true) =>
  useQuery({
    queryKey: ['storage-accounts'],
    queryFn: getStorageAccountsRequest,
    enabled,
  });

export const useDisconnectStorageAccount = () =>
  useMutation({
    mutationFn: disconnectStorageAccountRequest,
  });

export const useGetGoogleAuthUrl = () =>
  useMutation({
    mutationFn: getGoogleAuthUrlRequest,
  });

export const useConnectGoogleDrive = () =>
  useMutation({
    mutationFn: connectGoogleDriveRequest,
  });
