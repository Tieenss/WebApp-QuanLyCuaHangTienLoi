import type { CSSProperties, FC, ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';
import './ChartCard.css';

const { Text } = Typography;

interface ChartCardProps {
  title: string;
  description?: string;
  /** Khu vực điều khiển ở góc phải tiêu đề (Segmented, Select...). */
  extra?: ReactNode;
  /** Chiều cao vùng vẽ biểu đồ; recharts cần chiều cao cụ thể. */
  height?: number;
  children: ReactNode;
}

/**
 * Khung chứa biểu đồ. Recharts với `ResponsiveContainer` cần phần tử cha có
 * chiều cao xác định, nên chiều cao được đặt tường minh ở đây thay vì để
 * từng biểu đồ tự xử lý.
 */
export const ChartCard: FC<ChartCardProps> = ({
  title,
  description,
  extra,
  height = 300,
  children,
}) => (
  <Card
    styles={{ body: { padding: '16px 18px 8px' } }}
    title={
      <Space direction="vertical" size={0} className="chart-card-title-block">
        <Text strong className="chart-card-title">
          {title}
        </Text>
        {description !== undefined && (
          <Text type="secondary" className="chart-card-desc">
            {description}
          </Text>
        )}
      </Space>
    }
    extra={extra}
  >
    <div
      className="chart-card-plot"
      style={{ '--chart-height': `${height}px` } as CSSProperties}
    >
      {children}
    </div>
  </Card>
);
