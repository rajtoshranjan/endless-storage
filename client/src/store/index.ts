import { configureStore } from '@reduxjs/toolkit';
import { themeReducer, driveReducer, transferReducer } from './slices';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    drive: driveReducer,
    transfer: transferReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
