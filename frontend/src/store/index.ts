import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import supplierReducer from './slices/supplierSlice';
import internalExportReducer from './slices/internalExportSlice';
import branchReducer from './slices/branchSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    supplier: supplierReducer,
    internalExport: internalExportReducer,
    branch: branchReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
