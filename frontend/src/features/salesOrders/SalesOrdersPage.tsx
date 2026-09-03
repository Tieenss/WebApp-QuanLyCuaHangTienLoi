import { useEffect, useMemo, useState, type FC } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RollbackOutlined, StopOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { OrderStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  orderCancelled,
  orderRefunded,
  setSelectedOrder,
} from '@/store/slices/salesOrderSlice';
import { hoaDonApi, type HoaDonDTO } from '@/api/hoaDon';
import { chiTietHoaDonApi } from '@/api/chiTietHoaDon';
import {
  ORDER_STATUS,
  PAYMENT_METHOD_LABEL,
  USER_ROLE,
  type PaymentMethod,
  type SalesOrder,
} from '@/types';
import { formatDate, formatTime, today } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { OrderDetailDrawer } from './components/OrderDetailDrawer';
import './SalesOrdersPage.css';

const { Text } = Typography;

/** Map HoaDonDTO (backend) → SalesOrder (frontend). Lines nạp riêng nếu cần. */
const mapDtoToOrder = (dto: HoaDonDTO, branchName: string, cashierName: string): SalesOrder => ({
  id: dto.id,
  code: dto.maHoaDon ?? '',
  branchId: dto.idChiNhanh,
  branchName,
  cashierId: dto.idThuNgan,
  cashierName,
  shiftCode: dto.caLamViec ?? 'MORNING',
  soldAt: dto.ngayBan ?? '',
  lines: [],
  subTotal: dto.subTotal ?? 0,
  discountTotal: dto.giamGia ?? 0,
  vatTotal: dto.vatTotal ?? 0,
  grandTotal: dto.grandTotal ?? 0,
  paymentMethod: (dto.hinhThucTt ?? 'CASH') as PaymentMethod,
  tenderedAmount: dto.tienKhachDua ?? 0,
  changeAmount: dto.tienThoi ?? 0,
  status: (dto.trangThai ?? 'COMPLETED') as SalesOrder['status'],
  memberPhone: dto.sdtThanhVien ?? null,
  note: dto.ghiChu ?? '',
});

/**
 * Module — Lịch sử hoá đơn bán hàng.
 *
 * Bảng danh sách toàn bộ hoá đơn đã chốt. Phạm vi dữ liệu theo vai trò:
 * - Admin / Kế toán: xem tất cả chi nhánh.
 * - Quản lý chi nhánh: chỉ thấy hoá đơn của chi nhánh mình.
 * - Thu ngân: chỉ thấy hoá đơn do chính mình lập.
 * - Thủ kho: không có quyền truy cập.
 *
 * Click vào một dòng → mở Drawer chi tiết (OrderDetailDrawer) với danh sách
 * `OrderLine` đầy đủ.
 */
export const SalesOrdersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const user = useAppSelector((state) => state.auth.user);
  const sessionOrders = useAppSelector((state) => state.salesOrder.orders);
  const branches = useAppSelector((state) => state.branch.branches);
  const employees = useAppSelector((state) => state.employee.employees);
  const products = useAppSelector((state) => state.product.products);
  const selectedOrderId = useAppSelector(
    (state) => state.salesOrder.selectedOrderId,
  );

  const isStoreManager = user?.role === USER_ROLE.StoreManager;
  const isCashier = user?.role === USER_ROLE.Cashier;
  const branchScope = isStoreManager ? user?.branchId ?? null : null;
  const cashierScope = isCashier ? user?.employeeCode ?? null : null;
  /**
   * Chỉ Thu ngân và Quản lý chi nhánh mới được hoàn tiền — Admin và Kế toán
   * không trực tiếp thao tác két, chỉ giám sát qua sổ quỹ / báo cáo.
   */
  const canRefund = isStoreManager || isCashier;

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [apiOrders, setApiOrders] = useState<SalesOrder[]>([]);

  // Nạp hoá đơn từ DB (hoa_don) khi vào trang — hợp nhất với đơn trong session.
  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const list = await hoaDonApi.getAll();
        if (cancelled) return;
        const branchNameOf = (id: string) =>
          branches.find((b) => b.id === id)?.name ?? '';
        const cashierNameOf = (id: string) =>
          employees.find((e) => e.id === id)?.fullName ?? 'Thu ngân';
        setApiOrders(list.map((d) => mapDtoToOrder(d, branchNameOf(d.idChiNhanh), cashierNameOf(d.idThuNgan))));
      } catch {
        // im lặng — vẫn hiện đơn trong session
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, employees.length]);

  // Hợp nhất: API (DB) + session (đơn vừa bán chưa load lại trang).
  const orders = useMemo(() => {
    const seen = new Set(sessionOrders.map((o) => o.code));
    const merged = [...sessionOrders, ...apiOrders.filter((o) => !seen.has(o.code))];
    return merged.sort((a, b) => b.soldAt.localeCompare(a.soldAt));
  }, [sessionOrders, apiOrders]);

  /** Lọc theo phạm vi dữ liệu của vai trò trước, rồi mới đến filter UI. */
  const scoped = useMemo(
    () =>
      orders.filter((order) => {
        if (branchScope !== null && order.branchId !== branchScope) return false;
        if (cashierScope !== null && order.cashierId !== cashierScope) return false;
        return true;
      }),
    [orders, branchScope, cashierScope],
  );

  const filtered = useMemo(
    () =>
      scoped.filter((order) => {
        const matchSearch = matchKeyword(search, [
          order.code,
          order.cashierName,
          order.memberPhone ?? '',
        ]);
        const matchBranch =
          branchFilter === null || order.branchId === branchFilter;
        const matchPayment =
          paymentFilter === null || order.paymentMethod === paymentFilter;
        const matchStatus =
          statusFilter === null || order.status === statusFilter;
        return matchSearch && matchBranch && matchPayment && matchStatus;
      }),
    [scoped, search, branchFilter, paymentFilter, statusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const totalRevenue = scoped.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalItems = scoped.reduce(
      (sum, order) =>
        sum + order.lines.reduce((count, line) => count + line.quantity, 0),
      0,
    );
    const refunded = scoped.filter(
      (order) => order.status === 'REFUNDED',
    ).length;
    return [
      {
        key: 'count',
        title: 'Tổng hoá đơn',
        value: formatNumber(scoped.length),
        suffix: 'đơn',
        color: BRAND.primaryRed,
      },
      {
        key: 'revenue',
        title: 'Doanh thu',
        value: formatVND(totalRevenue),
      },
      {
        key: 'items',
        title: 'Số lượng bán ra',
        value: formatNumber(totalItems),
        suffix: 'đơn vị',
      },
      {
        key: 'refunded',
        title: 'Đã hoàn tiền',
        value: formatNumber(refunded),
        suffix: 'đơn',
        color: BRAND.warning,
      },
    ];
  }, [scoped]);

  const branchOptions = useMemo(() => {
    const ids = Array.from(new Set(scoped.map((o) => o.branchId)));
    return ids
      .map((id) => {
        const name = scoped.find((o) => o.branchId === id)?.branchName ?? id;
        return { value: id, label: name };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [scoped]);

  const filters: ToolbarFilter[] = [
    ...(branchScope === null
      ? [
          {
            key: 'branch',
            placeholder: 'Chi nhánh',
            value: branchFilter,
            onChange: setBranchFilter,
            options: branchOptions,
            span: 6,
          } as ToolbarFilter,
        ]
      : []),
    {
      key: 'payment',
      placeholder: 'Phương thức thanh toán',
      value: paymentFilter,
      onChange: setPaymentFilter,
      options: (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map(
        (method) => ({
          value: method,
          label: PAYMENT_METHOD_LABEL[method],
        }),
      ),
      span: 6,
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'COMPLETED', label: 'Hoàn tất' },
        { value: 'REFUNDED', label: 'Đã hoàn tiền' },
        { value: 'CANCELLED', label: 'Đã huỷ' },
      ],
      span: 5,
    },
  ];

  const columns: ColumnsType<SalesOrder> = [
    {
      title: 'Mã hoá đơn',
      dataIndex: 'code',
      width: 175,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Thời gian',
      key: 'soldAt',
      width: 145,
      sorter: (a, b) => a.soldAt.localeCompare(b.soldAt),
      defaultSortOrder: 'descend',
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text className="so-time-date">{formatDate(row.soldAt)}</Text>
          <Text type="secondary" className="so-time-hhmm">
            {formatTime(row.soldAt)}
          </Text>
        </Space>
      ),
    },
    ...(branchScope === null
      ? [
          {
            title: 'Chi nhánh',
            dataIndex: 'branchName',
            width: 200,
            render: (value: string) => (
              <Text className="so-text-12-5">{value}</Text>
            ),
          } as ColumnsType<SalesOrder>[number],
        ]
      : []),
    {
      title: 'Thu ngân',
      dataIndex: 'cashierName',
      width: 180,
      render: (value: string) => <Text className="so-text-12-5">{value}</Text>,
    },
    {
      title: 'Mặt hàng',
      key: 'lineCount',
      align: 'center',
      width: 95,
      render: (_, row) => (
        <Text className="numeric-cell">{row.lines.length}</Text>
      ),
    },
    {
      title: 'Tổng SL',
      key: 'totalQuantity',
      align: 'right',
      width: 95,
      render: (_, row) => (
        <Text className="numeric-cell">
          {formatNumber(
            row.lines.reduce((sum, line) => sum + line.quantity, 0),
          )}
        </Text>
      ),
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentMethod',
      width: 150,
      render: (method: PaymentMethod) => (
        <Tag color="blue" className="tag-no-margin">
          {PAYMENT_METHOD_LABEL[method]}
        </Tag>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'grandTotal',
      align: 'right',
      width: 145,
      sorter: (a, b) => a.grandTotal - b.grandTotal,
      render: (value: number) => (
        <Text strong className="numeric-cell so-grand-total">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 120,
      fixed: 'right',
      render: (status: SalesOrder['status']) => <OrderStatusTag status={status} />,
    },
    ...(canRefund
      ? [
          {
            title: '',
            key: 'actions',
            align: 'center' as const,
            width: 200,
            fixed: 'right' as const,
            render: (_: unknown, row: SalesOrder) => {
              // Chỉ thao tác được khi đơn đang COMPLETED — REFUNDED / CANCELLED
              // đã khoá vĩnh viễn (audit).
              if (row.status !== ORDER_STATUS.Completed) return null;
              // "Huỷ đơn" chỉ cho phép trong ngày — quá ngày phải dùng
              // "Hoàn tiền" để truy vết dòng tiền chính xác.
              const sameDay = row.soldAt.slice(0, 10) === today();
              return (
                <Space size={4}>
                  <Popconfirm
                    title="Hoàn tiền hoá đơn?"
                    description={
                      <span>
                        Hoàn <strong>{formatVND(row.grandTotal)}</strong> cho khách.
                        Hệ thống sẽ cộng lại tồn kho và tạo phiếu chi tiền mặt.
                      </span>
                    }
                    okText="Xác nhận hoàn"
                    cancelText="Đóng"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleRefund(row)}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<RollbackOutlined />}
                    >
                      Hoàn tiền
                    </Button>
                  </Popconfirm>
                  {sameDay && (
                    <Popconfirm
                      title="Huỷ đơn này?"
                      description={
                        <span>
                          Đánh dấu đơn <strong>{row.code}</strong> là đã huỷ
                          (lỗi nhập / khách đổi ý). Hệ thống sẽ cộng lại tồn
                          kho nhưng KHÔNG tạo phiếu chi — dùng khi chưa giao
                          nhận, chưa chốt két.
                        </span>
                      }
                      okText="Xác nhận huỷ"
                      cancelText="Đóng"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleCancel(row)}
                    >
                      <Button size="small" icon={<StopOutlined />}>
                        Huỷ đơn
                      </Button>
                    </Popconfirm>
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã hoá đơn', accessor: (row) => row.code },
        { header: 'Thời gian', accessor: (row) => row.soldAt },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        { header: 'Thu ngân', accessor: (row) => row.cashierName },
        { header: 'Mặt hàng', accessor: (row) => row.lines.length },
        {
          header: 'Tổng SL',
          accessor: (row) =>
            row.lines.reduce((sum, line) => sum + line.quantity, 0),
        },
        {
          header: 'Thanh toán',
          accessor: (row) => PAYMENT_METHOD_LABEL[row.paymentMethod],
        },
        { header: 'Tổng tiền', accessor: (row) => row.grandTotal },
        { header: 'Trạng thái', accessor: (row) => row.status },
      ],
      'Lich su hoa don',
    );
  };

  /** Mở drawer chi tiết — `OrderDetailDrawer` đọc `selectedOrderId` từ slice. */
  const handleView = (order: SalesOrder): void => {
    dispatch(setSelectedOrder(order.id));
    // Đơn từ DB có lines rỗng — nạp chi tiết từ API khi mở drawer.
    if (order.lines.length === 0) {
      void (async () => {
        try {
          const lines = await chiTietHoaDonApi.getByHoaDon(order.id);
          setApiOrders((prev) =>
            prev.map((o) =>
              o.id === order.id
                ? {
                    ...o,
                    lines: lines.map((l, i) => ({
                      id: l.id ?? `line-${i}`,
                      productId: l.idSanPham,
                      sku: products.find((p) => p.id === l.idSanPham)?.sku ?? '',
                      productName:
                        products.find((p) => p.id === l.idSanPham)?.name ?? '',
                      unit: '',
                      unitPrice: l.donGia,
                      quantity: l.soLuong,
                      lineDiscount: l.giamGia ?? 0,
                      vatPercent: 8,
                      lineTotal: l.thanhTien,
                      unitCost: 0,
                    })),
                  }
                : o,
            ),
          );
        } catch {
          // bỏ qua — drawer hiện bảng trống
        }
      })();
    }
  };

  /**
   * Hoàn tiền hoá đơn: dispatch `orderRefunded` để 3 slice xử lý song song:
   *   - salesOrderSlice → set status = REFUNDED, ghi lại dấu thời gian
   *   - stockSlice       → cộng lại tồn + ghi thẻ kho SALE_RETURN
   *   - cashbookSlice    → tạo phiếu chi HOAN_TIEN (tiền mặt)
   */
  const handleRefund = (order: SalesOrder): void => {
    if (user === null) return;
    const performedBy = `${user.fullName} (${user.employeeCode})`;
    const refundedAt = new Date().toISOString();

    dispatch(orderRefunded({ order, performedBy, refundedAt }));
    message.success(
      `Đã hoàn tiền hoá đơn ${order.code}. Tồn kho đã được cộng lại, sổ quỹ đã ghi phiếu chi.`,
    );
  };

  /**
   * Huỷ đơn (lỗi nhập / khách đổi ý trong ngày): dispatch `orderCancelled`
   * để 2 slice xử lý:
   *   - salesOrderSlice → set status = CANCELLED, ghi dấu
   *   - stockSlice       → cộng lại tồn + ghi thẻ kho SALE_RETURN
   *   - cashbookSlice    KHÔNG lắng nghe — không phát sinh phiếu chi.
   */
  const handleCancel = (order: SalesOrder): void => {
    if (user === null) return;
    const performedBy = `${user.fullName} (${user.employeeCode})`;
    const cancelledAt = new Date().toISOString();

    dispatch(orderCancelled({ order, performedBy, cancelledAt }));
    message.success(
      `Đã huỷ đơn ${order.code}. Tồn kho đã được cộng lại.`,
    );
  };

  const selectedOrder = useMemo(
    () => scoped.find((order) => order.id === selectedOrderId) ?? null,
    [scoped, selectedOrderId],
  );

  return (
    <>
      <PageHeader
        eyebrow="VẬN HÀNH / MODULE 2B"
        title="Lịch sử hoá đơn"
        description={
          isCashier
            ? 'Xem lại các hoá đơn bạn đã lập trong ca. Bấm vào từng dòng để xem chi tiết và in lại.'
            : isStoreManager
              ? 'Hoá đơn bán hàng tại chi nhánh bạn phụ trách. Bấm vào từng dòng để xem chi tiết.'
              : 'Tra cứu mọi hoá đơn bán hàng toàn chuỗi. Bấm vào từng dòng để xem chi tiết và in lại.'
        }
        extra={
          <Tag color="red" className="tag-no-margin">
            {filtered.length} / {scoped.length} hoá đơn
          </Tag>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã hoá đơn, thu ngân, SĐT thành viên..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setBranchFilter(null);
            setPaymentFilter(null);
            setStatusFilter(null);
          }}
        />

        <Table<SalesOrder>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: canRefund ? 1700 : 1500 }}
          onRow={(record) => ({
            onClick: (event) => {
              // Tránh mở drawer khi click vào nút hành động (Đổi trạng thái) —
              // nút này đã có Popconfirm riêng, click trúng thì chỉ chạy handler
              // của nút, không lan lên cả dòng.
              const target = event.target as HTMLElement | null;
              if (target?.closest('.ant-btn') !== null) return;
              handleView(record);
            },
            style: { cursor: 'pointer' },
          })}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `${total} hoá đơn`,
          }}
        />
      </Card>

      <OrderDetailDrawer order={selectedOrder} />
    </>
  );
};
