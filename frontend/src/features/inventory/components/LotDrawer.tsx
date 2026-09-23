import { useEffect, useState, type FC } from 'react';
import { App as AntdApp, Button, Drawer, Empty, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import { loHangApi, type LoHangDTO } from '@/api/loHang';
import type { StockBalance } from '@/types';
import { daysUntil, formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND } from '@/utils/formatters';

const { Text, Title } = Typography;

interface LotDrawerProps {
  open: boolean;
  onClose: () => void;
  balance: StockBalance | null;
  onLotDisposed?: () => void;
}

export const LotDrawer: FC<LotDrawerProps> = ({
  open,
  onClose,
  balance,
  onLotDisposed,
}) => {
  const { message } = AntdApp.useApp();
  const [lots, setLots] = useState<LoHangDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchLots = async (): Promise<void> => {
    if (!balance) return;
    setLoading(true);
    try {
      const data = await loHangApi.getByProduct(balance.productId, balance.branchId);
      setLots(data);
    } catch (err: any) {
      message.error(err.message || 'Không thể tải danh sách lô hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && balance) {
      fetchLots();
    } else {
      setLots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, balance?.productId, balance?.branchId]);

  const handleDispose = async (lot: LoHangDTO): Promise<void> => {
    try {
      await loHangApi.disposeLot(lot.id, `Huỷ lô quá hạn ngày ${lot.hanSuDung ? formatDate(lot.hanSuDung) : ''}`);
      message.success(`Đã huỷ thành công lô hàng ${lot.maLo} (${formatNumber(lot.soLuongTon)} sản phẩm).`);
      fetchLots();
      onLotDisposed?.();
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi huỷ lô');
    }
  };

  const columns: ColumnsType<LoHangDTO> = [
    {
      title: 'Mã lô',
      dataIndex: 'maLo',
      key: 'maLo',
      width: 170,
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'hanSuDung',
      key: 'hanSuDung',
      width: 180,
      render: (value: string | null, record) => {
        if (!value) return <Text type="secondary">—</Text>;
        const remaining = daysUntil(value);
        if (remaining === null) return <Text type="secondary">—</Text>;

        if (remaining < 0 && record.soLuongTon > 0) {
          return (
            <Tag color="error" style={{ fontWeight: 600 }}>
              Quá hạn ({formatDate(value)})
            </Tag>
          );
        }
        if (remaining <= 7 && record.soLuongTon > 0) {
          return (
            <Tag color="warning">
              Cận hạn ({formatDate(value)})
            </Tag>
          );
        }
        return <Text>{formatDate(value)}</Text>;
      },
    },
    {
      title: 'Tồn lô',
      dataIndex: 'soLuongTon',
      key: 'soLuongTon',
      align: 'right',
      width: 100,
      render: (qty: number) => (
        <Text strong style={{ color: qty > 0 ? '#1f1f1f' : '#8c8c8c' }}>
          {formatNumber(qty)}
        </Text>
      ),
    },
    {
      title: 'Giá vốn',
      dataIndex: 'giaVon',
      key: 'giaVon',
      align: 'right',
      width: 120,
      render: (price: number) => formatVND(price),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      align: 'center',
      width: 110,
      render: (status: string, record) => {
        if (status === 'DISPOSED' || record.soLuongTon === 0) {
          return <Tag color="default">Đã xuất / huỷ</Tag>;
        }
        const remaining = record.hanSuDung ? daysUntil(record.hanSuDung) : null;
        if (remaining !== null && remaining < 0) {
          return <Tag color="red">Hết hạn</Tag>;
        }
        return <Tag color="green">Đang bán</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 120,
      render: (_, record) => {
        const canDispose = record.trangThai === 'ACTIVE' && record.soLuongTon > 0;
        if (!canDispose) return <Text type="secondary">—</Text>;

        return (
          <Popconfirm
            title="Xác nhận huỷ lô hàng này?"
            description={
              <div style={{ maxWidth: 260 }}>
                Chỉ có lô <b>{record.maLo}</b> ({formatNumber(record.soLuongTon)} sản phẩm) bị huỷ về 0. Các lô còn hạn khác vẫn được bảo toàn.
              </div>
            }
            okText="Huỷ lô"
            cancelText="Bỏ qua"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDispose(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Huỷ lô
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  const totalLotStock = lots
    .filter((l) => l.trangThai === 'ACTIVE')
    .reduce((sum, l) => sum + (l.soLuongTon || 0), 0);

  return (
    <Drawer
      title={
        <Space>
          <InboxOutlined />
          <span>Quản lý Lô hàng & Hạn sử dụng (FEFO)</span>
        </Space>
      }
      placement="right"
      width={780}
      open={open}
      onClose={onClose}
      extra={
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchLots} loading={loading}>
          Làm mới
        </Button>
      }
    >
      {balance && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }}>
            {balance.productName}
          </Title>
          <Space split={<Text type="secondary">|</Text>}>
            <Text type="secondary">Mã SKU: <span className="mono-code">{balance.sku}</span></Text>
            <Text type="secondary">Chi nhánh: <b>{balance.branchName}</b></Text>
            <Text>Tổng tồn các lô: <b>{formatNumber(totalLotStock)}</b></Text>
          </Space>
        </div>
      )}

      <Table<LoHangDTO>
        rowKey="id"
        columns={columns}
        dataSource={lots}
        loading={loading}
        pagination={false}
        size="small"
        locale={{
          emptyText: <Empty description="Chưa có dữ liệu lô hàng cho sản phẩm này." />,
        }}
      />
    </Drawer>
  );
};
