import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Branch, BranchFormValues } from '@/types';
import { chiNhanhApi, type ChiNhanhDTO } from '@/api/chiNhanh';
import { today } from '@/utils/dateUtils';

export interface BranchState {
  branches: Branch[];
  selectedBranch: Branch | null;
  isModalOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: BranchState = {
  branches: [],
  selectedBranch: null,
  isModalOpen: false,
  loading: false,
  error: null,
};

const mapDtoToBranch = (dto: ChiNhanhDTO): Branch => ({
  id: dto.id,
  code: dto.maChiNhanh,
  name: dto.tenChiNhanh,
  addressLine: dto.diaChiChiTiet || dto.diaChi || '',
  district: dto.quanHuyen || '',
  province: dto.tinhThanh || '',
  region: (dto.vungMien || 'SOUTH') as Branch['region'],
  kind: (dto.loaiChiNhanh === 'KHO_TONG' || dto.loai === 'KHO_TONG')
    ? ('DISTRIBUTION_CENTER' as const)
    : ('STORE' as const),
  phone: dto.soDienThoai || '',
  openingHours: dto.gioMoCua || '',
  managerName: dto.tenQuanLy || '',
  employeeCount: 0,
  areaSqm: dto.dienTichM2 ? Number(dto.dienTichM2) : 0,
  monthlyRevenue: dto.doanhThuThang || 0,
  openedAt: dto.ngayKhaiTruong || today(),
  status: (dto.dangHoatDong === false || dto.trangThai === 'INACTIVE') ? ('Inactive' as const) : ('Active' as const),
});

export const fetchBranches = createAsyncThunk('branch/fetchAll', async () => {
  const data = await chiNhanhApi.getAll();
  return data.map(mapDtoToBranch);
});

export const fetchKhoTong = createAsyncThunk('branch/fetchKhoTong', async () => {
  const data = await chiNhanhApi.getKhoTong();
  return data.map(mapDtoToBranch);
});

export const fetchCuaHang = createAsyncThunk('branch/fetchCuaHang', async () => {
  const data = await chiNhanhApi.getCuaHang();
  return data.map(mapDtoToBranch);
});

export const createBranch = createAsyncThunk(
  'branch/create',
  async (values: BranchFormValues) => {
    const dto: ChiNhanhDTO = {
      id: '',
      maChiNhanh: values.code,
      tenChiNhanh: values.name,
      diaChiChiTiet: values.addressLine,
      tinhThanh: values.province,
      quanHuyen: values.district,
      vungMien: values.region,
      soDienThoai: values.phone,
      gioMoCua: values.openingHours,
      dienTichM2: values.areaSqm,
      loaiChiNhanh: values.kind === 'DISTRIBUTION_CENTER' ? 'KHO_TONG' : 'CUA_HANG_BAN_LE',
      dangHoatDong: values.status === 'Active',
      trangThai: values.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
      tenQuanLy: values.managerName,
    };
    const data = await chiNhanhApi.create(dto);
    return mapDtoToBranch(data);
  },
);

export const updateBranchThunk = createAsyncThunk(
  'branch/update',
  async ({ id, values }: { id: string; values: BranchFormValues }) => {
    const dto: Partial<ChiNhanhDTO> = {
      maChiNhanh: values.code,
      tenChiNhanh: values.name,
      diaChiChiTiet: values.addressLine,
      tinhThanh: values.province,
      quanHuyen: values.district,
      vungMien: values.region,
      soDienThoai: values.phone,
      gioMoCua: values.openingHours,
      tenQuanLy: values.managerName,
      dienTichM2: values.areaSqm,
      loaiChiNhanh: values.kind === 'DISTRIBUTION_CENTER' ? 'KHO_TONG' : 'CUA_HANG_BAN_LE',
      dangHoatDong: values.status === 'Active',
      trangThai: values.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
    };
    const data = await chiNhanhApi.update(id, dto);
    return mapDtoToBranch(data);
  },
);

export const deleteBranchThunk = createAsyncThunk(
  'branch/delete',
  async (id: string) => {
    await chiNhanhApi.delete(id);
    return id;
  },
);

export const branchSlice = createSlice({
  name: 'branch',
  initialState,
  reducers: {
    setSelectedBranch: (state, action: PayloadAction<Branch | null>) => {
      state.selectedBranch = action.payload;
    },
    setBranchModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.selectedBranch = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải danh sách';
      })
      .addCase(createBranch.fulfilled, (state, action) => {
        state.branches.unshift(action.payload);
      })
      .addCase(updateBranchThunk.fulfilled, (state, action) => {
        const index = state.branches.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) state.branches[index] = action.payload;
      })
      .addCase(deleteBranchThunk.fulfilled, (state, action) => {
        state.branches = state.branches.filter((b) => b.id !== action.payload);
      });
  },
});

export const { setSelectedBranch, setBranchModalOpen } = branchSlice.actions;
export default branchSlice.reducer;