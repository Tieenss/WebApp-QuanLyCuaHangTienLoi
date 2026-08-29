import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import posReducer from './slices/posSlice';
import inventoryReducer from './slices/inventorySlice';
import supplierReducer from './slices/supplierSlice';
import payrollReducer from './slices/payrollSlice';
import stockReducer from './slices/stockSlice';
import cashbookReducer from './slices/cashbookSlice';
import purchaseReducer from './slices/purchaseSlice';
import branchReducer from './slices/branchSlice';
import productReducer from './slices/productSlice';
import transferReducer from './slices/transferSlice';
import employeeReducer from './slices/employeeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    pos: posReducer,
    // `inventory` giữ bộ lọc UI của trang Kho; `stock` giữ dữ liệu tồn kho thật.
    inventory: inventoryReducer,
    stock: stockReducer,
    supplier: supplierReducer,
    payroll: payrollReducer,
    cashbook: cashbookReducer,
    purchase: purchaseReducer,
    transfer: transferReducer,
    employee: employeeReducer,
    branch: branchReducer,
    product: productReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
