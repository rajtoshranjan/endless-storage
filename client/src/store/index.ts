import { configureStore } from '@reduxjs/toolkit';
import { themeReducer, driveReducer, uploadReducer } from './slices';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    drive: driveReducer,
    upload: uploadReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
