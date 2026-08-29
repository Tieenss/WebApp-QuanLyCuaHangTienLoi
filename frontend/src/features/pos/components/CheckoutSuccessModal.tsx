import type { FC } from 'react';
import {
  App as AntdApp,
  Button,
  Descriptions,
  Modal,
  Result,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PrinterOutlined } from '@ant-design/icons';
import './CheckoutSuccessModal.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { dismissCompletedSale } from '@/store/slices/posSlice';
import { PAYMENT_METHOD_LABEL, type OrderLine } from '@/types';
import { formatDateTime } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import { printHtml } from '@/utils/exportUtils';
import { buildReceiptHtml } from '../receiptTemplate';

const { Text } = Typography;

/**
 * Xác nhận thanh toán thành công và in hoá đơn.
 *
 * Nhấn mạnh tiền thừa vì đây là con số thu ngân cần đọc ngay cho khách.
 */
export const CheckoutSuccessModal: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const sale = useAppSelector((state) => state.pos.lastCompletedSale);

  if (sale === null) return null;

  const { order } = sale;

  const handlePrint = (): void => {
    try {
      printHtml(buildReceiptHtml(order), `Hoá đơn ${order.code}`);
    } catch {
      // `printHtml` ném lỗi khi trình duyệt chặn popup.
      message.error(
        'Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup cho trang này rồi thử lại.',
      );
    }
  };

  const columns: ColumnsType<OrderLine> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (name: string, row) => (
        <span>
          <Text className="checkout-line-name">{name}</Text>
          <br />
          <Text type="secondary" className="checkout-line-sku">
            {row.sku}
          </Text>
        </span>
      ),
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      align: 'center',
      width: 56,
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      align: 'right',
      width: 100,
      render: (value: number) => formatVND(value),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'lineTotal',
      align: 'right',
      width: 110,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {formatVND(value)}
        </Text>
      ),
    },
  ];

  return (
    <Modal
      open
      width={640}
      onCancel={() => dispatch(dismissCompletedSale())}
      footer={[
        <Button key="close" onClick={() => dispatch(dismissCompletedSale())}>
          Đóng và bán tiếp
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
        >
          In hoá đơn
        </Button>,
      ]}
      // antd v6 dùng `destroyOnHidden` thay cho `destroyOnClose`.
      destroyOnHidden
    >
      <Result
        status="success"
        title="Thanh toán thành công"
        subTitle={
          <Space direction="vertical" size={2}>
            <Text>
              Hoá đơn <Text strong>{order.code}</Text> · {formatDateTime(order.soldAt)}
            </Text>
            {order.changeAmount > 0 && (
              <Text className="checkout-change">
                Tiền thừa trả khách: {formatVND(order.changeAmount)}
              </Text>
            )}
          </Space>
        }
        className="checkout-result"
      />

      <Table<OrderLine>
        columns={columns}
        dataSource={order.lines}
        rowKey="id"
        size="small"
        pagination={false}
        className="checkout-lines-table"
      />

      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Chi nhánh" span={2}>
          {order.branchName}
        </Descriptions.Item>
        <Descriptions.Item label="Thu ngân">{order.cashierName}</Descriptions.Item>
        <Descriptions.Item label="Hình thức">
          {PAYMENT_METHOD_LABEL[order.paymentMethod]}
        </Descriptions.Item>
        <Descriptions.Item label="Tiền hàng">
          {formatVND(order.subTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Giảm giá">
          -{formatVND(order.discountTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Thuế VAT">
          {formatVND(order.vatTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Tổng cộng">
          <Text strong className="checkout-grand-total">
            {formatVND(order.grandTotal)}
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};