import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UploadJob = {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
};

type UploadState = {
  jobs: Record<string, UploadJob>;
  isWidgetVisible: boolean;
};

const initialState: UploadState = {
  jobs: {},
  isWidgetVisible: false,
};

export const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    addUploadJob: (
      state,
      action: PayloadAction<Omit<UploadJob, 'progress' | 'status'>>,
    ) => {
      state.jobs[action.payload.id] = {
        ...action.payload,
        progress: 0,
        status: 'uploading',
      };
      state.isWidgetVisible = true;
    },
    updateUploadProgress: (
      state,
      action: PayloadAction<{ id: string; progress: number }>,
    ) => {
      if (state.jobs[action.payload.id]) {
        state.jobs[action.payload.id].progress = action.payload.progress;
      }
    },
    setUploadStatus: (
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
    removeUploadJob: (state, action: PayloadAction<string>) => {
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
  addUploadJob,
  updateUploadProgress,
  setUploadStatus,
  removeUploadJob,
  toggleWidgetVisibility,
  closeWidget,
} = uploadSlice.actions;

export const selectUploadJobs = (state: { upload: UploadState }) =>
  Object.values(state.upload.jobs);
export const selectIsWidgetVisible = (state: { upload: UploadState }) =>
  state.upload.isWidgetVisible;

export const uploadReducer = uploadSlice.reducer;
