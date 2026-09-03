import { useEffect, useMemo, useState, type FC, type ReactElement } from 'react';
import { chiTietPhieuXuatApi, type ChiTietPhieuXuatDTO } from '@/api/phieuXuatKho';
import { nhanVienApi, type NhanVienDTO } from '@/api/nhanVien';
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
  fetchTransfers,
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

export const TransfersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const { transfers, loading } = useAppSelector((state) => state.transfer);
  const branches = useAppSelector((state) => state.branch.branches);

  const [isFormOpen, setFormOpen] = useState(false);
  const [detailsCache, setDetailsCache] = useState<Record<string, ChiTietPhieuXuatDTO[]>>({});
  const [usersCache, setUsersCache] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [toFilter, setToFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | null>(null);

  const isStoreManager = user?.role === USER_ROLE.StoreManager;
  const isApprover = user?.role === USER_ROLE.Admin || user?.role === USER_ROLE.WarehouseKeeper;
  const branchScope = isStoreManager ? user?.branchId ?? null : null;

  useEffect(() => {
    dispatch(fetchTransfers());
  }, [dispatch]);

  const enrichedTransfers = useMemo(
    () =>
      transfers.map((t) => ({
        ...t,
        fromBranchName: t.fromBranchName || branches.find((b) => b.id === t.fromBranchId)?.name || '',
        toBranchName: t.toBranchName || branches.find((b) => b.id === t.toBranchId)?.name || '',
        createdByName: usersCache[t.createdById] || '',
      })),
    [transfers, branches, usersCache],
  );

  useEffect(() => {
    transfers.forEach((t) => {
      if (detailsCache[t.id] === undefined) {
        chiTietPhieuXuatApi.getByPhieuXuat(t.id)
          .then((data) => setDetailsCache((prev) => ({ ...prev, [t.id]: data })))
          .catch(() => setDetailsCache((prev) => ({ ...prev, [t.id]: [] })));
      }
      if (t.createdById && !usersCache[t.createdById]) {
        nhanVienApi.getById(t.createdById)
          .then((nv) => setUsersCache((prev) => ({ ...prev, [t.createdById]: nv.hoTen })))
          .catch(() => setUsersCache((prev) => ({ ...prev, [t.createdById]: '' })));
      }
    });
  }, [transfers.length]);

  const scoped = useMemo(() => {
    const allowed = user?.allowedBranchIds ?? [];
    const list = enrichedTransfers.filter((t) => {
      if (isStoreManager && t.toBranchId !== user?.branchId) return false;
      if (allowed.length > 0 && !allowed.includes(t.toBranchId)) return false;
      return true;
    });
    return list;
  }, [enrichedTransfers, isStoreManager, user]);

  const filtered = useMemo(
    () =>
      scoped.filter((transfer) => {
        const matchSearch = matchKeyword(search, [
          transfer.code,
          transfer.toBranchName,
          transfer.requestedBy,
        ]);
        const matchTo = toFilter === null || transfer.toBranchId === toFilter;
        const matchStatus = statusFilter === null || transfer.status === statusFilter;
        return matchSearch && matchTo && matchStatus;
      }),
    [scoped, search, toFilter, statusFilter],
  );

  const pendingCount = useMemo(
    () => scoped.filter((t) => t.status === DOCUMENT_STATUS.Pending).length,
    [scoped],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const totalValue = scoped.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    const totalItems = scoped.reduce((sum, t) => sum + (t.lines || []).length, 0);
    const pendingAmount = scoped
      .filter((t) => t.status === DOCUMENT_STATUS.Pending)
      .reduce((sum, t) => sum + (t.totalValue || 0), 0);
    const servedBranches = new Set(scoped.map((t) => t.toBranchId));
    return [
      {
        key: 'orders',
        title: 'Tổng phiếu luân chuyển',
        value: formatNumber(scoped.length),
        suffix: `/ ${filtered.length} hiển thị`,
        color: BRAND.primaryRed,
      },
      {
        key: 'value',
        title: 'Tổng giá trị hàng',
        value: formatVND(totalValue),
        color: BRAND.success,
      },
      {
        key: 'items',
        title: 'Tổng mặt hàng',
        value: formatNumber(totalItems),
        suffix: 'dòng hàng',
      },
      {
        key: 'pending',
        title: 'Đang chờ duyệt',
        value: formatVND(pendingAmount),
        suffix: `${pendingCount} phiếu`,
        color: BRAND.warning,
      },
    ];
  }, [scoped, filtered, pendingCount]);

  const handleApprove = (transfer: StockTransfer): void => {
    if (user === null) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/phieu-xuat-kho/${transfer.id}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
      },
      body: JSON.stringify({ idNguoiDuyet: user.id }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Lỗi duyệt');
        message.success('Đã duyệt phiếu xuất kho');
        dispatch(fetchTransfers());
        dispatch(approveTransfer({ id: transfer.id, approvedBy: `${user.fullName} (${user.employeeCode})`, approvedDate: today() }));
      })
      .catch((e) => message.error(e.message || 'Lỗi duyệt phiếu'));
  };

  const handleReject = (transfer: StockTransfer): void => {
    if (user === null) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/phieu-xuat-kho/${transfer.id}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token') ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}),
      },
      body: JSON.stringify({ idNguoiDuyet: user.id }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Lỗi từ chối');
        message.success(`Đã từ chối phiếu ${transfer.code}`);
        dispatch(fetchTransfers());
        dispatch(rejectTransfer({ id: transfer.id, rejectedBy: `${user.fullName} (${user.employeeCode})` }));
      })
      .catch((e) => message.error(e.message || 'Lỗi từ chối phiếu'));
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
        <Space size={4} className="transfer-route">
          <Tag color="purple">{row.fromBranchName}</Tag>
          <ArrowRightOutlined className="transfer-route-arrow" />
          <Tag color="red">{row.toBranchName}</Tag>
        </Space>
      ),
    },
    {
      title: 'Số mặt hàng',
      width: 110,
      align: 'center',
      render: (_, row) => {
        const details = detailsCache[row.id];
        if (details === undefined) return <Text type="secondary">...</Text>;
        if (details.length === 0) return <Text type="secondary">—</Text>;
        return <Tag color="blue">{details.length} món</Tag>;
      },
    },
    {
      title: 'Tổng số lượng',
      width: 110,
      align: 'right',
      render: (_, row) => {
        const details = detailsCache[row.id];
        if (details === undefined || details.length === 0) return <Text type="secondary">—</Text>;
        const total = details.reduce((sum, d) => sum + (d.soLuongXuat || 0), 0);
        return <Text strong>{formatNumber(total)}</Text>;
      },
    },
    {
      title: 'Giá trị hàng',
      width: 130,
      align: 'right',
      render: (_, row) => {
        const details = detailsCache[row.id];
        if (details === undefined || details.length === 0) return <Text type="secondary">—</Text>;
        const total = details.reduce(
          (sum, d) => sum + (d.donGiaVon || 0) * (d.soLuongXuat || 0),
          0,
        );
        return <Text strong>{formatVND(total)}</Text>;
      },
    },
    {
      title: 'Ngày xuất kho',
      dataIndex: 'requestDate',
      width: 125,
      sorter: (a, b) => a.requestDate.localeCompare(b.requestDate),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Người yêu cầu',
      width: 160,
      render: (_, row) => {
        const ten = (row as any).createdByName || usersCache[(row as any).createdById] || '—';
        return <Text className="inv-text-12-5">{ten}</Text>;
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
    const details = detailsCache[transfer.id] || [];
    const lineColumns: ColumnsType<TransferLine> = [
      {
        title: 'Sản phẩm',
        dataIndex: 'productId',
        render: (value: string) => {
          const product = products.find((p) => p.id === value);
          return product ? product.name : value;
        },
      },
      { title: 'Số lượng yêu cầu', dataIndex: 'requestedQuantity' },
      { title: 'Số lượng xuất', dataIndex: 'shippedQuantity' },
      { title: 'Số lượng nhận', dataIndex: 'receivedQuantity' },
      { title: 'Đơn giá vốn', dataIndex: 'unitCost', render: (v: number) => formatVND(v) },
      { title: 'Thành tiền', dataIndex: 'lineTotal', render: (v: number) => formatVND(v) },
    ];
    return (
      <Descriptions bordered size="small" column={3}>
        <Descriptions.Item label="Kho xuất">{transfer.fromBranchName}</Descriptions.Item>
        <Descriptions.Item label="Cửa hàng nhận">{transfer.toBranchName}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái"><DocumentStatusTag status={transfer.status} /></Descriptions.Item>
        <Descriptions.Item label="Số dòng hàng" span={3}>
          {details.length === 0 ? '—' : `${details.length} dòng`}
        </Descriptions.Item>
      </Descriptions>
    );
  };

  const products = useAppSelector((state) => state.product.products);

  const filters: ToolbarFilter[] = [
    {
      key: 'to',
      placeholder: 'Cửa hàng nhận',
      value: toFilter,
      onChange: setToFilter,
      options: branches.map((b) => ({ value: b.id, label: b.name })),
      span: 6,
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter as (v: string | null) => void,
      options: Object.values(DOCUMENT_STATUS).map((s) => ({ value: s, label: labelOfStatus(s) })),
    },
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã phiếu', accessor: (row) => row.code },
        { header: 'Kho xuất', accessor: (row) => row.fromBranchName },
        { header: 'Cửa hàng nhận', accessor: (row) => row.toBranchName },
        { header: 'Ngày xuất kho', accessor: (row) => row.requestDate },
        { header: 'Số mặt hàng', accessor: (row) => (row.lines || []).length },
        {
          header: 'Tổng số lượng',
          accessor: (row) => (row.lines || []).reduce((sum, line) => sum + line.shippedQuantity, 0),
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
          loading={loading}
          scroll={{ x: isApprover ? 2200 : 2050 }}
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