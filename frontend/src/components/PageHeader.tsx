import type { FC, ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';
import './PageHeader.css';

const { Title, Text } = Typography;

interface PageHeaderProps {
  /** Nhãn nhóm module, hiển thị nhỏ phía trên tiêu đề. */
  eyebrow: string;
  title: string;
  description?: string;
  /** Khu vực hành động bên phải: nút thêm mới, xuất Excel, bộ lọc thời gian... */
  extra?: ReactNode;
}

/**
 * Đầu trang dùng chung cho mọi module: viền đỏ trái là dấu nhận diện Circle K,
 * giúp các trang có nhịp thị giác nhất quán.
 */
export const PageHeader: FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  extra,
}) => (
  <Card styles={{ body: { padding: '18px 24px' } }} className="page-header-card">
    <div className="page-header-inner">
      <div>
        <Text type="secondary" className="page-header-eyebrow">
          {eyebrow}
        </Text>
        <Title level={3} className="page-header-title">
          {title}
        </Title>
        {description !== undefined && (
          <Text type="secondary" className="page-header-desc">
            {description}
          </Text>
        )}
      </div>
      {extra !== undefined && <Space wrap>{extra}</Space>}
    </div>
  </Card>
);