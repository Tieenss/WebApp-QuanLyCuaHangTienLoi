import { useMemo, useState, type FC, type ReactElement } from 'react';
import { Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppSelector } from '@/store/hooks';
import {
  USER_ROLE,
  type DocumentStatus,
  type StockTransfer,
  type TransferLine,
} from '@/types';
import { activeStores } from '@/mockData/branches';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { TransferFormModal } from './components/TransferFormModal';
import './TransfersPage.css';

const { Text } = Typography;

/**
 * Module 9 — Xuất kho nội bộ.
 *
 * Luồng duy nhất: Kho Tổng → cửa hàng bán lẻ (BR-06). Cột "Tuyến luân chuyển"
 * hiển thị rõ hai đầu để người điều phối kiểm tra nhanh mà không phải mở chi tiết.
 *
 * Phiếu xuất chỉ có một trạng thái `HOAN_THANH`: tồn kho chuyển ngay khi Thủ
 * kho xác nhận, cửa hàng không cần bước xác nhận nhận hàng riêng.
 */
export const TransfersPage: FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const transfers = useAppSelector((state) => state.transfer.transfers);

  /** Admin và Thủ kho được lập phiếu xuất (ma trận phân quyền). */
  const canCreate =
    user?.role === USER_ROLE.Admin || user?.role === USER_ROLE.WarehouseKeeper;
  const [isFormOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [toFilter, setToFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      transfers.filter((transfer) => {
        const matchSearch = matchKeyword(search, [
          transfer.code,
          transfer.toBranchName,
          transfer.requestedBy,
          transfer.approvedBy ?? '',
        ]);
        const matchTo = toFilter === null || transfer.toBranchId === toFilter;
        return matchSearch && matchTo;
      }),
    [transfers, search, toFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const totalValue = transfers.reduce(
      (sum, transfer) => sum + transfer.totalValue,
      0,
    );
    const totalItems = transfers.reduce(
      (sum, transfer) =>
        sum +
        transfer.lines.reduce((count, line) => count + line.shippedQuantity, 0),
      0,
    );
    /** Số cửa hàng đã nhận hàng — cho thấy độ phủ của việc cấp hàng. */
    const servedBranches = new Set(transfers.map((transfer) => transfer.toBranchId));

    return [
      {
        key: 'total',
        title: 'Tổng phiếu luân chuyển',
        value: formatNumber(transfers.length),
        suffix: 'phiếu',
        color: BRAND.primaryRed,
      },
      {
        key: 'value',
        title: 'Giá trị hàng đã luân chuyển',
        value: formatVND(totalValue),
      },
      {
        key: 'items',
        title: 'Số lượng hàng đã xuất',
        value: formatNumber(totalItems),
        suffix: 'đơn vị',
      },
      {
        key: 'branches',
        title: 'Cửa hàng đã nhận hàng',
        value: formatNumber(servedBranches.size),
        suffix: `/ ${activeStores.length} cửa hàng`,
        color: BRAND.info,
      },
    ];
  }, [transfers]);

  const filters: ToolbarFilter[] = [
    {
      key: 'to',
      placeholder: 'Cửa hàng nhận',
      value: toFilter,
      onChange: setToFilter,
      options: activeStores.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
      span: 6,
    },
  ];

  const columns: ColumnsType<StockTransfer> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      width: 165,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Tuyến luân chuyển',
      key: 'route',
      width: 360,
      render: (_, row) => (
        <Space size={8} wrap>
          <Tag color="orange" className="tag-no-margin">
            {row.fromBranchName}
          </Tag>
          <ArrowRightOutlined className="tr-route-arrow" />
          <Tag color="cyan" className="tag-no-margin">
            {row.toBranchName}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Ngày xuất kho',
      dataIndex: 'requestDate',
      width: 125,
      sorter: (a, b) => a.requestDate.localeCompare(b.requestDate),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Số mặt hàng',
      key: 'lineCount',
      align: 'center',
      width: 105,
      render: (_, row) => <Text className="numeric-cell">{row.lines.length}</Text>,
    },
    {
      title: 'Tổng số lượng',
      key: 'totalQuantity',
      align: 'right',
      width: 125,
      render: (_, row) => (
        <Text className="numeric-cell">
          {formatNumber(
            row.lines.reduce((sum, line) => sum + line.shippedQuantity, 0),
          )}
        </Text>
      ),
    },
    {
      title: 'Giá trị hàng',
      dataIndex: 'totalValue',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.totalValue - b.totalValue,
      render: (value: number) => (
        <Text strong className="numeric-cell tr-value">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Người yêu cầu',
      dataIndex: 'requestedBy',
      width: 200,
      render: (value: string) => <Text className="tr-text-12-5">{value}</Text>,
    },
    {
      title: 'Người xuất kho',
      dataIndex: 'approvedBy',
      width: 200,
      render: (value: string | null) =>
        value === null ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="tr-text-12-5">{value}</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 120,
      fixed: 'right',
      render: (status: DocumentStatus) => <DocumentStatusTag status={status} />,
    },
  ];

  const renderDetail = (transfer: StockTransfer): ReactElement => {
    const lineColumns: ColumnsType<TransferLine> = [
      {
        title: 'SKU',
        dataIndex: 'sku',
        width: 150,
        render: (value: string) => <span className="mono-code">{value}</span>,
      },
      { title: 'Sản phẩm', dataIndex: 'productName' },
      {
        title: 'Số lượng xuất',
        dataIndex: 'shippedQuantity',
        align: 'right',
        width: 120,
        render: (value: number) => (
          <Text strong className="numeric-cell">
            {value}
          </Text>
        ),
      },
      {
        title: 'Giá vốn',
        dataIndex: 'unitCost',
        align: 'right',
        width: 110,
        render: (value: number) => formatVND(value),
      },
      {
        title: 'Giá trị',
        dataIndex: 'lineTotal',
        align: 'right',
        width: 130,
        render: (value: number) => (
          <Text strong className="numeric-cell">
            {formatVND(value)}
          </Text>
        ),
      },
    ];

    return (
      <Space direction="vertical" size={14} className="tr-detail-full">
        <Table<TransferLine>
          columns={lineColumns}
          dataSource={transfer.lines}
          rowKey="id"
          size="small"
          pagination={false}
        />

        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="Kho xuất">
            {transfer.fromBranchName}
          </Descriptions.Item>
          <Descriptions.Item label="Cửa hàng nhận">
            {transfer.toBranchName}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng giá trị">
            <Text strong className="tr-value">
              {formatVND(transfer.totalValue)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Người yêu cầu">
            {transfer.requestedBy}
          </Descriptions.Item>
          <Descriptions.Item label="Người xuất kho">
            {transfer.approvedBy ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú">
            {transfer.note === '' ? '—' : transfer.note}
          </Descriptions.Item>
        </Descriptions>
      </Space>
    );
  };

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã phiếu', accessor: (row) => row.code },
        { header: 'Kho xuất', accessor: (row) => row.fromBranchName },
        { header: 'Cửa hàng nhận', accessor: (row) => row.toBranchName },
        { header: 'Ngày xuất kho', accessor: (row) => row.requestDate },
        { header: 'Số mặt hàng', accessor: (row) => row.lines.length },
        {
          header: 'Tổng số lượng',
          accessor: (row) =>
            row.lines.reduce((sum, line) => sum + line.shippedQuantity, 0),
        },
        { header: 'Giá trị hàng', accessor: (row) => row.totalValue },
        { header: 'Người yêu cầu', accessor: (row) => row.requestedBy },
        { header: 'Người xuất kho', accessor: (row) => row.approvedBy ?? '' },
      ],
      'Phieu xuat kho noi bo',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 9"
        title="Xuất kho nội bộ"
        description="Luân chuyển hàng hoá từ Kho Tổng tới các cửa hàng bán lẻ. Tồn kho hai đầu cập nhật ngay khi xuất."
        extra={
          <Space wrap>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {transfers.length} phiếu
            </Tag>

            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormOpen(true)}
              >
                Lập phiếu xuất
              </Button>
            )}
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, cửa hàng nhận..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setToFilter(null);
          }}
        />

        <Table<StockTransfer>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: 1600 }}
          expandable={{ expandedRowRender: renderDetail, columnWidth: 44 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu luân chuyển`,
          }}
        />
      </Card>

      <TransferFormModal open={isFormOpen} onClose={() => setFormOpen(false)} />
    </>
  );
};