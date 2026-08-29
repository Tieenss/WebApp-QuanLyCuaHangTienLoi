import { USER_ROLE, type UserRole } from '@/types';

/**
 * Đăng ký tập trung 14 module ERP.
 *
 * Đây là nguồn sự thật duy nhất cho: menu Sidebar, cấu hình Router,
 * Breadcrumb và kiểm tra quyền truy cập. Thêm module mới chỉ cần thêm 1 entry.
 */

/** Khoá icon logic; component `ModuleIcon` map sang @ant-design/icons. */
export type ModuleIconKey =
  | 'dashboard'
  | 'pos'
  | 'branch'
  | 'employee'
  | 'product'
  | 'supplier'
  | 'warehouse'
  | 'purchase'
  | 'transfer'
  | 'stocktake'
  | 'attendance'
  | 'cashbook'
  | 'report';

export interface ModuleDefinition {
  /** Số thứ tự module theo đặc tả (1..13, module 0 là Login nằm ngoài layout). */
  order: number;
  /** Khoá duy nhất, đồng thời là key của antd Menu. */
  key: string;
  /** Đường dẫn tuyệt đối. */
  path: string;
  /** Nhãn đầy đủ hiển thị trên Sidebar. */
  label: string;
  /** Nhãn ngắn cho Breadcrumb. */
  shortLabel: string;
  icon: ModuleIconKey;
  /** Các vai trò được phép truy cập. */
  allowedRoles: readonly UserRole[];
  /** Nhóm module trên Sidebar. */
  group: ModuleGroupKey;
  /** `true` khi module đã code đầy đủ; `false` sẽ render trang skeleton. */
  implemented: boolean;
  /** Mô tả ngắn, dùng cho trang skeleton và tooltip. */
  description: string;
}

export const MODULE_GROUP = {
  Operation: 'OPERATION',
  MasterData: 'MASTER_DATA',
  Warehouse: 'WAREHOUSE',
  Finance: 'FINANCE',
} as const;

export type ModuleGroupKey = (typeof MODULE_GROUP)[keyof typeof MODULE_GROUP];

export const MODULE_GROUP_LABEL: Record<ModuleGroupKey, string> = {
  OPERATION: 'VẬN HÀNH',
  MASTER_DATA: 'DANH MỤC & NHÂN SỰ',
  WAREHOUSE: 'QUẢN TRỊ KHO',
  FINANCE: 'TÀI CHÍNH & BÁO CÁO',
};

export const MODULE_GROUP_ORDER: readonly ModuleGroupKey[] = [
  MODULE_GROUP.Operation,
  MODULE_GROUP.MasterData,
  MODULE_GROUP.Warehouse,
  MODULE_GROUP.Finance,
];

/**
 * Các tập vai trò lặp lại nhiều lần, đặt tên theo ngữ nghĩa nghiệp vụ thay vì
 * theo cấp bậc — 5 vai trò không xếp thành thứ tự quyền hạn tăng dần.
 */

/** Mọi nhân viên: dùng cho chức năng ai cũng cần (chấm công). */
const EVERYONE = [
  USER_ROLE.Admin,
  USER_ROLE.Accountant,
  USER_ROLE.WarehouseKeeper,
  USER_ROLE.StoreManager,
  USER_ROLE.Cashier,
] as const;

/** Chỉ Admin — quản trị danh mục nền và cấp vốn. */
const ADMIN_ONLY = [USER_ROLE.Admin] as const;

/** Admin + Kế toán — nhóm nhìn số liệu tài chính toàn hệ thống. */
const FINANCE_VIEW = [USER_ROLE.Admin, USER_ROLE.Accountant] as const;

/** Admin + Thủ kho — nghiệp vụ nhập/xuất tại Kho Tổng. */
const WAREHOUSE_OPS = [USER_ROLE.Admin, USER_ROLE.WarehouseKeeper] as const;

/** Nhóm xem được tồn kho: Admin toàn bộ, Thủ kho Kho Tổng, Quản lý chi nhánh mình. */
const STOCK_VIEW = [
  USER_ROLE.Admin,
  USER_ROLE.WarehouseKeeper,
  USER_ROLE.StoreManager,
] as const;

/** Bán hàng tại quầy — Admin KHÔNG có quyền này theo ma trận phân quyền. */
const POS_OPS = [USER_ROLE.Cashier] as const;

/** Sổ quỹ: Admin và Kế toán xem toàn hệ thống, Quản lý chỉ chi nhánh mình. */
const CASHBOOK_VIEW = [
  USER_ROLE.Admin,
  USER_ROLE.Accountant,
  USER_ROLE.StoreManager,
] as const;

/** Danh sách 13 module trong layout (module 0 - Login đứng riêng). */
export const MODULES: readonly ModuleDefinition[] = [
  {
    order: 1,
    key: 'dashboard',
    path: '/dashboard',
    label: 'Tổng quan',
    shortLabel: 'Tổng quan',
    icon: 'dashboard',
    allowedRoles: [...FINANCE_VIEW, USER_ROLE.StoreManager] as const,
    group: MODULE_GROUP.Operation,
    implemented: true,
    description:
      'Biểu đồ doanh thu toàn chuỗi và theo chi nhánh, các chỉ số KPI chính, cảnh báo tồn kho.',
  },
  {
    order: 2,
    key: 'pos',
    path: '/pos',
    label: 'Bán hàng (POS)',
    shortLabel: 'POS',
    icon: 'pos',
    allowedRoles: POS_OPS,
    group: MODULE_GROUP.Operation,
    implemented: true,
    description:
      'Giao diện bán hàng tối ưu thao tác nhanh: quét mã vạch, giỏ hàng, thanh toán, in hoá đơn.',
  },
  {
    order: 3,
    key: 'branches',
    path: '/branches',
    label: 'Quản lý Chi nhánh',
    shortLabel: 'Chi nhánh',
    icon: 'branch',
    allowedRoles: ADMIN_ONLY,
    group: MODULE_GROUP.MasterData,
    implemented: true,
    description:
      'Danh sách cửa hàng bán lẻ và Kho Tổng, địa chỉ, giờ mở cửa, trạng thái hoạt động.',
  },
  {
    order: 4,
    key: 'employees',
    path: '/employees',
    label: 'Quản lý Nhân viên',
    shortLabel: 'Nhân viên',
    icon: 'employee',
    allowedRoles: ADMIN_ONLY,
    group: MODULE_GROUP.MasterData,
    implemented: true,
    description:
      'Danh sách nhân viên, ca làm việc, gán chi nhánh, vai trò và quyền hạn hệ thống.',
  },
  {
    order: 5,
    key: 'products',
    path: '/products',
    label: 'Danh mục & Sản phẩm',
    shortLabel: 'Sản phẩm',
    icon: 'product',
    allowedRoles: ADMIN_ONLY,
    group: MODULE_GROUP.MasterData,
    implemented: true,
    description:
      'Phân loại danh mục hàng hoá, danh sách sản phẩm, giá bán, mã vạch và SKU.',
  },
  {
    order: 6,
    key: 'suppliers',
    path: '/suppliers',
    label: 'Nhà cung cấp',
    shortLabel: 'Nhà cung cấp',
    icon: 'supplier',
    allowedRoles: ADMIN_ONLY,
    group: MODULE_GROUP.MasterData,
    implemented: true,
    description:
      'Danh sách nhà cung cấp, thông tin liên hệ, danh mục hàng cung ứng.',
  },
  {
    order: 7,
    key: 'inventory',
    path: '/inventory',
    label: 'Kho hàng (Tồn kho & Thẻ kho)',
    shortLabel: 'Kho hàng',
    icon: 'warehouse',
    allowedRoles: STOCK_VIEW,
    group: MODULE_GROUP.Warehouse,
    implemented: true,
    description:
      'Bảng tồn kho theo từng chi nhánh và Kho Tổng, lịch sử biến động thẻ kho (nhập/xuất/điều chỉnh).',
  },
  {
    order: 8,
    key: 'purchase-orders',
    path: '/purchase-orders',
    label: 'Nhập kho từ NCC',
    shortLabel: 'Nhập kho',
    icon: 'purchase',
    allowedRoles: WAREHOUSE_OPS,
    group: MODULE_GROUP.Warehouse,
    implemented: true,
    description:
      'Tạo phiếu nhập hàng từ nhà cung cấp vào Kho Tổng, xác nhận số lượng thực nhận.',
  },
  {
    order: 9,
    key: 'transfers',
    path: '/transfers',
    label: 'Xuất kho nội bộ',
    shortLabel: 'Xuất kho',
    icon: 'transfer',
    allowedRoles: WAREHOUSE_OPS,
    group: MODULE_GROUP.Warehouse,
    implemented: true,
    description:
      'Luân chuyển hàng hoá từ Kho Tổng tới các cửa hàng bán lẻ.',
  },
  {
    order: 10,
    key: 'stocktakes',
    path: '/stocktakes',
    label: 'Kiểm kê & Cân bằng kho',
    shortLabel: 'Kiểm kê',
    icon: 'stocktake',
    // Thủ kho kiểm kê Kho Tổng, Quản lý kiểm kê cửa hàng mình.
    allowedRoles: STOCK_VIEW,
    group: MODULE_GROUP.Warehouse,
    implemented: true,
    description:
      'Tạo phiếu kiểm kê thực tế, so sánh lệch tồn kho và cân bằng lại sổ sách.',
  },
  {
    order: 11,
    key: 'attendance',
    path: '/attendance',
    label: 'Chấm công & Bảng lương',
    shortLabel: 'Chấm công',
    icon: 'attendance',
    // Mọi vai trò đều phải check-in/check-out; phần bảng lương tự lọc theo quyền.
    allowedRoles: EVERYONE,
    group: MODULE_GROUP.Finance,
    implemented: true,
    description:
      'Chấm công ca làm việc và bảng lương theo tháng, duyệt lương hai tầng.',
  },
  {
    order: 12,
    key: 'cashbook',
    path: '/cashbook',
    label: 'Sổ quỹ (Thu/Chi)',
    shortLabel: 'Sổ quỹ',
    icon: 'cashbook',
    allowedRoles: CASHBOOK_VIEW,
    group: MODULE_GROUP.Finance,
    implemented: true,
    description:
      'Sổ thu chi toàn hệ thống: doanh thu bán hàng, chi nhập hàng, chi lương, cấp vốn.',
  },
  {
    order: 13,
    key: 'reports',
    path: '/reports',
    label: 'Báo cáo',
    shortLabel: 'Báo cáo',
    icon: 'report',
    allowedRoles: FINANCE_VIEW,
    group: MODULE_GROUP.Finance,
    implemented: true,
    description:
      'Báo cáo doanh thu, lợi nhuận, hàng bán chạy và hao hụt theo kỳ.',
  },
];

/** Tra cứu nhanh module theo path. */
export const MODULE_BY_PATH: Record<string, ModuleDefinition> = MODULES.reduce<Record<string, ModuleDefinition>>(
  (acc, module) => {
    acc[module.path] = module;
    return acc;
  },
  {},
);

/** Lọc module theo vai trò đang đăng nhập. */
export const getModulesForRole = (role: UserRole): ModuleDefinition[] =>
  MODULES.filter((module) => module.allowedRoles.includes(role));

/**
 * Trang mặc định sau khi đăng nhập, tuỳ theo vai trò.
 *
 * Không dùng chung một trang được vì mỗi vai trò có mối quan tâm khác nhau và
 * Dashboard chỉ mở cho Admin / Kế toán / Quản lý:
 * - THU_NGAN → quầy bán hàng.
 * - QUAN_LY → Dashboard.
 * - THU_KHO → tồn kho Kho Tổng.
 * - ADMIN, KE_TOAN → Dashboard.
 */
export const getLandingPath = (role: UserRole): string => {
  switch (role) {
    case USER_ROLE.Cashier:
      return '/pos';
    case USER_ROLE.StoreManager:
      return '/dashboard';
    case USER_ROLE.WarehouseKeeper:
      return '/inventory';
    default:
      return '/dashboard';
  }
};

/** Kiểm tra một vai trò có được vào path hay không. */
export const canAccessPath = (role: UserRole, path: string): boolean => {
  const module = MODULE_BY_PATH[path];
  if (!module) return true;
  return module.allowedRoles.includes(role);
};