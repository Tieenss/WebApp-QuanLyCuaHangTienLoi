import { useMemo, useState, type FC, type ReactElement } from 'react';
import { App as AntdApp, Button, Card, Descriptions, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  approveTransfer,
  rejectTransfer,
  transferShipped,
} from '@/store/slices/transferSlice';
import {
  DOCUMENT_STATUS,
  USER_ROLE,
  type DocumentStatus,
  type StockTransfer,
  type TransferLine,
} from '@/types';
import { formatDate, today } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { TransferFormModal } from './components/TransferFormModal';
import './TransfersPage.css';

const { Text } = Typography;

/**
 * Module 9 — Xuất kho nội bộ.
 *
 * Vòng đời phiếu: Kho Tổng → cửa hàng bán lẻ (BR-06), cột "Tuyến luân chuyển"
 * hiển thị rõ hai đầu để người điều phối kiểm tra nhanh mà không phải mở chi tiết.
 *
 * Phân quyền & phạm vi dữ liệu:
 * - Admin / Thủ kho: thấy mọi phiếu, có thể duyệt yêu cầu và xuất trực tiếp.
 * - Quản lý chi nhánh: chỉ thấy phiếu có `toBranchId = chi nhánh mình`; có thể
 *   tạo yêu cầu (PENDING) nhưng KHÔNG duyệt được.
 *
 * Trạng thái phiếu:
 * - PENDING: yêu cầu mới, tồn kho chưa bị đụng.
 * - COMPLETED: đã duyệt & xuất, tồn kho đã chuyển.
 * - CANCELLED: bị từ chối hoặc huỷ, tồn kho giữ nguyên.
 */
export const TransfersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const user = useAppSelector((state) => state.auth.user);
  const transfers = useAppSelector((state) => state.transfer.transfers);
  const branches = useAppSelector((state) => state.branch.branches);

  const activeStores = branches.filter((b) => b.status === 'Active');

  const isStoreManager = user?.role === USER_ROLE.StoreManager;
  const isApprover =
    user?.role === USER_ROLE.Admin || user?.role === USER_ROLE.WarehouseKeeper;

  /** Phạm vi chi nhánh của user hiện tại (StoreManager = 1, còn lại = null = tất cả). */
  const branchScope = isStoreManager ? user?.branchId ?? null : null;

  const [isFormOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [toFilter, setToFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | null>(null);

  /**
   * Lọc dữ liệu theo 3 trục:
   * 1. Phạm vi chi nhánh: StoreManager chỉ thấy phiếu liên quan chi nhánh mình.
   * 2. Từ khoá: mã phiếu, cửa hàng nhận, người yêu cầu/duyệt.
   * 3. Cửa hàng nhận + trạng thái.
   */
  const scoped = useMemo(
    () =>
      branchScope === null
        ? transfers
        : transfers.filter(
            (transfer) => transfer.toBranchId === branchScope,
          ),
    [transfers, branchScope],
  );

  const filtered = useMemo(
    () =>
      scoped.filter((transfer) => {
        const matchSearch = matchKeyword(search, [
          transfer.code,
          transfer.toBranchName,
          transfer.requestedBy,
          transfer.approvedBy ?? '',
        ]);
        const matchTo = toFilter === null || transfer.toBranchId === toFilter;
        const matchStatus =
          statusFilter === null || transfer.status === statusFilter;
        return matchSearch && matchTo && matchStatus;
      }),
    [scoped, search, toFilter, statusFilter],
  );

  /** Phiếu đang chờ duyệt — hiển thị badge nổi bật trên PageHeader. */
  const pendingCount = useMemo(
    () => scoped.filter((transfer) => transfer.status === DOCUMENT_STATUS.Pending).length,
    [scoped],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const totalValue = scoped.reduce(
      (sum, transfer) => sum + transfer.totalValue,
      0,
    );
    const totalItems = scoped.reduce(
      (sum, transfer) =>
        sum +
        transfer.lines.reduce((count, line) => count + line.shippedQuantity, 0),
      0,
    );
    /** Số cửa hàng đã nhận hàng — cho thấy độ phủ của việc cấp hàng. */
    const servedBranches = new Set(scoped.map((transfer) => transfer.toBranchId));

    return [
      {
        key: 'total',
        title: 'Tổng phiếu luân chuyển',
        value: formatNumber(scoped.length),
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
  }, [scoped]);

  /**
   * Dropdown lọc cửa hàng nhận: StoreManager chỉ thấy chi nhánh mình.
   */
  const toFilterOptions = useMemo(() => {
    const list =
      branchScope === null
        ? activeStores
        : activeStores.filter((branch) => branch.id === branchScope);
    return list.map((branch) => ({ value: branch.id, label: branch.name }));
  }, [branchScope]);

  const filters: ToolbarFilter[] = [
    {
      key: 'to',
      placeholder: 'Cửa hàng nhận',
      value: toFilter,
      onChange: setToFilter,
      options: toFilterOptions,
      span: 6,
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: (value) => setStatusFilter(value as DocumentStatus | null),
      options: (Object.keys(DOCUMENT_STATUS) as Array<keyof typeof DOCUMENT_STATUS>).map(
        (key) => {
          const value = DOCUMENT_STATUS[key];
          return { value, label: labelOfStatus(value) };
        },
      ),
      span: 6,
    },
  ];

  const handleApprove = (transfer: StockTransfer): void => {
    if (user === null) return;
    const performedBy = `${user.fullName} (${user.employeeCode})`;
    const approvedDate = today();

    // 1. Cập nhật trạng thái phiếu trong transferSlice.
    dispatch(
      approveTransfer({
        id: transfer.id,
        approvedBy: performedBy,
        approvedDate,
      }),
    );
    // 2. Dispatch transferShipped để stockSlice trừ/cộng tồn + ghi thẻ kho.
    //    Phiếu trong action có status = COMPLETED, stockSlice sẽ chỉ xử lý khi
    //    trạng thái là COMPLETED.
    dispatch(
      transferShipped({
        transfer: {
          ...transfer,
          status: DOCUMENT_STATUS.Completed,
          shippedDate: approvedDate,
          receivedDate: approvedDate,
          approvedBy: performedBy,
        },
        performedBy,
      }),
    );
    message.success(`Đã duyệt phiếu ${transfer.code}.`);
  };

  const handleReject = (transfer: StockTransfer): void => {
    if (user === null) return;
    const performedBy = `${user.fullName} (${user.employeeCode})`;
    dispatch(rejectTransfer({ id: transfer.id, rejectedBy: performedBy }));
    message.success(`Đã từ chối phiếu ${transfer.code}.`);
  };

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

  /**
   * Cột "Thao tác" chỉ hiển thị khi người dùng là Thủ kho/Admin.
   * - PENDING: hiện Duyệt / Từ chối.
   * - Các trạng thái khác: ẩn.
   */
  if (isApprover) {
    columns.push({
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 170,
      fixed: 'right',
      render: (_, row) => {
        if (row.status !== DOCUMENT_STATUS.Pending) return null;
        return (
          <Space size={4}>
            <Button type="primary" size="small" onClick={() => handleApprove(row)}>
              Duyệt
            </Button>
            <Popconfirm
              title="Từ chối yêu cầu xuất kho?"
              description={`Phiếu ${row.code} sẽ chuyển sang trạng thái "Đã huỷ".`}
              okText="Từ chối"
              cancelText="Đóng"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleReject(row)}
            >
              <Button danger size="small">
                Từ chối
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    });
  }

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
        { header: 'Trạng thái', accessor: (row) => row.status },
      ],
      'Phieu xuat kho noi bo',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 9"
        title="Xuất kho nội bộ"
        description={
          isStoreManager
            ? 'Tạo yêu cầu xuất hàng cho chi nhánh của bạn. Trạng thái phiếu sẽ là "Chờ duyệt" cho tới khi Thủ kho xác nhận.'
            : 'Luân chuyển hàng hoá từ Kho Tổng tới các cửa hàng bán lẻ. Tồn kho hai đầu cập nhật ngay khi xuất.'
        }
        extra={
          <Space wrap>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {scoped.length} phiếu
            </Tag>
            {isApprover && pendingCount > 0 && (
              <Tag color="gold" className="tag-no-margin">
                {pendingCount} phiếu chờ duyệt
              </Tag>
            )}

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormOpen(true)}
            >
              {isStoreManager ? 'Tạo yêu cầu xuất' : 'Lập phiếu xuất'}
            </Button>
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
            setStatusFilter(null);
          }}
        />

        <Table<StockTransfer>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: isApprover ? 1770 : 1600 }}
          expandable={{ expandedRowRender: renderDetail, columnWidth: 44 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu luân chuyển`,
          }}
        />
      </Card>

      <TransferFormModal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        initialStatus={isStoreManager ? DOCUMENT_STATUS.Pending : DOCUMENT_STATUS.Completed}
      />
    </>
  );
};

/** Map trạng thái phiếu sang nhãn tiếng Việt (mirror commonTypes nhưng gọn). */
function labelOfStatus(status: DocumentStatus): string {
  switch (status) {
    case DOCUMENT_STATUS.Draft:
      return 'Nháp';
    case DOCUMENT_STATUS.Pending:
      return 'Chờ duyệt';
    case DOCUMENT_STATUS.Approved:
      return 'Đã duyệt';
    case DOCUMENT_STATUS.Completed:
      return 'Hoàn tất';
    case DOCUMENT_STATUS.Cancelled:
      return 'Đã huỷ';
    case DOCUMENT_STATUS.Balanced:
      return 'Đã cân bằng';
    default:
      return status;
  }
}
