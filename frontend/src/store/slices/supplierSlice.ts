import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Supplier, SupplierFormValues } from '@/types';
import { mockSuppliers } from '@/mockData/suppliers';
import { today } from '@/utils/dateUtils';

/**
 * Module quản lý nhà cung cấp.
 *
 * MVP thao tác trực tiếp trên state (không gọi API), nên các reducer đóng vai trò
 * như một in-memory repository.
 */
export interface SupplierState {
  suppliers: Supplier[];
  /** NCC đang được chỉnh sửa; `null` nghĩa là đang thêm mới. */
  selectedSupplier: Supplier | null;
  isModalOpen: boolean;
  searchQuery: string;
  categoryFilter: string | null;
  statusFilter: Supplier['status'] | null;
}

const initialState: SupplierState = {
  suppliers: mockSuppliers,
  selectedSupplier: null,
  isModalOpen: false,
  searchQuery: '',
  categoryFilter: null,
  statusFilter: null,
};

/** Sinh mã NCC kế tiếp dựa trên mã lớn nhất đang có, tránh trùng khi đã xoá. */
const nextSupplierCode = (suppliers: readonly Supplier[]): string => {
  const maxNumber = suppliers.reduce((max, supplier) => {
    const parsed = Number.parseInt(supplier.code.replace('NCC-', ''), 10);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `NCC-${String(maxNumber + 1).padStart(3, '0')}`;
};

export const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    addSupplier: (state, action: PayloadAction<SupplierFormValues>) => {
      state.suppliers.unshift({
        ...action.payload,
        id: `sup-${Date.now()}`,
        code: nextSupplierCode(state.suppliers),
        totalDebt: 0,
        totalOrders: 0,
        createdAt: today(),
      });
    },

    updateSupplier: (
      state,
      action: PayloadAction<{ id: string; values: SupplierFormValues }>,
    ) => {
      const index = state.suppliers.findIndex(
        (supplier) => supplier.id === action.payload.id,
      );
      if (index === -1) return;
      const current = state.suppliers[index];
      if (!current) return;
      state.suppliers[index] = { ...current, ...action.payload.values };
    },

    deleteSupplier: (state, action: PayloadAction<string>) => {
      state.suppliers = state.suppliers.filter(
        (supplier) => supplier.id !== action.payload,
      );
    },

    setSelectedSupplier: (state, action: PayloadAction<Supplier | null>) => {
      state.selectedSupplier = action.payload;
    },

    setModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
      // Đóng modal thì bỏ luôn bản ghi đang chọn để lần mở sau là "thêm mới".
      if (!action.payload) {
        state.selectedSupplier = null;
      }
    },

    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    setCategoryFilter: (state, action: PayloadAction<string | null>) => {
      state.categoryFilter = action.payload;
    },

    setStatusFilter: (state, action: PayloadAction<Supplier['status'] | null>) => {
      state.statusFilter = action.payload;
    },
  },
});

export const {
  addSupplier,
  updateSupplier,
  deleteSupplier,
  setSelectedSupplier,
  setModalOpen,
  setSearchQuery,
  setCategoryFilter,
  setStatusFilter,
} = supplierSlice.actions;

export default supplierSlice.reducer;