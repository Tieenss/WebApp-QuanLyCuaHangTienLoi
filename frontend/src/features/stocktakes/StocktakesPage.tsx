import { useEffect, useMemo, useRef, useState, type FC, type ReactElement } from 'react';
import { Button, Card, Descriptions, Modal, Space, Statistic, Table, Tag, Typography, message } from 'antd';
const { Paragraph } = Typography;
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { DocumentStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { phieuKiemKeApi, chiTietKiemKeApi } from '@/api/phieuKiemKe';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchProducts } from '@/store/slices/productSlice';
import {
  DOCUMENT_STATUS,
  DOCUMENT_STATUS_LABEL,
  type DocumentStatus,
  type Stocktake,
  type StocktakeLine,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { StocktakeFormModal } from './components/StocktakeFormModal';
import './StocktakesPage.css';

const { Text } = Typography;

/**
 * Module 10 — Kiểm kê & Cân bằng kho.
 *
 * Trọng tâm là giá trị lệch: số âm nghĩa là thiếu hụt so với sổ sách, và đây
 * chính là nguồn dữ liệu cho báo cáo hao hụt ở module 13.
 */
export const StocktakesPage: FC = () => {
  const branches = useAppSelector((state) => state.branch.branches);
  const products = useAppSelector((state) => state.product.products);
  const productById = (id: string) => products.find((p) => p.id === id);
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [balanceModal, setBalanceModal] = useState<Stocktake | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [stocktakes, setStocktakes] = useState<Stocktake[]>([]);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, StocktakeLine[]>>({});

  /** Map trạng thái DB sang enum frontend. */
  const mapTrangThai = (db: string | undefined): DocumentStatus => {
    switch (db) {
      case 'DA_DUYET': return DOCUMENT_STATUS.Approved;
      case 'DA_CAN_BANG': return DOCUMENT_STATUS.Balanced;
      case 'CANCELLED': return DOCUMENT_STATUS.Cancelled;
      case 'DANG_KIEM_KE':
      default: return DOCUMENT_STATUS.Pending;
    }
  };

  /** Tải danh sách phiếu + chi tiết (1 lần duy nhất). */
  const loadStocktakes = async () => {
    setLoading(true);
    try {
      const data = await phieuKiemKeApi.getAll();
      const mapped = data.map((d) => ({
        id: d.id!,
        code: d.maPhieu ?? '',
        branchId: d.idChiNhanh || '',
        branchName: branches.find((b) => b.id === d.idChiNhanh)?.name || '',
        countDate: d.ngayKiemKe || '',
        status: mapTrangThai(d.trangThai),
        lines: [],
        totalItemsCounted: 0,
        totalVarianceItems: 0,
        totalVarianceValue: 0,
        countedBy: '',
        approvedBy: d.idNguoiDuyet || null,
        note: d.ghiChu || '',
      }));
      setStocktakes(mapped);

      // Load chi tiết cho tất cả phiếu (1 lần, tránh lazy-load khi expand)
      const allDetails: Record<string, StocktakeLine[]> = {};
      await Promise.all(
        mapped.map(async (st) => {
          try {
            const lines = await chiTietKiemKeApi.getByPhieuKiemKe(st.id);
            allDetails[st.id] = lines.map((d) => {
              const product = productById(d.idSanPham);
              return {
                id: d.id ?? `d-${d.idSanPham}`,
                productId: d.idSanPham,
                sku: product?.sku ?? '',
                productName: product?.name ?? '',
                unit: product?.unit ?? '',
                systemQuantity: d.tonHeThong,
                countedQuantity: d.tonThucTe,
                varianceQuantity: d.soLuongLech,
                unitCost: Number(d.donGiaVon),
                varianceValue: Number(d.giaTriLech),
                reason: d.lyDoLech ?? '',
              };
            });
          } catch {
            allDetails[st.id] = [];
          }
        }),
      );
      setDetails(allDetails);

      // Tính các thống kê trên bảng chính từ details đã load.
      setStocktakes(
        mapped.map((st) => {
          const lines = allDetails[st.id] ?? [];
          const totalItems = lines.length;
          const varianceItems = lines.filter((l) => l.varianceQuantity !== 0).length;
          const totalVarianceValue = lines.reduce(
            (sum, l) => sum + l.varianceValue,
            0,
          );
          return {
            ...st,
            lines,
            totalItemsCounted: totalItems,
            totalVarianceItems: varianceItems,
            totalVarianceValue,
          };
        }),
      );
    } catch {
      message.error('Lỗi tải danh sách phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts());
    }
    loadStocktakes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi products tải xong (chưa từng có), reload để enrich tên sản phẩm.
  useEffect(() => {
    if (!hasLoadedOnce.current && products.length > 0) {
      hasLoadedOnce.current = true;
      loadStocktakes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const filtered = useMemo(
    () =>
      stocktakes.filter((stocktake) => {
        const matchSearch = matchKeyword(search, [
          stocktake.code,
          stocktake.branchName,
          stocktake.countedBy,
        ]);
        const matchBranch =
          branchFilter === null || stocktake.branchId === branchFilter;
        const matchStatus = statusFilter === null || stocktake.status === statusFilter;
        return matchSearch && matchBranch && matchStatus;
      }),
    [stocktakes, search, branchFilter, statusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const totalVarianceValue = stocktakes.reduce(
      (sum, stocktake) =>
        sum + (details[stocktake.id] ?? []).reduce((s, l) => s + l.varianceValue, 0),
      0,
    );
    const totalVarianceItems = stocktakes.reduce(
      (sum, stocktake) =>
        sum + (details[stocktake.id] ?? []).filter((l) => l.varianceQuantity !== 0).length,
      0,
    );
    const totalCounted = stocktakes.reduce(
      (sum, stocktake) => sum + (details[stocktake.id] ?? []).length,
      0,
    );
    const pending = stocktakes.filter(
      (stocktake) =>
        stocktake.status === DOCUMENT_STATUS.Pending ||
        stocktake.status === DOCUMENT_STATUS.Draft,
    );

    return [
      {
        key: 'sheets',
        title: 'Tổng phiếu kiểm kê',
        value: formatNumber(stocktakes.length),
        suffix: 'phiếu',
        color: BRAND.primaryRed,
      },
      {
        key: 'variance',
        title: 'Giá trị lệch tồn tích luỹ',
        value: formatVND(totalVarianceValue),
        color: totalVarianceValue < 0 ? BRAND.error : BRAND.success,
      },
      {
        key: 'items',
        title: 'Số dòng có lệch',
        value: formatNumber(totalVarianceItems),
        suffix: `/ ${formatNumber(totalCounted)} dòng đếm`,
        color: BRAND.warning,
      },
      {
        key: 'pending',
        title: 'Chờ duyệt cân bằng',
        value: formatNumber(pending.length),
        suffix: 'phiếu',
      },
    ];
  }, [stocktakes, details]);

  const filters: ToolbarFilter[] = [
    {
      key: 'branch',
      placeholder: 'Chi nhánh',
      value: branchFilter,
      onChange: setBranchFilter,
      options: branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
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
    },
  ];

  const columns: ColumnsType<Stocktake> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      width: 165,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 240,
      render: (value: string) => (
        <Text strong className="stk-text-12-5">
          {value}
        </Text>
      ),
    },
    {
      title: 'Ngày kiểm kê',
      dataIndex: 'countDate',
      width: 125,
      sorter: (a, b) => a.countDate.localeCompare(b.countDate),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Số dòng đếm',
      dataIndex: 'totalItemsCounted',
      align: 'center',
      width: 115,
      render: (value: number) => <Text className="numeric-cell">{value}</Text>,
    },
    {
      title: 'Dòng có lệch',
      dataIndex: 'totalVarianceItems',
      align: 'center',
      width: 120,
      sorter: (a, b) => a.totalVarianceItems - b.totalVarianceItems,
      render: (value: number, row) => (
        <Space direction="vertical" size={0} className="stk-cell-center">
          <Text strong className={value > 0 ? 'variance-warn' : 'variance-ok'}>
            {value}
          </Text>
          <Text type="secondary" className="variance-note">
            {row.totalItemsCounted === 0
              ? '0%'
              : `${Math.round((value / row.totalItemsCounted) * 100)}%`}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Giá trị lệch',
      dataIndex: 'totalVarianceValue',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.totalVarianceValue - b.totalVarianceValue,
      render: (value: number) => (
        <Text
          strong
          className={`numeric-cell ${
            value < 0 ? 'value-loss' : value > 0 ? 'value-gain' : ''
          }`}
        >
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Người kiểm',
      dataIndex: 'countedBy',
      width: 170,
      render: (value: string) => <Text className="stk-text-12-5">{value}</Text>,
    },
    {
      title: 'Người duyệt',
      dataIndex: 'approvedBy',
      width: 190,
      render: (value: string | null) =>
        value === null ? (
          <Text type="secondary">Chưa duyệt</Text>
        ) : (
          <Text className="stk-text-12-5">{value}</Text>
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
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 160,
      fixed: 'right',
      render: (_: unknown, stocktake: Stocktake) =>
        canApprove(stocktake) ? (
          <Button
            type="primary"
            size="small"
            onClick={() => handleApprove(stocktake)}
          >
            Duyệt
          </Button>
        ) : canBalance(stocktake) ? (
          <Button
            type="primary"
            size="small"
            onClick={() => handleBalance(stocktake)}
          >
            Cân bằng kho
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  const renderDetail = (stocktake: Stocktake): ReactElement => {
    const lineColumns: ColumnsType<StocktakeLine> = [
      {
        title: 'SKU',
        dataIndex: 'sku',
        width: 150,
        render: (value: string) => <span className="mono-code">{value}</span>,
      },
      { title: 'Sản phẩm', dataIndex: 'productName' },
      {
        title: 'Tồn sổ sách',
        dataIndex: 'systemQuantity',
        align: 'right',
        width: 110,
      },
      {
        title: 'Đếm thực tế',
        dataIndex: 'countedQuantity',
        align: 'right',
        width: 110,
        render: (value: number) => (
          <Text strong className="numeric-cell">
            {value}
          </Text>
        ),
      },
      {
        title: 'Lệch',
        dataIndex: 'varianceQuantity',
        align: 'right',
        width: 90,
        render: (value: number) => (
          <Text
            strong
            className={`numeric-cell ${value < 0 ? 'qty-loss' : value > 0 ? 'qty-gain' : ''}`}
          >
            {value > 0 ? `+${value}` : value}
          </Text>
        ),
      },
      {
        title: 'Giá trị lệch',
        dataIndex: 'varianceValue',
        align: 'right',
        width: 130,
        render: (value: number) => (
          <Text className={`numeric-cell${value < 0 ? ' qty-loss' : ''}`}>
            {formatVND(value)}
          </Text>
        ),
      },
      {
        title: 'Nguyên nhân',
        dataIndex: 'reason',
        width: 280,
        render: (value: string) =>
          value === '' ? (
            <Text type="secondary">Khớp sổ sách</Text>
          ) : (
            <Text className="stk-reason">{value}</Text>
          ),
      },
    ];

    const currentLines = details[stocktake.id] ?? [];

    const totalItems = currentLines.length;
    const varianceItems = currentLines.filter((l) => l.varianceQuantity !== 0).length;
    const totalVarianceValue = currentLines.reduce(
      (sum, l) => sum + l.varianceValue,
      0,
    );

    const sortedLines = [...currentLines].sort(
      (a, b) => Math.abs(b.varianceQuantity) - Math.abs(a.varianceQuantity),
    );

    return (
      <Space direction="vertical" size={14} className="stk-detail-full">
        <Space size={32} wrap>
          <Statistic
            title="Số dòng đã đếm"
            value={totalItems}
            valueStyle={{ fontSize: 18, fontWeight: 700 }}
          />
          <Statistic
            title="Dòng lệch tồn"
            value={varianceItems}
            valueStyle={{ fontSize: 18, fontWeight: 700, color: BRAND.warning }}
          />
          <Statistic
            title="Tổng giá trị lệch"
            value={formatVND(totalVarianceValue)}
            valueStyle={{
              fontSize: 18,
              fontWeight: 700,
              color:
                totalVarianceValue < 0 ? BRAND.error : BRAND.success,
            }}
          />
        </Space>

        <Table<StocktakeLine>
          columns={lineColumns}
          dataSource={sortedLines}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: false }}
        />

        <Descriptions bordered size="small" column={3}>
          <Descriptions.Item label="Chi nhánh">
            {stocktake.branchName}
          </Descriptions.Item>
          <Descriptions.Item label="Người kiểm kê">
            {stocktake.countedBy}
          </Descriptions.Item>
          <Descriptions.Item label="Người duyệt">
            {stocktake.approvedBy ?? 'Chưa duyệt'}
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
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        { header: 'Ngày kiểm kê', accessor: (row) => row.countDate },
        { header: 'Số dòng đếm', accessor: (row) => row.totalItemsCounted },
        { header: 'Dòng có lệch', accessor: (row) => row.totalVarianceItems },
        { header: 'Giá trị lệch', accessor: (row) => row.totalVarianceValue },
        { header: 'Người kiểm', accessor: (row) => row.countedBy },
        { header: 'Người duyệt', accessor: (row) => row.approvedBy ?? '' },
        { header: 'Trạng thái', accessor: (row) => DOCUMENT_STATUS_LABEL[row.status] },
      ],
      'Phieu kiem ke Circle K',
    );
  };

  const canBalance = (stocktake: Stocktake): boolean => {
    return stocktake.status === DOCUMENT_STATUS.Approved;
  };

  const canApprove = (stocktake: Stocktake): boolean => {
    return stocktake.status === DOCUMENT_STATUS.Pending;
  };

  const handleApprove = async (stocktake: Stocktake): Promise<void> => {
    try {
      await phieuKiemKeApi.update(stocktake.id, { trangThai: 'DA_DUYET' });
      setStocktakes((prev) =>
        prev.map((s) =>
          s.id === stocktake.id
            ? { ...s, status: DOCUMENT_STATUS.Approved, approvedBy: 'Quản lý cửa hàng' }
            : s,
        ),
      );
      message.success(`Đã duyệt phiếu ${stocktake.code}`);
    } catch (e: any) {
      message.error('Lỗi duyệt phiếu: ' + (e?.message || e));
    }
  };

  const handleBalance = (stocktake: Stocktake): void => {
    setBalanceModal(stocktake);
  };

  const confirmBalance = async (): Promise<void> => {
    if (!balanceModal) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      await phieuKiemKeApi.update(balanceModal.id, {
        trangThai: 'DA_CAN_BANG',
        ngayCanBang: today,
      });
      setStocktakes((prev) =>
        prev.map((s) =>
          s.id === balanceModal.id
            ? { ...s, status: DOCUMENT_STATUS.Balanced }
            : s,
        ),
      );
      message.success(`Đã cân bằng kho cho phiếu ${balanceModal.code}`);
      setBalanceModal(null);
    } catch (e: any) {
      message.error('Lỗi cân bằng: ' + (e?.message || e));
    }
  };

  const handleCreateSuccess = (stocktake: Stocktake): void => {
    setStocktakes((prev) => [stocktake, ...prev]);
    // Lưu lines đã có sẵn trong stocktake để expand ngay không cần fetch lại.
    if (stocktake.lines.length > 0) {
      setDetails((prev) => ({ ...prev, [stocktake.id]: stocktake.lines }));
    }
    message.success('Đã tạo phiếu kiểm kê');
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 10"
        title="Kiểm kê & cân bằng kho"
        description="Đối chiếu tồn thực tế với sổ sách, xác định nguyên nhân lệch và cân bằng lại số liệu kho."
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModal(true)}
            >
              Tạo phiếu kiểm kê
            </Button>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {stocktakes.length} phiếu
            </Tag>
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, chi nhánh, người kiểm..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setBranchFilter(null);
            setStatusFilter(null);
          }}
        />

        <Table<Stocktake>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          loading={loading}
          scroll={{ x: 1500 }}
          expandable={{ expandedRowRender: renderDetail, columnWidth: 44 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu kiểm kê`,
          }}
        />
      </Card>

      <Modal
        title="Xác nhận cân bằng kho"
        open={!!balanceModal}
        onOk={confirmBalance}
        onCancel={() => setBalanceModal(null)}
        okText="Xác nhận cân bằng"
        cancelText="Huỷ"
      >
        {balanceModal && (
          <Space direction="vertical" size={16}>
            <Paragraph>
              Bạn có chắc chắn muốn cân bằng kho cho phiếu{' '}
              <strong>{balanceModal.code}</strong> không?
            </Paragraph>
            <Paragraph type="secondary">
              Hành động này sẽ thực hiện:
            </Paragraph>
            <ul>
              <li>Cập nhật tồn kho = tồn thực tế</li>
              <li>Ghi vào sổ kho (CAN_BANG_KIEM_KE)</li>
              <li>Chuyển trạng thái phiếu → Đã cân bằng</li>
            </ul>
            <Paragraph type="warning">
              Hành động này không thể hoàn tác.
            </Paragraph>
          </Space>
        )}
      </Modal>

      <StocktakeFormModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};
