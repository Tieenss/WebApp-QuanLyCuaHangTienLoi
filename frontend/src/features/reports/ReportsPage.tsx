import { useMemo, useState, type FC } from 'react';
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
import {
  SHRINKAGE_REASON_LABEL,
  TIME_RANGE_LABEL,
  type ProfitReportRow,
  type ShrinkageReason,
  type ShrinkageReportRow,
  type TimeRange,
  type TopSellingRow,
} from '@/types';
import { mockBranches, branchNameById } from '@/mockData/branches';
import {
  buildCategoryRevenue,
  buildDashboardMetrics,
  buildProfitByBranch,
  buildProfitByCategory,
  buildShrinkageReport,
  buildTopSelling,
} from '@/mockData/analytics';
import { productById } from '@/mockData/products';
import { formatDate } from '@/utils/dateUtils';
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

/**
 * Module 13 — Báo cáo.
 *
 * 4 báo cáo theo yêu cầu, dùng chung một bộ lọc (chi nhánh + khoảng thời gian)
 * để người dùng chuyển tab mà không phải chọn lại điều kiện.
 */
export const ReportsPage: FC = () => {
  const activeBranchId = useAppSelector((state) => state.auth.activeBranchId);

  const [branchId, setBranchId] = useState<string | null>(activeBranchId);
  const [range, setRange] = useState<TimeRange>('30days');

  /** Tồn kho hiện hành — cột "Tồn còn lại" ở báo cáo hàng bán chạy. */
  const balances = useAppSelector((state) => state.stock.balances);

  const metrics = useMemo(
    () => buildDashboardMetrics(branchId, range, balances),
    [branchId, range, balances],
  );

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
  const branchProfit = useMemo(() => buildProfitByBranch(range), [range]);
  const categoryRevenue = useMemo(
    () => buildCategoryRevenue(branchId, range),
    [branchId, range],
  );

  // ── Báo cáo 2: Lợi nhuận ──────────────────────────────────────────────────────
  const categoryProfit = useMemo(
    () => buildProfitByCategory(branchId, range),
    [branchId, range],
  );

  // ── Báo cáo 3: Hàng bán chạy ──────────────────────────────────────────────────
  const topSelling = useMemo(
    () => buildTopSelling(branchId, range, balances, 20),
    [branchId, range, balances],
  );

  // ── Báo cáo 4: Hao hụt / huỷ hàng ─────────────────────────────────────────────
  const shrinkage = useMemo(() => buildShrinkageReport(branchId), [branchId]);

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
              options={mockBranches.map((branch) => ({
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