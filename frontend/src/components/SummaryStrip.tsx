import type { FC } from 'react';
import { Card, Statistic } from 'antd';
import { BRAND } from '@/config/brand';
import './SummaryStrip.css';

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
  /**
   * Số cột cố định trên màn hình lớn; bỏ trống thì flexbox tự co giãn đều
   * theo số item (xem CSS).
   */
  columns?: number;
}

/**
 * Dải số liệu tóm tắt đặt trên đầu các bảng danh sách.
 *
 * Khác `StatCard` (có xu hướng tăng/giảm), component này chỉ trình bày con số
 * hiện tại — phù hợp cho tổng công nợ, tổng giá trị tồn, số phiếu chờ duyệt.
 */
export const SummaryStrip: FC<SummaryStripProps> = ({ items, columns }) => {
  const style =
    columns !== undefined && columns > 0
      ? ({ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } as const)
      : undefined;
  return (
    <div className="summary-strip" style={style}>
      {items.map((item) => (
        <Card key={item.key} styles={{ body: { padding: '16px 18px' } }}>
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
      ))}
    </div>
  );
};