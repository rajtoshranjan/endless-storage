import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DriveData, DriveRole } from '../../services/apis';
import { localStorageManager } from '../../lib/utils';

type DriveState = {
  activeDrive: DriveData | null;
  activeDriveId: string | null;
  canManageFiles: boolean;
  canManageUsers: boolean;
};

const initialState: DriveState = {
  activeDrive: null,
  activeDriveId: localStorageManager.getActiveDriveId(),
  canManageFiles: false,
  canManageUsers: false,
};

const driveSlice = createSlice({
  name: 'drive',
  initialState,
  reducers: {
    setActiveDrive: (state, action: PayloadAction<DriveData>) => {
      state.activeDrive = action.payload;
      state.activeDriveId = action.payload.id;
      state.canManageFiles = action.payload.role !== DriveRole.Guest;
      state.canManageUsers =
        action.payload.role === DriveRole.Admin ||
        action.payload.role === 'owner';
      localStorageManager.setActiveDriveId(action.payload.id);
    },

    resetActiveDrive: (state) => {
      Object.assign(state, initialState);
      localStorageManager.removeActiveDriveId();
    },
  },
});

// Selectors
export const selectActiveDrive = (state: { drive: DriveState }) => state.drive;

export const { setActiveDrive, resetActiveDrive } = driveSlice.actions;

export const driveReducer = driveSlice.reducer;
