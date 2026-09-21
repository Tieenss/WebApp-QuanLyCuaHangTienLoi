import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  PAYROLL_STATUS,
  USER_ROLE,
  paymentApproverRole,
  requiresHourConfirmation,
  type EmploymentType,
  type PayrollRow,
  type PayrollStatus,
  type UserRole,
} from '@/types';
import { bangLuongApi, type BangLuongDTO } from '@/api/bangLuong';

/**
 * Module 11 — Duyệt lương 2 tầng.
 *
 * Luồng theo `luong_nghiep_vu.md` mục 2.3 và 4.2:
 *
 *   CHO_XAC_NHAN --(Quản lý xác nhận giờ)--> DA_XAC_NHAN --(Kế toán duyệt chi)--> DA_THANH_TOAN
 *
 * Chỉ bảng lương của THU_NGAN đi qua tầng 1. Các vai trò khác tự quản giờ làm
 * nên bắt đầu ngay ở `DA_XAC_NHAN`.
 *
 * Nguyên tắc vàng của đặc tả: "Không ai tự duyệt lương cho chính mình" — cài
 * đặt tại backend và được phản ánh ở UI qua các async thunk bên dưới.
 */

export interface PayrollState {
  rows: PayrollRow[];
  /** Dòng đang mở modal điều chỉnh giờ; `null` = modal đóng. */
  adjustingId: string | null;
  /** Thông báo lỗi nghiệp vụ gần nhất (ví dụ tự duyệt cho mình). */
  error: string | null;
  /** Trạng thái tải dữ liệu từ backend. */
  loading: boolean;
  savingAdjustment: boolean;
}

const initialState: PayrollState = {
  rows: [],
  adjustingId: null,
  error: null,
  loading: false,
  savingAdjustment: false,
};

/** Map từ backend DTO sang frontend PayrollRow. */
const mapDtoToPayrollRow = (dto: BangLuongDTO): PayrollRow => ({
  id: dto.id,
  employeeId: dto.idNhanVien,
  employeeCode: dto.maNhanVien ?? '',
  employeeName: dto.tenNhanVien ?? '',
  role: (dto.vaiTro || (dto.loaiHopDong === 'FULL_TIME' ? 'QUAN_LY' : 'THU_NGAN')) as UserRole,
  branchId: dto.idChiNhanh,
  branchName: dto.tenChiNhanh ?? '',
  period: dto.thangNam,
  employmentType: dto.loaiHopDong as EmploymentType,
  totalShifts: dto.tongSoCa,
  totalHours: dto.tongGioLam,
  adjustedHours: dto.gioDieuChinh ?? null,
  adjustReason: dto.lyDoDieuChinh ?? '',
  overtimeHours: dto.overtimeHours,
  baseSalary: dto.luongCungThucTe ?? dto.luongCung,
  shiftPay: dto.tienCongTheoGio,
  overtimePay: dto.tienOt,
  bonus: dto.thuong,
  deduction: dto.khauTru,
  netPay: dto.tongTienLuong,
  status: (dto.trangThai || 'CHO_XAC_NHAN') as PayrollStatus,
  confirmedBy: dto.tenNguoiXacNhan ?? null,
  confirmedAt: dto.ngayXacNhan ?? null,
  paidBy: dto.tenNguoiThanhToan ?? null,
  paidAt: dto.ngayThanhToan ?? null,
});

/** Tải bảng lương theo scope; SELF không gọi API nhân sự để tránh lộ dữ liệu. */
export interface PayrollFetchOptions {
  scope?: 'SELF' | 'SCOPED';
  period?: string;
}

export const fetchPayroll = createAsyncThunk(
  'payroll/fetchAll',
  async ({ scope = 'SCOPED', period }: PayrollFetchOptions = {}, { rejectWithValue }) => {
    try {
      const list = scope === 'SELF' ? await bangLuongApi.getMine(period) : await bangLuongApi.getAll(period);
      return list.map(mapDtoToPayrollRow);
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi tải bảng lương');
    }
  },
);



/** Cập nhật bảng lương (duyệt / xác nhận). */
export const updatePayroll = createAsyncThunk(
  'payroll/update',
  async ({ id, data }: { id: string; data: Partial<BangLuongDTO> }) => {
    const dto = await bangLuongApi.update(id, data);
    return mapDtoToPayrollRow(dto);
  },
);

export const adjustPayrollHours = createAsyncThunk(
  'payroll/adjustHours',
  async ({ id, hours, reason }: { id: string; hours: number; reason: string }, { rejectWithValue }) => {
    try {
      return mapDtoToPayrollRow(await bangLuongApi.adjustHours(id, hours, reason));
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi lưu điều chỉnh giờ');
    }
  },
);

export const confirmPayrollHours = createAsyncThunk(
  'payroll/confirmHours',
  async (id: string, { rejectWithValue }) => {
    try { return mapDtoToPayrollRow(await bangLuongApi.confirmHours(id)); }
    catch (e: any) { return rejectWithValue(e?.message || 'Lỗi xác nhận giờ làm'); }
  },
);

export const approvePayrollPayment = createAsyncThunk(
  'payroll/approvePayment',
  async (id: string, { rejectWithValue }) => {
    try { return mapDtoToPayrollRow(await bangLuongApi.approvePayment(id)); }
    catch (e: any) { return rejectWithValue(e?.message || 'Lỗi duyệt chi lương'); }
  },
);

export const approvePayrollPaymentBatch = createAsyncThunk(
  'payroll/approvePaymentBatch',
  async (ids: string[], { rejectWithValue }) => {
    try { return (await bangLuongApi.approvePaymentBatch(ids)).map(mapDtoToPayrollRow); }
    catch (e: any) { return rejectWithValue(e?.message || 'Lỗi duyệt chi các bảng lương đã chọn'); }
  },
);

/** Tự tổng hợp bảng lương tháng từ dữ liệu chấm công, rồi tải lại. */
export const generatePayroll = createAsyncThunk(
  'payroll/generate',
  async (thangNam: string, { rejectWithValue, dispatch }) => {
    try {
      await bangLuongApi.generate(thangNam);
      await dispatch(fetchPayroll({ period: thangNam })).unwrap();
      return thangNam;
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi tạo bảng lương');
    }
  },
);

/**
 * Quản lý chi nhánh có được xác nhận giờ cho dòng này không (Tầng 1).
 *
 * Ba điều kiện: dòng đang chờ xác nhận, vai trò nhân viên thuộc diện phải qua
 * tầng 1, và người xác nhận là Quản lý cùng chi nhánh (hoặc Admin).
 */
export const canConfirmHours = (
  row: PayrollRow,
  actorId: string,
  actorRole: UserRole,
  actorBranchId: string | null,
): boolean => {
  if (row.status !== PAYROLL_STATUS.PendingConfirm) return false;
  if (!requiresHourConfirmation(row.role)) return false;
  // Không tự xác nhận giờ cho chính mình.
  if (row.employeeId === actorId) return false;

  if (actorRole === USER_ROLE.Admin) return true;
  return actorRole === USER_ROLE.StoreManager && row.branchId === actorBranchId;
};

/**
 * Người đang đăng nhập có được duyệt chi dòng này không (Tầng 2).
 *
 * Lương Kế toán do Admin duyệt; các vai trò còn lại do Kế toán duyệt. Admin
 * được duyệt mọi dòng vì là quyền cao nhất, nhưng vẫn không được tự duyệt cho
 * chính mình.
 */
export const canApprovePayment = (
  row: PayrollRow,
  actorId: string,
  actorRole: UserRole,
): boolean => {
  const needsConfirmation = requiresHourConfirmation(row.role);
  if (needsConfirmation && row.status !== PAYROLL_STATUS.Confirmed) return false;
  if (!needsConfirmation && row.status !== PAYROLL_STATUS.PendingConfirm && row.status !== PAYROLL_STATUS.Confirmed) return false;
  // Nguyên tắc vàng: không ai tự duyệt lương cho chính mình.
  if (row.employeeId === actorId) return false;

  if (actorRole === USER_ROLE.Admin) return true;
  return actorRole === paymentApproverRole(row.role);
};

/**
 * Tính lại tiền lương sau khi Quản lý điều chỉnh giờ làm.
 *
 * Đơn giá hiệu dụng suy ra từ `shiftPay / totalHours` — cách này giữ nguyên hệ
 * số ca đã tính khi tổng hợp, thay vì phải đọc lại từng bản ghi chấm công.
 *
 * Nhân sự full-time (`shiftPay = 0`) ăn lương cứng, nên điều chỉnh giờ không
 * làm thay đổi thực nhận; đây là hành vi đúng theo cách `buildPayroll` phân
 * biệt full-time / part-time.
 */
const recalculateNetPay = (row: PayrollRow, hours: number): Pick<
  PayrollRow,
  'shiftPay' | 'netPay'
> => {
  const effectiveRate = row.totalHours > 0 ? row.shiftPay / row.totalHours : 0;
  const shiftPay = Math.round(effectiveRate * hours);

  return {
    shiftPay,
    netPay: Math.round(
      row.baseSalary + shiftPay + row.overtimePay + row.bonus - row.deduction,
    ),
  };
};

export const payrollSlice = createSlice({
  name: 'payroll',
  initialState,
  reducers: {
    /** Mở modal điều chỉnh giờ cho một dòng. */
    openHourAdjust: (state, action: PayloadAction<string>) => {
      state.adjustingId = action.payload;
      state.error = null;
    },

    closeHourAdjust: (state) => {
      state.adjustingId = null;
    },

    /**
     * Quản lý sửa giờ làm kèm lý do (bắt buộc theo `bang_luong.ly_do_dieu_chinh`).
     * Chỉ sửa được khi dòng còn ở trạng thái chờ xác nhận.
     */
    adjustHours: (
      state,
      action: PayloadAction<{ id: string; hours: number; reason: string }>,
    ) => {
      const row = state.rows.find((item) => item.id === action.payload.id);
      if (!row) return;
      if (row.status !== PAYROLL_STATUS.PendingConfirm) {
        state.error = 'Chỉ điều chỉnh được giờ làm khi bảng lương chưa xác nhận.';
        return;
      }

      const hours = Math.max(0, action.payload.hours);
      const recalculated = recalculateNetPay(row, hours);

      row.adjustedHours = hours;
      row.adjustReason = action.payload.reason.trim();
      row.shiftPay = recalculated.shiftPay;
      row.netPay = recalculated.netPay;

      state.adjustingId = null;
      state.error = null;
    },

    /** Bỏ điều chỉnh, trả tiền lương về theo giờ hệ thống tổng hợp. */
    resetHourAdjust: (state, action: PayloadAction<string>) => {
      const row = state.rows.find((item) => item.id === action.payload);
      if (!row || row.status !== PAYROLL_STATUS.PendingConfirm) return;

      const recalculated = recalculateNetPay(row, row.totalHours);
      row.adjustedHours = null;
      row.adjustReason = '';
      row.shiftPay = recalculated.shiftPay;
      row.netPay = recalculated.netPay;
      state.error = null;
    },

    clearPayrollError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchPayroll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayroll.fulfilled, (state, action) => {
        state.loading = false;
        state.rows = action.payload;
      })
      .addCase(fetchPayroll.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Lỗi tải bảng lương';
      })
      .addCase(updatePayroll.fulfilled, (state, action) => {
        const idx = state.rows.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.rows[idx] = action.payload;
      })
      .addCase(updatePayroll.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Lỗi cập nhật bảng lương';
      })
      .addCase(adjustPayrollHours.pending, (state) => {
        state.savingAdjustment = true;
        state.error = null;
      })
      .addCase(adjustPayrollHours.fulfilled, (state, action) => {
        const idx = state.rows.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.rows[idx] = action.payload;
        state.savingAdjustment = false;
        state.adjustingId = null;
      })
      .addCase(adjustPayrollHours.rejected, (state, action) => {
        state.savingAdjustment = false;
        state.error = (action.payload as string) || 'Lỗi lưu điều chỉnh giờ';
      })
      .addCase(confirmPayrollHours.fulfilled, (state, action) => {
        const idx = state.rows.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.rows[idx] = action.payload;
      })
      .addCase(confirmPayrollHours.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Lỗi xác nhận giờ làm';
      })
      .addCase(approvePayrollPayment.fulfilled, (state, action) => {
        const idx = state.rows.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.rows[idx] = action.payload;
      })
      .addCase(approvePayrollPayment.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Lỗi duyệt chi lương';
      })
      .addCase(approvePayrollPaymentBatch.fulfilled, (state, action) => {
        for (const payroll of action.payload) {
          const idx = state.rows.findIndex((row) => row.id === payroll.id);
          if (idx !== -1) state.rows[idx] = payroll;
        }
      })
      .addCase(approvePayrollPaymentBatch.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Lỗi duyệt chi các bảng lương đã chọn';
      })
      .addCase(generatePayroll.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(generatePayroll.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Lỗi tạo bảng lương';
      });
  },
});

export const {
  openHourAdjust,
  closeHourAdjust,
  adjustHours,
  resetHourAdjust,
  clearPayrollError,
} = payrollSlice.actions;

export default payrollSlice.reducer;
