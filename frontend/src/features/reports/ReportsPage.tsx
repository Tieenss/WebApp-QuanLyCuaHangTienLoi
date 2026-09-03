import { useEffect, useMemo, useState, type FC } from 'react';
import {
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '@/components/ChartCard';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/ProductThumb';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { EmptyState } from '@/components/EmptyState';
import { BRAND, CHART_COLORS } from '@/config/brand';
import { useAppSelector } from '@/store/hooks';
import { hoaDonApi, type HoaDonDTO, type ChiTietHoaDonDTO } from '@/api/hoaDon';
import { theKhoApi, type TheKhoDTO } from '@/api/tonKho';
import {
  SHRINKAGE_REASON_LABEL,
  TIME_RANGE_LABEL,
  type ProfitReportRow,
  type ShrinkageReason,
  type ShrinkageReportRow,
  type TimeRange,
  type TopSellingRow,
} from '@/types';
import { dayjs, formatDate } from '@/utils/dateUtils';
import {
  formatNumber,
  formatRatio,
  formatVND,
  formatVNDCompact,
} from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import './ReportsPage.css';

const { Text } = Typography;

const AXIS_STYLE = { fontSize: 11, fill: BRAND.textSecondary } as const;

interface CategoryRevenueData {
  categoryId: string;
  categoryName: string;
  revenue: number;
  color: string;
}

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

/** Số ngày của kỳ so sánh trước (cùng độ dài). */
const rangeLengthDays = (range: TimeRange): number => {
  switch (range) {
    case 'today': return 1;
    case '7days': return 7;
    case '30days': return 30;
    case 'thisMonth': return dayjs().date();
  }
};

/**
 * Module 13 — Báo cáo.
 *
 * 4 báo cáo theo yêu cầu, dùng chung một bộ lọc (chi nhánh + khoảng thời gian)
 * để người dùng chuyển tab mà không phải chọn lại điều kiện.
 */
export const ReportsPage: FC = () => {
  const activeBranchId = useAppSelector((state) => state.auth.activeBranchId);
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);
  const balances = useAppSelector((state) => state.stock.balances);

  const [branchId, setBranchId] = useState<string | null>(activeBranchId);
  const [range, setRange] = useState<TimeRange>('30days');
  const [invoices, setInvoices] = useState<HoaDonDTO[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<Record<string, ChiTietHoaDonDTO[]>>({});
  const [ledger, setLedger] = useState<TheKhoDTO[]>([]);
  const [, setLoading] = useState(false);

  // Nạp dữ liệu gốc từ API khi vào trang.
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const [hdList, ledgerList] = await Promise.all([
          hoaDonApi.getAll(),
          theKhoApi.getAll(),
        ]);
        if (cancelled) return;
        setInvoices(hdList);
        setLedger(ledgerList);

        // Nạp chi tiết hoá đơn cho từng đơn (song song, giới hạn 200 đơn gần nhất).
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
        if (!cancelled) message.error('Lỗi tải dữ liệu báo cáo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Hoá đơn COMPLETED trong kỳ + filter chi nhánh. */
  const periodInvoices = useMemo(() => {
    const [from, to] = rangeToDateRange(range);
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (branchId === null || hd.idChiNhanh === branchId)
      );
    });
  }, [invoices, range, branchId]);

  /** Hoá đơn kỳ trước (cùng độ dài) để so sánh. */
  const previousPeriodInvoices = useMemo(() => {
    const days = rangeLengthDays(range);
    const now = dayjs();
    const from = now.subtract(days, 'day').format('YYYY-MM-DD');
    const to = now.subtract(1, 'day').format('YYYY-MM-DD');
    return invoices.filter((hd) => {
      const d = (hd.ngayBan ?? '').slice(0, 10);
      return (
        d >= from &&
        d <= to &&
        (hd.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (branchId === null || hd.idChiNhanh === branchId)
      );
    });
  }, [invoices, range, branchId]);

  /** Giá vốn đơn vị theo sản phẩm (từ ton_kho.giaVonTrungBinh, lấy min mọi chi nhánh). */
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

  /** Số lượng bán + doanh thu + COGS theo từng sản phẩm trong kỳ. */
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

  const branchNameById = (id: string | null): string => {
    if (id === null) return 'Toàn chuỗi';
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Chi nhánh';
  };

  const productById = (id: string) => products.find((p) => p.id === id);

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

  const summary = useMemo<SummaryItem[]>(() => {
    const grossMargin =
      metrics.revenue === 0 ? 0 : (metrics.grossProfit / metrics.revenue) * 100;

    return [
      {
        key: 'revenue',
        title: 'Doanh thu kỳ báo cáo',
        value: formatVND(metrics.revenue),
        color: BRAND.primaryRed,
      },
      {
        key: 'profit',
        title: 'Lợi nhuận gộp',
        value: formatVND(metrics.grossProfit),
        color: BRAND.success,
      },
      {
        key: 'margin',
        title: 'Tỷ suất lãi gộp',
        value: formatRatio(grossMargin, 1),
      },
      {
        key: 'orders',
        title: 'Số hoá đơn',
        value: formatNumber(metrics.orderCount),
        suffix: 'đơn',
      },
    ];
  }, [metrics]);

  // ── Báo cáo 1: Doanh thu ──────────────────────────────────────────────────────
  const branchProfit = useMemo<ProfitReportRow[]>(() => {
    // Chi phí vận hành theo chi nhánh từ sổ quỹ (PAYMENT) — đã nạp qua cashbookSlice.
    // Ở đây chỉ tổng hợp doanh thu/COGS từ hoá đơn; chi phí đặt 0 (MVP).
    const map = new Map<string, { revenue: number; cogs: number; orders: number }>();
    for (const hd of invoices.filter(
      (h) =>
        (h.trangThai ?? 'COMPLETED') === 'COMPLETED' &&
        (branchId === null || h.idChiNhanh === branchId),
    )) {
      const key = hd.idChiNhanh;
      const prev = map.get(key) ?? { revenue: 0, cogs: 0, orders: 0 };
      prev.revenue += hd.grandTotal;
      prev.orders += 1;
      map.set(key, prev);
    }
    // COGS chia theo chi nhánh từ line items
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const prev = map.get(hd.idChiNhanh);
        if (prev) {
          prev.cogs += line.soLuong * (costByProduct.get(line.idSanPham) ?? 0);
        }
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        dimensionName: branchNameById(id),
        revenue: v.revenue,
        cogs: v.cogs,
        grossProfit: v.revenue - v.cogs,
        operatingCost: 0,
        netProfit: v.revenue - v.cogs,
        netMarginPercent: v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, periodInvoices, invoiceLines, costByProduct, branchId, branches]);

  const categoryRevenue = useMemo<CategoryRevenueData[]>(() => {
    const map = new Map<string, { name: string; revenue: number }>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const product = productById(line.idSanPham);
        const catId = product?.categoryId ?? 'unknown';
        const prev = map.get(catId) ?? { name: product?.categoryName || 'Khác', revenue: 0 };
        prev.revenue += line.thanhTien;
        map.set(catId, prev);
      }
    }
    return [...map.entries()]
      .map(([categoryId, v], index) => ({
        categoryId,
        categoryName: v.name,
        revenue: v.revenue,
        color: CHART_COLORS[index % CHART_COLORS.length] ?? BRAND.primaryRed,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodInvoices, invoiceLines, products]);

  // ── Báo cáo 2: Lợi nhuận ──────────────────────────────────────────────────────
  const categoryProfit = useMemo<ProfitReportRow[]>(() => {
    const map = new Map<string, { name: string; revenue: number; cogs: number }>();
    for (const hd of periodInvoices) {
      const lines = invoiceLines[hd.id] ?? [];
      for (const line of lines) {
        const product = productById(line.idSanPham);
        const catId = product?.categoryId ?? 'unknown';
        const prev = map.get(catId) ?? { name: product?.categoryName || 'Khác', revenue: 0, cogs: 0 };
        prev.revenue += line.thanhTien;
        prev.cogs += line.soLuong * (costByProduct.get(line.idSanPham) ?? 0);
        map.set(catId, prev);
      }
    }
    return [...map.entries()]
      .map(([id, v]) => ({
        id,
        dimensionName: v.name,
        revenue: v.revenue,
        cogs: v.cogs,
        grossProfit: v.revenue - v.cogs,
        operatingCost: 0,
        netProfit: v.revenue - v.cogs,
        netMarginPercent: v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodInvoices, invoiceLines, costByProduct, products]);

  // ── Báo cáo 3: Hàng bán chạy ──────────────────────────────────────────────────
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
        const margin = v.revenue === 0 ? 0 : ((v.revenue - v.cogs) / v.revenue) * 100;
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
          marginPercent: margin,
          remainingStock: stockByProduct.get(productId) ?? 0,
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 20)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productStats, balances, products]);

  // ── Báo cáo 4: Hao hụt / huỷ hàng (từ the_kho các giao dịch điều chỉnh) ──────
  const shrinkage = useMemo<ShrinkageReportRow[]>(() => {
    const [from, to] = rangeToDateRange(range);
    return ledger
      .filter((tk) => {
        const d = (tk.ngayPhatSinh ?? '').slice(0, 10);
        const type = tk.loaiGiaoDich ?? '';
        return (
          d >= from &&
          d <= to &&
          (type.includes('ADJUST') || type.includes('SHRINKAGE') || type.includes('LOSS')) &&
          (branchId === null || tk.idChiNhanh === branchId)
        );
      })
      .map((tk) => {
        const product = productById(tk.idSanPham);
        const unitCost = Number(tk.donGia ?? 0);
        const qty = Math.abs(tk.soLuong);
        const branch = branches.find((b) => b.id === tk.idChiNhanh);
        const lossValue = qty * unitCost;
        return {
          id: tk.id,
          branchId: tk.idChiNhanh,
          branchName: branch?.name ?? '',
          sku: product?.sku ?? '',
          productName: product?.name ?? '',
          categoryName: product?.categoryName ?? '',
          reason: 'LOST' as ShrinkageReason,
          quantity: qty,
          unitCost,
          lossValue,
          occurredAt: (tk.ngayPhatSinh ?? '').slice(0, 10),
          shrinkageRatePercent: 0,
        };
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, range, branchId, products, branches]);

  /** Tổng tổn thất theo từng nguyên nhân, cho biểu đồ tròn. */
  const shrinkageByReason = useMemo(() => {
    const map = new Map<ShrinkageReason, number>();
    for (const row of shrinkage) {
      map.set(row.reason, (map.get(row.reason) ?? 0) + row.lossValue);
    }
    return [...map.entries()].map(([reason, value], index) => ({
      reason,
      name: SHRINKAGE_REASON_LABEL[reason],
      value,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? BRAND.primaryRed,
    }));
  }, [shrinkage]);

  const profitColumns: ColumnsType<ProfitReportRow> = [
    {
      title: 'Đối tượng',
      dataIndex: 'dimensionName',
      width: 240,
      render: (value: string) => (
        <Text strong className="report-dimension">
          {value}
        </Text>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.revenue - b.revenue,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Giá vốn (COGS)',
      dataIndex: 'cogs',
      align: 'right',
      width: 150,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lợi nhuận gộp',
      dataIndex: 'grossProfit',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.grossProfit - b.grossProfit,
      render: (value: number) => (
        <Text strong className="numeric-cell report-profit">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Chi phí vận hành',
      dataIndex: 'operatingCost',
      align: 'right',
      width: 150,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell report-opcost">
            {formatVND(value)}
          </span>
        ),
    },
    {
      title: 'Lợi nhuận thuần',
      dataIndex: 'netProfit',
      align: 'right',
      width: 160,
      sorter: (a, b) => a.netProfit - b.netProfit,
      render: (value: number) => (
        <Text
          strong
          className={`numeric-cell ${value >= 0 ? 'report-net-positive' : 'report-net-negative'}`}
        >
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Tỷ suất thuần',
      dataIndex: 'netMarginPercent',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text
          className={value >= 0 ? 'report-margin-positive' : 'report-margin-negative'}
        >
          {formatRatio(value, 1)}
        </Text>
      ),
    },
  ];

  const topSellingColumns: ColumnsType<TopSellingRow> = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 50,
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
      width: 320,
      render: (name: string, row) => {
        const product = productById(row.id);
        return (
          <Space size={10}>
            <ProductThumb
              categoryId={product?.categoryId ?? ''}
              size={36}
              productName={name}
            />
            <span className="report-product-info">
              <Text strong className="report-product-name">
                {name}
              </Text>
              <Text type="secondary" className="report-product-sub">
                <span className="mono-code">{row.sku}</span> · {row.categoryName}
              </Text>
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Số lượng bán',
      dataIndex: 'quantitySold',
      align: 'right',
      width: 120,
      sorter: (a, b) => a.quantitySold - b.quantitySold,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.revenue - b.revenue,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lãi gộp',
      dataIndex: 'grossProfit',
      align: 'right',
      width: 140,
      render: (value: number) => (
        <Text className="numeric-cell report-gross">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Tỷ suất lãi',
      dataIndex: 'marginPercent',
      align: 'right',
      width: 110,
      sorter: (a, b) => a.marginPercent - b.marginPercent,
      render: (value: number) => formatRatio(value, 1),
    },
    {
      title: 'Tồn còn lại',
      dataIndex: 'remainingStock',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text className={`numeric-cell${value < 20 ? ' stock-low' : ''}`}>
          {formatNumber(value)}
        </Text>
      ),
    },
  ];

  const shrinkageColumns: ColumnsType<ShrinkageReportRow> = [
    {
      title: 'Ngày phát hiện',
      dataIndex: 'occurredAt',
      width: 130,
      sorter: (a, b) => a.occurredAt.localeCompare(b.occurredAt),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 210,
      render: (value: string) => <Text className="report-text-12-5">{value}</Text>,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      width: 290,
      render: (name: string, row) => (
        <span>
          <Text strong className="report-shrink-name">
            {name}
          </Text>
          <Text type="secondary" className="report-shrink-sub">
            <span className="mono-code">{row.sku}</span> · {row.categoryName}
          </Text>
        </span>
      ),
    },
    {
      title: 'Nguyên nhân',
      dataIndex: 'reason',
      width: 180,
      render: (reason: ShrinkageReason) => (
        <Tag color="volcano" className="tag-no-margin">
          {SHRINKAGE_REASON_LABEL[reason]}
        </Tag>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      align: 'right',
      width: 100,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: 'Giá vốn',
      dataIndex: 'unitCost',
      align: 'right',
      width: 110,
      render: (value: number) => formatVND(value),
    },
    {
      title: 'Giá trị tổn thất',
      dataIndex: 'lossValue',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.lossValue - b.lossValue,
      render: (value: number) => (
        <Text strong className="numeric-cell report-loss">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Tỷ lệ hao hụt',
      dataIndex: 'shrinkageRatePercent',
      align: 'right',
      width: 120,
      render: (value: number) => formatRatio(value, 2),
    },
  ];

  const handleExportProfit = (rows: readonly ProfitReportRow[], name: string): void => {
    exportToExcel(
      rows,
      [
        { header: 'Đối tượng', accessor: (row) => row.dimensionName },
        { header: 'Doanh thu', accessor: (row) => row.revenue },
        { header: 'Giá vốn', accessor: (row) => row.cogs },
        { header: 'Lợi nhuận gộp', accessor: (row) => row.grossProfit },
        { header: 'Chi phí vận hành', accessor: (row) => row.operatingCost },
        { header: 'Lợi nhuận thuần', accessor: (row) => row.netProfit },
        {
          header: 'Tỷ suất thuần (%)',
          accessor: (row) => row.netMarginPercent.toFixed(2),
        },
      ],
      name,
    );
  };

  const handleExportTopSelling = (): void => {
    exportToExcel(
      topSelling,
      [
        { header: 'Xếp hạng', accessor: (row) => row.rank },
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Sản phẩm', accessor: (row) => row.productName },
        { header: 'Danh mục', accessor: (row) => row.categoryName },
        { header: 'Số lượng bán', accessor: (row) => row.quantitySold },
        { header: 'Doanh thu', accessor: (row) => row.revenue },
        { header: 'Lãi gộp', accessor: (row) => row.grossProfit },
        { header: 'Tỷ suất lãi (%)', accessor: (row) => row.marginPercent.toFixed(2) },
        { header: 'Tồn còn lại', accessor: (row) => row.remainingStock },
      ],
      'Bao cao hang ban chay Circle K',
    );
  };

  const handleExportShrinkage = (): void => {
    exportToExcel(
      shrinkage,
      [
        { header: 'Ngày', accessor: (row) => row.occurredAt },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Sản phẩm', accessor: (row) => row.productName },
        { header: 'Danh mục', accessor: (row) => row.categoryName },
        { header: 'Nguyên nhân', accessor: (row) => SHRINKAGE_REASON_LABEL[row.reason] },
        { header: 'Số lượng', accessor: (row) => row.quantity },
        { header: 'Giá vốn', accessor: (row) => row.unitCost },
        { header: 'Giá trị tổn thất', accessor: (row) => row.lossValue },
        {
          header: 'Tỷ lệ hao hụt (%)',
          accessor: (row) => row.shrinkageRatePercent.toFixed(2),
        },
      ],
      'Bao cao hao hut huy hang Circle K',
    );
  };

  const totalLoss = shrinkage.reduce((sum, row) => sum + row.lossValue, 0);

  return (
    <>
      <PageHeader
        eyebrow="TÀI CHÍNH & BÁO CÁO / MODULE 13"
        title="Báo cáo quản trị"
        description={`${branchNameById(branchId)} · ${TIME_RANGE_LABEL[range]}`}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="Toàn chuỗi"
              value={branchId}
              className="report-branch-select"
              options={branches.map((branch) => ({
                value: branch.id,
                label: branch.name,
              }))}
              onChange={(value: string | undefined) => setBranchId(value ?? null)}
            />
            <Segmented<TimeRange>
              value={range}
              onChange={setRange}
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

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '8px 18px 8px' } }}>
        <Tabs
          defaultActiveKey="revenue"
          items={[
            {
              key: 'revenue',
              label: 'Báo cáo doanh thu',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={14}>
                    <ChartCard
                      title="Doanh thu theo chi nhánh"
                      description="So sánh doanh thu các cửa hàng trong kỳ"
                      height={340}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={branchProfit}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
                        >
                          <CartesianGrid stroke="#F0F1F3" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={AXIS_STYLE}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatVNDCompact}
                          />
                          <YAxis
                            type="category"
                            dataKey="dimensionName"
                            tick={AXIS_STYLE}
                            tickLine={false}
                            axisLine={false}
                            width={150}
                          />
                          <ChartTooltip
                            formatter={(value: number | string) =>
                              formatVND(Number(value))
                            }
                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar
                            dataKey="revenue"
                            name="Doanh thu"
                            fill={BRAND.primaryRed}
                            radius={[0, 4, 4, 0]}
                            barSize={12}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </Col>

                  <Col xs={24} xl={10}>
                    <ChartCard
                      title="Doanh thu theo danh mục"
                      description="Cơ cấu nhóm hàng trong kỳ"
                      height={340}
                    >
                      {categoryRevenue.length === 0 ? (
                        <EmptyState title="Chưa có doanh thu trong kỳ" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryRevenue.map((slice) => ({
                                ...slice,
                                name: slice.categoryName,
                              }))}
                              dataKey="revenue"
                              nameKey="name"
                              innerRadius="50%"
                              outerRadius="76%"
                              paddingAngle={2}
                            >
                              {categoryRevenue.map((slice) => (
                                <Cell key={slice.categoryId} fill={slice.color} />
                              ))}
                            </Pie>
                            <ChartTooltip
                              formatter={(value: number | string) =>
                                formatVND(Number(value))
                              }
                              contentStyle={{ borderRadius: 8, fontSize: 12 }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              wrapperStyle={{ fontSize: 11.5, lineHeight: '18px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'profit',
              label: 'Báo cáo lợi nhuận',
              children: (
                <Space direction="vertical" size={16} className="report-stack-full">
                  <Card
                    size="small"
                    title="Lợi nhuận theo chi nhánh"
                    extra={
                      <Text
                        className="export-link"
                        onClick={() =>
                          handleExportProfit(
                            branchProfit,
                            'Bao cao loi nhuan theo chi nhanh',
                          )
                        }
                      >
                        Xuất Excel
                      </Text>
                    }
                  >
                    <Table<ProfitReportRow>
                      columns={profitColumns}
                      dataSource={branchProfit}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 1200 }}
                    />
                  </Card>

                  <Card
                    size="small"
                    title="Lợi nhuận theo danh mục hàng hoá"
                    extra={
                      <Text
                        className="export-link"
                        onClick={() =>
                          handleExportProfit(
                            categoryProfit,
                            'Bao cao loi nhuan theo danh muc',
                          )
                        }
                      >
                        Xuất Excel
                      </Text>
                    }
                  >
                    {categoryProfit.length === 0 ? (
                      <EmptyState title="Chưa có dữ liệu trong kỳ" />
                    ) : (
                      <Table<ProfitReportRow>
                        columns={profitColumns}
                        dataSource={categoryProfit}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ x: 1200 }}
                      />
                    )}
                  </Card>
                </Space>
              ),
            },
            {
              key: 'topselling',
              label: 'Hàng bán chạy',
              children: (
                <Card
                  size="small"
                  title={`Top ${topSelling.length} sản phẩm bán chạy nhất`}
                  extra={
                    <Text className="export-link" onClick={handleExportTopSelling}>
                      Xuất Excel
                    </Text>
                  }
                >
                  {topSelling.length === 0 ? (
                    <EmptyState title="Chưa có giao dịch trong kỳ" />
                  ) : (
                    <Table<TopSellingRow>
                      columns={topSellingColumns}
                      dataSource={topSelling}
                      rowKey="id"
                      size="small"
                      scroll={{ x: 1200 }}
                      pagination={{ pageSize: 10, showSizeChanger: false }}
                    />
                  )}
                </Card>
              ),
            },
            {
              key: 'shrinkage',
              label: 'Hao hụt & huỷ hàng',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={9}>
                    <ChartCard
                      title="Tổn thất theo nguyên nhân"
                      description={`Tổng tổn thất: ${formatVND(totalLoss)}`}
                      height={320}
                    >
                      {shrinkageByReason.length === 0 ? (
                        <EmptyState title="Không có hao hụt được ghi nhận" />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={shrinkageByReason}
                              dataKey="value"
                              nameKey="name"
                              innerRadius="48%"
                              outerRadius="75%"
                              paddingAngle={2}
                            >
                              {shrinkageByReason.map((slice) => (
                                <Cell key={slice.reason} fill={slice.color} />
                              ))}
                            </Pie>
                            <ChartTooltip
                              formatter={(value: number | string) =>
                                formatVND(Number(value))
                              }
                              contentStyle={{ borderRadius: 8, fontSize: 12 }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              wrapperStyle={{ fontSize: 11.5, lineHeight: '18px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </ChartCard>
                  </Col>

                  <Col xs={24} xl={15}>
                    <Card
                      size="small"
                      title={`Chi tiết hao hụt (${shrinkage.length} dòng)`}
                      extra={
                        <Text className="export-link" onClick={handleExportShrinkage}>
                          Xuất Excel
                        </Text>
                      }
                    >
                      {shrinkage.length === 0 ? (
                        <EmptyState title="Không có hao hụt được ghi nhận" />
                      ) : (
                        <Table<ShrinkageReportRow>
                          columns={shrinkageColumns}
                          dataSource={shrinkage}
                          rowKey="id"
                          size="small"
                          scroll={{ x: 1300 }}
                          className="dense-table"
                          pagination={{ pageSize: 10, showSizeChanger: false }}
                        />
                      )}
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
};