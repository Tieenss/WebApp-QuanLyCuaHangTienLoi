import type { ID, RecordStatus, VND } from './commonTypes';
import type { UserRole } from './authTypes';

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
  /** Số giờ làm thực tế, đã trừ giờ nghỉ. */
  workedHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  note: string;
}

/** Dòng bảng lương tổng hợp theo kỳ (tháng) của 1 nhân viên. */
export interface PayrollRow {
  id: ID;
  employeeId: ID;
  employeeCode: string;
  employeeName: string;
  branchId: ID;
  branchName: string;
  /** Kỳ lương dạng YYYY-MM. */
  period: string;
  employmentType: EmploymentType;
  totalShifts: number;
  totalHours: number;
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
}