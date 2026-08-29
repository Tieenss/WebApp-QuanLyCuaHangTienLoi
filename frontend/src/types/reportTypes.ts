import type { ID, VND } from './commonTypes';

/**
 * Module 1 — Dashboard & Module 13 — Báo cáo.
 *
 * Các type ở đây là dữ liệu đã tổng hợp (aggregated), sẵn sàng đổ vào
 * recharts hoặc antd Table mà không cần biến đổi thêm ở tầng component.
 */

/** Khoảng thời gian lọc chung cho dashboard và báo cáo. */
export const TIME_RANGE = {
  Today: 'today',
  Last7Days: '7days',
  Last30Days: '30days',
  ThisMonth: 'thisMonth',
} as const;

export type TimeRange = (typeof TIME_RANGE)[keyof typeof TIME_RANGE];

export const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  today: 'Hôm nay',
  '7days': '7 ngày qua',
  '30days': '30 ngày qua',
  thisMonth: 'Tháng này',
};

/** Icon logic của StatCard, component sẽ map sang @ant-design/icons. */
export const KPI_ICON = {
  Revenue: 'revenue',
  Orders: 'orders',
  AvgOrder: 'avgOrder',
  LowStock: 'lowStock',
  Profit: 'profit',
  Employees: 'employees',
  Cash: 'cash',
  Shrinkage: 'shrinkage',
} as const;

export type KpiIcon = (typeof KPI_ICON)[keyof typeof KPI_ICON];

/** Một thẻ chỉ số KPI trên dashboard. */
export interface KpiCard {
  id: ID;
  title: string;
  /** Giá trị thô, dùng khi cần tính toán tiếp. */
  value: number;
  /** Giá trị đã format sẵn để hiển thị. */
  displayValue: string;
  changePercent: number;
  /** `true` khi thay đổi là tín hiệu tốt (không đồng nghĩa changePercent > 0). */
  isFavorable: boolean;
  comparedTo: string;
  icon: KpiIcon;
  /** Màu nhấn của thẻ, mặc định lấy theo palette Circle K. */
  accentColor: string;
}

/** Điểm dữ liệu doanh thu theo trục thời gian (biểu đồ line/area). */
export interface RevenueTrendPoint {
  /** Nhãn trục X: giờ ("08:00") hoặc ngày ("26/08"). */
  label: string;
  revenue: VND;
  /** Doanh thu cùng kỳ trước để so sánh. */
  previousRevenue: VND;
  orderCount: number;
}

/** Doanh thu theo chi nhánh (biểu đồ bar ngang). */
export interface BranchRevenuePoint {
  branchId: ID;
  branchName: string;
  /** Tên rút gọn để nhãn biểu đồ không bị tràn. */
  shortName: string;
  revenue: VND;
  profit: VND;
  orderCount: number;
  /** Phần trăm hoàn thành mục tiêu doanh thu. */
  targetAchievedPercent: number;
}

/** Tỷ trọng doanh thu theo danh mục (biểu đồ donut). */
export interface CategoryRevenueSlice {
  categoryId: ID;
  categoryName: string;
  revenue: VND;
  percentage: number;
  color: string;
}

/** Dòng báo cáo hàng bán chạy. */
export interface TopSellingRow {
  id: ID;
  rank: number;
  sku: string;
  productName: string;
  categoryName: string;
  imageUrl: string;
  quantitySold: number;
  revenue: VND;
  grossProfit: VND;
  marginPercent: number;
  /** Tồn kho còn lại toàn chuỗi. */
  remainingStock: number;
}

/** Dòng báo cáo lợi nhuận theo chi nhánh hoặc theo danh mục. */
export interface ProfitReportRow {
  id: ID;
  /** Tên chi nhánh hoặc tên danh mục tuỳ chiều xem báo cáo. */
  dimensionName: string;
  revenue: VND;
  /** Giá vốn hàng bán. */
  cogs: VND;
  grossProfit: VND;
  /** Chi phí vận hành phân bổ (lương, thuê, điện nước). */
  operatingCost: VND;
  netProfit: VND;
  netMarginPercent: number;
}

/** Lý do hao hụt / huỷ hàng. */
export const SHRINKAGE_REASON = {
  Expired: 'EXPIRED',
  Damaged: 'DAMAGED',
  Lost: 'LOST',
  StaffMeal: 'STAFF_MEAL',
  CountError: 'COUNT_ERROR',
} as const;

export type ShrinkageReason = (typeof SHRINKAGE_REASON)[keyof typeof SHRINKAGE_REASON];

export const SHRINKAGE_REASON_LABEL: Record<ShrinkageReason, string> = {
  EXPIRED: 'Hết hạn sử dụng',
  DAMAGED: 'Hư hỏng / Đổ vỡ',
  LOST: 'Mất mát / Thất thoát',
  STAFF_MEAL: 'Sử dụng nội bộ',
  COUNT_ERROR: 'Sai lệch kiểm đếm',
};

/** Dòng báo cáo hao hụt & huỷ hàng. */
export interface ShrinkageReportRow {
  id: ID;
  branchId: ID;
  branchName: string;
  sku: string;
  productName: string;
  categoryName: string;
  reason: ShrinkageReason;
  quantity: number;
  unitCost: VND;
  /** Giá trị tổn thất = quantity * unitCost. */
  lossValue: VND;
  occurredAt: string;
  /** Tỷ lệ hao hụt so với lượng nhập trong kỳ (%). */
  shrinkageRatePercent: number;
}

/** Cảnh báo tồn kho hiển thị trên dashboard. */
export interface InventoryAlertItem {
  id: ID;
  productId: ID;
  sku: string;
  productName: string;
  categoryName: string;
  branchName: string;
  currentStock: number;
  minStock: number;
  /** Số lượng nên đặt thêm = maxStock - currentStock. */
  suggestedReorder: number;
  urgency: 'high' | 'medium' | 'low';
}

/** Bộ lọc chung của trang Báo cáo. */
export interface ReportFilter {
  fromDate: string;
  toDate: string;
  /** `null` nghĩa là toàn chuỗi. */
  branchId: ID | null;
  categoryId: ID | null;
}