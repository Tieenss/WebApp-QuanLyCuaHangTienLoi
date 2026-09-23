import { useEffect, useMemo, useState, type CSSProperties, type FC } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { RecordStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  deleteCategoryThunk,
  fetchCategories,
  moveCategoryUp,
  moveCategoryDown,
  restoreCategoryThunk,
} from '@/store/slices/categorySlice';
import {
  RECORD_STATUS,
  USER_ROLE,
  type Category,
} from '@/types';
import { formatNumber, matchKeyword } from '@/utils/formatters';
import { formatDateShort } from '@/utils/dateUtils';
import { exportToExcel } from '@/utils/exportUtils';
import { CategoryFormModal } from './components/CategoryFormModal';
import './CategoriesPage.css';

const { Text } = Typography;

/**
 * Module 5b — Quản lý Danh mục hàng hoá.
 *
 * Trang này được tách ra từ tab "Danh mục" trong `ProductsPage` (cũ) để phục
 * vụ việc quản trị danh mục độc lập với danh sách sản phẩm. Sản phẩm lấy
 * theo `categoryId`; quản lý danh mục sai sẽ ảnh hưởng lớn đến lưới POS và
 * báo cáo, nên cần trang riêng để dễ kiểm soát.
 */
export const CategoriesPage: FC = () => {
  const dispatch = useAppDispatch();
  const { modal, message } = AntdApp.useApp();

  const user = useAppSelector((state) => state.auth.user);
  const categories = useAppSelector((state) => state.category.categories);
  const products = useAppSelector((state) => state.product.products);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const canEdit =
    user?.role === USER_ROLE.Admin || user?.role === USER_ROLE.StoreManager;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  /**
   * Số SKU thực tế theo từng danh mục — đếm trực tiếp từ `state.product.products`
   * để khớp với thực tế thay vì dùng `productCount` (có thể lệch sau khi
   * thêm/xoá sản phẩm trong mock).
   */
  const actualProductCount = useMemo(() => {
    const count = new Map<string, number>();
    products.forEach((product) => {
      count.set(product.categoryId, (count.get(product.categoryId) ?? 0) + 1);
    });
    return count;
  }, [products]);

  const filtered = useMemo(
    () =>
      categories
        .filter((category) => {
          const matchSearch = matchKeyword(search, [
            category.name,
            category.code,
            category.description,
          ]);
          const matchStatus =
            statusFilter === null || category.status === statusFilter;
          return matchSearch && matchStatus;
        })
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [categories, search, statusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const active = categories.filter(
      (category) => category.status === RECORD_STATUS.Active,
    );
    const totalProducts = active.reduce(
      (sum, category) =>
        sum + (actualProductCount.get(category.id) ?? 0),
      0,
    );
    const empty = active.filter(
      (category) => (actualProductCount.get(category.id) ?? 0) === 0,
    );
    return [
      {
        key: 'total',
        title: 'Tổng danh mục',
        value: formatNumber(categories.length),
        suffix: 'nhóm hàng',
        color: BRAND.primaryRed,
      },
      {
        key: 'active',
        title: 'Đang hoạt động',
        value: formatNumber(active.length),
        suffix: `/${categories.length}`,
      },
      {
        key: 'products',
        title: 'SKU đang phân loại',
        value: formatNumber(totalProducts),
        suffix: 'SKU',
      },
      {
        key: 'empty',
        title: 'Danh mục trống',
        value: formatNumber(empty.length),
        suffix: 'nhóm',
        color: BRAND.warning,
      },
    ];
  }, [categories, actualProductCount]);

  const filters: ToolbarFilter[] = [
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: RECORD_STATUS.Active, label: 'Đang hoạt động' },
        { value: RECORD_STATUS.Inactive, label: 'Ngừng hoạt động' },
      ],
      span: 6,
    },
  ];

  const handleAdd = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (category: Category): void => {
    setEditing(category);
    setFormOpen(true);
  };

  const isAdmin = user?.role === USER_ROLE.Admin;

  const handleDelete = (category: Category): void => {
    const count = actualProductCount.get(category.id) ?? 0;
    const isGlobal = isAdmin;
    const scopeText = isGlobal ? 'toàn bộ hệ thống (tất cả chi nhánh)' : 'chi nhánh này';

    if (count > 0) {
      modal.confirm({
        title: isGlobal ? 'Ngừng kinh doanh danh mục toàn hệ thống' : 'Ngừng kinh doanh danh mục tại chi nhánh',
        content: `Danh mục "${category.name}" đang có ${count} SKU. Khi ngừng kinh doanh tại ${scopeText}, toàn bộ các sản phẩm thuộc danh mục này cũng sẽ chuyển sang ngừng kinh doanh và không hiển thị trên POS. Bạn có chắc muốn tiếp tục?`,
        okText: 'Xác nhận ngừng kinh doanh',
        cancelText: 'Huỷ',
        okButtonProps: { danger: true },
        onOk: async () => {
          const res = await dispatch(deleteCategoryThunk(category.id)).unwrap();
          message.success(res?.message || 'Đã ngừng kinh doanh danh mục thành công');
          dispatch(fetchCategories());
        },
      });
      return;
    }

    modal.confirm({
      title: 'Ngừng kinh doanh danh mục',
      content: `Ngừng kinh doanh danh mục "${category.name}" tại ${scopeText}?`,
      okText: 'Xác nhận',
      cancelText: 'Huỷ',
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await dispatch(deleteCategoryThunk(category.id)).unwrap();
        message.success(res?.message || 'Đã ngừng kinh doanh danh mục thành công');
        dispatch(fetchCategories());
      },
    });
  };

  const handleRestore = async (category: Category): Promise<void> => {
    const isGlobal = isAdmin;
    const scopeText = isGlobal ? 'toàn hệ thống' : 'chi nhánh này';
    try {
      const res = await dispatch(restoreCategoryThunk(category.id)).unwrap();
      message.success(res?.message || `Đã kích hoạt lại danh mục tại ${scopeText}`);
      dispatch(fetchCategories());
    } catch (err: any) {
      message.error(err.message || 'Không thể khôi phục danh mục');
    }
  };

  const handleMoveUp = async (category: Category): Promise<void> => {
    await dispatch(moveCategoryUp(category.id));
    dispatch(fetchCategories());
  };

  const handleMoveDown = async (category: Category): Promise<void> => {
    await dispatch(moveCategoryDown(category.id));
    dispatch(fetchCategories());
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 110,
      fixed: 'left',
      sorter: (a, b) => (a.code ?? '').localeCompare(b.code ?? ''),
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Danh mục',
      dataIndex: 'name',
      width: 250,
      fixed: 'left',
      render: (name: string, row) => {
        // Map từ iconEmoji/colorHex (từ DB) - fallback về icon/color (mock cũ)
        const icon = (row as any).iconEmoji || row.icon || '📦';
        const color = (row as any).colorHex || row.color || '#000000';
        const imageUrl = (row as any).imageUrl || '';
        return (
          <Space size={10}>
            <div
              className="category-icon-box"
              style={{
                '--cat-color': color,
                backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } as CSSProperties}
            >
              {!imageUrl && icon}
            </div>
            <span className="category-cell-info">
              <Text strong className="product-name">
                {name}
              </Text>
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      render: (value: string) =>
        value === '' ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="cat-desc">{value}</Text>
        ),
    },
    {
      title: 'Số SKU',
      key: 'skuCount',
      align: 'center',
      width: 100,
      render: (_, row) => {
        const count = actualProductCount.get(row.id) ?? 0;
        return (
          <Text
            strong
            className={`numeric-cell${count === 0 ? ' cat-empty' : ''}`}
          >
            {count}
          </Text>
        );
      },
    },
    {
      title: 'Thứ tự',
      dataIndex: 'displayOrder',
      align: 'center',
      width: 80,
      render: (order: number) => (
        <Text strong className="numeric-cell">{order}</Text>
      ),
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updatedAt',
      width: 120,
      align: 'center',
      sorter: (a, b) => (a.updatedAt ?? a.createdAt ?? '').localeCompare(b.updatedAt ?? b.createdAt ?? ''),
      render: (_: unknown, row: Category) => (
        <Text type="secondary">{formatDateShort(row.updatedAt || row.createdAt)}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 140,
      render: (status: Category['status']) => <RecordStatusTag status={status} />,
    },
    ...(isAdmin
      ? [
          {
            title: 'Sắp xếp',
            key: 'order_actions',
            align: 'center' as const,
            width: 90,
            render: (_: unknown, row: Category) => (
              <Space size={0}>
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  title="Lên trên"
                  onClick={() => handleMoveUp(row)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  title="Xuống dưới"
                  onClick={() => handleMoveDown(row)}
                />
              </Space>
            ),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            align: 'center' as const,
            width: isAdmin ? 110 : 80,
            fixed: 'right' as const,
            render: (_: unknown, row: Category) => (
              <Space size={0}>
                {isAdmin && (
                  <Tooltip title="Chỉnh sửa danh mục">
                    <Button
                      type="text"
                      icon={<EditOutlined className="action-edit-icon" />}
                      onClick={() => handleEdit(row)}
                    />
                  </Tooltip>
                )}
                {row.status === 'Active' ? (
                  <Popconfirm
                    title={isAdmin ? "Ngừng kinh doanh toàn chuỗi?" : "Ngừng kinh doanh tại chi nhánh?"}
                    description={
                      isAdmin
                        ? `Danh mục "${row.name}" và các sản phẩm thuộc danh mục sẽ ngừng bán trên toàn hệ thống.`
                        : `Danh mục "${row.name}" và các sản phẩm thuộc danh mục sẽ ngừng bán tại chi nhánh này.`
                    }
                    okText="Ngừng bán"
                    cancelText="Huỷ"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(row)}
                  >
                    <Tooltip title={isAdmin ? "Ngừng kinh doanh toàn chuỗi" : "Ngừng kinh doanh tại chi nhánh"}>
                      <Button
                        type="text"
                        icon={<StopOutlined style={{ color: '#faad14' }} />}
                      />
                    </Tooltip>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title={isAdmin ? "Kích hoạt lại cho toàn chuỗi?" : "Kích hoạt lại tại chi nhánh?"}
                    description={`Mở lại kinh doanh danh mục "${row.name}"?`}
                    okText="Kích hoạt"
                    cancelText="Huỷ"
                    onConfirm={() => handleRestore(row)}
                  >
                    <Tooltip title="Kích hoạt kinh doanh lại">
                      <Button
                        type="text"
                        icon={<UndoOutlined style={{ color: '#52c41a' }} />}
                      />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã', accessor: (row) => row.code },
        { header: 'Tên danh mục', accessor: (row) => row.name },
        { header: 'Mô tả', accessor: (row) => row.description },
        {
          header: 'Số SKU',
          accessor: (row) => actualProductCount.get(row.id) ?? 0,
        },
        { header: 'Thứ tự', accessor: (row) => row.displayOrder },
        { header: 'Trạng thái', accessor: (row) => row.status },
      ],
      'Danh muc hang hoa',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & NHÂN SỰ / MODULE 5B"
        title="Quản lý danh mục hàng hoá"
        description="Phân nhóm hàng, đặt màu và icon hiển thị ở POS. Mỗi sản phẩm thuộc đúng một danh mục để lên lưới bán hàng và thống kê doanh thu."
        extra={
          <Space wrap>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {categories.length} nhóm
            </Tag>
            {isAdmin && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                Thêm danh mục
              </Button>
            )}
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo tên, mã, mô tả..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setStatusFilter(null);
          }}
        />

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Table<Category>
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              size="middle"
              pagination={false}
              scroll={{ x: 900 }}
            />
          </Col>
        </Row>
      </Card>

      <CategoryFormModal
        open={isFormOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
    </>
  );
};
