import { useMemo, type FC } from 'react';
import { Button, Card, Progress, Space, Switch, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HistoryOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/ProductThumb';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { LedgerTypeTag, StockLevelTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  openLedgerDrawer,
  resetInventoryFilters,
  setActiveTab,
  setBranchFilter,
  setCategoryFilter,
  setInventorySearch,
  setLedgerTypeFilter,
  setStockLevelFilter,
  toggleNearExpiry,
} from '@/store/slices/inventorySlice';
import {
  LEDGER_TYPE,
  LEDGER_TYPE_LABEL,
  STOCK_LEVEL,
  STOCK_LEVEL_LABEL,
  type LedgerType,
  type StockBalance,
  type StockLedgerEntry,
  type StockLevel,
} from '@/types';
import { mockBranches } from '@/mockData/branches';
import { mockCategories } from '@/mockData/categories';
import { productById } from '@/mockData/products';
import {
  distinctSkuCount,
  lowStockBalances,
  mockStockBalances,
  mockStockLedger,
  resolveStockLevel,
  totalStockValue,
} from '@/mockData/inventory';
import { daysUntil, formatDate, formatDateTime } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import type { CSSProperties } from 'react';
import { LedgerDrawer } from './components/LedgerDrawer';
import './InventoryPage.css';

const { Text } = Typography;

/** Ngưỡng "cận hạn": còn dưới 7 ngày là cần xử lý ngay tại cửa hàng. */
const NEAR_EXPIRY_DAYS = 7;

/**
 * Module 7 — Kho hàng (Tồn kho & Thẻ kho).
 *
 * Tab "Tồn kho" là số liệu hiện tại; tab "Thẻ kho" là lịch sử biến động — đây
 * mới là nguồn sự thật, tồn kho chỉ là kết quả cộng dồn từ thẻ kho.
 */
export const InventoryPage: FC = () => {
  const dispatch = useAppDispatch();
  const {
    activeTab,
    branchFilter,
    categoryFilter,
    stockLevelFilter,
    ledgerTypeFilter,
    searchKeyword,
    onlyNearExpiry,
  } = useAppSelector((state) => state.inventory);

  /** Tồn kho sau khi áp toàn bộ bộ lọc. */
  const balances = useMemo(
    () =>
      mockStockBalances.filter((balance) => {
        const matchSearch = matchKeyword(searchKeyword, [
          balance.productName,
          balance.sku,
          balance.categoryName,
        ]);
        const matchBranch = branchFilter === null || balance.branchId === branchFilter;

        const product = productById(balance.productId);
        const matchCategory =
          categoryFilter === null || product?.categoryId === categoryFilter;

        const level = resolveStockLevel(
          balance.quantity,
          balance.minStock,
          balance.maxStock,
        );
        const matchLevel = stockLevelFilter === null || level === stockLevelFilter;

        const remainingDays = daysUntil(balance.nearestExpiryDate);
        const matchExpiry =
          !onlyNearExpiry || (remainingDays !== null && remainingDays <= NEAR_EXPIRY_DAYS);

        return matchSearch && matchBranch && matchCategory && matchLevel && matchExpiry;
      }),
    [
      searchKeyword,
      branchFilter,
      categoryFilter,
      stockLevelFilter,
      onlyNearExpiry,
    ],
  );

  /** Thẻ kho sau khi áp bộ lọc. */
  const ledgerEntries = useMemo(
    () =>
      mockStockLedger.filter((entry) => {
        const matchSearch = matchKeyword(searchKeyword, [
          entry.productName,
          entry.sku,
          entry.referenceCode,
          entry.performedBy,
        ]);
        const matchBranch = branchFilter === null || entry.branchId === branchFilter;
        const matchType = ledgerTypeFilter === null || entry.type === ledgerTypeFilter;

        const product = productById(entry.productId);
        const matchCategory =
          categoryFilter === null || product?.categoryId === categoryFilter;

        return matchSearch && matchBranch && matchType && matchCategory;
      }),
    [searchKeyword, branchFilter, ledgerTypeFilter, categoryFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const lowStock = lowStockBalances(branchFilter);
    const nearExpiry = mockStockBalances.filter((balance) => {
      if (branchFilter !== null && balance.branchId !== branchFilter) return false;
      const remaining = daysUntil(balance.nearestExpiryDate);
      return remaining !== null && remaining <= NEAR_EXPIRY_DAYS;
    });

    return [
      {
        key: 'value',
        title: 'Giá trị hàng tồn kho',
        value: formatVND(totalStockValue(branchFilter)),
        color: BRAND.primaryRed,
      },
      {
        key: 'sku',
        title: 'Số SKU đang có tồn',
        value: formatNumber(distinctSkuCount(branchFilter)),
        suffix: 'mặt hàng',
      },
      {
        key: 'low',
        title: 'Dưới ngưỡng tối thiểu',
        value: formatNumber(lowStock.length),
        suffix: 'SKU',
        color: BRAND.warning,
      },
      {
        key: 'expiry',
        title: `Cận hạn dưới ${NEAR_EXPIRY_DAYS} ngày`,
        value: formatNumber(nearExpiry.length),
        suffix: 'SKU',
        color: BRAND.error,
      },
    ];
  }, [branchFilter]);

  const branchOptions = useMemo(
    () => mockBranches.map((branch) => ({ value: branch.id, label: branch.name })),
    [],
  );

  const categoryOptions = useMemo(
    () =>
      mockCategories.map((category) => ({
        value: category.id,
        label: `${category.icon} ${category.name}`,
      })),
    [],
  );

  /** Bộ lọc dùng chung, thêm bộ lọc riêng theo tab đang mở. */
  const filters: ToolbarFilter[] = [
    {
      key: 'branch',
      placeholder: 'Kho / Chi nhánh',
      value: branchFilter,
      onChange: (value) => dispatch(setBranchFilter(value)),
      options: branchOptions,
      span: 6,
    },
    {
      key: 'category',
      placeholder: 'Danh mục',
      value: categoryFilter,
      onChange: (value) => dispatch(setCategoryFilter(value)),
      options: categoryOptions,
      span: 5,
    },
    activeTab === 'balance'
      ? {
          key: 'level',
          placeholder: 'Mức tồn',
          value: stockLevelFilter,
          onChange: (value) =>
            dispatch(setStockLevelFilter(value === null ? null : (value as StockLevel))),
          options: Object.values(STOCK_LEVEL).map((level) => ({
            value: level,
            label: STOCK_LEVEL_LABEL[level],
          })),
        }
      : {
          key: 'ledgerType',
          placeholder: 'Loại biến động',
          value: ledgerTypeFilter,
          onChange: (value) =>
            dispatch(setLedgerTypeFilter(value === null ? null : (value as LedgerType))),
          options: Object.values(LEDGER_TYPE).map((type) => ({
            value: type,
            label: LEDGER_TYPE_LABEL[type],
          })),
        },
  ];

  const balanceColumns: ColumnsType<StockBalance> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      width: 290,
      fixed: 'left',
      render: (name: string, row) => {
        const product = productById(row.productId);
        return (
          <Space size={10}>
            <ProductThumb
              categoryId={product?.categoryId ?? ''}
              size={38}
              productName={name}
            />
            <span className="inv-product-info">
              <Text strong className="inv-product-name">
                {name}
              </Text>
              <Text type="secondary" className="inv-product-sub">
                <span className="mono-code">{row.sku}</span> · {row.categoryName}
              </Text>
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Kho / Chi nhánh',
      dataIndex: 'branchName',
      width: 210,
      render: (value: string) => <Text className="inv-text-12-5">{value}</Text>,
    },
    {
      title: 'Tồn hiện tại',
      dataIndex: 'quantity',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.quantity - b.quantity,
      render: (value: number, row) => (
        <Space direction="vertical" size={2} className="inv-cell-full">
          <Text strong className="numeric-cell">
            {formatNumber(value)} {row.unit}
          </Text>
          <Progress
            percent={Math.min(100, Math.round((value / Math.max(1, row.maxStock)) * 100))}
            size="small"
            showInfo={false}
            strokeColor={value < row.minStock ? BRAND.error : BRAND.success}
          />
        </Space>
      ),
    },
    {
      title: 'Ngưỡng min/max',
      key: 'threshold',
      align: 'center',
      width: 120,
      render: (_, row) => (
        <Text type="secondary" className="inv-text-12">
          {row.minStock} / {row.maxStock}
        </Text>
      ),
    },
    {
      title: 'Mức tồn',
      key: 'level',
      align: 'center',
      width: 120,
      render: (_, row) => (
        <StockLevelTag
          level={resolveStockLevel(row.quantity, row.minStock, row.maxStock)}
        />
      ),
    },
    {
      title: 'Giá vốn BQ',
      dataIndex: 'averageCost',
      align: 'right',
      width: 110,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Giá trị tồn',
      dataIndex: 'stockValue',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.stockValue - b.stockValue,
      render: (value: number) => (
        <Text strong className="numeric-cell inv-stock-value">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'HSD gần nhất',
      dataIndex: 'nearestExpiryDate',
      width: 140,
      render: (value: string | null) => {
        if (value === null) {
          return <Text type="secondary">—</Text>;
        }
        const remaining = daysUntil(value);
        if (remaining === null) return <Text type="secondary">—</Text>;

        // Quá hạn và cận hạn cần bật màu cảnh báo để nhân viên xử lý ngay.
        const color =
          remaining < 0
            ? BRAND.error
            : remaining <= NEAR_EXPIRY_DAYS
              ? BRAND.warning
              : undefined;

        return (
          <Tooltip
            title={
              remaining < 0
                ? `Đã quá hạn ${Math.abs(remaining)} ngày`
                : `Còn ${remaining} ngày`
            }
          >
            <Text
              className="inv-expiry-text"
              style={{ '--expiry-color': color ?? 'inherit' } as CSSProperties}
            >
              {formatDate(value)}
              {remaining <= NEAR_EXPIRY_DAYS && (
                <Tag color={remaining < 0 ? 'red' : 'orange'} className="expiry-tag">
                  {remaining < 0 ? 'Quá hạn' : `${remaining}n`}
                </Tag>
              )}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Biến động cuối',
      dataIndex: 'lastMovementAt',
      width: 140,
      render: (value: string) => (
        <Text type="secondary" className="inv-text-12">
          {formatDateTime(value)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'action',
      align: 'center',
      width: 110,
      fixed: 'right',
      render: (_, row) => (
        <Button
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => dispatch(openLedgerDrawer(row.productId))}
        >
          Thẻ kho
        </Button>
      ),
    },
  ];

  const ledgerColumns: ColumnsType<StockLedgerEntry> = [
    {
      title: 'Thời điểm',
      dataIndex: 'occurredAt',
      width: 150,
      fixed: 'left',
      render: (value: string) => (
        <Text className="inv-text-12">{formatDateTime(value)}</Text>
      ),
    },
    {
      title: 'Loại biến động',
      dataIndex: 'type',
      width: 160,
      render: (type: LedgerType) => <LedgerTypeTag type={type} />,
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
      width: 280,
      render: (name: string, row) => (
        <span>
          <Text strong className="inv-ledger-name">
            {name}
          </Text>
          <Text type="secondary" className="inv-ledger-sku">
            <span className="mono-code">{row.sku}</span>
          </Text>
        </span>
      ),
    },
    {
      title: 'Kho / Chi nhánh',
      dataIndex: 'branchName',
      width: 200,
      render: (value: string) => <Text className="inv-text-12-5">{value}</Text>,
    },
    {
      title: 'Chứng từ',
      dataIndex: 'referenceCode',
      width: 170,
      render: (value: string) => <span className="mono-code">{value}</span>,
    },
    {
      title: 'Nhập / Xuất',
      dataIndex: 'quantityChange',
      align: 'right',
      width: 110,
      render: (value: number) => (
        <Text
          strong
          className={`numeric-cell ${value >= 0 ? 'delta-in' : 'delta-out'}`}
        >
          {value >= 0 ? `+${value}` : value}
        </Text>
      ),
    },
    {
      title: 'Tồn trước',
      dataIndex: 'balanceBefore',
      align: 'right',
      width: 100,
      render: (value: number) => (
        <Text type="secondary" className="numeric-cell">
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: 'Tồn sau',
      dataIndex: 'balanceAfter',
      align: 'right',
      width: 100,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performedBy',
      width: 210,
      render: (value: string) => <Text className="inv-text-12">{value}</Text>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      width: 260,
      render: (value: string) => (
        <Text type="secondary" className="inv-text-12">
          {value}
        </Text>
      ),
    },
  ];

  const handleExportBalances = (): void => {
    exportToExcel(
      balances,
      [
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Sản phẩm', accessor: (row) => row.productName },
        { header: 'Danh mục', accessor: (row) => row.categoryName },
        { header: 'Kho/Chi nhánh', accessor: (row) => row.branchName },
        { header: 'Tồn hiện tại', accessor: (row) => row.quantity },
        { header: 'Đơn vị', accessor: (row) => row.unit },
        { header: 'Tồn tối thiểu', accessor: (row) => row.minStock },
        { header: 'Tồn tối đa', accessor: (row) => row.maxStock },
        {
          header: 'Mức tồn',
          accessor: (row) =>
            STOCK_LEVEL_LABEL[resolveStockLevel(row.quantity, row.minStock, row.maxStock)],
        },
        { header: 'Giá vốn BQ', accessor: (row) => row.averageCost },
        { header: 'Giá trị tồn', accessor: (row) => row.stockValue },
        { header: 'HSD gần nhất', accessor: (row) => row.nearestExpiryDate ?? '' },
      ],
      'Bao cao ton kho Circle K',
    );
  };

  const handleExportLedger = (): void => {
    exportToExcel(
      ledgerEntries,
      [
        { header: 'Thời điểm', accessor: (row) => formatDateTime(row.occurredAt) },
        { header: 'Loại biến động', accessor: (row) => LEDGER_TYPE_LABEL[row.type] },
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Sản phẩm', accessor: (row) => row.productName },
        { header: 'Kho/Chi nhánh', accessor: (row) => row.branchName },
        { header: 'Chứng từ', accessor: (row) => row.referenceCode },
        { header: 'Thay đổi', accessor: (row) => row.quantityChange },
        { header: 'Tồn trước', accessor: (row) => row.balanceBefore },
        { header: 'Tồn sau', accessor: (row) => row.balanceAfter },
        { header: 'Giá vốn', accessor: (row) => row.unitCost },
        { header: 'Người thực hiện', accessor: (row) => row.performedBy },
        { header: 'Ghi chú', accessor: (row) => row.note },
      ],
      'The kho Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ KHO / MODULE 7"
        title="Kho hàng — Tồn kho & Thẻ kho"
        description="Theo dõi tồn kho theo từng chi nhánh, kho tổng và toàn bộ lịch sử biến động nhập/xuất/điều chỉnh."
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '8px 18px 8px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => dispatch(setActiveTab(key as 'balance' | 'ledger'))}
          items={[
            {
              key: 'balance',
              label: `Tồn kho (${balances.length})`,
              children: (
                <>
                  <TableToolbar
                    searchValue={searchKeyword}
                    searchPlaceholder="Tìm theo tên sản phẩm, SKU..."
                    onSearchChange={(value) => dispatch(setInventorySearch(value))}
                    filters={filters}
                    onExport={handleExportBalances}
                    onReset={() => dispatch(resetInventoryFilters())}
                    actions={
                      <Space size={6}>
                        <Switch
                          checked={onlyNearExpiry}
                          onChange={() => dispatch(toggleNearExpiry())}
                          size="small"
                        />
                        <Text className="near-expiry-label">Chỉ hàng cận hạn</Text>
                      </Space>
                    }
                  />

                  <Table<StockBalance>
                    columns={balanceColumns}
                    dataSource={balances}
                    rowKey="id"
                    size="middle"
                    scroll={{ x: 1800 }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} dòng tồn kho`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'ledger',
              label: `Thẻ kho (${ledgerEntries.length})`,
              children: (
                <>
                  <TableToolbar
                    searchValue={searchKeyword}
                    searchPlaceholder="Tìm theo sản phẩm, SKU, mã chứng từ..."
                    onSearchChange={(value) => dispatch(setInventorySearch(value))}
                    filters={filters}
                    onExport={handleExportLedger}
                    onReset={() => dispatch(resetInventoryFilters())}
                  />

                  <Table<StockLedgerEntry>
                    columns={ledgerColumns}
                    dataSource={ledgerEntries}
                    rowKey="id"
                    size="middle"
                    scroll={{ x: 1900 }}
                    className="dense-table"
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} biến động`,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      <LedgerDrawer />
    </>
  );
};