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
import { chiTietHoaDonApi, type ChiTietHoaDonDTO } from '@/api/chiTietHoaDon';
import {
  ORDER_STATUS,
  PAYMENT_METHOD_LABEL,
  USER_ROLE,
  type OrderLine,
  type PaymentMethod,
  type Product,
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

/** Map chi tiết hoá đơn và bổ sung thông tin hiển thị từ danh mục sản phẩm. */
const mapDtoToOrderLine = (
  dto: ChiTietHoaDonDTO,
  index: number,
  products: readonly Product[],
): OrderLine => {
  const product = products.find((item) => item.id === dto.idSanPham);

  return {
    id: dto.id ?? `line-${index}`,
    productId: dto.idSanPham,
    sku: product?.sku ?? '',
    productName: product?.name ?? '',
    unit: product?.unit ?? '',
    unitPrice: dto.donGia,
    quantity: dto.soLuong,
    lineDiscount: dto.giamGia ?? 0,
    vatPercent: 8,
    lineTotal: dto.thanhTien,
    unitCost: 0,
  };
};

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
  /**
   * Phạm vi dữ liệu theo chi nhánh của người dùng — khoá cứng với mọi vai trò
   * gắn chi nhánh (QUAN_LY, THU_NGAN), chỉ vai trò trụ sở mới xem toàn chuỗi.
   */
  const branchScope = user?.branchId ?? null;
  const cashierScope = isCashier ? user?.idNhanVien ?? null : null;
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
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
        const mapped = list.map((dto) => {
            return {
              ...mapDtoToOrder(
                dto,
                branchNameOf(dto.idChiNhanh),
                cashierNameOf(dto.idThuNgan),
              ),
              lines: [], // Lazy load later when viewed
            };
          });
        if (!cancelled) setApiOrders(mapped);
      } catch {
        // im lặng — vẫn hiện đơn trong session
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, employees.length, products.length]);

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
                      loading={actionLoadingId === row.id}
                      disabled={actionLoadingId !== null}
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
                      <Button
                        size="small"
                        icon={<StopOutlined />}
                        loading={actionLoadingId === row.id}
                        disabled={actionLoadingId !== null}
                      >
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
                    lines: lines.map((line, index) =>
                      mapDtoToOrderLine(line, index, products),
                    ),
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
   * Hoàn tiền hoá đơn:
   *   1. Nạp lines nếu chưa có để đảm bảo Redux stockSlice nhận diện đúng mặt hàng hoàn tồn.
   *   2. Gọi API hoaDonApi.refund để cập nhật trạng thái DB thành REFUNDED và hoàn kho trong DB.
   *   3. Dispatch `orderRefunded` để các slice Redux xử lý (stockSlice, cashbookSlice, cashbookPersistence).
   *   4. Cập nhật state `apiOrders` ngay trên UI để trạng thái chuyển thành 'Đã hoàn tiền'.
   */
  const handleRefund = async (order: SalesOrder): Promise<void> => {
    if (user === null || actionLoadingId !== null) return;
    const performedBy = `${user.fullName} (${user.employeeCode})`;
    const refundedAt = new Date().toISOString();

    setActionLoadingId(order.id);
    try {
      let orderWithLines = order;
      if (order.lines.length === 0) {
        try {
          const lines = await chiTietHoaDonApi.getByHoaDon(order.id);
          orderWithLines = {
            ...order,
            lines: lines.map((line, index) =>
              mapDtoToOrderLine(line, index, products),
            ),
          };
        } catch {
          // tiếp tục với order gốc nếu nạp lines thất bại
        }
      }

      await hoaDonApi.refund(order.id, 'Khách trả hàng hoàn tiền');

      dispatch(orderRefunded({ order: orderWithLines, performedBy, refundedAt }));

      const refundStamp = `[Hoàn ${refundedAt.slice(0, 16).replace('T', ' ')} bởi ${performedBy}]`;
      setApiOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                lines: orderWithLines.lines,
                status: ORDER_STATUS.Refunded,
                note: item.note === '' ? refundStamp : `${item.note}\n${refundStamp}`,
              }
            : item,
        ),
      );

      message.success(
        `Đã hoàn tiền hoá đơn ${order.code}. Tồn kho đã được cộng lại, sổ quỹ đã ghi phiếu chi.`,
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể hoàn tiền hoá đơn';
      message.error(errMsg);
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Huỷ đơn (lỗi nhập / khách đổi ý trong ngày):
   *   1. Nạp lines nếu chưa có để đảm bảo Redux stockSlice hoàn tồn.
   *   2. Gọi API hoaDonApi.cancel để cập nhật trạng thái DB thành CANCELLED.
   *   3. Dispatch `orderCancelled` để stockSlice hoàn tồn.
   *   4. Cập nhật state `apiOrders` trên UI để chuyển thành 'Đã huỷ'.
   */
  const handleCancel = async (order: SalesOrder): Promise<void> => {
    if (user === null || actionLoadingId !== null) return;
    const performedBy = `${user.fullName} (${user.employeeCode})`;
    const cancelledAt = new Date().toISOString();

    setActionLoadingId(order.id);
    try {
      let orderWithLines = order;
      if (order.lines.length === 0) {
        try {
          const lines = await chiTietHoaDonApi.getByHoaDon(order.id);
          orderWithLines = {
            ...order,
            lines: lines.map((line, index) =>
              mapDtoToOrderLine(line, index, products),
            ),
          };
        } catch {
          // tiếp tục với order gốc nếu nạp lines thất bại
        }
      }

      await hoaDonApi.cancel(order.id, 'Huỷ đơn hàng');

      dispatch(orderCancelled({ order: orderWithLines, performedBy, cancelledAt }));

      const cancelStamp = `[Huỷ ${cancelledAt.slice(0, 16).replace('T', ' ')} bởi ${performedBy}]`;
      setApiOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                lines: orderWithLines.lines,
                status: ORDER_STATUS.Cancelled,
                note: item.note === '' ? cancelStamp : `${item.note}\n${cancelStamp}`,
              }
            : item,
        ),
      );

      message.success(
        `Đã huỷ đơn ${order.code}. Tồn kho đã được cộng lại.`,
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể huỷ đơn hàng';
      message.error(errMsg);
    } finally {
      setActionLoadingId(null);
    }
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
