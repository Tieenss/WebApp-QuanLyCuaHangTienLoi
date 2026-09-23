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
  kind: dto.loai === 'KHO_TONG'
    ? ('DISTRIBUTION_CENTER' as const)
    : ('STORE' as const),
  phone: dto.soDienThoai || '',
  openingHours: dto.gioMoCua || '',
  managerName: '',
  managerId: dto.idQuanLy,
  employeeCount: 0,
  areaSqm: dto.dienTichM2 ? Number(dto.dienTichM2) : 0,
  monthlyRevenue: dto.doanhThuThang || 0,
  openedAt: dto.ngayKhaiTruong || today(),
  status: dto.dangHoatDong === false ? ('Inactive' as const) : ('Active' as const),
  createdAt: dto.ngayTao,
  updatedAt: dto.ngayCapNhat || dto.ngayTao || undefined,
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
      loai: values.kind === 'DISTRIBUTION_CENTER' ? 'KHO_TONG' : 'CUA_HANG_BAN_LE',
      dangHoatDong: values.status === 'Active',
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
      dienTichM2: values.areaSqm,
      loai: values.kind === 'DISTRIBUTION_CENTER' ? 'KHO_TONG' : 'CUA_HANG_BAN_LE',
      dangHoatDong: values.status === 'Active',
    };
    const data = await chiNhanhApi.update(id, dto);
    return mapDtoToBranch(data);
  },
);

export const deleteBranchThunk = createAsyncThunk(
  'branch/delete',
  async (id: string) => {
    const data = await chiNhanhApi.delete(id);
    return mapDtoToBranch(data);
  },
);

export const assignBranchManager = createAsyncThunk(
  'branch/assignManager',
  async ({ branchId, employeeId }: { branchId: string; employeeId: string }) => {
    const data = await chiNhanhApi.assignQuanLy(branchId, employeeId);
    return mapDtoToBranch(data);
  },
);

export const clearBranchManager = createAsyncThunk(
  'branch/clearManager',
  async (branchId: string) => {
    const data = await chiNhanhApi.clearQuanLy(branchId);
    return mapDtoToBranch(data);
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
      .addCase(assignBranchManager.fulfilled, (state, action) => {
        const index = state.branches.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) state.branches[index] = action.payload;
      })
      .addCase(clearBranchManager.fulfilled, (state, action) => {
        const index = state.branches.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) state.branches[index] = action.payload;
      })
      .addCase(deleteBranchThunk.fulfilled, (state, action) => {
        const index = state.branches.findIndex((b) => b.id === action.payload.id);
        if (index !== -1) state.branches[index] = action.payload;
      });
  },
});

export const { setSelectedBranch, setBranchModalOpen } = branchSlice.actions;
export default branchSlice.reducer;
