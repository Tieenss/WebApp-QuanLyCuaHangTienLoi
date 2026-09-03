import { useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import { Card, Col, Progress, Row, Segmented, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { ChartCard } from '@/components/ChartCard';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/ProductThumb';
import { StatCard } from '@/components/StatCard';
import { OrderStatusTag } from '@/components/StatusTag';
import { EmptyState } from '@/components/EmptyState';
import { OrderDetailDrawer } from '@/features/salesOrders/components/OrderDetailDrawer';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTimeRange } from '@/store/slices/uiSlice';
import { setSelectedOrder } from '@/store/slices/salesOrderSlice';
import { hoaDonApi, type HoaDonDTO, type ChiTietHoaDonDTO } from '@/api/hoaDon';
import {
  PAYMENT_METHOD_LABEL,
  SYSTEM_WIDE_ROLES,
  TIME_RANGE_LABEL,
  type InventoryAlertItem,
  type KpiCard,
  type SalesOrder,
  type TimeRange,
  type TopSellingRow,
} from '@/types';
import {
  formatNumber,
  formatRatio,
  formatVND,
  formatVNDCompact,
} from '@/utils/formatters';
import { dayjs, formatTime } from '@/utils/dateUtils';
import {
  BranchRevenueChart,
  CategoryRevenueChart,
  RevenueTrendChart,
} from './components/DashboardCharts';
import './DashboardPage.css';

const { Text } = Typography;

const percentChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

interface DashboardMetricsData {
  revenue: number;
  previousRevenue: number;
  orderCount: number;
  previousOrderCount: number;
  averageOrderValue: number;
  previousAverageOrderValue: number;
  grossProfit: number;
  previousGrossProfit: number;
  itemsSold: number;
  stockValue: number;
  lowStockCount: number;
}

interface RevenueTrendData {
  label: string;
  revenue: number;
  previousRevenue: number;
  orderCount: number;
}

interface BranchRevenueData {
  branchId: string;
  branchName: string;
  shortName: string;
  revenue: number;
  profit: number;
  orderCount: number;
  targetAchievedPercent: number;
}

interface CategoryRevenueData {
  categoryId: string;
  categoryName: string;
  revenue: number;
  percentage: number;
  color: string;
}

/** Khoảng ngày tương ứng TimeRange, dạng [fromDate, toDate] (YYYY-MM-DD). */
const rangeToDateRange = (range: TimeRange): [string, string] => {
  const now = dayjs();
  switch (range) {
    case 'today':
      return [now.format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
    case '7days':
      return [now.subtract(6, 'day').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
    case '30days':
      return [now.subtract(29, 'day').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
    case 'thisMonth':
      return [now.startOf('month').format('YYYY-MM-DD'), now.format('YYYY-MM-DD')];
  }
};

/** Nhãn mốc so sánh tương ứng từng khoảng thời gian. */
const COMPARE_LABEL: Record<TimeRange, string> = {
  today: 'so với hôm qua',
  '7days': 'so với 7 ngày trước',
  '30days': 'so với 30 ngày trước',
  thisMonth: 'so với tháng trước',
};

/**
 * Module 1 — Tổng quan (Dashboard).
 *
 * Toàn bộ số liệu tính từ `mockData/analytics.ts` theo chi nhánh đang chọn và
 * khoảng thời gian đang lọc, nên dashboard luôn khớp với trang Báo cáo.
 */
export const DashboardPage: FC = () => {
  const dispatch = useAppDispatch();
  const { activeBranchId, user } = useAppSelector((state) => state.auth);
  const { timeRange } = useAppSelector((state) => state.ui);
  const selectedOrderId = useAppSelector(
    (state) => state.salesOrder.selectedOrderId,
  );

  /**
   * Dashboard chỉ mở cho ADMIN và KE_TOAN, nhưng vẫn kiểm tra tường minh để
   * phần so sánh giữa các chi nhánh không lộ ra nếu về sau mở thêm vai trò.
   */
  const isSystemWide = user !== null && SYSTEM_WIDE_ROLES.includes(user.role);
  const compareLabel = COMPARE_LABEL[timeRange];

  /** Tồn kho hiện hành — KPI tồn kho và cảnh báo đọc từ đây. */
  const balances = useAppSelector((state) => state.stock.balances);
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);

  // ── Dữ liệu từ API ───────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<HoaDonDTO[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<Record<string, ChiTietHoaDonDTO[]>>({});

  // Nạp hoá đơn + chi tiết từ API khi vào trang.
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const hdList = await hoaDonApi.getAll();
        if (cancelled) return;
        setInvoices(hdList);
        const sorted = [...hdList]
          .sort((a, b) => (b.ngayBan ?? '').localeCompare(a.ngayBan ?? ''))
          .slice(0, 200);
        const lineMap: Record<string, ChiTietHoaDonDTO[]> = {};
        await Promise.all(
          sorted.map(async (hd) => {
            try {
              const res = await fetch(
                `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/chi-tiet-hoa-don/by-hoa-don/${hd.id}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } },
              );
              if (res.ok) lineMap[hd.id] = await res.json();
            } catch {
              lineMap[hd.id] = [];
            }
          }),
        );
        if (!cancelled) setInvoiceLines(lineMap);
      } catch {
        // im lặng — dashboard vẫn render với 0
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const branchNameById = (id: string | null): string => {
    if (id === null) return 'Toàn chuỗi';
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Chi nhánh';
  };

  const productById = (id: string) => products.find((p) => p.id === id);

  /** Hoá đơn COMPLETED trong kỳ + filter chi nhánh. */
  const periodInvoices = useMemo(() => {
    const [from, to] = rangeToDateRange(timeRange);
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (activeBranchId === null || hd.idChiNhanh === activeBranchId)
      );
    });
  }, [invoices, timeRange, activeBranchId]);

  /** Hoá đơn kỳ trước (cùng độ dài) để so sánh. */
  const previousPeriodInvoices = useMemo(() => {
    const days =
      timeRange === 'today' ? 1
      : timeRange === '7days' ? 7
      : timeRange === '30days' ? 30
      : dayjs().date();
    const now = dayjs();
    const from = now.subtract(days, 'day').format('YYYY-MM-DD');
    const to = now.subtract(1, 'day').format('YYYY-MM-DD');
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (activeBranchId === null || hd.idChiNhanh === activeBranchId)
      );
    });
  }, [invoices, timeRange, activeBranchId]);

  /** Giá vốn đơn vị theo sản phẩm (từ ton_kho.giaVonTrungBinh). */
  const costByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of balances) {
      const cost = Number(b.averageCost ?? 0);
      if (cost > 0 && (!map.has(b.productId) || cost < (map.get(b.productId) ?? Infinity))) {
        map.set(b.productId, cost);
      }
    }
    return map;
  }, [balances]);

  /** Số lượng bán + doanh thu + COGS theo sản phẩm trong kỳ. */
  const productStats = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number; cogs: number }>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const prev = map.get(line.idSanPham) ?? { qty: 0, revenue: 0, cogs: 0 };
        prev.qty += line.soLuong;
        prev.revenue += line.thanhTien;
        prev.cogs += line.soLuong * (costByProduct.get(line.idSanPham) ?? 0);
        map.set(line.idSanPham, prev);
      }
    }
    return map;
  }, [periodInvoices, invoiceLines, costByProduct]);

  const metrics = useMemo<DashboardMetricsData>(() => {
    const revenue = periodInvoices.reduce((s, hd) => s + hd.grandTotal, 0);
    const previousRevenue = previousPeriodInvoices.reduce((s, hd) => s + hd.grandTotal, 0);
    const cogs = [...productStats.values()].reduce((s, v) => s + v.cogs, 0);
    const itemsSold = [...productStats.values()].reduce((s, v) => s + v.qty, 0);
    const stockValue = balances.reduce(
      (sum, b) => sum + Number(b.stockValue ?? 0),
      0,
    );
    const lowStockCount = balances.filter(
      (b) => Number(b.quantity ?? 0) <= Number(b.minStock ?? 0),
    ).length;
    return {
      revenue,
      previousRevenue,
      orderCount: periodInvoices.length,
      previousOrderCount: previousPeriodInvoices.length,
      averageOrderValue: periodInvoices.length === 0 ? 0 : Math.round(revenue / periodInvoices.length),
      previousAverageOrderValue:
        previousPeriodInvoices.length === 0
          ? 0
          : Math.round(previousRevenue / previousPeriodInvoices.length),
      grossProfit: revenue - cogs,
      previousGrossProfit: 0,
      itemsSold,
      stockValue,
      lowStockCount,
    };
  }, [periodInvoices, previousPeriodInvoices, productStats, balances]);

  /** Biến động doanh thu theo ngày trong kỳ. */
  const trendData = useMemo<RevenueTrendData[]>(() => {
    const [from] = rangeToDateRange(timeRange);
    const days =
      timeRange === 'today' ? 1
      : timeRange === '7days' ? 7
      : timeRange === '30days' ? 30
      : dayjs().date();
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const hd of periodInvoices) {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      const prev = byDay.get(d) ?? { revenue: 0, orders: 0 };
      prev.revenue += hd.grandTotal;
      prev.orders += 1;
      byDay.set(d, prev);
    }
    const points: RevenueTrendData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dayjs(from).add(days - 1 - i, 'day').format('YYYY-MM-DD');
      const data = byDay.get(date) ?? { revenue: 0, orders: 0 };
      points.push({
        label: dayjs(date).format('DD/MM'),
        revenue: data.revenue,
        previousRevenue: 0,
        orderCount: data.orders,
      });
    }
    return points;
  }, [periodInvoices, timeRange]);

  /** Doanh thu + lợi nhuận theo chi nhánh. */
  const branchData = useMemo<BranchRevenueData[]>(() => {
    const revMap = new Map<string, { revenue: number; orders: number }>();
    for (const hd of periodInvoices) {
      const prev = revMap.get(hd.idChiNhanh) ?? { revenue: 0, orders: 0 };
      prev.revenue += hd.grandTotal;
      prev.orders += 1;
      revMap.set(hd.idChiNhanh, prev);
    }
    const cogsMap = new Map<string, number>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        cogsMap.set(
          hd.idChiNhanh,
          (cogsMap.get(hd.idChiNhanh) ?? 0) +
            line.soLuong * (costByProduct.get(line.idSanPham) ?? 0),
        );
      }
    }
    return [...revMap.entries()]
      .map(([id, v]) => {
        const branch = branches.find((b) => b.id === id);
        const cogs = cogsMap.get(id) ?? 0;
        return {
          branchId: id,
          branchName: branch?.name ?? 'Chi nhánh',
          shortName: (branch?.name ?? 'CN').replace('Circle K ', ''),
          revenue: v.revenue,
          profit: v.revenue - cogs,
          orderCount: v.orders,
          targetAchievedPercent: 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [periodInvoices, invoiceLines, costByProduct, branches]);

  const categoryData = useMemo<CategoryRevenueData[]>(() => {
    const map = new Map<string, number>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const product = productById(line.idSanPham);
        const catId = product?.categoryId ?? 'unknown';
        map.set(catId, (map.get(catId) ?? 0) + line.thanhTien);
      }
    }
    const total = [...map.values()].reduce((s, v) => s + v, 0);
    return [...map.entries()]
      .map(([catId, revenue], index) => {
        const product = products.find((p) => p.categoryId === catId);
        return {
          categoryId: catId,
          categoryName: product?.categoryName || 'Khác',
          revenue,
          percentage: total === 0 ? 0 : (revenue / total) * 100,
          color: ['#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'][index % 7],
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodInvoices, invoiceLines, products]);

  const topSelling = useMemo<TopSellingRow[]>(() => {
    const stockByProduct = new Map<string, number>();
    for (const b of balances) {
      stockByProduct.set(
        b.productId,
        (stockByProduct.get(b.productId) ?? 0) + Number(b.quantity ?? 0),
      );
    }
    return [...productStats.entries()]
      .map(([productId, v]) => {
        const product = productById(productId);
        return {
          id: productId,
          rank: 0,
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          categoryName: product?.categoryName ?? '',
          imageUrl: product?.imageUrl ?? '',
          quantitySold: v.qty,
          revenue: v.revenue,
          grossProfit: v.revenue - v.cogs,
          marginPercent: v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100,
          remainingStock: stockByProduct.get(productId) ?? 0,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 8)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productStats, balances, products]);

  const alerts = useMemo<InventoryAlertItem[]>(() => {
    const productAlerts = new Map<string, { current: number; min: number }>();
    for (const b of balances) {
      if (activeBranchId !== null && b.branchId !== activeBranchId) continue;
      const prev = productAlerts.get(b.productId) ?? { current: 0, min: b.minStock ?? 0 };
      prev.current += Number(b.quantity ?? 0);
      productAlerts.set(b.productId, prev);
    }
    return [...productAlerts.entries()]
      .filter(([, v]) => v.current <= v.min)
      .map(([productId, v]) => {
        const product = productById(productId);
        const ratio = v.min === 0 ? 1 : v.current / v.min;
        const suggested = Math.max(0, (product?.maxStock ?? 0) - v.current);
        return {
          id: productId,
          productId,
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          categoryName: product?.categoryName ?? '',
          branchName: branchNameById(activeBranchId),
          currentStock: v.current,
          minStock: v.min,
          suggestedReorder: suggested,
          urgency: (ratio <= 0.5 ? 'high' : 'medium') as 'high' | 'medium',
        };
      })
      .sort((a, b) => a.currentStock / Math.max(1, a.minStock) - b.currentStock / Math.max(1, b.minStock))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, activeBranchId, products, branches]);

  /** 4 thẻ KPI chính theo yêu cầu: doanh số, đơn hàng, giá trị TB, cảnh báo tồn. */
  const kpiCards = useMemo<KpiCard[]>(
    () => [
      {
        id: 'revenue',
        title: 'Doanh thu',
        value: metrics.revenue,
        displayValue: formatVND(metrics.revenue),
        changePercent: percentChange(metrics.revenue, metrics.previousRevenue),
        isFavorable: metrics.revenue >= metrics.previousRevenue,
        comparedTo: compareLabel,
        icon: 'revenue',
        accentColor: BRAND.primaryRed,
      },
      {
        id: 'orders',
        title: 'Số đơn hàng',
        value: metrics.orderCount,
        displayValue: `${formatNumber(metrics.orderCount)} đơn`,
        changePercent: percentChange(metrics.orderCount, metrics.previousOrderCount),
        isFavorable: metrics.orderCount >= metrics.previousOrderCount,
        comparedTo: compareLabel,
        icon: 'orders',
        accentColor: BRAND.info,
      },
      {
        id: 'aov',
        title: 'Giá trị trung bình / đơn',
        value: metrics.averageOrderValue,
        displayValue: formatVND(Math.round(metrics.averageOrderValue)),
        changePercent: percentChange(
          metrics.averageOrderValue,
          metrics.previousAverageOrderValue,
        ),
        isFavorable: metrics.averageOrderValue >= metrics.previousAverageOrderValue,
        comparedTo: compareLabel,
        icon: 'avgOrder',
        accentColor: BRAND.accentYellow,
      },
      {
        id: 'lowstock',
        title: 'Mặt hàng cần nhập thêm',
        value: metrics.lowStockCount,
        displayValue: `${formatNumber(metrics.lowStockCount)} SKU`,
        // Cảnh báo tồn kho: càng ít càng tốt, nên luôn coi là tín hiệu xấu khi có.
        changePercent: metrics.lowStockCount === 0 ? 0 : metrics.lowStockCount,
        isFavorable: metrics.lowStockCount === 0,
        comparedTo: 'dưới ngưỡng tồn tối thiểu',
        icon: 'lowStock',
        accentColor: BRAND.warning,
      },
    ],
    [metrics, compareLabel],
  );

  /** Thẻ KPI phụ: lợi nhuận gộp, số lượng bán, giá trị tồn kho. */
  const secondaryCards = useMemo<KpiCard[]>(
    () => [
      {
        id: 'profit',
        title: 'Lợi nhuận gộp',
        value: metrics.grossProfit,
        displayValue: formatVND(metrics.grossProfit),
        changePercent: percentChange(metrics.grossProfit, metrics.previousGrossProfit),
        isFavorable: metrics.grossProfit >= metrics.previousGrossProfit,
        comparedTo: compareLabel,
        icon: 'profit',
        accentColor: BRAND.success,
      },
      {
        id: 'items',
        title: 'Số lượng sản phẩm đã bán',
        value: metrics.itemsSold,
        displayValue: `${formatNumber(metrics.itemsSold)} đơn vị`,
        changePercent: 0,
        isFavorable: true,
        comparedTo: TIME_RANGE_LABEL[timeRange],
        icon: 'orders',
        accentColor: '#6366F1',
      },
      {
        id: 'stockvalue',
        title: 'Giá trị hàng tồn kho',
        value: metrics.stockValue,
        displayValue: formatVND(metrics.stockValue),
        changePercent: 0,
        isFavorable: true,
        comparedTo: branchNameById(activeBranchId),
        icon: 'cash',
        accentColor: BRAND.neutralDark,
      },
    ],
    [metrics, compareLabel, timeRange, activeBranchId],
  );

  /**
   * Hoá đơn mới nhất đọc trực tiếp từ slice `salesOrder.orders` thay vì từ
   * `mockData.analytics` — nhờ vậy hoá đơn vừa bán ở POS (qua action
   * `saleCompleted`) sẽ xuất hiện ngay trên dashboard mà không cần refresh.
   * Lọc theo chi nhánh đang chọn (nếu có) và lấy 8 dòng đầu.
   */
  const allOrders = useAppSelector((state) => state.salesOrder.orders);
  const latestOrders = useMemo(
    () =>
      allOrders
        .filter((order) =>
          activeBranchId === null ? true : order.branchId === activeBranchId,
        )
        .slice(0, 8),
    [allOrders, activeBranchId],
  );

  const topSellingColumns: ColumnsType<TopSellingRow> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 44,
      align: 'center',
      render: (rank: number) => (
        <Text strong className={rank <= 3 ? 'rank-top' : undefined}>
          {rank}
        </Text>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (name: string, row) => {
        const product = productById(row.id);
        return (
          <Space size={10}>
            <ProductThumb
              categoryId={product?.categoryId ?? ''}
              size={38}
              productName={name}
            />
            <span className="dash-product-info">
              <Text strong className="dash-product-name">
                {name}
              </Text>
              <Text type="secondary" className="dash-product-sub">
                {row.sku} · {row.categoryName}
              </Text>
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Đã bán',
      dataIndex: 'quantitySold',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <span className="numeric-cell">{formatNumber(value)}</span>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lãi gộp',
      dataIndex: 'grossProfit',
      align: 'right',
      width: 140,
      render: (value: number, row) => (
        <Space direction="vertical" size={0} className="cell-stack-right">
          <span className="numeric-cell profit-value">{formatVND(value)}</span>
          <Text type="secondary" className="cell-note">
            {formatRatio(row.marginPercent, 1)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Tồn còn',
      dataIndex: 'remainingStock',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text
          className={`numeric-cell${value < 20 ? ' stock-low' : ''}`}
        >
          {formatNumber(value)}
        </Text>
      ),
    },
  ];

  const orderColumns: ColumnsType<SalesOrder> = [
    {
      title: 'Mã hoá đơn',
      dataIndex: 'code',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'soldAt',
      width: 90,
      render: (value: string) => formatTime(value),
    },
    ...(isSystemWide && activeBranchId === null
      ? [
          {
            title: 'Chi nhánh',
            dataIndex: 'branchName',
            render: (value: string) => (
              <Text className="dash-text-12-5">{value.replace('Circle K ', '')}</Text>
            ),
          },
        ]
      : []),
    {
      title: 'Thu ngân',
      dataIndex: 'cashierName',
      render: (value: string) => <Text className="dash-text-12-5">{value}</Text>,
    },
    {
      title: 'SL',
      key: 'quantity',
      align: 'center',
      width: 60,
      render: (_, row) => row.lines.reduce((sum, line) => sum + line.quantity, 0),
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentMethod',
      width: 130,
      render: (method: SalesOrder['paymentMethod']) => (
        <Tag color="blue" className="tag-no-margin">
          {PAYMENT_METHOD_LABEL[method]}
        </Tag>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'grandTotal',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text strong className="numeric-cell total-red">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 110,
      render: (status: SalesOrder['status']) => <OrderStatusTag status={status} />,
    },
  ];

  /** Màu thanh tiến trình theo mức độ khẩn cấp của cảnh báo tồn. */
  const urgencyColor = (urgency: InventoryAlertItem['urgency']): string =>
    urgency === 'high'
      ? BRAND.error
      : urgency === 'medium'
        ? BRAND.warning
        : BRAND.info;

  return (
    <>
      <PageHeader
        eyebrow="VẬN HÀNH / MODULE 1"
        title="Tổng quan hoạt động"
        description={`${branchNameById(activeBranchId)} · ${TIME_RANGE_LABEL[timeRange]}`}
        extra={
          <Space>
            <ClockCircleOutlined className="time-icon" />
            <Segmented<TimeRange>
              value={timeRange}
              onChange={(value) => dispatch(setTimeRange(value))}
              options={[
                { label: 'Hôm nay', value: 'today' },
                { label: '7 ngày', value: '7days' },
                { label: '30 ngày', value: '30days' },
                { label: 'Tháng này', value: 'thisMonth' },
              ]}
            />
          </Space>
        }
      />

      <Row gutter={[16, 16]}>
        {kpiCards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.id}>
            <StatCard data={card} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {secondaryCards.map((card) => (
          <Col xs={24} sm={12} xl={8} key={card.id}>
            <StatCard data={card} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <ChartCard
            title="Biến động doanh thu"
            description={`Đơn vị: VND · ${branchNameById(activeBranchId)}`}
            height={318}
          >
            <RevenueTrendChart data={trendData} compareLabel="Kỳ trước" />
          </ChartCard>
        </Col>
        <Col xs={24} xl={8}>
          <ChartCard
            title="Tỷ trọng theo danh mục"
            description="Cơ cấu doanh thu các nhóm hàng"
            height={318}
          >
            {categoryData.length > 0 ? (
              <CategoryRevenueChart data={categoryData} />
            ) : (
              <EmptyState title="Chưa có doanh thu trong kỳ" />
            )}
          </ChartCard>
        </Col>
      </Row>

      {/* Bảng xếp hạng chi nhánh chỉ có ý nghĩa với Admin chuỗi. */}
      {isSystemWide && (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <ChartCard
              title="Doanh thu & lợi nhuận theo chi nhánh"
              description="So sánh hiệu quả các cửa hàng trong chuỗi"
              height={330}
            >
              <BranchRevenueChart data={branchData} />
            </ChartCard>
          </Col>
          <Col xs={24} xl={10}>
            <Card
              title="Mức hoàn thành mục tiêu"
              styles={{ body: { padding: '12px 18px 18px' } }}
            >
              <Space direction="vertical" size={14} className="dash-list-full">
                {branchData.map((branch) => (
                  <div key={branch.branchId}>
                    <div className="dash-progress-row">
                      <Text className="dash-branch-name">{branch.shortName}</Text>
                      <Text type="secondary" className="dash-branch-revenue">
                        {formatVNDCompact(branch.revenue)}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.min(100, Math.round(branch.targetAchievedPercent))}
                      size="small"
                      strokeColor={
                        branch.targetAchievedPercent >= 100
                          ? BRAND.success
                          : branch.targetAchievedPercent >= 70
                            ? BRAND.accentYellow
                            : BRAND.primaryRed
                      }
                    />
                  </div>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card
            title="Hàng bán chạy nhất"
            styles={{ body: { padding: '0 4px 8px' } }}
          >
            <Table<TopSellingRow>
              columns={topSellingColumns}
              dataSource={topSelling}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 720 }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card
            title={
              <Space size={8}>
                <WarningOutlined className="alert-title-icon" />
                <span>Cảnh báo tồn kho</span>
              </Space>
            }
            extra={
              <Tag color="red" className="tag-no-margin">
                {metrics.lowStockCount} SKU
              </Tag>
            }
            styles={{ body: { padding: '12px 18px 18px' } }}
          >
            {alerts.length === 0 ? (
              <EmptyState
                title="Tồn kho đang ở mức an toàn"
                description="Không có mặt hàng nào dưới ngưỡng tối thiểu."
              />
            ) : (
              <Space direction="vertical" size={12} className="dash-list-full">
                {alerts.map((alert) => (
                  <div key={alert.id}>
                    <div className="dash-progress-row with-gap">
                      <Text strong className="dash-text-12-5" ellipsis>
                        {alert.productName}
                      </Text>
                      <Text
                        strong
                        className="alert-stock-value"
                        style={
                          { '--alert-color': urgencyColor(alert.urgency) } as CSSProperties
                        }
                      >
                        {alert.currentStock}/{alert.minStock}
                      </Text>
                    </div>
                    <Progress
                      percent={Math.round(
                        (alert.currentStock / Math.max(1, alert.minStock)) * 100,
                      )}
                      size="small"
                      showInfo={false}
                      strokeColor={urgencyColor(alert.urgency)}
                    />
                    <Text type="secondary" className="alert-note">
                      {alert.sku} · Đề xuất nhập thêm {alert.suggestedReorder}
                    </Text>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Giao dịch POS gần nhất" styles={{ body: { padding: '0 4px 8px' } }}>
        <Table<SalesOrder>
          columns={orderColumns}
          dataSource={latestOrders}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 860 }}
          className="dense-table"
          onRow={(record) => ({
            onClick: () => dispatch(setSelectedOrder(record.id)),
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <OrderDetailDrawer
        order={
          allOrders.find(
            (order) => order.id === selectedOrderId,
          ) ?? null
        }
      />
    </>
  );
};