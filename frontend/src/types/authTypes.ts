import type { AuditInfo, ID, RecordStatus } from './commonTypes';

/**
 * Module 0 — Đăng nhập & Phân quyền.
 *
 * 5 vai trò theo `nhan_vien.vai_tro` trong đặc tả cơ sở dữ liệu. Giá trị chuỗi
 * giữ đúng tên enum của DB để khi nối API không phải map qua lại.
 *
 * Bộ máy tổ chức (xem `luong_nghiep_vu.md`):
 * - Trụ sở: ADMIN, KE_TOAN, THU_KHO.
 * - Mỗi cửa hàng bán lẻ: 1 QUAN_LY + nhiều THU_NGAN.
 *
 * Lưu ý phạm vi: THU_KHO làm việc tại Kho Tổng và không dính tới tiền; KE_TOAN
 * giữ dòng tiền toàn hệ thống nhưng không thao tác kho. Đây là hai vai trò
 * song song, không phải quyền hạn tăng dần.
 */
export const USER_ROLE = {
  Admin: 'ADMIN',
  Accountant: 'KE_TOAN',
  WarehouseKeeper: 'THU_KHO',
  StoreManager: 'QUAN_LY',
  Cashier: 'THU_NGAN',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin / Giám đốc',
  KE_TOAN: 'Kế toán',
  THU_KHO: 'Thủ kho',
  QUAN_LY: 'Quản lý Chi nhánh',
  THU_NGAN: 'Thu ngân',
};

export const USER_ROLE_DESCRIPTION: Record<UserRole, string> = {
  ADMIN: 'Toàn quyền hệ thống, cấp vốn và duyệt lương cho Kế toán.',
  KE_TOAN: 'Giữ sổ quỹ toàn hệ thống, duyệt chi lương và thanh toán nhà cung cấp.',
  THU_KHO: 'Nhập hàng từ NCC vào Kho Tổng, xuất hàng cho chi nhánh, kiểm kê Kho Tổng.',
  QUAN_LY: 'Quản lý hàng hoá và nhân sự tại chi nhánh, xác nhận giờ làm nhân viên.',
  THU_NGAN: 'Bán hàng tại quầy POS và chấm công ca làm việc.',
};

/**
 * Danh sách vai trò theo thứ tự cấp bậc tổ chức: trụ sở trước, cửa hàng sau.
 * Dùng cho ô chọn vai trò và menu chuyển đổi vai trò demo.
 */
export const USER_ROLES: readonly UserRole[] = [
  USER_ROLE.Admin,
  USER_ROLE.Accountant,
  USER_ROLE.WarehouseKeeper,
  USER_ROLE.StoreManager,
  USER_ROLE.Cashier,
];

/**
 * Vai trò xem dữ liệu toàn hệ thống, không bị giới hạn theo một chi nhánh.
 *
 * Chỉ gồm ADMIN và KE_TOAN — hai vai trò làm việc trên số liệu tổng hợp
 * (Dashboard, Sổ quỹ toàn hệ thống, Báo cáo). THU_KHO cũng ở trụ sở nhưng gắn
 * với Kho Tổng như một điểm kho cụ thể, nên không thuộc nhóm này.
 */
export const SYSTEM_WIDE_ROLES: readonly UserRole[] = [
  USER_ROLE.Admin,
  USER_ROLE.Accountant,
];

/** Vai trò được phép bán hàng tại quầy POS (ma trận phân quyền). */
export const POS_ROLES: readonly UserRole[] = [
  USER_ROLE.StoreManager,
  USER_ROLE.Cashier,
];


/** Người dùng đang đăng nhập. */
export interface AuthUser {
  id: ID;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  /**
   * Chi nhánh làm việc (`nhan_vien.id_chi_nhanh`).
   * `null` với ADMIN và KE_TOAN — hai vai trò trụ sở xem toàn hệ thống.
   */
  branchId: ID | null;
  /** Danh sách chi nhánh người dùng được phép truy cập. Rỗng = tất cả. */
  allowedBranchIds: ID[];
  avatarText: string;
  status: RecordStatus;
}

/** Tài khoản demo trong mockData (có kèm mật khẩu để login thử). */
export interface DemoAccount extends AuthUser {
  username: string;
  password: string;
}

/** Giá trị form đăng nhập. */
export interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

/**
 * Giá trị form cập nhật hồ sơ cá nhân.
 *
 * Chỉ gồm các trường người dùng tự sửa được. Vai trò, chi nhánh và mã nhân
 * viên do quản trị cấp nên không nằm ở đây.
 */
export interface ProfileFormValues {
  fullName: string;
  email: string;
  phone: string;
}

/** Giá trị form đổi mật khẩu. */
export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Kết quả đăng nhập trả về từ mock auth service. */
export interface LoginResult {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

/** Bản ghi lịch sử truy cập, hiển thị ở trang phân quyền. */
export interface AccessLogEntry extends AuditInfo {
  id: ID;
  userId: ID;
  userName: string;
  role: UserRole;
  action: string;
  ipAddress: string;
}