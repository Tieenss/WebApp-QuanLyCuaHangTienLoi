import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Employee, EmployeeFormValues } from '@/types';
import { nhanVienApi, type NhanVienDTO } from '@/api/nhanVien';
import { today } from '@/utils/dateUtils';

export interface EmployeeState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  isModalOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: EmployeeState = {
  employees: [],
  selectedEmployee: null,
  isModalOpen: false,
  loading: false,
  error: null,
};

const mapDtoToEmployee = (dto: NhanVienDTO): Employee => ({
  id: dto.id,
  code: dto.maNhanVien || '',
  fullName: dto.hoTen,
  branchId: dto.idChiNhanh || '',
  branchName: '',
  position: dto.viTri || '',
  role: (dto.vaiTro || 'THU_NGAN') as Employee['role'],
  defaultShift: (dto.caMacDinh || 'MORNING') as Employee['defaultShift'],
  employmentType: (dto.loaiHopDong || 'FULL_TIME') as Employee['employmentType'],
  hourlyWage: dto.luongTheoGio || 0,
  baseSalary: dto.luongCung || 0,
  phone: dto.soDienThoai || '',
  email: dto.email || '',
  avatarText: dto.hoTen?.charAt(0) || 'U',
  joinedAt: dto.ngayVaoLam || today(),
  status: dto.trangThai === 'INACTIVE' ? ('Inactive' as const) : ('Active' as const),
});

export const fetchEmployees = createAsyncThunk('employee/fetchAll', async () => {
  const data = await nhanVienApi.getAll();
  return data.map(mapDtoToEmployee);
});

export const createEmployee = createAsyncThunk(
  'employee/create',
  async (values: EmployeeFormValues) => {
    const dto: NhanVienDTO = {
      id: '',
      maNhanVien: values.code,
      hoTen: values.fullName,
      email: values.email,
      soDienThoai: values.phone,
      vaiTro: values.role,
      viTri: values.position,
      loaiHopDong: values.employmentType,
      caMacDinh: values.defaultShift,
      luongTheoGio: values.hourlyWage,
      luongCung: values.baseSalary,
      idChiNhanh: values.branchId,
      trangThai: values.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
    };
    const data = await nhanVienApi.create(dto);
    return mapDtoToEmployee(data);
  },
);

export const updateEmployeeThunk = createAsyncThunk(
  'employee/update',
  async ({ id, values }: { id: string; values: EmployeeFormValues }) => {
    const dto: Partial<NhanVienDTO> = {
      maNhanVien: values.code,
      hoTen: values.fullName,
      email: values.email,
      soDienThoai: values.phone,
      vaiTro: values.role,
      viTri: values.position,
      loaiHopDong: values.employmentType,
      caMacDinh: values.defaultShift,
      luongTheoGio: values.hourlyWage,
      luongCung: values.baseSalary,
      idChiNhanh: values.branchId,
      trangThai: values.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
    };
    const data = await nhanVienApi.update(id, dto);
    return mapDtoToEmployee(data);
  },
);

export const deleteEmployeeThunk = createAsyncThunk(
  'employee/delete',
  async (id: string) => {
    await nhanVienApi.delete(id);
    return id;
  },
);

export const employeeSlice = createSlice({
  name: 'employee',
  initialState,
  reducers: {
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload;
    },
    setEmployeeModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isModalOpen = action.payload;
      if (!action.payload) {
        state.selectedEmployee = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải danh sách';
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.employees.unshift(action.payload);
      })
      .addCase(updateEmployeeThunk.fulfilled, (state, action) => {
        const index = state.employees.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) state.employees[index] = action.payload;
      })
      .addCase(deleteEmployeeThunk.fulfilled, (state, action) => {
        state.employees = state.employees.filter((e) => e.id !== action.payload);
      });
  },
});

export const { setSelectedEmployee, setEmployeeModalOpen } = employeeSlice.actions;
export default employeeSlice.reducer;