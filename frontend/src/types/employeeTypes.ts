import type { ID, RecordStatus, VND } from './commonTypes';
import { USER_ROLE, type UserRole } from './authTypes';

/**
 * Module 4 — Quản lý Nhân viên & Module 11 — Chấm công / Bảng lương.
 *
 * Cửa hàng tiện lợi vận hành 24/7 nên ca làm việc là trục dữ liệu chính:
 * mọi bản ghi chấm công đều gắn với một `ShiftCode`.
 */
export const SHIFT_CODE = {
  Morning: 'MORNING',
  Afternoon: 'AFTERNOON',
  Night: 'NIGHT',
} as const;

export type ShiftCode = (typeof SHIFT_CODE)[keyof typeof SHIFT_CODE];

export const SHIFT_LABEL: Record<ShiftCode, string> = {
  MORNING: 'Ca sáng (06:00 - 14:00)',
  AFTERNOON: 'Ca chiều (14:00 - 22:00)',
  NIGHT: 'Ca đêm (22:00 - 06:00)',
};

export const SHIFT_SHORT_LABEL: Record<ShiftCode, string> = {
  MORNING: 'Sáng',
  AFTERNOON: 'Chiều',
  NIGHT: 'Đêm',
};

/** Hệ số lương theo ca — ca đêm được phụ cấp cao hơn. */
export const SHIFT_RATE_MULTIPLIER: Record<ShiftCode, number> = {
  MORNING: 1,
  AFTERNOON: 1,
  NIGHT: 1.3,
};

/** Loại hợp đồng, ảnh hưởng tới cách tính lương (theo giờ hoặc theo tháng). */
export const EMPLOYMENT_TYPE = {
  FullTime: 'FULL_TIME',
  PartTime: 'PART_TIME',
} as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPE)[keyof typeof EMPLOYMENT_TYPE];

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: 'Toàn thời gian',
  PART_TIME: 'Bán thời gian',
};

export interface Employee {
  id: ID;
  /** Mã nhân viên dạng NV-0012. */
  code: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  position: string;
  branchId: ID;
  branchName: string;
  employmentType: EmploymentType;
  /** Ca làm việc mặc định được phân công. */
  defaultShift: ShiftCode;
  /** Lương theo giờ (part-time) hoặc quy đổi theo giờ (full-time). */
  hourlyWage: VND;
  /** Lương cứng theo tháng, 0 với nhân viên part-time. */
  baseSalary: VND;
  joinedAt: string;
  status: RecordStatus;
  avatarText: string;
}

export type EmployeeFormValues = Omit<Employee, 'id' | 'code' | 'avatarText' | 'branchName'>;

/**
 * Module 11 — Bản ghi chấm công của 1 nhân viên trong 1 ca.
 * `checkOutAt` để trống nghĩa là nhân viên chưa kết thúc ca.
 */
export const ATTENDANCE_STATUS = {
  Present: 'PRESENT',
  Late: 'LATE',
  Absent: 'ABSENT',
  Leave: 'LEAVE',
} as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Đủ giờ',
  LATE: 'Đi muộn',
  ABSENT: 'Vắng không phép',
  LEAVE: 'Nghỉ có phép',
};

export const ATTENDANCE_STATUS_COLOR: Record<AttendanceStatus, string> = {
  PRESENT: 'green',
  LATE: 'gold',
  ABSENT: 'red',
  LEAVE: 'blue',
};

export interface AttendanceRecord {
  id: ID;
  employeeId: ID;
  employeeName: string;
  employeeCode: string;
  branchId: ID;
  /** Ngày làm việc dạng YYYY-MM-DD. */
  workDate: string;
  shift: ShiftCode;
  checkInAt: string | null;
  checkOutAt: string | null;
  /** Giờ vào thực tế từ máy chấm công. */
  clockInAt: string | null;
  /** Giờ ra thực tế từ máy chấm công. */
  clockOutAt: string | null;
  /** Thời gian nghỉ (giờ). */
  breakDuration: number;
  /** Số giờ làm thực tế đã trừ giờ nghỉ. */
  actualHours: number;
  /** Số giờ làm thực tế, đã trừ giờ nghỉ (legacy, dùng cho lương). */
  workedHours: number;
  overtimeHours: number;
  /** Đã thanh toán lương cho ca này chưa. */
  isPaid: boolean;
  status: AttendanceStatus;
  note: string;
}

/**
 * Trạng thái bảng lương (`bang_luong.trang_thai`) — luồng duyệt 2 tầng.
 *
 * CHO_XAC_NHAN → DA_XAC_NHAN → DA_THANH_TOAN
 *
 * Không có trạng thái từ chối/huỷ: quản lý sai giờ thì sửa `adjustedHours` kèm
 * lý do rồi xác nhận, chứ không trả ngược bảng lương.
 */
export const PAYROLL_STATUS = {
  PendingConfirm: 'CHO_XAC_NHAN',
  Confirmed: 'DA_XAC_NHAN',
  Paid: 'DA_THANH_TOAN',
} as const;

export type PayrollStatus = (typeof PAYROLL_STATUS)[keyof typeof PAYROLL_STATUS];

export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận giờ',
  DA_THANH_TOAN: 'Đã thanh toán',
};

export const PAYROLL_STATUS_COLOR: Record<PayrollStatus, string> = {
  CHO_XAC_NHAN: 'gold',
  DA_XAC_NHAN: 'blue',
  DA_THANH_TOAN: 'green',
};

/**
 * Quy tắc "ai duyệt cho ai" (`luong_nghiep_vu.md` mục 4.2).
 *
 * | Nhân viên | Tầng 1 (xác nhận giờ) | Tầng 2 (duyệt chi) |
 * |-----------|----------------------|--------------------|
 * | THU_NGAN  | QUAN_LY chi nhánh    | KE_TOAN            |
 * | QUAN_LY   | (bỏ qua)             | KE_TOAN            |
 * | THU_KHO   | (bỏ qua)             | KE_TOAN            |
 * | KE_TOAN   | (bỏ qua)             | ADMIN              |
 *
 * Chỉ THU_NGAN đi qua tầng 1 — các vai trò còn lại tự quản giờ làm của mình
 * nên bảng lương của họ vào thẳng trạng thái chờ duyệt chi.
 */

/** Vai trò phải qua bước xác nhận giờ của Quản lý chi nhánh. */
export const requiresHourConfirmation = (role: UserRole): boolean =>
  role === USER_ROLE.Cashier;

/**
 * Vai trò có quyền duyệt chi lương cho một nhân viên.
 *
 * Lương Kế toán do Admin duyệt — đây là ngoại lệ duy nhất được đặc tả, nhằm
 * tránh việc Kế toán tự phê duyệt tiền của chính mình.
 *
 * Lương của ADMIN không được đặc tả nêu. Ở đây gán cho KE_TOAN để bảng lương
 * không bị kẹt vĩnh viễn ở trạng thái chờ, đồng thời vẫn giữ nguyên tắc không
 * ai tự duyệt cho mình.
 */
export const paymentApproverRole = (role: UserRole): UserRole =>
  role === USER_ROLE.Accountant ? USER_ROLE.Admin : USER_ROLE.Accountant;

/** Dòng bảng lương tổng hợp theo kỳ (tháng) của 1 nhân viên. */
export interface PayrollRow {
  id: ID;
  employeeId: ID;
  employeeCode: string;
  employeeName: string;
  /** Vai trò nhân viên — quyết định luồng duyệt áp dụng cho dòng này. */
  role: UserRole;
  branchId: ID;
  branchName: string;
  /** Kỳ lương dạng MM-YYYY theo `bang_luong.thang_nam`. */
  period: string;
  employmentType: EmploymentType;
  totalShifts: number;
  /** Giờ hệ thống tự tổng hợp từ chấm công. */
  totalHours: number;
  /**
   * Giờ sau khi Quản lý điều chỉnh; `null` nghĩa là không sửa.
   * Khi có giá trị, tiền lương tính theo số này thay cho `totalHours`.
   */
  adjustedHours: number | null;
  /** Lý do điều chỉnh — bắt buộc ghi nếu `adjustedHours` khác `null`. */
  adjustReason: string;
  overtimeHours: number;
  baseSalary: VND;
  /** Tiền lương theo giờ đã nhân hệ số ca. */
  shiftPay: VND;
  overtimePay: VND;
  /** Thưởng KPI doanh số ca. */
  bonus: VND;
  /** Trừ đi muộn, vắng, hao hụt quầy. */
  deduction: VND;
  /** Tổng thực nhận = baseSalary + shiftPay + overtimePay + bonus - deduction. */
  netPay: VND;

  status: PayrollStatus;
  /** Người xác nhận giờ (Tầng 1); `null` nếu chưa xác nhận hoặc được bỏ qua. */
  confirmedBy: string | null;
  confirmedAt: string | null;
  /** Người duyệt chi (Tầng 2); `null` nếu chưa duyệt. */
  paidBy: string | null;
  paidAt: string | null;
}