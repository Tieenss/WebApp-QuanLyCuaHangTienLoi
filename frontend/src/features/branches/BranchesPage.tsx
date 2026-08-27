import { useMemo, useState, type FC } from 'react';
import { Card, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { RecordStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import {
  BRANCH_KIND,
  BRANCH_KIND_LABEL,
  RECORD_STATUS,
  REGION,
  REGION_LABEL,
  type Branch,
} from '@/types';
import { mockBranches } from '@/mockData/branches';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import './BranchesPage.css';

const { Text } = Typography;

/**
 * Module 3 — Quản lý Chi nhánh.
 *
 * Danh sách gồm cả kho tổng và cửa hàng bán lẻ; cột "Doanh thu tháng" để trống
 * với kho tổng vì kho không phát sinh doanh thu bán lẻ.
 */
export const BranchesPage: FC = () => {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mockBranches.filter((branch) => {
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
    [search, regionFilter, kindFilter, statusFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const stores = mockBranches.filter(
      (branch) => branch.kind === BRANCH_KIND.Store,
    );
    const active = mockBranches.filter(
      (branch) => branch.status === RECORD_STATUS.Active,
    );
    const totalRevenue = mockBranches.reduce(
      (sum, branch) => sum + branch.monthlyRevenue,
      0,
    );
    const totalEmployees = mockBranches.reduce(
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
        suffix: `/ ${mockBranches.length}`,
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
  }, []);

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
          <Space>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {mockBranches.length} điểm
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
          scroll={{ x: 1560 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} điểm bán` }}
        />
      </Card>
    </>
  );
};