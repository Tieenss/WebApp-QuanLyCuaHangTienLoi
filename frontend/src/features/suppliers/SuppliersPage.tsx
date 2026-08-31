import { useMemo, type FC } from 'react';
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
import {
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  deleteSupplier,
  setCategoryFilter,
  setModalOpen,
  setSearchQuery,
  setSelectedSupplier,
  setStatusFilter,
} from '@/store/slices/supplierSlice';
import type { Supplier } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { SupplierFormModal } from './components/SupplierFormModal';
import './SuppliersPage.css';

const { Text } = Typography;

/** Danh sách nhóm hàng để lọc, gom từ dữ liệu nhà cung cấp hiện có. */
const collectCategories = (suppliers: readonly Supplier[]): string[] =>
  [...new Set(suppliers.flatMap((supplier) => supplier.categories))].sort();

/**
 * Module 6 — Nhà cung cấp.
 *
 * Ngoài thông tin liên hệ, bảng nhấn vào công nợ và số SKU đang cung ứng — hai
 * chỉ số quyết định khi đàm phán và lập đơn mua hàng.
 */
export const SuppliersPage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { suppliers, searchQuery, categoryFilter, statusFilter } = useAppSelector(
    (state) => state.supplier,
  );
  const products = useAppSelector((state) => state.product.products);

  const filtered = useMemo(
    () =>
      suppliers.filter((supplier) => {
        const matchSearch = matchKeyword(searchQuery, [
          supplier.name,
          supplier.code,
          supplier.taxCode,
          supplier.email,
          supplier.phone,
        ]);
        const matchCategory =
          categoryFilter === null || supplier.categories.includes(categoryFilter);
        const matchStatus = statusFilter === null || supplier.status === statusFilter;
        return matchSearch && matchCategory && matchStatus;
      }),
    [suppliers, searchQuery, categoryFilter, statusFilter],
  );

  /** Số SKU mỗi nhà cung cấp đang cung ứng. */
  const skuCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.supplierId, (map.get(product.supplierId) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const summary = useMemo<SummaryItem[]>(() => {
    const active = suppliers.filter((supplier) => supplier.status === 'Active');
    const totalDebt = suppliers.reduce((sum, supplier) => sum + supplier.totalDebt, 0);
    const totalOrders = suppliers.reduce(
      (sum, supplier) => sum + supplier.totalOrders,
      0,
    );

    return [
      {
        key: 'total',
        title: 'Tổng nhà cung cấp',
        value: formatNumber(suppliers.length),
        suffix: 'đối tác',
        color: BRAND.primaryRed,
      },
      {
        key: 'active',
        title: 'Đang hợp tác',
        value: formatNumber(active.length),
        suffix: `/ ${suppliers.length}`,
        color: BRAND.success,
      },
      {
        key: 'debt',
        title: 'Tổng công nợ phải trả',
        value: formatVND(totalDebt),
        color: BRAND.error,
      },
      {
        key: 'orders',
        title: 'Tổng đơn nhập đã thực hiện',
        value: formatNumber(totalOrders),
        suffix: 'đơn',
      },
    ];
  }, [suppliers]);

  const filters: ToolbarFilter[] = [
    {
      key: 'category',
      placeholder: 'Nhóm hàng cung ứng',
      value: categoryFilter,
      onChange: (value) => dispatch(setCategoryFilter(value)),
      options: collectCategories(suppliers).map((item) => ({
        value: item,
        label: item,
      })),
      span: 6,
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: (value) =>
        dispatch(setStatusFilter(value === null ? null : (value as Supplier['status']))),
      options: [
        { value: 'Active', label: 'Đang hợp tác' },
        { value: 'Inactive', label: 'Ngừng hợp tác' },
      ],
    },
  ];

  const handleEdit = (supplier: Supplier): void => {
    dispatch(setSelectedSupplier(supplier));
    dispatch(setModalOpen(true));
  };

  const handleAdd = (): void => {
    dispatch(setSelectedSupplier(null));
    dispatch(setModalOpen(true));
  };

  const handleDelete = (supplier: Supplier): void => {
    dispatch(deleteSupplier(supplier.id));
    message.success(`Đã xoá nhà cung cấp "${supplier.name}".`);
  };

  const columns: ColumnsType<Supplier> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 100,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'name',
      width: 290,
      render: (name: string, row) => (
        <span>
          <Text strong className="supplier-name">
            {name}
          </Text>
          <Text type="secondary" className="supplier-tax">
            MST: {row.taxCode}
          </Text>
        </span>
      ),
    },
    {
      title: 'Nhóm hàng cung ứng',
      dataIndex: 'categories',
      width: 240,
      render: (categories: string[]) => (
        <Space size={[0, 4]} wrap>
          {categories.map((item) => (
            <Tag key={item} color="volcano" className="supplier-category-tag">
              {item}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Số SKU',
      key: 'skuCount',
      align: 'center',
      width: 90,
      render: (_, row) => (
        <Text strong className="numeric-cell">
          {skuCountMap.get(row.id) ?? 0}
        </Text>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 220,
      render: (_, row) => (
        <span>
          <Text className="supplier-line">
            <PhoneOutlined className="supplier-phone-icon" />
            {row.phone}
          </Text>
          <Text type="secondary" className="supplier-email">
            <MailOutlined className="supplier-mail-icon" />
            {row.email}
          </Text>
        </span>
      ),
    },
    {
      title: 'Điều khoản',
      dataIndex: 'paymentTerms',
      width: 140,
      render: (value: string) => (
        <Tag color="blue" className="tag-no-margin">
          {value}
        </Tag>
      ),
    },
    {
      title: 'Công nợ',
      dataIndex: 'totalDebt',
      align: 'right',
      width: 140,
      sorter: (a, b) => a.totalDebt - b.totalDebt,
      render: (value: number) => (
        <Text
          strong
          className={`numeric-cell ${value > 0 ? 'debt-outstanding' : 'debt-clear'}`}
        >
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Số đơn nhập',
      dataIndex: 'totalOrders',
      align: 'center',
      width: 110,
      sorter: (a, b) => a.totalOrders - b.totalOrders,
    },
    {
      title: 'Hợp tác từ',
      dataIndex: 'createdAt',
      width: 110,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 130,
      render: (status: Supplier['status']) => (
        <Tag color={status === 'Active' ? 'green' : 'default'} className="tag-no-margin">
          {status === 'Active' ? 'Đang hợp tác' : 'Ngừng hợp tác'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      align: 'center',
      width: 90,
      fixed: 'right',
      render: (_, row) => (
        <Space size={0}>
          <Button
            type="text"
            icon={<EditOutlined className="action-edit-icon" />}
            onClick={() => handleEdit(row)}
          />
          <Popconfirm
            title="Xoá nhà cung cấp?"
            description={`Xoá "${row.name}" khỏi danh sách đối tác?`}
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row)}
          >
            <Button type="text" icon={<DeleteOutlined className="action-delete-icon" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã NCC', accessor: (row) => row.code },
        { header: 'Tên nhà cung cấp', accessor: (row) => row.name },
        { header: 'Mã số thuế', accessor: (row) => row.taxCode },
        { header: 'Điện thoại', accessor: (row) => row.phone },
        { header: 'Email', accessor: (row) => row.email },
        { header: 'Địa chỉ', accessor: (row) => row.address },
        { header: 'Nhóm hàng', accessor: (row) => row.categories.join(', ') },
        { header: 'Điều khoản', accessor: (row) => row.paymentTerms },
        { header: 'Công nợ', accessor: (row) => row.totalDebt },
        { header: 'Số đơn nhập', accessor: (row) => row.totalOrders },
        { header: 'Số SKU', accessor: (row) => skuCountMap.get(row.id) ?? 0 },
        {
          header: 'Trạng thái',
          accessor: (row) => (row.status === 'Active' ? 'Đang hợp tác' : 'Ngừng hợp tác'),
        },
      ],
      'Danh sach nha cung cap Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & NHÂN SỰ / MODULE 6"
        title="Quản lý nhà cung cấp"
        description="Thông tin đối tác, nhóm hàng cung ứng, điều khoản và công nợ phải trả."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm nhà cung cấp
          </Button>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={searchQuery}
          searchPlaceholder="Tìm theo tên, mã NCC, mã số thuế..."
          onSearchChange={(value) => dispatch(setSearchQuery(value))}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            dispatch(setSearchQuery(''));
            dispatch(setCategoryFilter(null));
            dispatch(setStatusFilter(null));
          }}
        />

        <Table<Supplier>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: 1800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} nhà cung cấp`,
          }}
        />
      </Card>

      <SupplierFormModal />
    </>
  );
};