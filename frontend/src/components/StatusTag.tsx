import type { CSSProperties, FC } from 'react';
import { Tag } from 'antd';
import './StatusTag.css';
import {
  ATTENDANCE_STATUS_COLOR,
  ATTENDANCE_STATUS_LABEL,
  DOCUMENT_STATUS_COLOR,
  DOCUMENT_STATUS_LABEL,
  LEDGER_TYPE_COLOR,
  LEDGER_TYPE_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  RECORD_STATUS,
  STOCK_LEVEL_COLOR,
  STOCK_LEVEL_LABEL,
  type AttendanceStatus,
  type DocumentStatus,
  type LedgerType,
  type OrderStatus,
  type RecordStatus,
  type StockLevel,
} from '@/types';

/** Trạng thái hoạt động của bản ghi danh mục. */
export const RecordStatusTag: FC<{ status: RecordStatus }> = ({ status }) => (
  <Tag color={status === RECORD_STATUS.Active ? 'green' : 'default'}>
    {status === RECORD_STATUS.Active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
  </Tag>
);

/** Trạng thái phiếu nghiệp vụ (nhập/xuất/kiểm kê/thu chi). */
export const DocumentStatusTag: FC<{ status: DocumentStatus }> = ({ status }) => (
  <Tag color={DOCUMENT_STATUS_COLOR[status]}>{DOCUMENT_STATUS_LABEL[status]}</Tag>
);

/** Trạng thái hoá đơn bán hàng. */
export const OrderStatusTag: FC<{ status: OrderStatus }> = ({ status }) => (
  <Tag color={ORDER_STATUS_COLOR[status]}>{ORDER_STATUS_LABEL[status]}</Tag>
);

/** Loại biến động thẻ kho. */
export const LedgerTypeTag: FC<{ type: LedgerType }> = ({ type }) => (
  <Tag color={LEDGER_TYPE_COLOR[type]}>{LEDGER_TYPE_LABEL[type]}</Tag>
);

/** Mức cảnh báo tồn kho — màu tự định nghĩa, truyền qua biến `--stock-color`. */
export const StockLevelTag: FC<{ level: StockLevel }> = ({ level }) => (
  <Tag
    className="stock-level-tag"
    style={{ '--stock-color': STOCK_LEVEL_COLOR[level] } as CSSProperties}
  >
    {STOCK_LEVEL_LABEL[level]}
  </Tag>
);

/** Trạng thái chấm công. */
export const AttendanceStatusTag: FC<{ status: AttendanceStatus }> = ({ status }) => (
  <Tag color={ATTENDANCE_STATUS_COLOR[status]}>
    {ATTENDANCE_STATUS_LABEL[status]}
  </Tag>
);