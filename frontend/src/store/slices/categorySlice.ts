import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Category, CategoryFormValues } from '@/types';
import { danhMucApi, type DanhMucDTO } from '@/api/danhMuc';

export interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  loading: false,
  error: null,
};

const mapDtoToCategory = (dto: DanhMucDTO): Category => ({
  id: dto.id,
  code: dto.maDanhMuc,
  name: dto.tenDanhMuc,
  parentId: dto.parentId || null,
  description: dto.moTa || '',
  icon: dto.iconEmoji || '',
  color: dto.mauHex || '#000000',
  displayOrder: dto.thuTuHienThi || 999,
  productCount: dto.productCount || 0,
  status: dto.dangHoatDong === false ? ('Inactive' as const) : ('Active' as const),
});

export const fetchCategories = createAsyncThunk('category/fetchAll', async () => {
  const data = await danhMucApi.getAll();
  return data.map(mapDtoToCategory);
});

export const createCategory = createAsyncThunk(
  'category/create',
  async (values: CategoryFormValues) => {
    const rawIcon = (values as any).icon;
    const rawColor = (values as any).color;
    const dto: DanhMucDTO = {
      id: '',
      maDanhMuc: values.code,
      tenDanhMuc: values.name,
      parentId: values.parentId || undefined,
      moTa: values.description,
      // Form dùng name="icon" (Input) và name="color" (ColorPicker trả object)
      iconEmoji: typeof rawIcon === 'string' ? rawIcon : values.iconEmoji,
      imageUrl: typeof (values as any).imageUrl === 'string' ? (values as any).imageUrl : undefined,
      // ColorPicker trả object có toHexString(); nếu là string thì dùng luôn
      mauHex: typeof rawColor === 'string' ? rawColor : (rawColor?.toHexString?.() ?? values.colorHex),
      thuTuHienThi: values.displayOrder,
      dangHoatDong: values.status === 'Active',
    };
    const data = await danhMucApi.create(dto);
    return mapDtoToCategory(data);
  },
);

export const updateCategoryThunk = createAsyncThunk(
  'category/update',
  async ({ id, values }: { id: string; values: CategoryFormValues }) => {
    const rawIcon = (values as any).icon;
    const rawColor = (values as any).color;
    const dto: Partial<DanhMucDTO> = {
      maDanhMuc: values.code,
      tenDanhMuc: values.name,
      parentId: values.parentId || undefined,
      moTa: values.description,
      iconEmoji: typeof rawIcon === 'string' ? rawIcon : values.iconEmoji,
      imageUrl: typeof (values as any).imageUrl === 'string' ? (values as any).imageUrl : undefined,
      mauHex: typeof rawColor === 'string' ? rawColor : (rawColor?.toHexString?.() ?? values.colorHex),
      thuTuHienThi: values.displayOrder,
      dangHoatDong: values.status === 'Active',
    };
    const data = await danhMucApi.update(id, dto);
    return mapDtoToCategory(data);
  },
);

export const deleteCategoryThunk = createAsyncThunk(
  'category/delete',
  async (id: string) => {
    await danhMucApi.delete(id);
    return id;
  },
);

export const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    addCategoryLocal: (state, action: PayloadAction<Category>) => {
      state.categories.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải danh sách';
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.unshift(action.payload);
      })
      .addCase(updateCategoryThunk.fulfilled, (state, action) => {
        const index = state.categories.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.categories[index] = action.payload;
      })
      .addCase(deleteCategoryThunk.fulfilled, (state, action) => {
        state.categories = state.categories.filter((c) => c.id !== action.payload);
      });
  },
});

export const { addCategoryLocal } = categorySlice.actions;
export default categorySlice.reducer;