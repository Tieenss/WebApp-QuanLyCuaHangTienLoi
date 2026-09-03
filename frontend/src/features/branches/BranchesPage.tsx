import { useEffect, useMemo, useState, type FC } from 'react';
import {
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { RecordStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  deleteBranchThunk,
  fetchBranches,
  setBranchModalOpen,
  setSelectedBranch,
} from '@/store/slices/branchSlice';
import { fetchEmployees } from '@/store/slices/employeeSlice';
import {
  BRANCH_KIND,
  BRANCH_KIND_LABEL,
  RECORD_STATUS,
  REGION,
  REGION_LABEL,
  type Branch,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { BranchFormModal } from './components/BranchFormModal';
import './BranchesPage.css';

const { Text } = Typography;

export const BranchesPage: FC = () => {
  const dispatch = useAppDispatch();
  const { branches, loading } = useAppSelector((state) => state.branch);
  const employees = useAppSelector((state) => state.employee.employees);

  useEffect(() => {
    dispatch(fetchBranches());
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Enrich branches: đếm số NV thực tế theo idChiNhanh
  const enrichedBranches = useMemo(
    () =>
      branches.map((b) => ({
        ...b,
        employeeCount: employees.filter((e) => e.branchId === b.id).length,
      })),
    [branches, employees],
  );

  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      enrichedBranches.filter((branch) => {
        const matchSearch = matchKeyword(search, [
          branch.name,
          branch.code,
          branch.addressLine,
          branch.district,
          branch.province,
          branch.managerName,
        ]);
        const matchRegion = regionFilter === null || branch.region === regionFilter;
        const matchKind = kindFilter === null || branch.kind === kindFilter;
        const matchStatus = statusFilter === null || branch.status === statusFilter;
        return matchSearch && matchRegion && matchKind && matchStatus;
      }),
    [branches, search, regionFilter, kindFilter, statusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const stores = enrichedBranches.filter(
      (branch) => branch.kind === BRANCH_KIND.Store,
    );
    const active = enrichedBranches.filter(
      (branch) => branch.status === RECORD_STATUS.Active,
    );
    const totalRevenue = enrichedBranches.reduce(
      (sum, branch) => sum + branch.monthlyRevenue,
      0,
    );
    const totalEmployees = enrichedBranches.reduce(
      (sum, branch) => sum + branch.employeeCount,
      0,
    );

    return [
      {
        key: 'stores',
        title: 'Tổng số cửa hàng',
        value: formatNumber(stores.length),
        suffix: 'điểm bán',
        color: BRAND.primaryRed,
      },
      {
        key: 'active',
        title: 'Đang hoạt động',
        value: formatNumber(active.length),
        suffix: `/ ${branches.length}`,
        color: BRAND.success,
      },
      {
        key: 'employees',
        title: 'Tổng nhân sự',
        value: formatNumber(totalEmployees),
        suffix: 'người',
      },
      {
        key: 'revenue',
        title: 'Doanh thu tháng gần nhất',
        value: formatVND(totalRevenue),
        color: BRAND.primaryRed,
      },
    ];
  }, [enrichedBranches]);

  const filters: ToolbarFilter[] = [
    {
      key: 'region',
      placeholder: 'Vùng miền',
      value: regionFilter,
      onChange: setRegionFilter,
      options: Object.values(REGION).map((region) => ({
        value: region,
        label: REGION_LABEL[region],
      })),
    },
    {
      key: 'kind',
      placeholder: 'Loại điểm',
      value: kindFilter,
      onChange: setKindFilter,
      options: Object.values(BRANCH_KIND).map((kind) => ({
        value: kind,
        label: BRANCH_KIND_LABEL[kind],
      })),
    },
    {
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: RECORD_STATUS.Active, label: 'Đang hoạt động' },
        { value: RECORD_STATUS.Inactive, label: 'Ngừng hoạt động' },
      ],
    },
  ];

  const handleEdit = (branch: Branch): void => {
    dispatch(setSelectedBranch(branch));
    dispatch(setBranchModalOpen(true));
  };

  const handleAdd = (): void => {
    dispatch(setSelectedBranch(null));
    dispatch(setBranchModalOpen(true));
  };

  const handleDelete = (id: string): void => {
    dispatch(deleteBranchThunk(id));
  };

  const columns: ColumnsType<Branch> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 100,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Tên điểm bán',
      dataIndex: 'name',
      width: 240,
      render: (name: string, row) => (
        <span>
          <Text strong className="branch-name">
            {name}
          </Text>
          <Tag
            color={row.kind === BRANCH_KIND.DistributionCenter ? 'purple' : 'red'}
            className="branch-kind-tag"
          >
            {BRANCH_KIND_LABEL[row.kind]}
          </Tag>
        </span>
      ),
    },
    {
      title: 'Địa chỉ',
      key: 'address',
      width: 300,
      render: (_, row) => (
        <span>
          <Text className="branch-line">
            <EnvironmentOutlined className="branch-address-icon" />
            {row.addressLine}
          </Text>
          <Text type="secondary" className="branch-sub">
            {row.district}, {row.province} · {REGION_LABEL[row.region]}
          </Text>
        </span>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 170,
      render: (_, row) => (
        <span>
          <Text className="branch-line">
            <PhoneOutlined className="branch-phone-icon" />
            {row.phone}
          </Text>
          <Text type="secondary" className="branch-sub">
            {row.openingHours}
          </Text>
        </span>
      ),
    },
    {
      title: 'Quản lý',
      dataIndex: 'managerName',
      width: 160,
      render: (value: string) => <Text className="branch-text-12-5">{value}</Text>,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'employeeCount',
      align: 'center',
      width: 90,
      sorter: (a, b) => a.employeeCount - b.employeeCount,
      render: (value: number) => <span className="numeric-cell">{value}</span>,
    },
    {
      title: 'Diện tích',
      dataIndex: 'areaSqm',
      align: 'right',
      width: 100,
      sorter: (a, b) => a.areaSqm - b.areaSqm,
      render: (value: number) => (
        <span className="numeric-cell">{formatNumber(value)} m²</span>
      ),
    },
    {
      title: 'Doanh thu tháng',
      dataIndex: 'monthlyRevenue',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.monthlyRevenue - b.monthlyRevenue,
      render: (value: number, row) =>
        row.kind === BRANCH_KIND.DistributionCenter ? (
          <Tooltip title="Kho tổng không phát sinh doanh thu bán lẻ">
            <Text type="secondary">—</Text>
          </Tooltip>
        ) : (
          <Text strong className="numeric-cell branch-revenue">
            {formatVND(value)}
          </Text>
        ),
    },
    {
      title: 'Khai trương',
      dataIndex: 'openedAt',
      width: 110,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 130,
      fixed: 'right',
      render: (status: Branch['status']) => <RecordStatusTag status={status} />,
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
            title="Xoá chi nhánh?"
            description={`Xoá "${row.name}" khỏi danh sách?`}
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row.id)}
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
        { header: 'Mã chi nhánh', accessor: (row) => row.code },
        { header: 'Tên', accessor: (row) => row.name },
        { header: 'Loại', accessor: (row) => BRANCH_KIND_LABEL[row.kind] },
        { header: 'Vùng', accessor: (row) => REGION_LABEL[row.region] },
        { header: 'Địa chỉ', accessor: (row) => row.addressLine },
        { header: 'Quận/Huyện', accessor: (row) => row.district },
        { header: 'Tỉnh/Thành', accessor: (row) => row.province },
        { header: 'Điện thoại', accessor: (row) => row.phone },
        { header: 'Giờ mở cửa', accessor: (row) => row.openingHours },
        { header: 'Quản lý', accessor: (row) => row.managerName },
        { header: 'Số nhân sự', accessor: (row) => row.employeeCount },
        { header: 'Diện tích (m2)', accessor: (row) => row.areaSqm },
        { header: 'Doanh thu tháng', accessor: (row) => row.monthlyRevenue },
        { header: 'Ngày khai trương', accessor: (row) => row.openedAt },
      ],
      'Danh sach chi nhanh Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & NHÂN SỰ / MODULE 3"
        title="Quản lý chi nhánh"
        description="Danh sách cửa hàng Circle K và kho tổng trên toàn quốc."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm chi nhánh
            </Button>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {branches.length} điểm
            </Tag>
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo tên, mã, địa chỉ, quản lý..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setRegionFilter(null);
            setKindFilter(null);
            setStatusFilter(null);
          }}
        />

        <Table<Branch>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          loading={loading}
          scroll={{ x: 1560 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} điểm bán` }}
        />
      </Card>

      <BranchFormModal />
    </>
  );
};