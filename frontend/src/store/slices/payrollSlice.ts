import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
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
import { nowIso } from '@/utils/dateUtils';

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
 * đặt tại `canApprovePayment`, và reducer kiểm tra lại lần nữa để state không
 * bị ghi sai nếu được gọi từ nơi khác.
 *
 * MVP thao tác trực tiếp trên state (không gọi API), nên slice này đóng vai trò
 * một in-memory repository.
 */

export interface PayrollState {
  rows: PayrollRow[];
  /** Dòng đang mở modal điều chỉnh giờ; `null` = modal đóng. */
  adjustingId: string | null;
  /** Thông báo lỗi nghiệp vụ gần nhất (ví dụ tự duyệt cho mình). */
  error: string | null;
  /** Trạng thái tải dữ liệu từ backend. */
  loading: boolean;
}

const initialState: PayrollState = {
  rows: [],
  adjustingId: null,
  error: null,
  loading: false,
};

/** Map từ backend DTO sang frontend PayrollRow. */
const mapDtoToPayrollRow = (dto: BangLuongDTO): PayrollRow => ({
  id: dto.id,
  employeeId: dto.idNhanVien,
  employeeCode: '',
  employeeName: dto.tenNhanVien ?? '',
  role: (dto.loaiHopDong === 'FULL_TIME' ? 'QUAN_LY' : 'THU_NGAN') as UserRole,
  branchId: dto.idChiNhanh,
  branchName: dto.tenChiNhanh ?? '',
  period: dto.thangNam,
  employmentType: dto.loaiHopDong as EmploymentType,
  totalShifts: dto.tongSoCa,
  totalHours: dto.tongGioLam,
  adjustedHours: dto.gioDieuChinh ?? null,
  adjustReason: dto.lyDoDieuChinh ?? '',
  overtimeHours: dto.overtimeHours,
  baseSalary: dto.luongCung,
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

/** Tải bảng lương từ backend (kèm enrich vai trò từ danh sách nhân viên). */
export const fetchPayroll = createAsyncThunk(
  'payroll/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const [list, nvList] = await Promise.all([
        bangLuongApi.getAll(),
        fetch(`${API_BASE_URL}/api/nhan-vien`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }).then((r) => r.json() as Promise<Array<{ id: string; vaiTro?: string; maNhanVien?: string; hoTen?: string }>>),
      ]);

      const roleById = new Map(nvList.map((nv) => [nv.id, nv.vaiTro]));
      const codeById = new Map(nvList.map((nv) => [nv.id, nv.maNhanVien]));

      return list.map((dto) => {
        const row = mapDtoToPayrollRow(dto);
        const role = roleById.get(dto.idNhanVien);
        if (role) row.role = role as UserRole;
        row.employeeCode = codeById.get(dto.idNhanVien) ?? '';
        return row;
      });
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi tải bảng lương');
    }
  },
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** Cập nhật bảng lương (duyệt / xác nhận). */
export const updatePayroll = createAsyncThunk(
  'payroll/update',
  async ({ id, data }: { id: string; data: Partial<BangLuongDTO> }) => {
    const dto = await bangLuongApi.update(id, data);
    return mapDtoToPayrollRow(dto);
  },
);

/** Tự tổng hợp bảng lương tháng từ dữ liệu chấm công, rồi tải lại. */
export const generatePayroll = createAsyncThunk(
  'payroll/generate',
  async (thangNam: string, { rejectWithValue, dispatch }) => {
    try {
      await bangLuongApi.generate(thangNam);
      await dispatch(fetchPayroll()).unwrap();
      return thangNam;
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Lỗi tạo bảng lương');
    }
  },
);

/** Người thực hiện hành động, truyền từ component vì slice không đọc state auth. */
interface Actor {
  /** `nhan_vien.id` của người đang đăng nhập. */
  actorId: string;
  /** Chuỗi hiển thị dạng "Họ Tên (NV-0002)". */
  actorName: string;
  actorRole: UserRole;
}

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
  if (row.status !== PAYROLL_STATUS.Confirmed) return false;
  // Nguyên tắc vàng: không ai tự duyệt lương cho chính mình.
  if (row.employeeId === actorId) return false;

  if (actorRole === USER_ROLE.Admin) return true;
  return actorRole === paymentApproverRole(row.role);
};

/**
 * Tầng 2 — Duyệt chi lương. Action dùng chung cho cả transaction.
 *
 * Theo `luong_nghiep_vu.md` mục 4.2, duyệt chi phải làm 2 việc cùng lúc:
 * chuyển bảng lương sang `DA_THANH_TOAN` **và** tạo phiếu chi sổ quỹ
 * (CHI / TRA_LUONG) cho từng nhân viên. Hai việc thuộc 2 slice khác nhau nên
 * dùng chung một action như cách `saleCompleted` xử lý giao dịch POS:
 *
 * - `payrollSlice`   → đổi trạng thái, ghi người duyệt và thời điểm
 * - `cashbookSlice`  → sinh phiếu chi cho mỗi dòng
 *
 * Component lọc trước bằng `canApprovePayment` rồi truyền danh sách dòng đủ
 * điều kiện, vì reducer của cashbook không đọc được state payroll để tự kiểm.
 */
export const payrollPaid = createAction<{
  /** Các dòng đã được kiểm quyền, sẵn sàng chuyển sang đã thanh toán. */
  rows: PayrollRow[];
  /** Người duyệt, dạng "Họ Tên (NV-0002)". */
  approvedBy: string;
  /** Thời điểm duyệt, ISO string. */
  paidAt: string;
}>('payroll/paid');

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

    /** Tầng 1 — Quản lý chi nhánh xác nhận giờ làm của thu ngân. */
    confirmHours: (
      state,
      action: PayloadAction<Actor & { id: string; actorBranchId: string | null }>,
    ) => {
      const row = state.rows.find((item) => item.id === action.payload.id);
      if (!row) return;

      if (
        !canConfirmHours(
          row,
          action.payload.actorId,
          action.payload.actorRole,
          action.payload.actorBranchId,
        )
      ) {
        state.error = 'Bạn không có quyền xác nhận giờ làm cho bảng lương này.';
        return;
      }

      row.status = PAYROLL_STATUS.Confirmed;
      row.confirmedBy = action.payload.actorName;
      row.confirmedAt = nowIso();
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
      .addCase(generatePayroll.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(generatePayroll.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Lỗi tạo bảng lương';
      })
      /**
       * Chuyển các dòng đã duyệt sang `DA_THANH_TOAN`.
       *
       * Component đã lọc bằng `canApprovePayment` trước khi dispatch, nhưng vẫn
       * kiểm lại ở đây — action công khai nên có thể được gọi từ nơi khác.
       */
      .addCase(payrollPaid, (state, action) => {
        for (const paidRow of action.payload.rows) {
          const row = state.rows.find((item) => item.id === paidRow.id);
          if (!row || row.status !== PAYROLL_STATUS.Confirmed) continue;

          row.status = PAYROLL_STATUS.Paid;
          row.paidBy = action.payload.approvedBy;
          row.paidAt = action.payload.paidAt;
        }
        state.error = null;
      });
  },
});

export const {
  openHourAdjust,
  closeHourAdjust,
  adjustHours,
  resetHourAdjust,
  confirmHours,
  clearPayrollError,
} = payrollSlice.actions;

export default payrollSlice.reducer;
