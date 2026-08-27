import {
  ATTENDANCE_STATUS,
  EMPLOYMENT_TYPE,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_RATE_MULTIPLIER,
  USER_ROLE,
  type AttendanceRecord,
  type AttendanceStatus,
  type Employee,
  type EmploymentType,
  type PayrollRow,
  type ShiftCode,
  type UserRole,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import { initialsOf } from '@/utils/formatters';
import { activeStores, branchById, DISTRIBUTION_CENTER_ID } from './branches';
import { createRandom, randomInt, randomPick, roundTo } from './seed';

/**
 * Module 4 – Nhân viên, Module 11 – Chấm công & Bảng lương.
 */

const random = createRandom(19940715);

interface RawEmployee {
  id: string;
  code: string;
  fullName: string;
  position: string;
  role: UserRole;
  branchId: string;
  employmentType: EmploymentType;
  defaultShift: ShiftCode;
  hourlyWage: number;
  baseSalary: number;
  joinedAt: string;
  status?: Employee['status'];
}

/** Email nội bộ suy ra từ mã nhân viên để tránh trùng. */
const emailOf = (code: string): string =>
  `${code.toLowerCase().replace('-', '')}@circlek.vn`;

const rawEmployees: RawEmployee[] = [
  {
    id: 'emp-001',
    code: 'NV-0001',
    fullName: 'Phạm Quốc Hưng',
    position: 'Giám đốc vận hành chuỗi',
    role: USER_ROLE.Admin,
    branchId: DISTRIBUTION_CENTER_ID,
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 180_000,
    baseSalary: 42_000_000,
    joinedAt: '2019-03-15',
  },
  {
    id: 'emp-002',
    code: 'NV-0002',
    fullName: 'Trần Văn Anh',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0101',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 78_000,
    baseSalary: 18_500_000,
    joinedAt: '2020-06-01',
  },
  {
    id: 'emp-003',
    code: 'NV-0003',
    fullName: 'Nguyễn Thị Kim Ngân',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0102',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 76_000,
    baseSalary: 17_800_000,
    joinedAt: '2020-11-20',
  },
  {
    id: 'emp-004',
    code: 'NV-0004',
    fullName: 'Lê Hoàng Nam',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0103',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Afternoon,
    hourlyWage: 76_000,
    baseSalary: 17_800_000,
    joinedAt: '2021-04-08',
  },
  {
    id: 'emp-005',
    code: 'NV-0005',
    fullName: 'Đỗ Thanh Tuyền',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0104',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 74_000,
    baseSalary: 17_200_000,
    joinedAt: '2022-02-14',
  },
  {
    id: 'emp-006',
    code: 'NV-0006',
    fullName: 'Vũ Đình Trọng',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0201',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 75_000,
    baseSalary: 17_500_000,
    joinedAt: '2021-09-30',
  },
  {
    id: 'emp-007',
    code: 'NV-0007',
    fullName: 'Hoàng Minh Châu',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0202',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Afternoon,
    hourlyWage: 73_000,
    baseSalary: 17_000_000,
    joinedAt: '2022-07-11',
  },
  {
    id: 'emp-008',
    code: 'NV-0008',
    fullName: 'Ngô Bảo Khang',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0301',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 70_000,
    baseSalary: 16_200_000,
    joinedAt: '2023-05-19',
  },
  {
    id: 'emp-009',
    code: 'NV-0009',
    fullName: 'Bùi Thị Mai Lan',
    position: 'Quản lý cửa hàng',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0101',
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Night,
    hourlyWage: 72_000,
    baseSalary: 16_800_000,
    joinedAt: '2021-01-25',
    status: RECORD_STATUS.Inactive,
  },
  {
    id: 'emp-010',
    code: 'NV-0010',
    fullName: 'Nguyễn Thị Thu Hà',
    position: 'Thủ kho Kho Tổng',
    // Thủ kho làm tại Kho Tổng: nhập hàng từ NCC, xuất hàng cho chi nhánh.
    role: USER_ROLE.WarehouseKeeper,
    branchId: DISTRIBUTION_CENTER_ID,
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 48_000,
    baseSalary: 11_200_000,
    joinedAt: '2022-08-02',
  },
  {
    id: 'emp-011',
    code: 'NV-0011',
    fullName: 'Lương Thị Bích Hạnh',
    position: 'Kế toán trưởng',
    // Kế toán làm tại trụ sở (đặt cùng Kho Tổng trong mock data).
    role: USER_ROLE.Accountant,
    branchId: DISTRIBUTION_CENTER_ID,
    employmentType: EMPLOYMENT_TYPE.FullTime,
    defaultShift: SHIFT_CODE.Morning,
    hourlyWage: 95_000,
    baseSalary: 22_400_000,
    joinedAt: '2020-02-17',
  },
];

/** Thu ngân part-time: sinh tự động để đủ 3 ca cho mỗi cửa hàng. */
const cashierNames = [
  'Nguyễn Văn Minh',
  'Trần Thị Thu',
  'Lê Quang Huy',
  'Phan Thị Ngọc Diễm',
  'Đặng Hoàng Phúc',
  'Vương Thị Kiều Trinh',
  'Trịnh Công Định',
  'Lý Thanh Thảo',
  'Hồ Nhật Trường',
  'Mai Thị Bích Hạnh',
  'Cao Đức Thắng',
  'Dương Thuỳ Linh',
  'Tạ Minh Khôi',
  'Chu Thị Hồng Nhung',
  'Đinh Bá Lộc',
  'Lâm Ngọc Ánh',
  'Phạm Hữu Nghĩa',
  'Tô Thanh Vy',
  'Huỳnh Gia Bảo',
  'Kiều Thị Lan Anh',
  'Nguyễn Thành Đạt',
  'Võ Thị Kim Chi',
  'Bạch Quốc Cường',
  'Trương Mỹ Duyên',
];

const shiftRotation: ShiftCode[] = [
  SHIFT_CODE.Morning,
  SHIFT_CODE.Afternoon,
  SHIFT_CODE.Night,
];

const buildCashiers = (): RawEmployee[] => {
  const cashiers: RawEmployee[] = [];
  // Bắt đầu sau nhân sự cố định trong `rawEmployees` (11 người, NV-0001..0011).
  let sequence = rawEmployees.length + 1;

  activeStores.forEach((branch, branchIndex) => {
    // Mỗi cửa hàng 3 thu ngân, phủ đủ 3 ca vận hành 24/7.
    for (let slot = 0; slot < 3; slot += 1) {
      const nameIndex = (branchIndex * 3 + slot) % cashierNames.length;
      const shift = shiftRotation[slot] ?? SHIFT_CODE.Morning;
      cashiers.push({
        id: `emp-${String(sequence).padStart(3, '0')}`,
        code: `NV-${String(sequence).padStart(4, '0')}`,
        fullName: cashierNames[nameIndex] ?? 'Nhân viên bán hàng',
        position: 'Thu ngân / Phục vụ quầy',
        role: USER_ROLE.Cashier,
        branchId: branch.id,
        employmentType: EMPLOYMENT_TYPE.PartTime,
        defaultShift: shift,
        hourlyWage: shift === SHIFT_CODE.Night ? 34_000 : 28_000,
        baseSalary: 0,
        joinedAt: dayjs('2024-01-15')
          .add(sequence * 11, 'day')
          .format('YYYY-MM-DD'),
      });
      sequence += 1;
    }
  });

  return cashiers;
};

/** Danh sách nhân viên toàn chuỗi. */
export const mockEmployees: Employee[] = [...rawEmployees, ...buildCashiers()].map(
  (raw) => ({
    id: raw.id,
    code: raw.code,
    fullName: raw.fullName,
    email: emailOf(raw.code),
    phone: `09${randomInt(random, 10, 89)} ${randomInt(random, 100, 999)} ${randomInt(
      random,
      100,
      999,
    )}`,
    role: raw.role,
    position: raw.position,
    branchId: raw.branchId,
    branchName: branchById(raw.branchId)?.name ?? 'Không xác định',
    employmentType: raw.employmentType,
    defaultShift: raw.defaultShift,
    hourlyWage: raw.hourlyWage,
    baseSalary: raw.baseSalary,
    joinedAt: raw.joinedAt,
    status: raw.status ?? RECORD_STATUS.Active,
    avatarText: initialsOf(raw.fullName),
  }),
);

/** Nhân viên đang làm việc. */
export const activeEmployees = mockEmployees.filter(
  (employee) => employee.status === RECORD_STATUS.Active,
);

/** Tra cứu nhân viên theo id. */
export const employeeById = (id: string): Employee | undefined =>
  mockEmployees.find((employee) => employee.id === id);

/** Nhân viên của một chi nhánh (`null` = toàn chuỗi). */
export const employeesOfBranch = (branchId: string | null): Employee[] =>
  branchId === null
    ? activeEmployees
    : activeEmployees.filter((employee) => employee.branchId === branchId);

/** Thu ngân của một chi nhánh, dùng để gán người bán cho hoá đơn POS. */
export const cashiersOfBranch = (branchId: string): Employee[] => {
  const list = activeEmployees.filter(
    (employee) =>
      employee.branchId === branchId && employee.role === USER_ROLE.Cashier,
  );
  // Cửa hàng mới có thể chưa có thu ngân riêng — fallback về quản lý.
  return list.length > 0
    ? list
    : activeEmployees.filter((employee) => employee.branchId === branchId);
};

/** Giờ chuẩn một ca làm việc. */
const SHIFT_HOURS = 8;

/** Giờ bắt đầu ca theo định nghĩa vận hành. */
const SHIFT_START_HOUR: Record<ShiftCode, number> = {
  MORNING: 6,
  AFTERNOON: 14,
  NIGHT: 22,
};

const attendanceStatusPool: AttendanceStatus[] = [
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Present,
  ATTENDANCE_STATUS.Late,
  ATTENDANCE_STATUS.Leave,
  ATTENDANCE_STATUS.Absent,
];

/** Số ngày lịch sử chấm công được sinh sẵn. */
export const ATTENDANCE_HISTORY_DAYS = 30;

const buildAttendance = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  let sequence = 1;

  for (let dayOffset = ATTENDANCE_HISTORY_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const workDate = dayjs().subtract(dayOffset, 'day');

    for (const employee of activeEmployees) {
      const status = randomPick(random, attendanceStatusPool);
      const startHour = SHIFT_START_HOUR[employee.defaultShift];
      const isWorking =
        status === ATTENDANCE_STATUS.Present || status === ATTENDANCE_STATUS.Late;

      // Đi muộn 5-25 phút, đủ giờ thì vào sớm 0-8 phút.
      const lateMinutes =
        status === ATTENDANCE_STATUS.Late ? randomInt(random, 5, 25) : 0;
      const checkIn = isWorking
        ? workDate
            .hour(startHour)
            .minute(lateMinutes - (status === ATTENDANCE_STATUS.Present ? randomInt(random, 0, 8) : 0))
            .second(0)
        : null;

      const overtimeHours = isWorking && random() < 0.18 ? randomInt(random, 1, 2) : 0;
      const checkOut = checkIn
        ? checkIn.add(SHIFT_HOURS + overtimeHours, 'hour')
        : null;

      const workedHours = isWorking
        ? SHIFT_HOURS + overtimeHours - lateMinutes / 60
        : 0;

      records.push({
        id: `att-${String(sequence).padStart(5, '0')}`,
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeCode: employee.code,
        branchId: employee.branchId,
        workDate: workDate.format('YYYY-MM-DD'),
        shift: employee.defaultShift,
        checkInAt: checkIn ? checkIn.toISOString() : null,
        checkOutAt: checkOut ? checkOut.toISOString() : null,
        workedHours: Number(workedHours.toFixed(2)),
        overtimeHours,
        status,
        note:
          status === ATTENDANCE_STATUS.Late
            ? `Đi muộn ${lateMinutes} phút`
            : status === ATTENDANCE_STATUS.Leave
              ? 'Nghỉ phép đã được duyệt'
              : status === ATTENDANCE_STATUS.Absent
                ? 'Vắng không thông báo'
                : '',
      });
      sequence += 1;
    }
  }

  return records;
};

/** Bản ghi chấm công 30 ngày gần nhất. */
export const mockAttendance: AttendanceRecord[] = buildAttendance();

/** Kỳ lương hiện tại dạng YYYY-MM. */
export const CURRENT_PAYROLL_PERIOD = dayjs().format('YYYY-MM');

/**
 * Tính bảng lương của kỳ hiện tại từ dữ liệu chấm công.
 * Công thức: netPay = baseSalary + shiftPay + overtimePay + bonus - deduction.
 */
const buildPayroll = (): PayrollRow[] =>
  activeEmployees.map((employee, index) => {
    const records = mockAttendance.filter(
      (record) =>
        record.employeeId === employee.id &&
        record.workDate.startsWith(CURRENT_PAYROLL_PERIOD),
    );

    const workedRecords = records.filter(
      (record) =>
        record.status === ATTENDANCE_STATUS.Present ||
        record.status === ATTENDANCE_STATUS.Late,
    );

    const totalHours = workedRecords.reduce(
      (sum, record) => sum + record.workedHours - record.overtimeHours,
      0,
    );
    const overtimeHours = workedRecords.reduce(
      (sum, record) => sum + record.overtimeHours,
      0,
    );

    // Ca đêm hưởng hệ số phụ cấp cao hơn.
    const shiftPay = workedRecords.reduce(
      (sum, record) =>
        sum +
        (record.workedHours - record.overtimeHours) *
          employee.hourlyWage *
          SHIFT_RATE_MULTIPLIER[record.shift],
      0,
    );

    // Ngoài giờ tính 1,5 lần lương giờ cơ bản.
    const overtimePay = overtimeHours * employee.hourlyWage * 1.5;

    const lateCount = records.filter(
      (record) => record.status === ATTENDANCE_STATUS.Late,
    ).length;
    const absentCount = records.filter(
      (record) => record.status === ATTENDANCE_STATUS.Absent,
    ).length;

    // Trừ 50.000đ mỗi lần muộn, 1 ngày lương cho mỗi ngày vắng không phép.
    const deduction =
      lateCount * 50_000 + absentCount * employee.hourlyWage * SHIFT_HOURS;

    const bonus = index % 4 === 0 ? roundTo(random() * 1_500_000, 50_000) : 0;

    // Lương cứng chia theo tỷ lệ ngày làm thực tế trong kỳ.
    const expectedShifts = records.length || 1;
    const proratedBase = Math.round(
      (employee.baseSalary * workedRecords.length) / expectedShifts,
    );

    return {
      id: `pay-${employee.id}`,
      employeeId: employee.id,
      employeeCode: employee.code,
      employeeName: employee.fullName,
      branchId: employee.branchId,
      branchName: employee.branchName,
      period: CURRENT_PAYROLL_PERIOD,
      employmentType: employee.employmentType,
      totalShifts: workedRecords.length,
      totalHours: Number(totalHours.toFixed(1)),
      overtimeHours,
      baseSalary: proratedBase,
      shiftPay: Math.round(employee.baseSalary > 0 ? 0 : shiftPay),
      overtimePay: Math.round(overtimePay),
      bonus,
      deduction: Math.round(deduction),
      netPay: Math.round(
        proratedBase +
          (employee.baseSalary > 0 ? 0 : shiftPay) +
          overtimePay +
          bonus -
          deduction,
      ),
    };
  });

/** Bảng lương kỳ hiện tại. */
export const mockPayroll: PayrollRow[] = buildPayroll();