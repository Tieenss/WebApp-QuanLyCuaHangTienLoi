import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Category, CategoryFormValues } from '@/types';
import { mockCategories } from '@/mockData/categories';

/**
 * Module 5 — Danh mục hàng hoá (dữ liệu ghi được).
 *
 * Trước đây danh mục là mảng `const` trong `mockData/categories.ts`, chỉ đọc.
 * Sau khi tách thành trang quản lý riêng (`/categories`), slice này giữ trạng
 * thái runtime để có thể thêm / sửa / xoá danh mục từ UI.
 *
 * Lưu ý tương thích: nhiều chỗ trong codebase (POS, Inventory, ProductThumb,
 * analytics) vẫn import trực tiếp từ `mockData/categories.ts`. Kho dữ liệu
 * dùng chung ở đây nên thay đổi qua slice sẽ KHÔNG tự động phản ánh ra các
 * nơi đó — đó là giới hạn đã biết của MVP, sẽ được migrate sang selector
 * chung khi nối API thật.
 */
export interface CategoryState {
  categories: Category[];
}

const initialState: CategoryState = {
  categories: [...mockCategories],
};

/**
 * Sinh mã danh mục kế tiếp dạng `DM-NN` theo số thứ tự lớn nhất hiện có.
 * Không dùng cho danh mục do hệ thống seed sẵn (đã có mã cố định).
 */
const nextCategoryCode = (categories: readonly Category[]): string => {
  const maxNumber = categories.reduce((max, category) => {
    const match = category.code.match(/(\d+)$/);
    const parsed = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `DM-${String(maxNumber + 1).padStart(2, '0')}`;
};

export const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    addCategory: (state, action: PayloadAction<CategoryFormValues>) => {
      const nextOrder =
        state.categories.reduce(
          (max, category) => Math.max(max, category.displayOrder),
          0,
        ) + 1;
      state.categories.unshift({
        ...action.payload,
        id: `cat-live-${Date.now()}`,
        code: nextCategoryCode(state.categories),
        productCount: 0,
        displayOrder: nextOrder,
      });
    },
    updateCategory: (
      state,
      action: PayloadAction<{ id: string; values: CategoryFormValues }>,
    ) => {
      const index = state.categories.findIndex(
        (category) => category.id === action.payload.id,
      );
      if (index === -1) return;
      state.categories[index] = {
        ...state.categories[index],
        ...action.payload.values,
      };
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(
        (category) => category.id !== action.payload,
      );
    },
  },
});

export const { addCategory, updateCategory, deleteCategory } =
  categorySlice.actions;

export default categorySlice.reducer;
