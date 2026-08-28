import { useMemo, useState, type FC, type ReactElement } from 'react';
import { Card, Descriptions, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import {
  DOCUMENT_STATUS,
  DOCUMENT_STATUS_LABEL,
  type DocumentStatus,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from '@/types';
import { mockBranches } from '@/mockData/branches';
import { mockSuppliers } from '@/mockData/suppliers';
import {
  mockPurchaseOrders,
  totalSupplierPayable,
} from '@/mockData/warehouseDocuments';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import './PurchaseOrdersPage.css';

const { Text } = Typography;

/**
 * Module 8 — Nhập kho từ nhà cung cấp.
 *
 * Mỗi dòng là một đơn mua hàng (PO); mở rộng dòng để xem chi tiết mặt hàng,
 * đối chiếu số đặt với số thực nhận — chỗ hay phát sinh sai lệch nhất.
 */
export const PurchaseOrdersPage: FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mockPurchaseOrders.filter((order) => {
        const matchSearch = matchKeyword(search, [
          order.code,
          order.supplierName,
          order.branchName,
          order.createdBy,
        ]);
        const matchStatus = statusFilter === null || order.status === statusFilter;
        const matchSupplier =
          supplierFilter === null || order.supplierId === supplierFilter;
        const matchBranch = branchFilter === null || order.branchId === branchFilter;
        return matchSearch && matchStatus && matchSupplier && matchBranch;
      }),
    [search, statusFilter, supplierFilter, branchFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const completed = mockPurchaseOrders.filter(
      (order) => order.status === DOCUMENT_STATUS.Completed,
    );
    const pending = mockPurchaseOrders.filter(
      (order) =>
        order.status === DOCUMENT_STATUS.Pending ||
        order.status === DOCUMENT_STATUS.Draft,
    );
    const totalValue = completed.reduce((sum, order) => sum + order.grandTotal, 0);

    return [
      {
        key: 'orders',
        title: 'Tổng đơn nhập',
        value: formatNumber(mockPurchaseOrders.length),
        suffix: 'phiếu',
        color: BRAND.primaryRed,
      },
      {
        key: 'value',
        title: 'Giá trị đã nhập kho',
        value: formatVND(totalValue),
      },
      {
        key: 'payable',
        title: 'Công nợ còn phải trả NCC',
        value: formatVND(totalSupplierPayable()),
        color: BRAND.error,
      },
      {
        key: 'pending',
        title: 'Phiếu chờ xử lý',
        value: formatNumber(pending.length),
        suffix: 'phiếu',
        color: BRAND.warning,
      },
    ];
  }, []);

  const filters: ToolbarFilter[] = [
    {
      key: 'supplier',
      placeholder: 'Nhà cung cấp',
      value: supplierFilter,
      onChange: setSupplierFilter,
      options: mockSuppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
      span: 6,
    },
    {
      key: 'branch',
      placeholder: 'Kho nhận',
      value: branchFilter,
      onChange: setBranchFilter,
      options: mockBranches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
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

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      width: 165,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplierName',
      width: 280,
      render: (value: string) => (
        <Text strong className="po-text-12-5">
          {value}
        </Text>
      ),
    },
    {
      title: 'Kho nhận',
      dataIndex: 'branchName',
      width: 210,
      render: (value: string) => <Text className="po-text-12-5">{value}</Text>,
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'orderDate',
      width: 105,
      sorter: (a, b) => a.orderDate.localeCompare(b.orderDate),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Dự kiến giao',
      dataIndex: 'expectedDate',
      width: 115,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Ngày nhập kho',
      dataIndex: 'receivedDate',
      width: 120,
      render: (value: string | null) =>
        value === null ? <Text type="secondary">Chưa nhận</Text> : formatDate(value),
    },
    {
      title: 'Số mặt hàng',
      key: 'lineCount',
      align: 'center',
      width: 105,
      render: (_, row) => <Text className="numeric-cell">{row.lines.length}</Text>,
    },
    {
      title: 'Tổng phải trả',
      dataIndex: 'grandTotal',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.grandTotal - b.grandTotal,
      render: (value: number) => (
        <Text strong className="numeric-cell po-total-due">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Đã thanh toán',
      key: 'paid',
      align: 'right',
      width: 160,
      render: (_, row) => {
        const percent =
          row.grandTotal === 0 ? 0 : Math.round((row.paidAmount / row.grandTotal) * 100);
        return (
          <Space direction="vertical" size={2} className="po-cell-full">
            <Text className="numeric-cell po-text-12-5">
              {formatVND(row.paidAmount)}
            </Text>
            <Progress
              percent={percent}
              size="small"
              strokeColor={percent >= 100 ? BRAND.success : BRAND.accentYellow}
            />
          </Space>
        );
      },
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

  /** Bảng chi tiết mặt hàng khi mở rộng một phiếu nhập. */
  const renderDetail = (order: PurchaseOrder): ReactElement => {
    const lineColumns: ColumnsType<PurchaseOrderLine> = [
      {
        title: 'SKU',
        dataIndex: 'sku',
        width: 150,
        render: (value: string) => <span className="mono-code">{value}</span>,
      },
      { title: 'Sản phẩm', dataIndex: 'productName' },
      {
        title: 'Đặt',
        dataIndex: 'orderedQuantity',
        align: 'right',
        width: 80,
      },
      {
        title: 'Thực nhận',
        dataIndex: 'receivedQuantity',
        align: 'right',
        width: 100,
        render: (value: number, row) => (
          <Text
            strong
            // Giao thiếu là tín hiệu cần đối chiếu với nhà cung cấp.
            className={`numeric-cell${
              value > 0 && value < row.orderedQuantity ? ' po-received-short' : ''
            }`}
          >
            {value}
          </Text>
        ),
      },
      {
        title: 'Đơn giá',
        dataIndex: 'unitCost',
        align: 'right',
        width: 110,
        render: (value: number) => formatVND(value),
      },
      {
        title: 'VAT',
        dataIndex: 'vatPercent',
        align: 'center',
        width: 65,
        render: (value: number) => `${value}%`,
      },
      {
        title: 'Thành tiền',
        dataIndex: 'lineTotal',
        align: 'right',
        width: 130,
        render: (value: number) => (
          <Text strong className="numeric-cell">
            {formatVND(value)}
          </Text>
        ),
      },
      {
        title: 'HSD lô hàng',
        dataIndex: 'expiryDate',
        width: 120,
        render: (value: string | null) =>
          value === null ? <Text type="secondary">—</Text> : formatDate(value),
      },
    ];

    return (
      <Space direction="vertical" size={14} className="po-detail-full">
        <Table<PurchaseOrderLine>
          columns={lineColumns}
          dataSource={order.lines}
          rowKey="id"
          size="small"
          pagination={false}
        />

        <Descriptions bordered size="small" column={4}>
          <Descriptions.Item label="Tiền hàng">
            {formatVND(order.subTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Thuế VAT">
            {formatVND(order.vatTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Chiết khấu">
            -{formatVND(order.discount)}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng phải trả">
            <Text strong className="po-total-due">
              {formatVND(order.grandTotal)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Người tạo phiếu" span={2}>
            {order.createdBy}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={2}>
            {order.note === '' ? '—' : order.note}
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
        { header: 'Nhà cung cấp', accessor: (row) => row.supplierName },
        { header: 'Kho nhận', accessor: (row) => row.branchName },
        { header: 'Ngày đặt', accessor: (row) => row.orderDate },
        { header: 'Dự kiến giao', accessor: (row) => row.expectedDate },
        { header: 'Ngày nhập kho', accessor: (row) => row.receivedDate ?? '' },
        { header: 'Số mặt hàng', accessor: (row) => row.lines.length },
        { header: 'Tiền hàng', accessor: (row) => row.subTotal },
        { header: 'VAT', accessor: (row) => row.vatTotal },
        { header: 'Chiết khấu', accessor: (row) => row.discount },
        { header: 'Tổng phải trả', accessor: (row) => row.grandTotal },
        { header: 'Đã thanh toán', accessor: (row) => row.paidAmount },
        { header: 'Còn nợ', accessor: (row) => row.grandTotal - row.paidAmount },
        { header: 'Trạng thái', accessor: (row) => DOCUMENT_STATUS_LABEL[row.status] },
      ],
      'Phieu nhap kho Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 8"
        title="Nhập kho từ nhà cung cấp"
        description="Quản lý đơn mua hàng (PO), xác nhận số lượng thực nhận và theo dõi công nợ nhà cung cấp."
        extra={
          <Tag color="red" className="tag-no-margin">
            {filtered.length} / {mockPurchaseOrders.length} phiếu
          </Tag>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, nhà cung cấp..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setStatusFilter(null);
            setSupplierFilter(null);
            setBranchFilter(null);
          }}
        />

        <Table<PurchaseOrder>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: 1700 }}
          expandable={{ expandedRowRender: renderDetail, columnWidth: 44 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu nhập`,
          }}
        />
      </Card>
    </>
  );
};