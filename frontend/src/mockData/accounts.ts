import { RECORD_STATUS, USER_ROLE, type DemoAccount } from '@/types';
import { DISTRIBUTION_CENTER_ID } from './branches';

/**
 * Module 0 – Tài khoản demo, một tài khoản cho mỗi vai trò trong đặc tả.
 *
 * MVP không có backend nên mật khẩu để lộ trong mã nguồn là chấp nhận được,
 * nhưng khi nối API thật phải xoá file này và chuyển sang xác thực server-side
 * (`nhan_vien.mat_khau` lưu dạng hash BCrypt).
 *
 * Quy ước `branchId` / `allowedBranchIds` theo bộ máy tổ chức:
 * - ADMIN, KE_TOAN: làm ở trụ sở, xem toàn hệ thống → `branchId = null`,
 *   `allowedBranchIds = []` (rỗng nghĩa là không giới hạn).
 * - THU_KHO: gắn với Kho Tổng, không thao tác tại cửa hàng bán lẻ.
 * - QUAN_LY, THU_NGAN: bị giới hạn đúng chi nhánh mình.
 */
export const DEMO_PASSWORD = 'circlek@123';

export const mockAccounts: DemoAccount[] = [
  {
    id: 'usr-001',
    username: 'admin',
    password: DEMO_PASSWORD,
    employeeCode: 'NV-0001',
    fullName: 'Phạm Quốc Hưng',
    email: 'hung.pham@circlek.vn',
    phone: '0903 118 224',
    role: USER_ROLE.Admin,
    branchId: null,
    allowedBranchIds: [],
    avatarText: 'PH',
    status: RECORD_STATUS.Active,
  },
  {
    id: 'usr-002',
    username: 'ketoan',
    password: DEMO_PASSWORD,
    employeeCode: 'NV-0002',
    fullName: 'Lương Thị Bích Hạnh',
    email: 'hanh.luong@circlek.vn',
    phone: '0908 552 137',
    role: USER_ROLE.Accountant,
    // Kế toán giữ sổ quỹ toàn hệ thống nên không gắn cứng chi nhánh.
    branchId: null,
    allowedBranchIds: [],
    avatarText: 'LH',
    status: RECORD_STATUS.Active,
  },
  {
    id: 'usr-003',
    username: 'thukho',
    password: DEMO_PASSWORD,
    employeeCode: 'NV-0003',
    fullName: 'Đặng Văn Kiên',
    email: 'kien.dang@circlek.vn',
    phone: '0937 640 812',
    role: USER_ROLE.WarehouseKeeper,
    branchId: DISTRIBUTION_CENTER_ID,
    allowedBranchIds: [DISTRIBUTION_CENTER_ID],
    avatarText: 'DK',
    status: RECORD_STATUS.Active,
  },
  {
    id: 'usr-004',
    username: 'quanly',
    password: DEMO_PASSWORD,
    employeeCode: 'NV-0004',
    fullName: 'Trần Văn Anh',
    email: 'anh.tran@circlek.vn',
    phone: '0912 447 889',
    role: USER_ROLE.StoreManager,
    branchId: 'br-0101',
    allowedBranchIds: ['br-0101'],
    avatarText: 'TA',
    status: RECORD_STATUS.Active,
  },
  {
    id: 'usr-005',
    username: 'thungan',
    password: DEMO_PASSWORD,
    employeeCode: 'NV-0014',
    fullName: 'Nguyễn Văn Minh',
    email: 'minh.nguyen@circlek.vn',
    phone: '0987 220 116',
    role: USER_ROLE.Cashier,
    branchId: 'br-0101',
    allowedBranchIds: ['br-0101'],
    avatarText: 'NM',
    status: RECORD_STATUS.Active,
  },
];

/** Tra cứu tài khoản demo theo username (không phân biệt hoa thường). */
export const findAccount = (username: string): DemoAccount | undefined =>
  mockAccounts.find(
    (account) => account.username.toLowerCase() === username.trim().toLowerCase(),
  );

/** Tài khoản demo tương ứng một vai trò, dùng cho nút "chuyển đổi vai trò". */
export const accountByRole = (role: DemoAccount['role']): DemoAccount => {
  const found = mockAccounts.find((account) => account.role === role);
  if (!found) {
    throw new Error(`Không tìm thấy tài khoản demo cho vai trò ${role}`);
  }
  return found;
};
