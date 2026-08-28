import {
  SHRINKAGE_REASON,
  type BranchRevenuePoint,
  type CategoryRevenueSlice,
  type InventoryAlertItem,
  type ProfitReportRow,
  type RevenueTrendPoint,
  type SalesOrder,
  type ShrinkageReason,
  type ShrinkageReportRow,
  type StockBalance,
  type TimeRange,
  type TopSellingRow,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import { lowStockBalances, totalStockValue } from '@/store/slices/stockSlice';
import { activeStores } from './branches';
import { mockCategories, categoryColorById } from './categories';
import { productById } from './products';
import {
  completedOrders,
  ordersOfBranch,
  sumCogs,
  sumQuantity,
  sumRevenue,
} from './salesOrders';
import { mockStocktakes } from './warehouseDocuments';
import { createRandom, randomPick } from './seed';

/**
 * Module 1 & 13 – Lớp tổng hợp (aggregation) cho Dashboard và Báo cáo.
 *
 * Mọi số liệu ở đây đều tính từ `mockSalesOrders` và tồn kho hiện hành, nên
 * dashboard và báo cáo luôn khớp nhau. Không hard-code số tổng ở bất kỳ đâu.
 *
 * Các hàm cần tồn kho nhận `balances` qua tham số (không import mảng seed), vì
 * tồn kho thay đổi lúc chạy — component truyền `state.stock.balances` vào.
 */

const random = createRandom(52061977);

/** Chuyển `TimeRange` thành khoảng ngày cụ thể. */
export const resolveTimeRange = (
  range: TimeRange,
): { from: string; to: string; previousFrom: string; previousTo: string } => {
  const to = dayjs();

  switch (range) {
    case 'today': {
      return {
        from: to.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        previousFrom: to.subtract(1, 'day').format('YYYY-MM-DD'),
        previousTo: to.subtract(1, 'day').format('YYYY-MM-DD'),
      };
    }
    case '7days': {
      const from = to.subtract(6, 'day');
      return {
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        previousFrom: from.subtract(7, 'day').format('YYYY-MM-DD'),
        previousTo: from.subtract(1, 'day').format('YYYY-MM-DD'),
      };
    }
    case '30days': {
      const from = to.subtract(29, 'day');
      return {
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        previousFrom: from.subtract(30, 'day').format('YYYY-MM-DD'),
        previousTo: from.subtract(1, 'day').format('YYYY-MM-DD'),
      };
    }
    case 'thisMonth':
    default: {
      const from = to.startOf('month');
      const previousMonth = from.subtract(1, 'month');
      return {
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        previousFrom: previousMonth.format('YYYY-MM-DD'),
        previousTo: previousMonth.endOf('month').format('YYYY-MM-DD'),
      };
    }
  }
};

/** Lọc hoá đơn theo chi nhánh và khoảng ngày. */
export const filterOrders = (
  branchId: string | null,
  from: string,
  to: string,
): SalesOrder[] =>
  ordersOfBranch(branchId).filter((order) => {
    const date = order.soldAt.slice(0, 10);
    return date >= from && date <= to;
  });

/** Nhãn mốc thời gian: theo giờ nếu chỉ 1 ngày, theo ngày nếu nhiều ngày. */
const buildTrendBuckets = (
  from: string,
  to: string,
): { keys: string[]; labels: string[]; byHour: boolean } => {
  const start = dayjs(from);
  const end = dayjs(to);
  const dayCount = end.diff(start, 'day') + 1;

  if (dayCount <= 1) {
    const keys: string[] = [];
    const labels: string[] = [];
    // Gom theo khung 2 giờ để biểu đồ trong ngày không quá dày.
    for (let hour = 0; hour < 24; hour += 2) {
      keys.push(String(hour).padStart(2, '0'));
      labels.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return { keys, labels, byHour: true };
  }

  const keys: string[] = [];
  const labels: string[] = [];
  for (let index = 0; index < dayCount; index += 1) {
    const date = start.add(index, 'day');
    keys.push(date.format('YYYY-MM-DD'));
    labels.push(date.format('DD/MM'));
  }
  return { keys, labels, byHour: false };
};

/** Chuỗi doanh thu theo thời gian, kèm số liệu cùng kỳ trước để so sánh. */
export const buildRevenueTrend = (
  branchId: string | null,
  range: TimeRange,
): RevenueTrendPoint[] => {
  const { from, to, previousFrom, previousTo } = resolveTimeRange(range);
  const current = filterOrders(branchId, from, to);
  const previous = filterOrders(branchId, previousFrom, previousTo);
  const { keys, labels, byHour } = buildTrendBuckets(from, to);

  /** Gom doanh thu vào bucket tương ứng. */
  const bucketize = (orders: readonly SalesOrder[], offsetDays: number) => {
    const revenue = new Map<string, number>();
    const count = new Map<string, number>();

    for (const order of orders) {
      const moment = dayjs(order.soldAt);
      const key = byHour
        ? String(Math.floor(moment.hour() / 2) * 2).padStart(2, '0')
        : moment.add(offsetDays, 'day').format('YYYY-MM-DD');

      revenue.set(key, (revenue.get(key) ?? 0) + order.grandTotal);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
    return { revenue, count };
  };

  const currentBuckets = bucketize(current, 0);
  // Dịch kỳ trước lên trùng trục thời gian của kỳ hiện tại.
  const dayShift = dayjs(from).diff(dayjs(previousFrom), 'day');
  const previousBuckets = bucketize(previous, dayShift);

  return keys.map((key, index) => ({
    label: labels[index] ?? key,
    revenue: currentBuckets.revenue.get(key) ?? 0,
    previousRevenue: previousBuckets.revenue.get(key) ?? 0,
    orderCount: currentBuckets.count.get(key) ?? 0,
  }));
};

/** Doanh thu, lợi nhuận và mức hoàn thành mục tiêu của từng chi nhánh. */
export const buildBranchRevenue = (range: TimeRange): BranchRevenuePoint[] => {
  const { from, to } = resolveTimeRange(range);

  return activeStores
    .map((branch) => {
      const orders = filterOrders(branch.id, from, to);
      const revenue = sumRevenue(orders);
      const cogs = sumCogs(orders);
      // Mục tiêu doanh thu tỷ lệ với diện tích cửa hàng: 380k/m2/ngày.
      const dayCount = dayjs(to).diff(dayjs(from), 'day') + 1;
      const target = branch.areaSqm * 380_000 * dayCount;

      return {
        branchId: branch.id,
        branchName: branch.name,
        shortName: branch.name.replace('Circle K ', ''),
        revenue,
        profit: revenue - cogs,
        orderCount: orders.length,
        targetAchievedPercent: target === 0 ? 0 : (revenue / target) * 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
};

/** Tỷ trọng doanh thu theo danh mục hàng hoá. */
export const buildCategoryRevenue = (
  branchId: string | null,
  range: TimeRange,
): CategoryRevenueSlice[] => {
  const { from, to } = resolveTimeRange(range);
  const orders = filterOrders(branchId, from, to);

  const revenueByCategory = new Map<string, number>();
  for (const order of orders) {
    for (const line of order.lines) {
      const product = productById(line.productId);
      if (!product) continue;
      revenueByCategory.set(
        product.categoryId,
        (revenueByCategory.get(product.categoryId) ?? 0) + line.lineTotal,
      );
    }
  }

  const total = [...revenueByCategory.values()].reduce((sum, value) => sum + value, 0);

  return mockCategories
    .map((category) => {
      const revenue = revenueByCategory.get(category.id) ?? 0;
      return {
        categoryId: category.id,
        categoryName: category.name,
        revenue,
        percentage: total === 0 ? 0 : (revenue / total) * 100,
        color: categoryColorById(category.id),
      };
    })
    .filter((slice) => slice.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
};

/** Bảng xếp hạng hàng bán chạy. */
export const buildTopSelling = (
  branchId: string | null,
  range: TimeRange,
  /** Tồn kho hiện tại, truyền từ `state.stock.balances`. */
  balances: readonly StockBalance[],
  limit = 10,
): TopSellingRow[] => {
  const { from, to } = resolveTimeRange(range);
  const orders = filterOrders(branchId, from, to);

  interface Accumulator {
    quantity: number;
    revenue: number;
    cost: number;
  }
  const stats = new Map<string, Accumulator>();

  for (const order of orders) {
    for (const line of order.lines) {
      const current = stats.get(line.productId) ?? { quantity: 0, revenue: 0, cost: 0 };
      current.quantity += line.quantity;
      current.revenue += line.lineTotal;
      current.cost += line.unitCost * line.quantity;
      stats.set(line.productId, current);
    }
  }

  return [...stats.entries()]
    .map(([productId, value]) => {
      const product = productById(productId);
      const grossProfit = value.revenue - value.cost;
      const remainingStock = balances
        .filter(
          (balance) =>
            balance.productId === productId &&
            (branchId === null || balance.branchId === branchId),
        )
        .reduce((sum, balance) => sum + balance.quantity, 0);

      return {
        id: productId,
        rank: 0,
        sku: product?.sku ?? '—',
        productName: product?.name ?? 'Không xác định',
        categoryName: product?.categoryName ?? '—',
        imageUrl: product?.imageUrl ?? '',
        quantitySold: value.quantity,
        revenue: value.revenue,
        grossProfit,
        marginPercent: value.revenue === 0 ? 0 : (grossProfit / value.revenue) * 100,
        remainingStock,
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
};

/** Báo cáo lợi nhuận theo chi nhánh. */
export const buildProfitByBranch = (range: TimeRange): ProfitReportRow[] => {
  const { from, to } = resolveTimeRange(range);
  const dayCount = dayjs(to).diff(dayjs(from), 'day') + 1;

  return activeStores
    .map((branch) => {
      const orders = filterOrders(branch.id, from, to);
      const revenue = sumRevenue(orders);
      const cogs = sumCogs(orders);
      const grossProfit = revenue - cogs;
      // Chi phí vận hành phân bổ theo ngày: thuê + lương + tiện ích ước tính.
      const operatingCost = Math.round(
        (branch.areaSqm * 520_000 + branch.employeeCount * 6_800_000) *
          (dayCount / 30),
      );

      const netProfit = grossProfit - operatingCost;
      return {
        id: branch.id,
        dimensionName: branch.name,
        revenue,
        cogs,
        grossProfit,
        operatingCost,
        netProfit,
        netMarginPercent: revenue === 0 ? 0 : (netProfit / revenue) * 100,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
};

/** Báo cáo lợi nhuận theo danh mục hàng hoá. */
export const buildProfitByCategory = (
  branchId: string | null,
  range: TimeRange,
): ProfitReportRow[] => {
  const { from, to } = resolveTimeRange(range);
  const orders = filterOrders(branchId, from, to);

  const stats = new Map<string, { revenue: number; cogs: number }>();
  for (const order of orders) {
    for (const line of order.lines) {
      const product = productById(line.productId);
      if (!product) continue;
      const current = stats.get(product.categoryId) ?? { revenue: 0, cogs: 0 };
      current.revenue += line.lineTotal;
      current.cogs += line.unitCost * line.quantity;
      stats.set(product.categoryId, current);
    }
  }

  return mockCategories
    .map((category) => {
      const value = stats.get(category.id) ?? { revenue: 0, cogs: 0 };
      const grossProfit = value.revenue - value.cogs;
      // Danh mục không chịu chi phí vận hành trực tiếp trong mô hình MVP.
      return {
        id: category.id,
        dimensionName: category.name,
        revenue: value.revenue,
        cogs: value.cogs,
        grossProfit,
        operatingCost: 0,
        netProfit: grossProfit,
        netMarginPercent:
          value.revenue === 0 ? 0 : (grossProfit / value.revenue) * 100,
      };
    })
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.netProfit - a.netProfit);
};

/** Ánh xạ lý do lệch tồn (chuỗi tự do trong phiếu kiểm kê) sang enum báo cáo. */
const mapVarianceReason = (reason: string): ShrinkageReason => {
  if (reason.includes('hết hạn') || reason.includes('Hao hụt tự nhiên')) {
    return SHRINKAGE_REASON.Expired;
  }
  if (reason.includes('hư hỏng')) return SHRINKAGE_REASON.Damaged;
  if (reason.includes('Thất thoát')) return SHRINKAGE_REASON.Lost;
  if (reason.includes('nội bộ')) return SHRINKAGE_REASON.StaffMeal;
  return SHRINKAGE_REASON.CountError;
};

/**
 * Báo cáo hao hụt & huỷ hàng, lấy từ các dòng lệch âm của phiếu kiểm kê
 * (module 10) – đây là nguồn dữ liệu hao hụt thực tế trong hệ thống.
 */
export const buildShrinkageReport = (
  branchId: string | null,
): ShrinkageReportRow[] => {
  const rows: ShrinkageReportRow[] = [];

  for (const stocktake of mockStocktakes) {
    if (branchId !== null && stocktake.branchId !== branchId) continue;

    for (const line of stocktake.lines) {
      if (line.varianceQuantity >= 0) continue;

      const product = productById(line.productId);
      const quantity = Math.abs(line.varianceQuantity);

      rows.push({
        id: `${stocktake.id}-${line.id}`,
        branchId: stocktake.branchId,
        branchName: stocktake.branchName,
        sku: line.sku,
        productName: line.productName,
        categoryName: product?.categoryName ?? '—',
        reason: line.reason
          ? mapVarianceReason(line.reason)
          : randomPick(random, [
              SHRINKAGE_REASON.Expired,
              SHRINKAGE_REASON.Damaged,
              SHRINKAGE_REASON.CountError,
            ]),
        quantity,
        unitCost: line.unitCost,
        lossValue: quantity * line.unitCost,
        occurredAt: stocktake.countDate,
        shrinkageRatePercent:
          line.systemQuantity === 0 ? 0 : (quantity / line.systemQuantity) * 100,
      });
    }
  }

  return rows.sort((a, b) => b.lossValue - a.lossValue);
};

/** Danh sách cảnh báo tồn kho cho dashboard. */
export const buildInventoryAlerts = (
  branchId: string | null,
  /** Tồn kho hiện tại, truyền từ `state.stock.balances`. */
  balances: readonly StockBalance[],
  limit = 8,
): InventoryAlertItem[] =>
  lowStockBalances(balances, branchId)
    .slice(0, limit)
    .map((balance) => {
      const ratio = balance.minStock === 0 ? 1 : balance.quantity / balance.minStock;
      return {
        id: balance.id,
        productId: balance.productId,
        sku: balance.sku,
        productName: balance.productName,
        categoryName: balance.categoryName,
        branchName: balance.branchName,
        currentStock: balance.quantity,
        minStock: balance.minStock,
        suggestedReorder: Math.max(0, balance.maxStock - balance.quantity),
        urgency: ratio <= 0.35 ? 'high' : ratio <= 0.7 ? 'medium' : 'low',
      };
    });

/** Chỉ số tổng hợp cho các thẻ KPI của dashboard. */
export interface DashboardMetrics {
  revenue: number;
  previousRevenue: number;
  orderCount: number;
  previousOrderCount: number;
  averageOrderValue: number;
  previousAverageOrderValue: number;
  grossProfit: number;
  previousGrossProfit: number;
  itemsSold: number;
  lowStockCount: number;
  stockValue: number;
}

/** Tính phần trăm thay đổi an toàn khi mẫu số bằng 0. */
export const percentChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

/** Tổng hợp toàn bộ chỉ số dashboard trong một lần duyệt dữ liệu. */
export const buildDashboardMetrics = (
  branchId: string | null,
  range: TimeRange,
  /** Tồn kho hiện tại, truyền từ `state.stock.balances`. */
  balances: readonly StockBalance[],
): DashboardMetrics => {
  const { from, to, previousFrom, previousTo } = resolveTimeRange(range);
  const current = filterOrders(branchId, from, to);
  const previous = filterOrders(branchId, previousFrom, previousTo);

  const revenue = sumRevenue(current);
  const previousRevenue = sumRevenue(previous);
  const cogs = sumCogs(current);
  const previousCogs = sumCogs(previous);

  return {
    revenue,
    previousRevenue,
    orderCount: current.length,
    previousOrderCount: previous.length,
    averageOrderValue: current.length === 0 ? 0 : revenue / current.length,
    previousAverageOrderValue:
      previous.length === 0 ? 0 : previousRevenue / previous.length,
    grossProfit: revenue - cogs,
    previousGrossProfit: previousRevenue - previousCogs,
    itemsSold: sumQuantity(current),
    lowStockCount: lowStockBalances(balances, branchId).length,
    stockValue: totalStockValue(balances, branchId),
  };
};

/** Hoá đơn gần nhất, dùng cho bảng "giao dịch mới nhất" trên dashboard. */
export const recentOrders = (branchId: string | null, limit = 8): SalesOrder[] =>
  ordersOfBranch(branchId).slice(0, limit);

/** Tổng số hoá đơn đã ghi nhận trong hệ thống. */
export const totalOrderCount = completedOrders.length;