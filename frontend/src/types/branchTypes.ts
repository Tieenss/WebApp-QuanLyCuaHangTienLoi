import type { ID, RecordStatus, VND } from './commonTypes';

/**
 * Module 3 — Quản lý Chi nhánh.
 *
 * `BranchKind` phân biệt Kho tổng (DC - Distribution Center) với cửa hàng bán lẻ.
 * Kho tổng không có quầy POS nhưng là nguồn xuất hàng nội bộ (module 9).
 */
export const BRANCH_KIND = {
  Store: 'STORE',
  DistributionCenter: 'DISTRIBUTION_CENTER',
} as const;

export type BranchKind = (typeof BRANCH_KIND)[keyof typeof BRANCH_KIND];

export const BRANCH_KIND_LABEL: Record<BranchKind, string> = {
  STORE: 'Cửa hàng',
  DISTRIBUTION_CENTER: 'Kho tổng',
};

/** Vùng miền, dùng để nhóm báo cáo doanh thu theo khu vực. */
export const REGION = {
  South: 'SOUTH',
  North: 'NORTH',
  Central: 'CENTRAL',
} as const;

export type Region = (typeof REGION)[keyof typeof REGION];

export const REGION_LABEL: Record<Region, string> = {
  SOUTH: 'Miền Nam',
  NORTH: 'Miền Bắc',
  CENTRAL: 'Miền Trung',
};

export interface Branch {
  id: ID;
  /** Mã chi nhánh dạng CK-0101. */
  code: string;
  name: string;
  kind: BranchKind;
  region: Region;
  province: string;
  district: string;
  addressLine: string;
  phone: string;
  /** Giờ mở cửa, "24/7" với cửa hàng hoạt động liên tục. */
  openingHours: string;
  managerName: string;
  managerId: ID;
  employeeCount: number;
  /** Diện tích sàn (m2), dùng để tính doanh thu trên mỗi m2. */
  areaSqm: number;
  /** Doanh thu tháng gần nhất, phục vụ xếp hạng chi nhánh. */
  monthlyRevenue: VND;
  openedAt: string;
  status: RecordStatus;
}

/** Giá trị form thêm/sửa chi nhánh (bỏ các field hệ thống tự sinh). */
export type BranchFormValues = Omit<
  Branch,
  'id' | 'code' | 'employeeCount' | 'monthlyRevenue'
>;