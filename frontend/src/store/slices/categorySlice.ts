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
  createdAt: dto.ngayTao,
  updatedAt: dto.ngayCapNhat || dto.ngayTao || undefined,
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

/**
 * Soft delete: gọi DELETE backend (backend sẽ set dangHoatDong=false).
 * Store cập nhật status thành Inactive thay vì xoá record khỏi danh sách
 * để trang vẫn hiển thị danh mục với trạng thái "Ngừng hoạt động".
 */
export const deleteCategoryThunk = createAsyncThunk(
  'category/delete',
  async (id: string) => {
    const res = await danhMucApi.delete(id);
    return { id, message: res?.message };
  },
);

export const restoreCategoryThunk = createAsyncThunk(
  'category/restore',
  async (id: string) => {
    const res = await danhMucApi.restore(id);
    return { id, message: res?.message };
  },
);

/** Di chuyển danh mục lên trên (swap với phần tử liền kề nhỏ hơn). */
export const moveCategoryUp = createAsyncThunk(
  'category/moveUp',
  async (id: string) => {
    await danhMucApi.moveUp(id);
    return id;
  },
);

/** Di chuyển danh mục xuống dưới (swap với phần tử liền kề lớn hơn). */
export const moveCategoryDown = createAsyncThunk(
  'category/moveDown',
  async (id: string) => {
    await danhMucApi.moveDown(id);
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
      // Soft delete: chuyển status → Inactive thay vì xoá khỏi store
      .addCase(deleteCategoryThunk.fulfilled, (state, action) => {
        const index = state.categories.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.categories[index].status = 'Inactive';
      })
      // Restore: chuyển status → Active
      .addCase(restoreCategoryThunk.fulfilled, (state, action) => {
        const index = state.categories.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.categories[index].status = 'Active';
      })
      // Sau khi move, fetch lại từ backend để có thứ tự chính xác
      .addCase(moveCategoryUp.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(moveCategoryDown.fulfilled, (state) => {
        state.loading = false;
      });
  },
});

export const { addCategoryLocal } = categorySlice.actions;
export default categorySlice.reducer;