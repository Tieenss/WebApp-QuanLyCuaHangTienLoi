import { useEffect, useMemo, useState, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRightOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchStock, stockOf } from '@/store/slices/stockSlice';
import { fetchTransfers } from '@/store/slices/transferSlice';
import {
  chiTietPhieuXuatApi,
  phieuXuatKhoApi,
  type ChiTietPhieuXuatDTO,
} from '@/api/phieuXuatKho';
import { formatVND } from '@/utils/formatters';
import type { StockTransfer } from '@/types';

const { Text } = Typography;

/** Một dòng thực xuất đang chỉnh trên form. */
interface ShipRow {
  productId: string;
  productName: string;
  requested: number;
  stockAtSource: number;
  shipQty: number;
  unitCost: number;
}

interface ShipModalProps {
  open: boolean;
  transfer: StockTransfer | null;
  onClose: () => void;
}

/**
 * Form xác nhận xuất kho khi Thủ kho duyệt một phiếu yêu cầu (module 9).
 *
 * PENDING → SHIPPED: backend trừ tồn kho xuất + ghi thẻ kho TRANSFER_OUT
 * trong cùng transaction; số thực xuất có thể nhỏ hơn số yêu cầu (kho thiếu
 * hàng) và bị chặn ở mức tồn hiện có.
 */
export const ShipModal: FC<ShipModalProps> = ({ open, transfer, onClose }) => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const user = useAppSelector((state) => state.auth.user);
  const balances = useAppSelector((state) => state.stock.balances);
  const products = useAppSelector((state) => state.product.products);

  const [rows, setRows] = useState<ShipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Nạp dòng chi tiết từ DB mỗi lần mở phiếu.
  useEffect(() => {
    if (!open || transfer === null) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    chiTietPhieuXuatApi
      .getByPhieuXuat(transfer.id)
      .then((details: ChiTietPhieuXuatDTO[]) => {
        if (cancelled) return;
        setRows(
          details.map((d) => {
            const product = products.find((p) => p.id === d.idSanPham);
            const stock = stockOf(balances, transfer.fromBranchId, d.idSanPham);
            const requested = d.soLuongYeuCau || 0;
            const previousShip = d.soLuongXuat && d.soLuongXuat > 0 ? d.soLuongXuat : requested;
            return {
              productId: d.idSanPham,
              productName: product?.name ?? d.idSanPham,
              requested,
              stockAtSource: stock,
              shipQty: Math.min(previousShip, requested, Math.max(stock, 0)),
              unitCost: product?.costPrice ?? 0,
            };
          }),
        );
      })
      .catch(() => message.error('Không tải được dòng chi tiết của phiếu.'))
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transfer?.id]);

  const totalValue = useMemo(
    () => rows.reduce((sum, row) => sum + row.shipQty * row.unitCost, 0),
    [rows],
  );

  const overStockRows = rows.filter(
    (row) => row.shipQty > row.stockAtSource || row.shipQty > row.requested,
  );

  const handleConfirm = async (): Promise<void> => {
    if (transfer === null || user === null) return;
    if (rows.length === 0) {
      message.error('Phiếu không có dòng chi tiết — không thể xuất.');
      return;
    }
    if (overStockRows.length > 0) {
      message.error('Có dòng thực xuất vượt tồn kho hoặc vượt số yêu cầu.');
      return;
    }
    setSubmitting(true);
    try {
      await phieuXuatKhoApi.ship(transfer.id, {
        idNguoiThucHien: user.idNhanVien ?? '',
        lines: rows.map((row) => ({ idSanPham: row.productId, soLuong: row.shipQty })),
      });
      message.success(
        `Đã xuất kho ${transfer.code}. Phiếu chuyển sang "Chờ nhận hàng" — chi nhánh sẽ bấm "Đã nhận hàng" khi hàng tới nơi.`,
      );
      dispatch(fetchTransfers());
      dispatch(fetchStock());
      onClose();
    } catch (e) {
      message.error((e as Error).message || 'Lỗi xác nhận xuất kho');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ShipRow> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      render: (name: string) => <Text className="inv-text-12-5">{name}</Text>,
    },
    {
      title: 'SL yêu cầu',
      dataIndex: 'requested',
      align: 'right',
      width: 110,
      render: (value: number) => <span className="numeric-cell">{value}</span>,
    },
    {
      title: 'Tồn kho xuất',
      dataIndex: 'stockAtSource',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text className={`numeric-cell${value === 0 ? ' transfer-stock-low' : ''}`}>
          {value}
        </Text>
      ),
    },
    {
      title: 'SL thực xuất',
      dataIndex: 'shipQty',
      align: 'right',
      width: 140,
      render: (value: number, row) => (
        <InputNumber
          size="small"
          min={0}
          max={Math.min(row.requested, row.stockAtSource)}
          value={value}
          status={value > Math.min(row.requested, row.stockAtSource) ? 'error' : undefined}
          onChange={(qty) =>
            setRows((current) =>
              current.map((item) =>
                item.productId === row.productId ? { ...item, shipQty: qty ?? 0 } : item,
              ),
            )
          }
        />
      ),
    },
    {
      title: 'Giá trị',
      key: 'value',
      align: 'right',
      width: 130,
      render: (_, row) => (
        <Text strong className="numeric-cell">
          {formatVND(row.shipQty * row.unitCost)}
        </Text>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={
        transfer === null
          ? 'Xác nhận xuất kho'
          : (
            <Space size={8}>
              <span>Xuất kho {transfer.code}</span>
              <Tag color="purple">{transfer.fromBranchName}</Tag>
              <ArrowRightOutlined />
              <Tag color="red">{transfer.toBranchName}</Tag>
            </Space>
          )
      }
      okText="Xác nhận xuất kho"
      cancelText="Huỷ"
      confirmLoading={submitting}
      okButtonProps={{ disabled: loading || rows.length === 0 || overStockRows.length > 0 }}
      onOk={handleConfirm}
      onCancel={onClose}
      width={860}
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Thủ kho kiểm đếm hàng thực tế rồi xác nhận số xuất. Sau khi xuất, phiếu ở trạng thái “Chờ nhận hàng” cho tới khi chi nhánh xác nhận đã nhận."
      />
      {overStockRows.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Số thực xuất không được vượt tồn kho hoặc vượt số yêu cầu."
        />
      )}
      <Table<ShipRow>
        columns={columns}
        dataSource={rows}
        rowKey="productId"
        size="small"
        loading={loading}
        pagination={false}
      />
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Text type="secondary">Tổng giá trị thực xuất (theo giá vốn): </Text>
        <Text strong>{formatVND(totalValue)}</Text>
      </div>
    </Modal>
  );
};
