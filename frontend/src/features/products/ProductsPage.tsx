import { useMemo, useState, type FC } from 'react';
import { Card, Col, Row, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarcodeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { ProductThumb } from '@/components/ProductThumb';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { RecordStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import {
  PRODUCT_UNIT_LABEL,
  RECORD_STATUS,
  type Category,
  type Product,
} from '@/types';
import { mockCategories } from '@/mockData/categories';
import {
  grossProfitPerUnit,
  marginPercent,
  mockProducts,
} from '@/mockData/products';
import { totalStockOf } from '@/mockData/inventory';
import {
  formatNumber,
  formatRatio,
  formatVND,
  matchKeyword,
} from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import type { CSSProperties } from 'react';
import './ProductsPage.css';

const { Text } = Typography;

/**
 * Module 5 — Danh mục & Sản phẩm.
 *
 * Hai tab: danh sách sản phẩm (mặc định) và cây danh mục. Cột "Lãi gộp" tính
 * trực tiếp từ giá bán trừ giá nhập nên luôn khớp với báo cáo lợi nhuận.
 */
export const ProductsPage: FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [perishableFilter, setPerishableFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mockProducts.filter((product) => {
        const matchSearch = matchKeyword(search, [
          product.name,
          product.sku,
          product.barcode,
          product.categoryName,
          product.supplierName,
        ]);
        const matchCategory =
          categoryFilter === null || product.categoryId === categoryFilter;
        const matchStatus = statusFilter === null || product.status === statusFilter;
        const matchPerishable =
          perishableFilter === null ||
          (perishableFilter === 'yes' ? product.isPerishable : !product.isPerishable);
        return matchSearch && matchCategory && matchStatus && matchPerishable;
      }),
    [search, categoryFilter, statusFilter, perishableFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const active = mockProducts.filter(
      (product) => product.status === RECORD_STATUS.Active,
    );
    const perishable = active.filter((product) => product.isPerishable);
    const averageMargin =
      active.reduce((sum, product) => sum + marginPercent(product), 0) /
      Math.max(1, active.length);

    return [
      {
        key: 'products',
        title: 'Sản phẩm đang kinh doanh',
        value: formatNumber(active.length),
        suffix: `/ ${mockProducts.length} SKU`,
        color: BRAND.primaryRed,
      },
      {
        key: 'categories',
        title: 'Số danh mục',
        value: formatNumber(mockCategories.length),
        suffix: 'nhóm hàng',
      },
      {
        key: 'perishable',
        title: 'Hàng có hạn sử dụng ngắn',
        value: formatNumber(perishable.length),
        suffix: 'SKU',
        color: BRAND.warning,
      },
      {
        key: 'margin',
        title: 'Tỷ suất lãi gộp trung bình',
        value: formatRatio(averageMargin, 1),
        color: BRAND.success,
      },
    ];
  }, []);

  const filters: ToolbarFilter[] = [
    {
      key: 'category',
      placeholder: 'Danh mục',
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: mockCategories.map((category) => ({
        value: category.id,
        label: `${category.icon} ${category.name}`,
      })),
      span: 6,
    },
    {
      key: 'perishable',
      placeholder: 'Hạn sử dụng',
      value: perishableFilter,
      onChange: setPerishableFilter,
      options: [
        { value: 'yes', label: 'Có HSD ngắn' },
        { value: 'no', label: 'Bảo quản dài' },
      ],
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: RECORD_STATUS.Active, label: 'Đang kinh doanh' },
        { value: RECORD_STATUS.Inactive, label: 'Ngừng kinh doanh' },
      ],
    },
  ];

  const productColumns: ColumnsType<Product> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      width: 300,
      fixed: 'left',
      render: (name: string, row) => (
        <Space size={10}>
          <ProductThumb
            categoryId={row.categoryId}
            size={40}
            imageUrl={row.imageUrl}
            productName={name}
          />
          <span className="product-cell-info">
            <Text strong className="product-name">
              {name}
            </Text>
            <Text type="secondary" className="product-sub">
              <span className="mono-code">{row.sku}</span> · {PRODUCT_UNIT_LABEL[row.unit]}
            </Text>
          </span>
        </Space>
      ),
    },
    {
      title: 'Mã vạch',
      dataIndex: 'barcode',
      width: 150,
      render: (value: string) => (
        <Text className="barcode-text">
          <BarcodeOutlined className="barcode-icon" />
          {value}
        </Text>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'categoryName',
      width: 160,
      render: (value: string, row) => {
        const category = mockCategories.find((item) => item.id === row.categoryId);
        return (
          <Tag
            className="category-tag"
            style={{ '--cat-color': category?.color ?? '#999' } as CSSProperties}
          >
            {value}
          </Tag>
        );
      },
    },
    {
      title: 'Giá nhập',
      dataIndex: 'costPrice',
      align: 'right',
      width: 110,
      sorter: (a, b) => a.costPrice - b.costPrice,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Giá bán',
      dataIndex: 'salePrice',
      align: 'right',
      width: 110,
      sorter: (a, b) => a.salePrice - b.salePrice,
      render: (value: number) => (
        <Text strong className="numeric-cell price-sale">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Lãi gộp',
      key: 'margin',
      align: 'right',
      width: 120,
      sorter: (a, b) => marginPercent(a) - marginPercent(b),
      render: (_, row) => (
        <Space direction="vertical" size={0} className="cell-stack-right">
          <span className="numeric-cell profit-value">
            {formatVND(grossProfitPerUnit(row))}
          </span>
          <Text type="secondary" className="cell-note">
            {formatRatio(marginPercent(row), 1)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'VAT',
      dataIndex: 'vatPercent',
      align: 'center',
      width: 70,
      render: (value: number) => `${value}%`,
    },
    {
      title: 'Tồn toàn chuỗi',
      key: 'stock',
      align: 'right',
      width: 130,
      render: (_, row) => {
        const stock = totalStockOf(row.id);
        return (
          <Space direction="vertical" size={0} className="cell-stack-right">
            <Text
              strong
              className={`numeric-cell${stock < row.minStock ? ' stock-below-min' : ''}`}
            >
              {formatNumber(stock)}
            </Text>
            <Text type="secondary" className="cell-note">
              tối thiểu {row.minStock}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Hạn sử dụng',
      key: 'shelfLife',
      width: 130,
      render: (_, row) =>
        row.isPerishable ? (
          <Tooltip title="Hàng dễ hỏng, cần theo dõi hạn sử dụng chặt">
            <Tag color="orange" className="tag-no-margin">
              <ClockCircleOutlined /> {row.shelfLifeDays} ngày
            </Tag>
          </Tooltip>
        ) : row.shelfLifeDays > 0 ? (
          <Text type="secondary" className="shelf-life-days">
            {row.shelfLifeDays} ngày
          </Text>
        ) : (
          <Text type="secondary">Pha chế tại quầy</Text>
        ),
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplierName',
      width: 250,
      render: (value: string) => (
        <Text className="supplier-ellipsis" ellipsis>
          {value}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 140,
      fixed: 'right',
      render: (status: Product['status']) => <RecordStatusTag status={status} />,
    },
  ];

  const categoryColumns: ColumnsType<Category> = [
    {
      title: 'Danh mục',
      dataIndex: 'name',
      render: (name: string, row) => (
        <Space size={10}>
          <div
            className="category-icon-box"
            style={{ '--cat-color': row.color } as CSSProperties}
          >
            {row.icon}
          </div>
          <span>
            <Text strong className="product-name">
              {name}
            </Text>
            <Text type="secondary" className="product-sub">
              {row.code}
            </Text>
          </span>
        </Space>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      render: (value: string) => (
        <Text type="secondary" className="cat-desc">
          {value}
        </Text>
      ),
    },
    {
      title: 'Số SKU',
      key: 'skuCount',
      align: 'center',
      width: 100,
      render: (_, row) => {
        const count = mockProducts.filter(
          (product) => product.categoryId === row.id,
        ).length;
        return <Text strong className="numeric-cell">{count}</Text>;
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'displayOrder',
      align: 'center',
      width: 90,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 140,
      render: (status: Category['status']) => <RecordStatusTag status={status} />,
    },
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'SKU', accessor: (row) => row.sku },
        { header: 'Mã vạch', accessor: (row) => row.barcode },
        { header: 'Tên sản phẩm', accessor: (row) => row.name },
        { header: 'Danh mục', accessor: (row) => row.categoryName },
        { header: 'Đơn vị', accessor: (row) => PRODUCT_UNIT_LABEL[row.unit] },
        { header: 'Giá nhập', accessor: (row) => row.costPrice },
        { header: 'Giá bán', accessor: (row) => row.salePrice },
        { header: 'Lãi gộp/đơn vị', accessor: (row) => grossProfitPerUnit(row) },
        { header: 'Tỷ suất lãi (%)', accessor: (row) => marginPercent(row).toFixed(1) },
        { header: 'VAT (%)', accessor: (row) => row.vatPercent },
        { header: 'Tồn tối thiểu', accessor: (row) => row.minStock },
        { header: 'Tồn tối đa', accessor: (row) => row.maxStock },
        { header: 'Tồn toàn chuỗi', accessor: (row) => totalStockOf(row.id) },
        { header: 'HSD (ngày)', accessor: (row) => row.shelfLifeDays },
        { header: 'Nhà cung cấp', accessor: (row) => row.supplierName },
      ],
      'Danh muc san pham Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & NHÂN SỰ / MODULE 5"
        title="Danh mục & sản phẩm"
        description="Phân loại nhóm hàng, quản lý SKU, mã vạch, giá bán và biên lợi nhuận."
        extra={
          <Tag color="red" className="tag-no-margin">
            {filtered.length} / {mockProducts.length} SKU
          </Tag>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '8px 18px 8px' } }}>
        <Tabs
          defaultActiveKey="products"
          items={[
            {
              key: 'products',
              label: `Sản phẩm (${mockProducts.length})`,
              children: (
                <>
                  <TableToolbar
                    searchValue={search}
                    searchPlaceholder="Tìm theo tên, SKU, mã vạch, nhà cung cấp..."
                    onSearchChange={setSearch}
                    filters={filters}
                    onExport={handleExport}
                    onReset={() => {
                      setSearch('');
                      setCategoryFilter(null);
                      setStatusFilter(null);
                      setPerishableFilter(null);
                    }}
                  />

                  <Table<Product>
                    columns={productColumns}
                    dataSource={filtered}
                    rowKey="id"
                    size="middle"
                    scroll={{ x: 1900 }}
                    pagination={{
                      pageSize: 12,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} sản phẩm`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'categories',
              label: `Danh mục (${mockCategories.length})`,
              children: (
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Table<Category>
                      columns={categoryColumns}
                      dataSource={mockCategories}
                      rowKey="id"
                      size="middle"
                      pagination={false}
                      scroll={{ x: 900 }}
                    />
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
};