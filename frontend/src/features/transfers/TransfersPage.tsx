import { useMemo, useState, type FC, type ReactElement } from 'react';
import { Card, Descriptions, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRightOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import {
  DOCUMENT_STATUS,
  DOCUMENT_STATUS_LABEL,
  type DocumentStatus,
  type StockTransfer,
  type TransferLine,
} from '@/types';
import { mockBranches } from '@/mockData/branches';
import { mockTransfers } from '@/mockData/warehouseDocuments';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';

const { Text } = Typography;

/**
 * Module 9 — Xuất kho nội bộ.
 *
 * Luồng chuẩn: kho tổng → cửa hàng. Cột "Tuyến luân chuyển" hiển thị rõ hai
 * đầu để người điều phối kiểm tra nhanh mà không phải mở chi tiết.
 */
export const TransfersPage: FC = () => {
  const [search, setSearch] = useState('');
  const [fromFilter, setFromFilter] = useState<string | null>(null);
  const [toFilter, setToFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mockTransfers.filter((transfer) => {
        const matchSearch = matchKeyword(search, [
          transfer.code,
          transfer.fromBranchName,
          transfer.toBranchName,
          transfer.requestedBy,
        ]);
        const matchFrom = fromFilter === null || transfer.fromBranchId === fromFilter;
        const matchTo = toFilter === null || transfer.toBranchId === toFilter;
        const matchStatus = statusFilter === null || transfer.status === statusFilter;
        return matchSearch && matchFrom && matchTo && matchStatus;
      }),
    [search, fromFilter, toFilter, statusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const completed = mockTransfers.filter(
      (transfer) => transfer.status === DOCUMENT_STATUS.Completed,
    );
    const inTransit = mockTransfers.filter(
      (transfer) => transfer.status === DOCUMENT_STATUS.Approved,
    );
    const waiting = mockTransfers.filter(
      (transfer) =>
        transfer.status === DOCUMENT_STATUS.Pending ||
        transfer.status === DOCUMENT_STATUS.Draft,
    );

    return [
      {
        key: 'total',
        title: 'Tổng phiếu luân chuyển',
        value: formatNumber(mockTransfers.length),
        suffix: 'phiếu',
        color: BRAND.primaryRed,
      },
      {
        key: 'value',
        title: 'Giá trị hàng đã luân chuyển',
        value: formatVND(
          completed.reduce((sum, transfer) => sum + transfer.totalValue, 0),
        ),
      },
      {
        key: 'transit',
        title: 'Đang trên đường',
        value: formatNumber(inTransit.length),
        suffix: 'phiếu',
        color: BRAND.info,
      },
      {
        key: 'waiting',
        title: 'Chờ duyệt / nháp',
        value: formatNumber(waiting.length),
        suffix: 'phiếu',
        color: BRAND.warning,
      },
    ];
  }, []);

  const branchOptions = useMemo(
    () => mockBranches.map((branch) => ({ value: branch.id, label: branch.name })),
    [],
  );

  const filters: ToolbarFilter[] = [
    {
      key: 'from',
      placeholder: 'Kho xuất',
      value: fromFilter,
      onChange: setFromFilter,
      options: branchOptions,
      span: 5,
    },
    {
      key: 'to',
      placeholder: 'Kho nhận',
      value: toFilter,
      onChange: setToFilter,
      options: branchOptions,
      span: 5,
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: Object.values(DOCUMENT_STATUS).map((status) => ({
        value: status,
        label: DOCUMENT_STATUS_LABEL[status],
      })),
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
      width: 380,
      render: (_, row) => (
        <Space size={8} wrap>
          <Tag color="orange" style={{ margin: 0 }}>
            {row.fromBranchName.replace('Circle K ', '')}
          </Tag>
          <ArrowRightOutlined style={{ color: BRAND.textSecondary, fontSize: 11 }} />
          <Tag color="cyan" style={{ margin: 0 }}>
            {row.toBranchName.replace('Circle K ', '')}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      width: 120,
      sorter: (a, b) => a.requestDate.localeCompare(b.requestDate),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Ngày xuất',
      dataIndex: 'shippedDate',
      width: 110,
      render: (value: string | null) =>
        value === null ? <Text type="secondary">—</Text> : formatDate(value),
    },
    {
      title: 'Ngày nhận',
      dataIndex: 'receivedDate',
      width: 110,
      render: (value: string | null) =>
        value === null ? <Text type="secondary">—</Text> : formatDate(value),
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
      width: 120,
      render: (_, row) => (
        <Text className="numeric-cell">
          {formatNumber(
            row.lines.reduce((sum, line) => sum + line.requestedQuantity, 0),
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
        <Text strong className="numeric-cell" style={{ color: BRAND.primaryRed }}>
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Người yêu cầu',
      dataIndex: 'requestedBy',
      width: 170,
      render: (value: string) => <Text style={{ fontSize: 12.5 }}>{value}</Text>,
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
        title: 'Yêu cầu',
        dataIndex: 'requestedQuantity',
        align: 'right',
        width: 90,
      },
      {
        title: 'Đã xuất',
        dataIndex: 'shippedQuantity',
        align: 'right',
        width: 90,
      },
      {
        title: 'Đã nhận',
        dataIndex: 'receivedQuantity',
        align: 'right',
        width: 90,
        render: (value: number, row) => (
          <Text
            strong
            className="numeric-cell"
            // Nhận thiếu so với đã xuất là dấu hiệu thất thoát trên đường.
            style={{
              color:
                row.shippedQuantity > 0 && value < row.shippedQuantity
                  ? BRAND.error
                  : undefined,
            }}
          >
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
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
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
          <Descriptions.Item label="Kho nhận">
            {transfer.toBranchName}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng giá trị">
            <Text strong style={{ color: BRAND.primaryRed }}>
              {formatVND(transfer.totalValue)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Người yêu cầu">
            {transfer.requestedBy}
          </Descriptions.Item>
          <Descriptions.Item label="Người duyệt">
            {transfer.approvedBy ?? 'Chưa duyệt'}
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
        { header: 'Kho nhận', accessor: (row) => row.toBranchName },
        { header: 'Ngày yêu cầu', accessor: (row) => row.requestDate },
        { header: 'Ngày xuất', accessor: (row) => row.shippedDate ?? '' },
        { header: 'Ngày nhận', accessor: (row) => row.receivedDate ?? '' },
        { header: 'Số mặt hàng', accessor: (row) => row.lines.length },
        {
          header: 'Tổng số lượng',
          accessor: (row) =>
            row.lines.reduce((sum, line) => sum + line.requestedQuantity, 0),
        },
        { header: 'Giá trị hàng', accessor: (row) => row.totalValue },
        { header: 'Người yêu cầu', accessor: (row) => row.requestedBy },
        { header: 'Người duyệt', accessor: (row) => row.approvedBy ?? '' },
        { header: 'Trạng thái', accessor: (row) => DOCUMENT_STATUS_LABEL[row.status] },
      ],
      'Phieu xuat kho noi bo Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 9"
        title="Xuất kho nội bộ"
        description="Luân chuyển hàng hoá từ kho tổng tới các chi nhánh hoặc điều chuyển ngang giữa các cửa hàng."
        extra={
          <Tag color="red" style={{ margin: 0 }}>
            {filtered.length} / {mockTransfers.length} phiếu
          </Tag>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, kho xuất, kho nhận..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setFromFilter(null);
            setToFilter(null);
            setStatusFilter(null);
          }}
        />

        <Table<StockTransfer>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: 1740 }}
          expandable={{ expandedRowRender: renderDetail, columnWidth: 44 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu luân chuyển`,
          }}
        />
      </Card>
    </>
  );
};