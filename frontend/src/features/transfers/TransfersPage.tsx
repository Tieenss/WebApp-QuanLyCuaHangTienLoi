import { useEffect, useMemo, useState, type FC, type ReactElement } from 'react';
import { isInitialLoading } from '@/utils/tableLoading';
import { chiTietPhieuXuatApi, type ChiTietPhieuXuatDTO } from '@/api/phieuXuatKho';
import { tonKhoApi } from '@/api/tonKho';
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRightOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchTransfers,
  rejectTransfer,
} from '@/store/slices/transferSlice';
import { fetchStock, stockOf } from '@/store/slices/stockSlice';
import { fetchProducts } from '@/store/slices/productSlice';
import { phieuXuatKhoApi } from '@/api/phieuXuatKho';
import {
  DOCUMENT_STATUS,
  USER_ROLE,
  type DocumentStatus,
  type StockTransfer,
  // type TransferLine,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { compareDateDescWithId, formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { ShipModal } from './components/ShipModal';
import { TransferFormModal } from './components/TransferFormModal';
import './TransfersPage.css';

const { Text } = Typography;

export const TransfersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const { user} = useAppSelector((state) => state.auth);
  const { transfers, loading } = useAppSelector((state) => state.transfer);
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);
  const balances = useAppSelector((state) => state.stock.balances);

  const [isFormOpen, setFormOpen] = useState(false);
  const [detailsCache, setDetailsCache] = useState<Record<string, ChiTietPhieuXuatDTO[]>>({});

  const loadDetails = async (transferId: string): Promise<ChiTietPhieuXuatDTO[]> => {
    try {
      const data = await chiTietPhieuXuatApi.getByPhieuXuat(transferId);
      setDetailsCache((prev) => ({ ...prev, [transferId]: data }));
      return data;
    } catch {
      setDetailsCache((prev) => ({ ...prev, [transferId]: [] }));
      return [];
    }
  };

  const [rejectTarget, setRejectTarget] = useState<StockTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [toFilter, setToFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | null>(null);

  const isStoreManager = user?.role === USER_ROLE.StoreManager;
  const isWarehouseKeeper = user?.role === USER_ROLE.WarehouseKeeper;
  const isApprover = user?.role === USER_ROLE.Admin || user?.role === USER_ROLE.WarehouseKeeper;
  // const branchScope = isStoreManager ? user?.branchId ?? null : null;

  useEffect(() => {
    dispatch(fetchTransfers());
    if (products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, products.length]);

  // Tự động tải chi tiết sản phẩm cho các phiếu xuất kho để hiển thị số mặt hàng, số lượng, giá trị
  useEffect(() => {
    if (!transfers || transfers.length === 0) return;
    let isCancelled = false;

    const missing = transfers.filter((t) => detailsCache[t.id] === undefined);
    if (missing.length === 0) return;

    void Promise.all(
      missing.map(async (t) => {
        try {
          const data = await chiTietPhieuXuatApi.getByPhieuXuat(t.id);
          return { id: t.id, data };
        } catch {
          return { id: t.id, data: [] };
        }
      }),
    ).then((results) => {
      if (!isCancelled) {
        setDetailsCache((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            next[r.id] = r.data;
          });
          return next;
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [transfers]);

  const enrichedTransfers = useMemo(
    () =>
      transfers.map((t) => ({
        ...t,
        fromBranchName:
          t.fromBranchName ||
          branches.find((b) => b.id === t.fromBranchId)?.name ||
          '',
        toBranchName:
          t.toBranchName ||
          branches.find((b) => b.id === t.toBranchId)?.name ||
          '',
      })),
    [transfers, branches],
  );

  const scoped = useMemo(() => {
    const list = enrichedTransfers.filter((t) => {
      if (isStoreManager && t.toBranchId !== user?.branchId) return false;
      if (isWarehouseKeeper && t.fromBranchId !== user?.branchId) return false;
      return true;
    });
    return list;
  }, [enrichedTransfers, isStoreManager, isWarehouseKeeper, user?.branchId]);

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
      }).sort((a, b) => compareDateDescWithId(a, b, (row) => row.requestDate)),
    [scoped, search, toFilter, statusFilter],
  );

  const pendingCount = useMemo(
    () => scoped.filter((t) => t.status === DOCUMENT_STATUS.Pending).length,
    [scoped],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const calculateRowValue = (t: StockTransfer): number => {
      const details = detailsCache[t.id];
      if (details && details.length > 0) {
        return details.reduce((sum, d) => {
          const qty = (d.soLuongXuat && d.soLuongXuat > 0) ? d.soLuongXuat : (d.soLuongYeuCau || 0);
          const prod = products.find((p) => p.id === d.idSanPham);
          const cost = (d.donGiaVon && d.donGiaVon > 0) ? d.donGiaVon : (prod?.costPrice || 0);
          return sum + cost * qty;
        }, 0);
      }
      return t.totalValue || 0;
    };

    const totalValue = scoped.reduce((sum, t) => sum + calculateRowValue(t), 0);
    const totalItems = scoped.reduce((sum, t) => {
      const details = detailsCache[t.id];
      return sum + (details ? details.length : (t.lines || []).length);
    }, 0);
    const pendingAmount = scoped
      .filter((t) => t.status === DOCUMENT_STATUS.Pending)
      .reduce((sum, t) => sum + calculateRowValue(t), 0);

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
  }, [scoped, filtered, pendingCount, detailsCache, products]);

  /** Bước 2 của luồng: Thủ kho bấm Duyệt → kiểm tra tồn kho trước khi mở form xác nhận. */
  const [shipTarget, setShipTarget] = useState<StockTransfer | null>(null);

  const handleApprove = async (transfer: StockTransfer): Promise<void> => {
    let details = detailsCache[transfer.id];
    if (!details) {
      try {
        details = await chiTietPhieuXuatApi.getByPhieuXuat(transfer.id);
        setDetailsCache((prev) => ({ ...prev, [transfer.id]: details }));
      } catch {
        message.error('Không tải được chi tiết phiếu');
        return;
      }
    }

    if (details.length === 0) {
      message.error('Phiếu không có dòng chi tiết — không thể xuất.');
      return;
    }

    // Lấy tồn kho thực tế từ backend để kiểm tra tức thời
    let currentStockMap: Record<string, number> = {};
    try {
      const stockList = await tonKhoApi.getByBranch(transfer.fromBranchId);
      stockList.forEach((st) => {
        currentStockMap[st.idSanPham] = st.soLuongTon ?? 0;
      });
    } catch {
      details.forEach((d) => {
        currentStockMap[d.idSanPham] = stockOf(balances, transfer.fromBranchId, d.idSanPham);
      });
    }

    // Kiểm tra từng sản phẩm yêu cầu
    for (const d of details) {
      const requested = d.soLuongYeuCau || 0;
      const currentStock = currentStockMap[d.idSanPham] ?? 0;
      if (requested > currentStock) {
        const prod = products.find((p) => p.id === d.idSanPham);
        const prodName = prod?.name || 'sản phẩm';
        message.error(
          `Tổng lượng hàng trong kho không đủ để duyệt phiếu - Tổng kho của hàng ${prodName} hiện tại: ${currentStock}`,
        );
        return;
      }
    }

    setShipTarget(transfer);
  };

  const handleOpenReject = (transfer: StockTransfer): void => {
    setRejectTarget(transfer);
    setRejectReason('Hết hàng');
  };

  const handleConfirmReject = async (): Promise<void> => {
    if (!rejectTarget || user === null) return;
    if (!rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    setRejectSubmitting(true);
    try {
      await phieuXuatKhoApi.reject(rejectTarget.id, {
        lyDo: rejectReason.trim(),
      });
      message.success(`Đã từ chối phiếu ${rejectTarget.code}`);
      dispatch(rejectTransfer({ id: rejectTarget.id, rejectedBy: `${user.fullName} (${user.employeeCode})` }));
      dispatch(fetchTransfers());
      setRejectTarget(null);
      setRejectReason('');
    } catch (e) {
      message.error((e as Error).message || 'Lỗi từ chối phiếu');
    } finally {
      setRejectSubmitting(false);
    }
  };

  /** Bước 3 của luồng: chi nhánh xác nhận đã nhận → SHIPPED thành COMPLETED. */
  const handleReceive = async (transfer: StockTransfer): Promise<void> => {
    if (user === null) return;
    try {
      await phieuXuatKhoApi.receive(transfer.id, {});
      message.success(
        `Đã nhận hàng phiếu ${transfer.code}. Tồn kho chi nhánh đã tăng theo số thực nhận.`,
      );
      void loadDetails(transfer.id);
      dispatch(fetchTransfers());
      dispatch(fetchStock());
    } catch (e) {
      message.error((e as Error).message || 'Lỗi xác nhận nhận hàng');
    }
  };

  /** Quyền bấm "Đã nhận hàng": QL đúng chi nhánh nhận, hoặc Admin. */
  const canReceive = (row: StockTransfer): boolean =>
    row.status === DOCUMENT_STATUS.Shipped &&
    (user?.role === USER_ROLE.Admin ||
      (isStoreManager && row.toBranchId === user?.branchId));

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
        if (details === undefined) return <Text type="secondary">...</Text>;
        if (details.length === 0) return <Text type="secondary">—</Text>;
        const total = details.reduce(
          (sum, d) => sum + ((d.soLuongXuat && d.soLuongXuat > 0) ? d.soLuongXuat : (d.soLuongYeuCau || 0)),
          0,
        );
        return <Text strong>{formatNumber(total)}</Text>;
      },
    },
    {
      title: 'Giá trị hàng',
      width: 130,
      align: 'right',
      render: (_, row) => {
        const details = detailsCache[row.id];
        if (details === undefined) return <Text type="secondary">...</Text>;
        if (details.length === 0) return <Text type="secondary">—</Text>;
        const total = details.reduce((sum, d) => {
          const qty = (d.soLuongXuat && d.soLuongXuat > 0) ? d.soLuongXuat : (d.soLuongYeuCau || 0);
          const prod = products.find((p) => p.id === d.idSanPham);
          const cost = (d.donGiaVon && d.donGiaVon > 0) ? d.donGiaVon : (prod?.costPrice || 0);
          return sum + cost * qty;
        }, 0);
        return <Text strong>{formatVND(total)}</Text>;
      },
    },
    {
      title: 'Ngày xuất kho',
      dataIndex: 'shippedDate',
      width: 130,
      align: 'center',
      sorter: (a, b) => (a.shippedDate || '').localeCompare(b.shippedDate || ''),
      render: (value: string | null) => (value ? formatDate(value) : <Text type="secondary">—</Text>),
    },
    {
      title: 'Người yêu cầu',
      dataIndex: 'requestedBy',
      width: 160,
      render: (value: string) => (
          <Text className="inv-text-12-5">
            {value || '—'}
          </Text>
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

  // Cột thao tác: Thủ kho/Admin thấy nút Duyệt+Từ chối (PENDING);
  // QL chi nhánh thấy nút "Đã nhận hàng" (SHIPPED).
  const canSeeActions = isApprover || isStoreManager;
  if (canSeeActions) {
    columns.push({
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 170,
      fixed: 'right',
      render: (_, row) => {
        const approving = isApprover && row.status === DOCUMENT_STATUS.Pending;
        const receiving = canReceive(row);
        if (!approving && !receiving) return null;
        return (
          <Space size={4}>
            {approving && (
              <Button type="primary" size="small" onClick={() => handleApprove(row)}>
                Duyệt
              </Button>
            )}
            {approving && (
              <Button danger size="small" onClick={() => handleOpenReject(row)}>
                Từ chối
              </Button>
            )}
            {receiving && (
              <Popconfirm
                title="Xác nhận đã nhận đủ hàng?"
                description={`Phiếu ${row.code} sẽ chuyển sang "Hoàn tất" và tồn kho ${row.toBranchName} tăng theo số thực nhận.`}
                okText="Đã nhận hàng"
                cancelText="Đóng"
                onConfirm={() => void handleReceive(row)}
              >
                <Button type="primary" size="small">
                  Đã nhận hàng
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    });
  }

  const renderDetail = (transfer: StockTransfer): ReactElement => {
    const details = detailsCache[transfer.id];
    const isLoading = details === undefined;

    if (isLoading) {
      void loadDetails(transfer.id);
    }

    const detailColumns: ColumnsType<ChiTietPhieuXuatDTO> = [
      {
        title: 'STT',
        key: 'index',
        width: 55,
        align: 'center',
        render: (_1, _2, index) => index + 1,
      },
      {
        title: 'Tên sản phẩm',
        key: 'productName',
        render: (_, d) => {
          const prod = products.find((p) => p.id === d.idSanPham);
          return (
            <div>
              <Text strong>{prod?.name || d.idSanPham}</Text>
              {prod?.sku && <div style={{ fontSize: 12, color: '#8c8c8c' }}>Mã: {prod.sku}</div>}
            </div>
          );
        },
      },
      {
        title: 'SL yêu cầu',
        dataIndex: 'soLuongYeuCau',
        key: 'soLuongYeuCau',
        width: 110,
        align: 'right',
        render: (qty: number) => <Text strong>{formatNumber(qty || 0)}</Text>,
      },
      {
        title: 'SL xuất',
        dataIndex: 'soLuongXuat',
        key: 'soLuongXuat',
        width: 110,
        align: 'right',
        render: (qty: number) => (qty && qty > 0 ? formatNumber(qty) : <Text type="secondary">—</Text>),
      },
      {
        title: 'Đơn giá vốn',
        key: 'donGiaVon',
        width: 130,
        align: 'right',
        render: (_, d) => {
          const prod = products.find((p) => p.id === d.idSanPham);
          const price = (d.donGiaVon && d.donGiaVon > 0) ? d.donGiaVon : (prod?.costPrice || 0);
          return formatVND(price);
        },
      },
      {
        title: 'Thành tiền',
        key: 'thanhTien',
        width: 140,
        align: 'right',
        render: (_, d) => {
          const prod = products.find((p) => p.id === d.idSanPham);
          const price = (d.donGiaVon && d.donGiaVon > 0) ? d.donGiaVon : (prod?.costPrice || 0);
          const qty = (d.soLuongXuat && d.soLuongXuat > 0) ? d.soLuongXuat : (d.soLuongYeuCau || 0);
          return <Text strong>{formatVND(price * qty)}</Text>;
        },
      },
      {
        title: 'Hạn sử dụng',
        dataIndex: 'hanSuDung',
        key: 'hanSuDung',
        width: 120,
        align: 'center',
        render: (hsd: string) => (hsd ? <Tag color="green">{formatDate(hsd)}</Tag> : <Text type="secondary">—</Text>),
      },
    ];

    return (
      <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Kho xuất">{transfer.fromBranchName}</Descriptions.Item>
          <Descriptions.Item label="Cửa hàng nhận">{transfer.toBranchName}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái"><DocumentStatusTag status={transfer.status} /></Descriptions.Item>
          <Descriptions.Item label="Ngày yêu cầu">{formatDate(transfer.requestDate)}</Descriptions.Item>
          <Descriptions.Item label="Ngày xuất kho">
            {transfer.shippedDate ? formatDate(transfer.shippedDate) : <Text type="secondary">— (Chưa xuất kho)</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Người yêu cầu">{transfer.requestedBy || transfer.createdByName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú" span={3}>
            {transfer.note ? (
              <Text strong style={{ color: transfer.status === DOCUMENT_STATUS.Cancelled ? '#cf1322' : 'inherit' }}>
                {transfer.note}
              </Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginBottom: 6 }}>
          <Text strong>
            Danh sách sản phẩm xuất kho {isLoading ? '(đang tải...)' : `(${details?.length || 0} mặt hàng)`}:
          </Text>
        </div>
        <Table<ChiTietPhieuXuatDTO>
          columns={detailColumns}
          dataSource={details || []}
          rowKey={(r) => r.id || r.idSanPham}
          size="small"
          pagination={false}
          bordered
          loading={isLoading}
        />
      </div>
    );
  };

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
        { header: 'Người yêu cầu', accessor: (row) => row.requestedBy || row.createdByName || '', },
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
          searchPlaceholder="Tìm theo mã phiếu, cửa hàng nhận, người yêu cầu..."
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
          loading={isInitialLoading(loading, transfers)}
          scroll={{ x: canSeeActions ? 2200 : 2050 }}
          expandable={{
            expandedRowRender: renderDetail,
            columnWidth: 44,
            onExpand: (expanded, record) => {
              if (expanded && detailsCache[record.id] === undefined) {
                void loadDetails(record.id);
              }
            },
          }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `${total} phiếu luân chuyển`,
          }}
        />
      </Card>
      <TransferFormModal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        initialStatus={user?.role === USER_ROLE.Admin ? DOCUMENT_STATUS.Completed : DOCUMENT_STATUS.Pending}
      />
      <ShipModal
        open={shipTarget !== null}
        transfer={shipTarget}
        onClose={() => {
          if (shipTarget) {
            void loadDetails(shipTarget.id);
          }
          setShipTarget(null);
        }}
      />
      <Modal
        open={rejectTarget !== null}
        title={`Từ chối yêu cầu xuất kho - ${rejectTarget?.code}`}
        okText="Gửi"
        cancelText="Huỷ"
        okButtonProps={{ danger: true, loading: rejectSubmitting }}
        onOk={handleConfirmReject}
        onCancel={() => {
          setRejectTarget(null);
          setRejectReason('');
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text>
            Vui lòng điền lý do từ chối yêu cầu xuất kho sang <strong>{rejectTarget?.toBranchName}</strong>:
          </Text>
        </div>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối (ví dụ: Hết hàng trong kho tổng, không đủ số lượng tồn...)"
          maxLength={255}
          showCount
        />
      </Modal>
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
    case DOCUMENT_STATUS.Shipped:
      return 'Chờ nhận hàng';
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
