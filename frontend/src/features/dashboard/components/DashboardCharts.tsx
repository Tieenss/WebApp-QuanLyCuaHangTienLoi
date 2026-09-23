import { useMemo, type FC } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { BRAND } from '@/config/brand';
import { formatVND, formatVNDCompact } from '@/utils/formatters';
import type {
  BranchRevenuePoint,
  CategoryRevenueSlice,
  RevenueTrendPoint,
} from '@/types';

/** Cấu hình trục và grid dùng chung cho mọi biểu đồ để nhìn đồng bộ. */
const AXIS_STYLE = { fontSize: 11, fill: BRAND.textSecondary } as const;
const GRID_COLOR = '#F0F1F3';

/** Tooltip tiền tệ: recharts truyền value dạng `unknown` nên cần ép kiểu an toàn. */
const currencyFormatter = (value: number | string): string =>
  formatVND(typeof value === 'number' ? value : Number(value));

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
  /** Nhãn của đường so sánh, ví dụ "Kỳ trước". */
  compareLabel: string;
}

/**
 * Biểu đồ doanh thu theo thời gian: vùng tô cho kỳ hiện tại, đường nét đứt cho
 * kỳ trước. Đặt cạnh nhau giúp thấy ngay xu hướng tăng/giảm theo từng mốc.
 */
export const RevenueTrendChart: FC<RevenueTrendChartProps> = ({
  data,
  compareLabel,
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.primaryRed} stopOpacity={0.28} />
          <stop offset="100%" stopColor={BRAND.primaryRed} stopOpacity={0.02} />
        </linearGradient>
      </defs>

      <CartesianGrid stroke={GRID_COLOR} vertical={false} />
      <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
      <YAxis
        tick={AXIS_STYLE}
        tickLine={false}
        axisLine={false}
        width={58}
        tickFormatter={formatVNDCompact}
      />
      <ChartTooltip
        formatter={currencyFormatter}
        contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: BRAND.border }}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />

      <Area
        type="monotone"
        dataKey="revenue"
        name="Kỳ hiện tại"
        stroke={BRAND.primaryRed}
        strokeWidth={2.4}
        fill="url(#revenueFill)"
      />
      <Line
        type="monotone"
        dataKey="previousRevenue"
        name={compareLabel}
        stroke={BRAND.textDisabled}
        strokeWidth={1.8}
        strokeDasharray="5 4"
        dot={false}
      />
    </AreaChart>
  </ResponsiveContainer>
);

interface BranchRevenueChartProps {
  data: BranchRevenuePoint[];
}

/**
 * Doanh thu và lợi nhuận gộp theo chi nhánh.
 * Dùng bar ngang vì tên cửa hàng dài, trục X sẽ bị chồng chữ nếu để bar dọc.
 */
export const BranchRevenueChart: FC<BranchRevenueChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
      barGap={2}
    >
      <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
      <XAxis
        type="number"
        tick={AXIS_STYLE}
        tickLine={false}
        axisLine={false}
        tickFormatter={formatVNDCompact}
      />
      <YAxis
        type="category"
        dataKey="shortName"
        tick={AXIS_STYLE}
        tickLine={false}
        axisLine={false}
        width={130}
      />
      <ChartTooltip
        formatter={currencyFormatter}
        contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: BRAND.border }}
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />

      <Bar
        dataKey="revenue"
        name="Doanh thu"
        fill={BRAND.primaryRed}
        radius={[0, 4, 4, 0]}
        barSize={11}
      />
      <Bar
        dataKey="profit"
        name="Lợi nhuận gộp"
        fill={BRAND.accentYellow}
        radius={[0, 4, 4, 0]}
        barSize={11}
      />
    </BarChart>
  </ResponsiveContainer>
);

interface CategoryRevenueChartProps {
  data: CategoryRevenueSlice[];
}

const RADIAN = Math.PI / 180;

/**
 * Nhãn phần trăm hiển thị chính giữa từng miếng donut.
 */
const renderCustomizedLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (typeof percent !== 'number' || percent < 0.05) return null;
  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
  const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/** Tỷ trọng doanh thu theo danh mục — donut để thấy cả tổng thể và từng phần. */
export const CategoryRevenueChart: FC<CategoryRevenueChartProps> = ({ data }) => {
  const chartData = useMemo(
    () => data.map((slice) => ({ ...slice, name: slice.categoryName })),
    [data],
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="revenue"
          nameKey="name"
          innerRadius="48%"
          outerRadius="78%"
          paddingAngle={2}
          label={renderCustomizedLabel}
          labelLine={false}
        >
          {chartData.map((slice) => (
            <Cell key={slice.categoryId} fill={slice.color} />
          ))}
        </Pie>
        <ChartTooltip
          formatter={(value: any, name: any, item: any) => [
            `${currencyFormatter(Number(value))} (${(item?.payload?.percentage ?? (Number(item?.payload?.percent ?? 0) * 100)).toFixed(1)}%)`,
            name,
          ]}
          contentStyle={{ borderRadius: 8, fontSize: 12, borderColor: BRAND.border }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 11.5, lineHeight: '20px', paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};