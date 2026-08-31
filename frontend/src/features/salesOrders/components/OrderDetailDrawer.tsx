import { useEffect, useState, type FC } from 'react';
import {
  App as AntdApp,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  EditOutlined,
  PrinterOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useAppDispatch } from '@/store/hooks';
import {
  setSelectedOrder,
  updateOrderNote,
} from '@/store/slices/salesOrderSlice';
import {
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  type OrderLine,
  type SalesOrder,
} from '@/types';
import { formatDateTime } from '@/utils/dateUtils';
import { formatAmount, formatVND } from '@/utils/formatters';
import { printHtml } from '@/utils/exportUtils';
import { buildReceiptHtml } from '../../pos/receiptTemplate';
import './OrderDetailDrawer.css';

const { Text } = Typography;

interface OrderDetailDrawerProps {
  /** Hoá đơn đang mở; `null` = drawer đóng. */
  order: SalesOrder | null;
  /** `false` (mặc định) cho phép sửa ghi chú; `true` chỉ xem. */
  readOnly?: boolean;
}

/**
 * Drawer chi tiết hoá đơn — dùng chung cho trang "Lịch sử hoá đơn" và bất kỳ
 * chỗ nào cần mở nhanh một hoá đơn (Dashboard, báo cáo...).
 *
 * Layout 4 khối từ trên xuống:
 *   1. Tóm tắt: tổng tiền lớn, trạng thái, phương thức thanh toán
 *   2. Metadata: chi nhánh, thu ngân, ca, thời gian, thành viên
 *   3. Bảng OrderLine: SKU, tên SP, SL, đơn giá, giảm giá, VAT, thành tiền
 *   4. Tổng kết: tạm tính, giảm giá, VAT, tổng, tiền khách đưa, tiền thừa
 *
 * Có 2 action: "In lại hoá đơn" (cùng template POS, khổ 80mm) và "Sửa ghi chú"
 * (lưu vào `updateOrderNote`).
 */
export const OrderDetailDrawer: FC<OrderDetailDrawerProps> = ({
  order,
  readOnly = false,
}) => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const open = order !== null;

  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  /**
   * Reset trạng thái draft mỗi khi mở drawer / đổi hoá đơn. Phải dùng `useEffect`
   * vì order là prop từ component cha — nếu dùng `useState(() => …)` thì lần
   * đầu render mới có giá trị, các lần sau vẫn giữ draft cũ.
   */
  useEffect(() => {
    if (order !== null) {
      setNoteDraft(order.note);
      setNoteEditing(false);
    }
  }, [order]);

  const handleClose = (): void => {
    dispatch(setSelectedOrder(null));
  };

  const handlePrint = (): void => {
    if (order === null) return;
    try {
      printHtml(buildReceiptHtml(order), `Hoá đơn ${order.code}`);
    } catch {
      message.error(
        'Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup cho trang này rồi thử lại.',
      );
    }
  };

  const handleSaveNote = (): void => {
    if (order === null) return;
    dispatch(updateOrderNote({ id: order.id, note: noteDraft }));
    setNoteEditing(false);
    message.success('Đã cập nhật ghi chú hoá đơn.');
  };

  const lineColumns: ColumnsType<OrderLine> = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 130,
      render: (value: string) => <span className="mono-code">{value}</span>,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (value: string, row) => (
        <Space direction="vertical" size={0}>
          <Text className="odd-line-name">{value}</Text>
          <Text type="secondary" className="odd-line-unit">
            {row.unit}
          </Text>
        </Space>
      ),
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      align: 'right',
      width: 60,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {value}
        </Text>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      align: 'right',
      width: 110,
      render: (value: number) => formatAmount(value),
    },
    {
      title: 'Giảm giá',
      dataIndex: 'lineDiscount',
      align: 'right',
      width: 110,
      render: (value: number) =>
        value > 0 ? (
          <Text type="secondary" className="odd-line-discount">
            -{formatAmount(value)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'VAT',
      dataIndex: 'vatPercent',
      align: 'center',
      width: 60,
      render: (value: number) => `${value}%`,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'lineTotal',
      align: 'right',
      width: 140,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {formatVND(value)}
        </Text>
      ),
    },
  ];

  const isCash = order?.paymentMethod === PAYMENT_METHOD.Cash;

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={760}
      destroyOnHidden
      className="order-detail-drawer"
      title={
        order !== null ? (
          <Space size={10} wrap>
            <Text strong className="odd-code">
              {order.code}
            </Text>
            <Tag
              color={
                order.status === 'COMPLETED'
                  ? 'green'
                  : order.status === 'REFUNDED'
                    ? 'gold'
                    : 'red'
              }
              className="tag-no-margin"
            >
              {order.status === 'COMPLETED'
                ? 'Hoàn tất'
                : order.status === 'REFUNDED'
                  ? 'Đã hoàn tiền'
                  : 'Đã huỷ'}
            </Tag>
          </Space>
        ) : (
          'Chi tiết hoá đơn'
        )
      }
      extra={
        order !== null ? (
          <Space>
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
            >
              In lại
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleClose}
            >
              Đóng
            </Button>
          </Space>
        ) : null
      }
    >
      {order === null ? (
        <Empty description="Không có hoá đơn đang mở" />
      ) : (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {/* ── Khối 1: Tóm tắt tiền ─────────────────────────────── */}
          <div className="odd-summary">
            <div>
              <Text type="secondary" className="odd-label">
                Tổng thanh toán
              </Text>
              <div className="odd-grand-total">{formatVND(order.grandTotal)}</div>
            </div>
            <div className="odd-summary-right">
              <Text type="secondary" className="odd-label">
                Phương thức
              </Text>
              <Tag color="blue" className="tag-no-margin odd-payment">
                {PAYMENT_METHOD_LABEL[order.paymentMethod]}
              </Tag>
            </div>
          </div>

          {/* ── Khối 2: Metadata ─────────────────────────────────── */}
          <Descriptions
            bordered
            size="small"
            column={2}
            className="odd-descriptions"
          >
            <Descriptions.Item label="Chi nhánh">
              {order.branchName}
            </Descriptions.Item>
            <Descriptions.Item label="Thu ngân">
              {order.cashierName}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian">
              {formatDateTime(order.soldAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Ca làm việc">
              {order.shiftCode}
            </Descriptions.Item>
            <Descriptions.Item label="Thành viên" span={2}>
              {order.memberPhone === null ? (
                <Text type="secondary">Khách lẻ</Text>
              ) : (
                <Text className="mono-code">{order.memberPhone}</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú" span={2}>
              {readOnly ? (
                order.note === '' ? (
                  <Text type="secondary">—</Text>
                ) : (
                  order.note
                )
              ) : noteEditing ? (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    onPressEnter={handleSaveNote}
                    placeholder="Ghi chú cho hoá đơn (vd: khách quen, đổi mẫu thử...)"
                    autoFocus
                  />
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveNote}
                  >
                    Lưu
                  </Button>
                </Space.Compact>
              ) : (
                <Space>
                  <Text>
                    {order.note === '' ? (
                      <Text type="secondary">Chưa có ghi chú</Text>
                    ) : (
                      order.note
                    )}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setNoteDraft(order.note);
                      setNoteEditing(true);
                    }}
                  />
                </Space>
              )}
            </Descriptions.Item>
          </Descriptions>

          {/* ── Khối 3: Bảng chi tiết sản phẩm ──────────────────── */}
          <div>
            <Text strong className="odd-section-title">
              Chi tiết sản phẩm ({order.lines.length} mặt hàng)
            </Text>
            <Table<OrderLine>
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={order.lines}
              columns={lineColumns}
              scroll={{ x: 720 }}
              className="odd-line-table"
            />
          </div>

          {/* ── Khối 4: Tổng kết tiền ───────────────────────────── */}
          <div className="odd-totals">
            <div className="odd-totals-row">
              <Text type="secondary">Tạm tính</Text>
              <Text className="numeric-cell">{formatVND(order.subTotal)}</Text>
            </div>
            {order.discountTotal > 0 && (
              <div className="odd-totals-row">
                <Text type="secondary">Giảm giá</Text>
                <Text type="secondary" className="numeric-cell">
                  -{formatAmount(order.discountTotal)}
                </Text>
              </div>
            )}
            <div className="odd-totals-row">
              <Text type="secondary">Thuế VAT</Text>
              <Text className="numeric-cell">{formatVND(order.vatTotal)}</Text>
            </div>
            <div className="odd-totals-row odd-totals-grand">
              <Text strong>TỔNG THANH TOÁN</Text>
              <Text strong className="numeric-cell odd-grand-total-cell">
                {formatVND(order.grandTotal)}
              </Text>
            </div>
            {isCash && (
              <>
                <div className="odd-totals-row odd-totals-cash">
                  <Text type="secondary">Tiền khách đưa</Text>
                  <Text className="numeric-cell">
                    {formatVND(order.tenderedAmount)}
                  </Text>
                </div>
                <div className="odd-totals-row odd-totals-cash">
                  <Text type="secondary">Tiền thừa trả khách</Text>
                  <Text
                    strong
                    className={`numeric-cell${order.changeAmount > 0 ? ' odd-change' : ''}`}
                  >
                    {formatVND(order.changeAmount)}
                  </Text>
                </div>
              </>
            )}
          </div>
        </Space>
      )}
    </Drawer>
  );
};
