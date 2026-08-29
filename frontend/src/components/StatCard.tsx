import type { CSSProperties, FC } from 'react';
import { Card, Typography } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BankOutlined,
  DollarOutlined,
  FallOutlined,
  RiseOutlined,
  ShoppingOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { formatPercent } from '@/utils/formatters';
import type { KpiCard, KpiIcon } from '@/types';
import './StatCard.css';

const { Text } = Typography;

/** Icon minh hoạ cho từng loại chỉ số. */
const KPI_ICON_MAP: Record<KpiIcon, FC> = {
  revenue: DollarOutlined,
  orders: ShoppingOutlined,
  avgOrder: RiseOutlined,
  lowStock: WarningOutlined,
  profit: RiseOutlined,
  employees: TeamOutlined,
  cash: BankOutlined,
  shrinkage: FallOutlined,
};

interface StatCardProps {
  data: KpiCard;
}

/**
 * Thẻ KPI dùng chung cho dashboard và các trang tổng hợp.
 *
 * Màu của phần trăm thay đổi dựa trên `isFavorable`, không dựa vào dấu của
 * `changePercent`: ví dụ hao hụt giảm là tín hiệu tốt dù số âm.
 */
export const StatCard: FC<StatCardProps> = ({ data }) => {
  const IconComponent = KPI_ICON_MAP[data.icon];
  const trendClass = data.isFavorable ? 'is-favorable' : 'is-unfavorable';
  const TrendIcon = data.changePercent >= 0 ? ArrowUpOutlined : ArrowDownOutlined;

  return (
    <Card styles={{ body: { padding: 18 } }} className="stat-card">
      <div className="stat-card-top">
        <div
          className="stat-card-icon"
          style={{ '--stat-accent': data.accentColor } as CSSProperties}
        >
          <IconComponent />
        </div>
        <Text type="secondary" className="stat-card-title">
          {data.title}
        </Text>
      </div>

      <div className="stat-card-value">{data.displayValue}</div>

      <div className="stat-card-trend">
        <span className={`stat-card-trend-value ${trendClass}`}>
          <TrendIcon /> {formatPercent(Math.abs(data.changePercent))}
        </span>
        <Text type="secondary" className="stat-card-compared">
          {data.comparedTo}
        </Text>
      </div>
    </Card>
  );
};