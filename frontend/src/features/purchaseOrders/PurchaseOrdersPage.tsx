import { useMemo, useState, type FC, type ReactElement } from 'react';
import { isInitialLoading } from '@/utils/tableLoading';
import {
  App as AntdApp,
  Button,
  Card,
  Descriptions,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPurchaseOrders,
  purchaseReceived,
} from '@/store/slices/purchaseSlice';
import { fetchStock } from '@/store/slices/stockSlice';
import { phieuNhapApi } from '@/api/phieuNhap';
import { chiTietPhieuNhapApi, type ChiTietPhieuNhapDTO } from '@/api/chiTietPhieuNhap';
import {
  DOCUMENT_STATUS,
  DOCUMENT_STATUS_LABEL,
  USER_ROLE,
  type DocumentStatus,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { compareDateDescWithId, formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { PurchaseFormModal } from './components/PurchaseFormModal';
import './PurchaseOrdersPage.css';

const { Text } = Typography;

/**
 * Module 8 — Nhập kho từ nhà cung cấp.
 *
 * Mỗi dòng là một phiếu nhập; mở rộng dòng để xem chi tiết mặt hàng và hạn dùng
 * từng lô. Hàng luôn nhập vào Kho Tổng (BR-05) nên không có cột chọn chi nhánh.
 *
 * Luồng 2 bước: Thủ kho lập phiếu → "Chờ thanh toán" (chưa cộng tồn);
 * Kế toán kiểm tra và bấm "Thanh toán" → trả NCC + cộng tồn Kho Tổng → "Hoàn tất".
 */
export const PurchaseOrdersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const user = useAppSelector((state) => state.auth.user);
  const { orders, loading } = useAppSelector((state) => state.purchase);
  const suppliers = useAppSelector((state) => state.supplier.suppliers);
  const products = useAppSelector((state) => state.product.products);
  const branches = useAppSelector((state) => state.branch.branches);
  const [paying, setPaying] = useState<string | null>(null); // orderId đang thanh toán

  // Enrich orders: thêm tên NCC + tên kho
  const enrichedOrders = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        supplierName: o.supplierName || suppliers.find((s) => s.id === o.supplierId)?.name || '',
        branchName: o.branchName || branches.find((b) => b.id === o.branchId)?.name || '',
      })),
    [orders, suppliers, branches],
  );

  // Debug tạm thời

  // Cache chi tiết phiếu nhập theo orderId
  const [detailsCache, setDetailsCache] = useState<Record<string, ChiTietPhieuNhapDTO[]>>({});

  const loadDetails = async (orderId: string) => {
    if (detailsCache[orderId] !== undefined) return;
    try {
      const data = await chiTietPhieuNhapApi.getByPhieuNhap(orderId);
      setDetailsCache((prev) => ({ ...prev, [orderId]: data }));
    } catch {
      setDetailsCache((prev) => ({ ...prev, [orderId]: [] }));
    }
  };

  // Lazy loading will be handled by loadDetails when expanding a row

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [dispatch]);

  /** Thủ kho chỉ lập phiếu NCC tại Kho Tổng được gán cho chính mình. */
  const assignedBranch = branches.find((branch) => branch.id === user?.branchId);
  const canCreate = user?.role === USER_ROLE.Admin
    || (user?.role === USER_ROLE.WarehouseKeeper
      && assignedBranch?.kind === 'DISTRIBUTION_CENTER');
  const [isFormOpen, setFormOpen] = useState(false);

  /** Chỉ Kế toán (và Admin) được bấm "Thanh toán" trả NCC. */
  /** Kế toán (và Admin) được bấm "Thanh toán" trả NCC. */
  const isPayer =
    user?.role === USER_ROLE.Accountant || user?.role === USER_ROLE.Admin;
  /** Thủ kho (và Admin) được bấm "Đã nhận hàng". */
  const canReceive =
    user?.role === USER_ROLE.WarehouseKeeper || user?.role === USER_ROLE.Admin;

  const isAwaitingPayment = (status: DocumentStatus): boolean =>
    status === DOCUMENT_STATUS.PendingPayment;

  const [receiving, setReceiving] = useState<string | null>(null);

  /**
   * Bước 2: Kế toán bấm Thanh toán: ghi nhận chi tiền trả NCC,
   * chuyển PENDING_PAYMENT → PENDING ("Chờ nhận hàng").
   * Chưa cộng tồn kho và chưa tạo lô hàng.
   */
  const handlePay = async (order: PurchaseOrder): Promise<void> => {
    if (user === null) return;
    setPaying(order.id);
    try {
      const updated = await phieuNhapApi.pay(order.id);
      const details = detailsCache[order.id] ?? [];
      const withLines: PurchaseOrder = {
        ...order,
        status: DOCUMENT_STATUS.Pending,
        paidAmount: updated.daThanhToan ?? order.grandTotal,
        lines: details.map((d) => {
          const product = products.find((p) => p.id === d.idSanPham);
          return {
            id: d.id,
            productId: d.idSanPham,
            sku: product?.sku ?? '',
            productName: product?.name ?? '',
            unit: product?.unit ?? '',
            orderedQuantity: d.soLuongDat,
            receivedQuantity: d.soLuongNhan,
            unitCost: d.donGiaNhap,
            vatPercent: d.vatPhantram,
            lineTotal: d.thanhTien,
            expiryDate: d.hanSuDung ?? null,
          } as PurchaseOrderLine;
        }),
      };
      dispatch(purchaseReceived({ order: withLines, performedBy: user.fullName }));
      message.success(
        `Đã thanh toán ${formatVND(order.grandTotal)} cho phiếu ${order.code}. Phiếu chuyển sang trạng thái "Chờ nhận hàng".`,
      );
      dispatch(fetchPurchaseOrders());
    } catch (e) {
      message.error((e as Error).message || 'Lỗi thanh toán phiếu nhập');
    } finally {
      setPaying(null);
    }
  };

  /**
   * Bước 3: Thủ kho bấm "Đã nhận hàng" khi xe giao đến kho:
   * Backend lấy ngày nhận là hôm nay, tự động cộng tồn kho Kho Tổng
   * và tính hạn sử dụng các lô hàng: ngày nhận + han_su_dung_ngay.
   */
  const handleReceive = async (order: PurchaseOrder): Promise<void> => {
    if (user === null) return;
    setReceiving(order.id);
    try {
      await phieuNhapApi.receive(order.id);
      message.success(
        `Nhận hàng thành công cho phiếu ${order.code}! Tồn kho Kho Tổng đã tăng và hạn sử dụng các lô hàng đã được tính từ ngày hôm nay.`,
      );
      dispatch(fetchPurchaseOrders());
      dispatch(fetchStock());
    } catch (e) {
      message.error((e as Error).message || 'Lỗi nhận hàng phiếu nhập');
    } finally {
      setReceiving(null);
    }
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      enrichedOrders.filter((order) => {
        const matchSearch = matchKeyword(search, [
          order.code,
          order.supplierName,
          order.createdBy,
        ]);
        const matchStatus = statusFilter === null || order.status === statusFilter;
        const matchSupplier =
          supplierFilter === null || order.supplierId === supplierFilter;
        return matchSearch && matchStatus && matchSupplier;
      }).sort((a, b) => compareDateDescWithId(a, b, (row) => row.orderDate)),
    [enrichedOrders, search, statusFilter, supplierFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const completed = orders.filter(
      (order) => order.status === DOCUMENT_STATUS.Completed,
    );
    const pending = orders.filter(
      (order) =>
        order.status === DOCUMENT_STATUS.Pending ||
        order.status === DOCUMENT_STATUS.PendingPayment ||
        order.status === DOCUMENT_STATUS.Draft,
    );
    const totalValue = completed.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalItems = completed.reduce(
      (sum, order) =>
        sum + order.lines.reduce((count, line) => count + line.receivedQuantity, 0),
      0,
    );

    return [
      {
        key: 'orders',
        title: 'Tổng phiếu nhập',
        value: formatNumber(orders.length),
        suffix: 'phiếu',
        color: BRAND.primaryRed,
      },
      {
        key: 'value',
        title: 'Giá trị đã nhập kho',
        value: formatVND(totalValue),
      },
      {
        key: 'items',
        title: 'Số lượng hàng đã nhận',
        value: formatNumber(totalItems),
        suffix: 'đơn vị',
      },
      {
        key: 'pending',
        title: 'Phiếu chờ xử lý',
        value: formatNumber(pending.length),
        suffix: 'phiếu',
        color: BRAND.warning,
      },
    ];
  }, [orders]);

  const filters: ToolbarFilter[] = [
    {
      key: 'supplier',
      placeholder: 'Nhà cung cấp',
      value: supplierFilter,
      onChange: setSupplierFilter,
      options: suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
      span: 6,
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
      span: 5,
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
      title: 'Số mặt hàng',
      width: 110,
      align: 'center',
      render: (_: any, row: any) => {
        const details = detailsCache[row.id];
        if (details === undefined) return <Text type="secondary">...</Text>;
        if (details.length === 0) return <Text type="secondary">—</Text>;
        return <Tag color="blue">{details.length}</Tag>;
      },
    },
    {
      title: 'Số lượng nhận',
      width: 120,
      align: 'right',
      render: (_: any, row: any) => {
        const details = detailsCache[row.id];
        if (details === undefined) return <Text type="secondary">...</Text>;
        if (details.length === 0) return <Text type="secondary">—</Text>;
        const total = details.reduce((sum, d) => sum + (d.soLuongNhan || 0), 0);
        return <Text strong>{formatNumber(total)}</Text>;
      },
    },
    {
      title: 'Ngày nhập kho',
      dataIndex: 'orderDate',
      width: 125,
      sorter: (a, b) => a.orderDate.localeCompare(b.orderDate),
      defaultSortOrder: 'descend',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Tiền hàng',
      dataIndex: 'subTotal',
      align: 'right',
      width: 130,
      render: (value: number) => (
        <Text className="numeric-cell">{formatVND(value)}</Text>
      ),
    },
    {
      title: 'Thuế VAT',
      dataIndex: 'vatTotal',
      align: 'right',
      width: 120,
      render: (value: number) => (
        <Text className="numeric-cell">{formatVND(value)}</Text>
      ),
    },
    {
      title: 'Tổng đã trả',
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
      title: 'Người nhập',
      dataIndex: 'createdBy',
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
      width: 150,
      render: (status: DocumentStatus) => {
        if (status === DOCUMENT_STATUS.Pending) {
          return <Tag color="blue">Chờ nhận hàng</Tag>;
        }
        return <DocumentStatusTag status={status} />;
      },
    },
    ...((isPayer || canReceive)
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'center' as const,
            width: 160,
            fixed: 'right' as const,
            render: (_: unknown, row: PurchaseOrder) => {
              if (isAwaitingPayment(row.status) && isPayer) {
                return (
                  <Popconfirm
                    title="Thanh toán phiếu nhập cho NCC?"
                    description={
                      <span>
                        Trả <strong>{formatVND(row.grandTotal)}</strong>. Phiếu
                        chuyển sang trạng thái "Chờ nhận hàng" và lập phiếu chi
                        sổ quỹ.
                      </span>
                    }
                    okText="Xác nhận thanh toán"
                    cancelText="Đóng"
                    onConfirm={() => void handlePay(row)}
                  >
                    <Button
                      type="primary"
                      size="small"
                      loading={paying === row.id}
                      disabled={paying !== null || receiving !== null}
                    >
                      Thanh toán
                    </Button>
                  </Popconfirm>
                );
              }

              if (row.status === DOCUMENT_STATUS.Pending && canReceive) {
                return (
                  <Popconfirm
                    title="Xác nhận đã nhận hàng về kho?"
                    description="Ghi nhận ngày nhận là hôm nay, tự động cộng tồn kho Kho Tổng và tính hạn sử dụng các lô hàng theo từng sản phẩm."
                    okText="Đã nhận hàng"
                    cancelText="Đóng"
                    onConfirm={() => void handleReceive(row)}
                  >
                    <Button
                      type="primary"
                      size="small"
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      loading={receiving === row.id}
                      disabled={paying !== null || receiving !== null}
                    >
                      Đã nhận hàng
                    </Button>
                  </Popconfirm>
                );
              }

              return null;
            },
          } as ColumnsType<PurchaseOrder>[number],
        ]
      : []),
  ];

  /** Bảng chi tiết mặt hàng khi mở rộng một phiếu nhập. */
  const renderDetail = (order: PurchaseOrder): ReactElement => {
    // Load chi tiết từ cache hoặc fallback về order.lines
    const details = detailsCache[order.id] || [];
    // Map từ chi tiết DB sang PurchaseOrderLine
    const mappedLines: PurchaseOrderLine[] = details.length > 0
      ? details.map((d) => {
          const product = products.find((p) => p.id === d.idSanPham);
          return {
            id: d.id,
            productId: d.idSanPham,
            sku: product?.sku || '',
            productName: product?.name || '',
            unit: product?.unit || '',
            orderedQuantity: d.soLuongDat,
            receivedQuantity: d.soLuongNhan,
            unitCost: d.donGiaNhap,
            vatPercent: d.vatPhantram,
            lineTotal: d.thanhTien,
            expiryDate: d.hanSuDung || null,
          };
        })
      : order.lines;

    const lineColumns: ColumnsType<PurchaseOrderLine> = [
      {
        title: 'SKU',
        dataIndex: 'sku',
        width: 150,
        render: (value: string) => <span className="mono-code">{value || '—'}</span>,
      },
      { title: 'Sản phẩm', dataIndex: 'productName' },
      {
        title: 'Số lượng nhận',
        dataIndex: 'receivedQuantity',
        align: 'right',
        width: 120,
        render: (value: number, row) => (
          <Text
            strong
            className={`numeric-cell${
              value > 0 && value < row.orderedQuantity ? ' po-received-short' : ''
            }`}
          >
            {value}
            {value < row.orderedQuantity && (
              <Text type="secondary" className="po-text-12-5">
                {' '}
                / {row.orderedQuantity} đặt
              </Text>
            )}
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
        {details.length === 0 ? (
          <Text type="secondary" style={{ padding: 12, display: 'block' }}>
            Đang tải chi tiết...
          </Text>
        ) : (
          <Table<PurchaseOrderLine>
            columns={lineColumns}
            dataSource={mappedLines}
            rowKey="id"
            size="small"
            pagination={false}
          />
        )}

        <Descriptions bordered size="small" column={4}>
          <Descriptions.Item label="Tiền hàng">
            {formatVND(order.subTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Thuế VAT">
            {formatVND(order.vatTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Tổng đã trả" span={2}>
            <Text strong className="po-total-due">
              {formatVND(order.grandTotal)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Người nhập" span={2}>
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
        { header: 'Ngày nhập kho', accessor: (row) => row.orderDate },
        { header: 'Số mặt hàng', accessor: (row) => row.lines.length },
        {
          header: 'Số lượng nhận',
          accessor: (row) =>
            row.lines.reduce((sum, line) => sum + line.receivedQuantity, 0),
        },
        { header: 'Tiền hàng', accessor: (row) => row.subTotal },
        { header: 'VAT', accessor: (row) => row.vatTotal },
        { header: 'Tổng đã trả', accessor: (row) => row.grandTotal },
        { header: 'Người nhập', accessor: (row) => row.createdBy },
        { header: 'Trạng thái', accessor: (row) => DOCUMENT_STATUS_LABEL[row.status] },
      ],
      'Phieu nhap kho',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 8"
        title="Nhập kho từ nhà cung cấp"
        description="Lập phiếu nhập hàng vào Kho Tổng — lưu ở trạng thái “Chờ thanh toán”. Kế toán bấm Thanh toán thì hệ thống cộng tồn kho, ghi thẻ kho và lập phiếu chi sổ quỹ."
        extra={
          <Space wrap>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {orders.length} phiếu
            </Tag>

            {canCreate && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setFormOpen(true)}
              >
                Lập phiếu nhập
              </Button>
            )}
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, nhà cung cấp, người tạo..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setStatusFilter(null);
            setSupplierFilter(null);
          }}
        />

        <Table<PurchaseOrder>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          loading={isInitialLoading(loading, orders)}
          scroll={{ x: 1800 }}
          expandable={{
            expandedRowRender: (record) => {
              try {
                return renderDetail(record);
              } catch (e) {
                console.error('[PurchaseOrders] renderDetail error:', e);
                return <Text type="danger">Lỗi render chi tiết</Text>;
              }
            },
            columnWidth: 44,
            onExpand: (expanded, record) => {
              if (expanded) loadDetails(record.id);
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu nhập`,
          }}
        />
      </Card>

      <PurchaseFormModal open={isFormOpen} onClose={() => setFormOpen(false)} />
    </>
  );
};
