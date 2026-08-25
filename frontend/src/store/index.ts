import { configureStore } from '@reduxjs/toolkit';
import dashboardReducer from './slices/dashboardSlice';
import supplierReducer from './slices/supplierSlice';

export const store = configureStore({
  reducer: {
    dashboard: dashboardReducer,
    supplier: supplierReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
