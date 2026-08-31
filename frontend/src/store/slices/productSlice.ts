import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductFormValues } from '@/types';
import { today } from '@/utils/dateUtils';

export interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  isModalOpen: boolean;
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  isModalOpen: false,
};

const nextProductSku = (products: readonly Product[]): string => {
  const maxNumber = products.reduce((max, product) => {
    const match = product.sku.match(/(\d+)$/);
    const parsed = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  const next = maxNumber + 1;
  return `CK-${String(next).padStart(2, '000')}`;
};

export const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    addProduct: (state, action: PayloadAction<ProductFormValues>) => {
      state.products.unshift({
        ...action.payload,
        id: `prd-${Date.now()}`,
        sku: nextProductSku(state.products),
        categoryName: '',
        supplierName: '',
        createdAt: today(),
      });
    },
    updateProduct: (
      state,
      action: PayloadAction<{ id: string; values: ProductFormValues }>,
    ) => {
      const index = state.products.findIndex(
        (product) => product.id === action.payload.id,
      );
      if (index === -1) return;
      state.products[index] = { ...state.products[index], ...action.payload.values };
    },
    deleteProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(
        (product) => product.id !== action.payload,
      );
    },
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    setProductModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.selectedProduct = null;
      }
    },
  },
});

export const {
  addProduct,
  updateProduct,
  deleteProduct,
  setSelectedProduct,
  setProductModalOpen,
} = productSlice.actions;

export default productSlice.reducer;
