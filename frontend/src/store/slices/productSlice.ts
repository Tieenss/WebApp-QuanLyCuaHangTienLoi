import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductFormValues } from '@/types';
import { sanPhamApi, type SanPhamDTO } from '@/api/sanPham';
import { today } from '@/utils/dateUtils';

export interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  isModalOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  isModalOpen: false,
  loading: false,
  error: null,
};

const mapDtoToProduct = (dto: SanPhamDTO): Product => ({
  id: dto.id,
  sku: dto.sku || '',
  barcode: dto.maVach || '',
  name: dto.tenSanPham,
  categoryId: dto.idDanhMuc || '',
  categoryName: '',
  unit: (dto.donVi as Product['unit']) || 'PIECE',
  costPrice: dto.giaVon || 0,
  salePrice: dto.giaBan,
  vatPercent: dto.vatPhantram || 8,
  supplierId: dto.idNhaCungCap || '',
  supplierName: '',
  minStock: dto.tonToiThieu || 0,
  maxStock: dto.tonToiDa || 0,
  isPerishable: dto.deHong || false,
  shelfLifeDays: dto.hanSuDungNgay || 0,
  imageUrl: dto.imageUrl || '',
  status: dto.dangHoatDong === false ? ('Inactive' as const) : ('Active' as const),
  createdAt: today(),
});

export const fetchProducts = createAsyncThunk('product/fetchAll', async () => {
  const data = await sanPhamApi.getAll();
  return data.map(mapDtoToProduct);
});

export const createProduct = createAsyncThunk(
  'product/create',
  async (values: ProductFormValues) => {
    const dto: SanPhamDTO = {
      id: '',
      sku: values.sku,
      maVach: values.barcode,
      tenSanPham: values.name,
      idDanhMuc: values.categoryId,
      donVi: values.unit,
      giaVon: values.costPrice,
      giaBan: values.salePrice,
      vatPhantram: values.vatPercent,
      idNhaCungCap: values.supplierId,
      tonToiThieu: values.minStock,
      tonToiDa: values.maxStock,
      deHong: values.isPerishable,
      hanSuDungNgay: values.shelfLifeDays,
      imageUrl: values.imageUrl,
      dangHoatDong: values.status === 'Active',
    };
    const data = await sanPhamApi.create(dto);
    return mapDtoToProduct(data);
  },
);

export const updateProductThunk = createAsyncThunk(
  'product/update',
  async ({ id, values }: { id: string; values: ProductFormValues }) => {
    const dto: Partial<SanPhamDTO> = {
      sku: values.sku,
      maVach: values.barcode,
      tenSanPham: values.name,
      idDanhMuc: values.categoryId,
      donVi: values.unit,
      giaVon: values.costPrice,
      giaBan: values.salePrice,
      vatPhantram: values.vatPercent,
      idNhaCungCap: values.supplierId,
      tonToiThieu: values.minStock,
      tonToiDa: values.maxStock,
      deHong: values.isPerishable,
      hanSuDungNgay: values.shelfLifeDays,
      imageUrl: values.imageUrl,
      dangHoatDong: values.status === 'Active',
    };
    const data = await sanPhamApi.update(id, dto);
    return mapDtoToProduct(data);
  },
);

export const deleteProductThunk = createAsyncThunk(
  'product/delete',
  async (id: string) => {
    await sanPhamApi.delete(id);
    return id;
  },
);

export const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải danh sách';
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.products.unshift(action.payload);
      })
      .addCase(updateProductThunk.fulfilled, (state, action) => {
        const index = state.products.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) state.products[index] = action.payload;
      })
      .addCase(deleteProductThunk.fulfilled, (state, action) => {
        state.products = state.products.filter((p) => p.id !== action.payload);
      });
  },
});

export const { setSelectedProduct, setProductModalOpen } = productSlice.actions;
export default productSlice.reducer;