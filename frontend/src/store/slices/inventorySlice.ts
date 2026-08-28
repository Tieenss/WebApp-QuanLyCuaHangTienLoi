import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { LedgerType, StockLevel } from '@/types';

/**
 * Module 7 – State bộ lọc của trang Kho hàng.
 *
 * Chỉ lưu điều kiện lọc, không lưu dữ liệu tồn kho: dữ liệu được tính bằng
 * selector từ mockData nên không bị lệch giữa các trang.
 */
export interface InventoryState {
  /** Tab đang xem: bảng tồn kho hay thẻ kho. */
  activeTab: 'balance' | 'ledger';
  /** `null` = xem toàn bộ kho. */
  branchFilter: string | null;
  categoryFilter: string | null;
  /** Lọc theo mức cảnh báo tồn; `null` = tất cả. */
  stockLevelFilter: StockLevel | null;
  /** Lọc theo loại biến động ở tab thẻ kho. */
  ledgerTypeFilter: LedgerType | null;
  searchKeyword: string;
  /** Chỉ hiện mặt hàng cận hạn (dưới 7 ngày) hoặc đã quá hạn. */
  onlyNearExpiry: boolean;
  /** Sản phẩm đang mở drawer chi tiết thẻ kho; `null` = drawer đóng. */
  selectedProductId: string | null;
}

const initialState: InventoryState = {
  activeTab: 'balance',
  branchFilter: null,
  categoryFilter: null,
  stockLevelFilter: null,
  ledgerTypeFilter: null,
  searchKeyword: '',
  onlyNearExpiry: false,
  selectedProductId: null,
};

export const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<InventoryState['activeTab']>) => {
      state.activeTab = action.payload;
    },
    setBranchFilter: (state, action: PayloadAction<string | null>) => {
      state.branchFilter = action.payload;
    },
    setCategoryFilter: (state, action: PayloadAction<string | null>) => {
      state.categoryFilter = action.payload;
    },
    setStockLevelFilter: (state, action: PayloadAction<StockLevel | null>) => {
      state.stockLevelFilter = action.payload;
    },
    setLedgerTypeFilter: (state, action: PayloadAction<LedgerType | null>) => {
      state.ledgerTypeFilter = action.payload;
    },
    setInventorySearch: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },
    toggleNearExpiry: (state) => {
      state.onlyNearExpiry = !state.onlyNearExpiry;
    },
    openLedgerDrawer: (state, action: PayloadAction<string>) => {
      state.selectedProductId = action.payload;
    },
    closeLedgerDrawer: (state) => {
      state.selectedProductId = null;
    },
    /** Đưa mọi bộ lọc về mặc định. */
    resetInventoryFilters: (state) => {
      state.branchFilter = null;
      state.categoryFilter = null;
      state.stockLevelFilter = null;
      state.ledgerTypeFilter = null;
      state.searchKeyword = '';
      state.onlyNearExpiry = false;
    },
  },
});

export const {
  setActiveTab,
  setBranchFilter,
  setCategoryFilter,
  setStockLevelFilter,
  setLedgerTypeFilter,
  setInventorySearch,
  toggleNearExpiry,
  openLedgerDrawer,
  closeLedgerDrawer,
  resetInventoryFilters,
} = inventorySlice.actions;

export default inventorySlice.reducer;