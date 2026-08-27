import { useMemo, type CSSProperties, type FC } from 'react';
import { Drawer, Empty, Space, Table, Tag, Timeline, Typography } from 'antd';
import './LedgerDrawer.css';
import type { ColumnsType } from 'antd/es/table';
import { LedgerTypeTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeLedgerDrawer } from '@/store/slices/inventorySlice';
import { LEDGER_TYPE_LABEL, type StockLedgerEntry } from '@/types';
import { mockStockLedger } from '@/mockData/inventory';
import { productById } from '@/mockData/products';
import { formatDateTime } from '@/utils/dateUtils';
import { formatNumber, formatVND } from '@/utils/formatters';

const { Text } = Typography;

/**
 * Drawer thẻ kho của một sản phẩm.
 *
 * Hiển thị song song 2 góc nhìn: timeline để thấy dòng thời gian biến động, và
 * bảng để tra số liệu tồn trước/sau từng nghiệp vụ.
 */
export const LedgerDrawer: FC = () => {
  const dispatch = useAppDispatch();
  const { selectedProductId, branchFilter } = useAppSelector(
    (state) => state.inventory,
  );

  const product = selectedProductId === null ? undefined : productById(selectedProductId);

  /** Thẻ kho của đúng sản phẩm (và chi nhánh nếu đang lọc). */
  const entries = useMemo(() => {
    if (selectedProductId === null) return [];
    return mockStockLedger
      .filter(
        (entry) =>
          entry.productId === selectedProductId &&
          (branchFilter === null || entry.branchId === branchFilter),
      )
      .slice(0, 60);
  }, [selectedProductId, branchFilter]);

  const columns: ColumnsType<StockLedgerEntry> = [
    {
      title: 'Thời điểm',
      dataIndex: 'occurredAt',
      width: 140,
      render: (value: string) => (
        <Text className="ledger-text-12">{formatDateTime(value)}</Text>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      width: 150,
      render: (type: StockLedgerEntry['type']) => <LedgerTypeTag type={type} />,
    },
    {
      title: 'Chứng từ',
      dataIndex: 'referenceCode',
      width: 160,
      render: (value: string) => <span className="mono-code">{value}</span>,
    },
    {
      title: 'Thay đổi',
      dataIndex: 'quantityChange',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text
          strong
          className={`numeric-cell ${value >= 0 ? 'ledger-delta-in' : 'ledger-delta-out'}`}
        >
          {value >= 0 ? `+${value}` : value}
        </Text>
      ),
    },
    {
      title: 'Tồn trước',
      dataIndex: 'balanceBefore',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text type="secondary" className="numeric-cell">
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: 'Tồn sau',
      dataIndex: 'balanceAfter',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performedBy',
      width: 200,
      render: (value: string) => <Text className="ledger-text-12">{value}</Text>,
    },
  ];

  return (
    <Drawer
      open={selectedProductId !== null}
      onClose={() => dispatch(closeLedgerDrawer())}
      width={980}
      title={
        product === undefined ? (
          'Thẻ kho'
        ) : (
          <Space direction="vertical" size={0}>
            <Text strong className="ledger-drawer-title">
              Thẻ kho — {product.name}
            </Text>
            <Text type="secondary" className="ledger-drawer-subtitle">
              <span className="mono-code">{product.sku}</span> · Giá nhập{' '}
              {formatVND(product.costPrice)} · Giá bán {formatVND(product.salePrice)}
            </Text>
          </Space>
        )
      }
      destroyOnHidden
    >
      {entries.length === 0 ? (
        <Empty description="Chưa có biến động kho cho sản phẩm này" />
      ) : (
        <Space direction="vertical" size={20} className="ledger-drawer-body">
          <Table<StockLedgerEntry>
            columns={columns}
            dataSource={entries}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 12, showSizeChanger: false }}
            scroll={{ x: 920 }}
          />

          <div>
            <Text strong className="ledger-timeline-label">
              Dòng thời gian 8 biến động gần nhất
            </Text>
            <Timeline
              items={entries.slice(0, 8).map((entry) => ({
                color: entry.quantityChange >= 0 ? 'green' : 'red',
                children: (
                  <Space direction="vertical" size={2}>
                    <Space size={8} wrap>
                      <Text strong className="ledger-timeline-type">
                        {LEDGER_TYPE_LABEL[entry.type]}
                      </Text>
                      <Tag
                        className="ledger-delta-tag"
                        style={
                          {
                            '--delta-color':
                              entry.quantityChange >= 0 ? BRAND.success : BRAND.error,
                          } as CSSProperties
                        }
                      >
                        {entry.quantityChange >= 0
                          ? `+${entry.quantityChange}`
                          : entry.quantityChange}
                      </Tag>
                      <Text type="secondary" className="ledger-timeline-note">
                        còn {entry.balanceAfter}
                      </Text>
                    </Space>
                    <Text type="secondary" className="ledger-timeline-note">
                      {formatDateTime(entry.occurredAt)} · {entry.branchName} ·{' '}
                      {entry.referenceCode}
                    </Text>
                    {entry.note !== '' && (
                      <Text type="secondary" className="ledger-timeline-note">
                        {entry.note}
                      </Text>
                    )}
                  </Space>
                ),
              }))}
            />
          </div>
        </Space>
      )}
    </Drawer>
  );
};