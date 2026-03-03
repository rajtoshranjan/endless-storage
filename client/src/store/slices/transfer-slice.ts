import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TransferJob = {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'downloading' | 'success' | 'error';
  type: 'upload' | 'download';
  totalChunks: number;
  completedChunks: number;
};

type TransferState = {
  jobs: Record<string, TransferJob>;
  isWidgetVisible: boolean;
};

const initialState: TransferState = {
  jobs: {},
  isWidgetVisible: false,
};

export const transferSlice = createSlice({
  name: 'transfer',
  initialState,
  reducers: {
    addTransferJob: (
      state,
      action: PayloadAction<
        Omit<TransferJob, 'progress' | 'status' | 'completedChunks'>
      >,
    ) => {
      state.jobs[action.payload.id] = {
        ...action.payload,
        progress: 0,
        status: action.payload.type === 'upload' ? 'uploading' : 'downloading',
        completedChunks: 0,
      };
      state.isWidgetVisible = true;
    },
    updateTransferProgress: (
      state,
      action: PayloadAction<{ id: string; progress: number }>,
    ) => {
      if (state.jobs[action.payload.id]) {
        state.jobs[action.payload.id].progress = action.payload.progress;
      }
    },
    updateTransferChunkProgress: (
      state,
      action: PayloadAction<{
        id: string;
        completedChunks: number;
        totalChunks: number;
      }>,
    ) => {
      if (state.jobs[action.payload.id]) {
        state.jobs[action.payload.id].completedChunks =
          action.payload.completedChunks;
        state.jobs[action.payload.id].totalChunks = action.payload.totalChunks;
      }
    },
    setTransferStatus: (
      state,
      action: PayloadAction<{ id: string; status: 'success' | 'error' }>,
    ) => {
      if (state.jobs[action.payload.id]) {
        state.jobs[action.payload.id].status = action.payload.status;
        if (action.payload.status === 'success') {
          state.jobs[action.payload.id].progress = 100;
        }
      }
    },
    removeTransferJob: (state, action: PayloadAction<string>) => {
      delete state.jobs[action.payload];
      if (Object.keys(state.jobs).length === 0) {
        state.isWidgetVisible = false;
      }
    },
    toggleWidgetVisibility: (state) => {
      state.isWidgetVisible = !state.isWidgetVisible;
    },
    closeWidget: (state) => {
      state.isWidgetVisible = false;
    },
  },
});

export const {
  addTransferJob,
  updateTransferProgress,
  updateTransferChunkProgress,
  setTransferStatus,
  removeTransferJob,
  toggleWidgetVisibility,
  closeWidget,
} = transferSlice.actions;

export const selectTransferJobs = (state: { transfer: TransferState }) =>
  Object.values(state.transfer.jobs);
export const selectIsWidgetVisible = (state: { transfer: TransferState }) =>
  state.transfer.isWidgetVisible;

export const transferReducer = transferSlice.reducer;
