import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Supplier, SupplierFormValues } from '@/types';
import { nhaCungCapApi, type NhaCungCapDTO } from '@/api/nhaCungCap';
import { today } from '@/utils/dateUtils';

export interface SupplierState {
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  isModalOpen: boolean;
  searchQuery: string;
  categoryFilter: string | null;
  statusFilter: Supplier['status'] | null;
  loading: boolean;
  error: string | null;
}

const initialState: SupplierState = {
  suppliers: [],
  selectedSupplier: null,
  isModalOpen: false,
  searchQuery: '',
  categoryFilter: null,
  statusFilter: null,
  loading: false,
  error: null,
};

const mapDtoToSupplier = (dto: NhaCungCapDTO): Supplier => ({
  id: dto.id,
  code: dto.maNcc,
  name: dto.tenNcc,
  taxCode: dto.maSoThue || '',
  phone: dto.soDienThoai || '',
  email: dto.email || '',
  address: dto.diaChi || '',
  contactName: dto.nguoiLienHe || '',
  contactTitle: dto.chucDanhLienHe || '',
  contactPhone: dto.sdtLienHe || '',
  paymentTerms: (dto.dieuKhoanThanhToan || 'Thanh toán ngay') as Supplier['paymentTerms'],
  creditDays: dto.soNgayDuocNo || 0,
  totalDebt: dto.tongCongNo || 0,
  totalOrders: dto.tongDonHang || 0,
  status: dto.dangHoatDong === false ? ('Inactive' as const) : ('Active' as const),
  categories: [],
  createdAt: today(),
  note: dto.ghiChu || '',
});

export const fetchSuppliers = createAsyncThunk('supplier/fetchAll', async () => {
  const data = await nhaCungCapApi.getAll();
  return data.map(mapDtoToSupplier);
});

export const createSupplier = createAsyncThunk(
  'supplier/create',
  async (values: SupplierFormValues) => {
    const dto: NhaCungCapDTO = {
      id: '',
      maNcc: values.code,
      tenNcc: values.name,
      maSoThue: values.taxCode,
      soDienThoai: values.phone,
      email: values.email,
      diaChi: values.address,
      nguoiLienHe: values.contactName,
      chucDanhLienHe: values.contactTitle,
      sdtLienHe: values.contactPhone,
      dieuKhoanThanhToan: values.paymentTerms,
      soNgayDuocNo: values.creditDays,
      dangHoatDong: values.status === 'Active',
      ghiChu: values.note,
    };
    const data = await nhaCungCapApi.create(dto);
    return mapDtoToSupplier(data);
  },
);

export const updateSupplierThunk = createAsyncThunk(
  'supplier/update',
  async ({ id, values }: { id: string; values: SupplierFormValues }) => {
    const dto: Partial<NhaCungCapDTO> = {
      maNcc: values.code,
      tenNcc: values.name,
      maSoThue: values.taxCode,
      soDienThoai: values.phone,
      email: values.email,
      diaChi: values.address,
      nguoiLienHe: values.contactName,
      chucDanhLienHe: values.contactTitle,
      sdtLienHe: values.contactPhone,
      dieuKhoanThanhToan: values.paymentTerms,
      soNgayDuocNo: values.creditDays,
      dangHoatDong: values.status === 'Active',
      ghiChu: values.note,
    };
    const data = await nhaCungCapApi.update(id, dto);
    return mapDtoToSupplier(data);
  },
);

export const deleteSupplierThunk = createAsyncThunk(
  'supplier/delete',
  async (id: string) => {
    await nhaCungCapApi.delete(id);
    return id;
  },
);

export const supplierSlice = createSlice({
  name: 'supplier',
  initialState,
  reducers: {
    setSelectedSupplier: (state, action: PayloadAction<Supplier | null>) => {
      state.selectedSupplier = action.payload;
    },
    setModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = action.payload;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải danh sách';
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.suppliers.unshift(action.payload);
      })
      .addCase(updateSupplierThunk.fulfilled, (state, action) => {
        const index = state.suppliers.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) state.suppliers[index] = action.payload;
      })
      .addCase(deleteSupplierThunk.fulfilled, (state, action) => {
        state.suppliers = state.suppliers.filter((s) => s.id !== action.payload);
      });
  },
});

export const {
  setSelectedSupplier,
  setModalOpen,
  setSearchQuery,
  setCategoryFilter,
  setStatusFilter,
} = supplierSlice.actions;

export default supplierSlice.reducer;