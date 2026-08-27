import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import posReducer from './slices/posSlice';
import inventoryReducer from './slices/inventorySlice';
import supplierReducer from './slices/supplierSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    pos: posReducer,
    inventory: inventoryReducer,
    supplier: supplierReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
