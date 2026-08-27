import type { FC } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { BRAND } from '@/config/brand';

/** Một ô số liệu tóm tắt. */
export interface SummaryItem {
  key: string;
  title: string;
  value: string;
  /** Màu của con số; mặc định màu chữ tiêu đề. */
  color?: string;
  /** Ghi chú nhỏ dưới con số. */
  suffix?: string;
}

interface SummaryStripProps {
  items: SummaryItem[];
  /** Số cột trên màn hình lớn; mặc định chia đều theo số item. */
  columns?: number;
}

/**
 * Dải số liệu tóm tắt đặt trên đầu các bảng danh sách.
 *
 * Khác `StatCard` (có xu hướng tăng/giảm), component này chỉ trình bày con số
 * hiện tại — phù hợp cho tổng công nợ, tổng giá trị tồn, số phiếu chờ duyệt.
 */
export const SummaryStrip: FC<SummaryStripProps> = ({ items, columns }) => {
  const span = Math.max(4, Math.floor(24 / (columns ?? (items.length || 1))));

  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={12} sm={12} md={8} xl={span} key={item.key}>
          <Card styles={{ body: { padding: '16px 18px' } }}>
            <Statistic
              title={item.title}
              value={item.value}
              suffix={item.suffix}
              valueStyle={{
                color: item.color ?? BRAND.textHeading,
                fontSize: 22,
                fontWeight: 700,
              }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
};