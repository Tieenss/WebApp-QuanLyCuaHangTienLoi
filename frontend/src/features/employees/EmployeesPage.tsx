import { useMemo, useState, type FC } from 'react';
import {
  Avatar,
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
  PlusOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { RecordStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  deleteEmployee,
  setEmployeeModalOpen,
  setSelectedEmployee,
} from '@/store/slices/employeeSlice';
import {
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_LABEL,
  SHIFT_SHORT_LABEL,
  USER_ROLE_LABEL,
  type Employee,
  type ShiftCode,
} from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import './EmployeesPage.css';

const { Text } = Typography;

const SHIFT_COLOR: Record<ShiftCode, string> = {
  MORNING: 'gold',
  AFTERNOON: 'orange',
  NIGHT: 'geekblue',
};

export const EmployeesPage: FC = () => {
  const dispatch = useAppDispatch();
  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const { employees } = useAppSelector((state) => state.employee);
  const branchesState = useAppSelector((state) => state.branch.branches);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const scoped = useMemo(() => {
    const allowed = user?.allowedBranchIds ?? [];
    if (allowed.length === 0) return employees;
    return employees.filter((employee) => allowed.includes(employee.branchId));
  }, [user?.allowedBranchIds, employees]);

  const filtered = useMemo(
    () =>
      scoped.filter((employee) => {
        const matchSearch = matchKeyword(search, [
          employee.fullName,
          employee.code,
          employee.email,
          employee.phone,
          employee.position,
        ]);
        const matchBranch =
          branchFilter === null || employee.branchId === branchFilter;
        const matchShift = shiftFilter === null || employee.defaultShift === shiftFilter;
        const matchType = typeFilter === null || employee.employmentType === typeFilter;
        return matchSearch && matchBranch && matchShift && matchType;
      }),
    [scoped, search, branchFilter, shiftFilter, typeFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const active = scoped.filter(
      (employee) => employee.status === RECORD_STATUS.Active,
    );
    const fullTime = active.filter(
      (employee) => employee.employmentType === EMPLOYMENT_TYPE.FullTime,
    );
    const nightShift = active.filter(
      (employee) => employee.defaultShift === SHIFT_CODE.Night,
    );
    const monthlyCost = active.reduce(
      (sum, employee) =>
        sum + (employee.baseSalary > 0 ? employee.baseSalary : employee.hourlyWage * 8 * 22),
      0,
    );

    return [
      {
        key: 'total',
        title: 'Tổng nhân sự đang làm',
        value: formatNumber(active.length),
        suffix: 'người',
        color: BRAND.primaryRed,
      },
      {
        key: 'fulltime',
        title: 'Toàn thời gian',
        value: formatNumber(fullTime.length),
        suffix: `/ ${active.length}`,
      },
      {
        key: 'night',
        title: 'Nhân sự trực ca đêm',
        value: formatNumber(nightShift.length),
        suffix: 'người',
        color: BRAND.info,
      },
      {
        key: 'cost',
        title: 'Chi phí nhân sự ước tính / tháng',
        value: formatVND(monthlyCost),
        color: BRAND.warning,
      },
    ];
  }, [scoped]);

  const branchOptions = useMemo(() => {
    const branches = branchesState;
    const allowed = user?.allowedBranchIds ?? [];
    const list =
      allowed.length === 0
        ? branches
        : branches.filter((branch) => allowed.includes(branch.id));
    return list.map((branch) => ({ value: branch.id, label: branch.name }));
  }, [branchesState, user?.allowedBranchIds]);

  const filters: ToolbarFilter[] = [
    {
      key: 'branch',
      placeholder: 'Chi nhánh',
      value: branchFilter,
      onChange: setBranchFilter,
      options: branchOptions,
      span: 6,
    },
    {
      key: 'shift',
      placeholder: 'Ca làm việc',
      value: shiftFilter,
      onChange: setShiftFilter,
      options: Object.values(SHIFT_CODE).map((shift) => ({
        value: shift,
        label: SHIFT_SHORT_LABEL[shift],
      })),
    },
    {
      key: 'type',
      placeholder: 'Loại hợp đồng',
      value: typeFilter,
      onChange: setTypeFilter,
      options: Object.values(EMPLOYMENT_TYPE).map((type) => ({
        value: type,
        label: EMPLOYMENT_TYPE_LABEL[type],
      })),
    },
  ];

  const handleEdit = (employee: Employee): void => {
    dispatch(setSelectedEmployee(employee));
    dispatch(setEmployeeModalOpen(true));
  };

  const handleAdd = (): void => {
    dispatch(setSelectedEmployee(null));
    dispatch(setEmployeeModalOpen(true));
  };

  const handleDelete = (id: string): void => {
    dispatch(deleteEmployee(id));
  };

  const columns: ColumnsType<Employee> = [
    {
      title: 'Nhân viên',
      dataIndex: 'fullName',
      width: 250,
      fixed: 'left',
      render: (name: string, row) => (
        <Space size={10}>
          <Avatar className="employee-avatar" size={36}>
            {row.avatarText}
          </Avatar>
          <span className="employee-info">
            <Text strong className="employee-name">
              {name}
            </Text>
            <Text type="secondary" className="employee-sub">
              {row.code} · {row.position}
            </Text>
          </span>
        </Space>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 210,
      render: (value: string) => <Text className="emp-text-12-5">{value}</Text>,
    },
    {
      title: 'Vai trò hệ thống',
      dataIndex: 'role',
      width: 150,
      render: (role: Employee['role']) => (
        <Tag color="red" className="tag-no-margin">
          {USER_ROLE_LABEL[role]}
        </Tag>
      ),
    },
    {
      title: 'Ca mặc định',
      dataIndex: 'defaultShift',
      width: 190,
      render: (shift: ShiftCode) => (
        <Tag color={SHIFT_COLOR[shift]} className="tag-no-margin">
          {SHIFT_LABEL[shift]}
        </Tag>
      ),
    },
    {
      title: 'Hợp đồng',
      dataIndex: 'employmentType',
      width: 130,
      render: (type: Employee['employmentType']) => (
        <Tag
          color={type === EMPLOYMENT_TYPE.FullTime ? 'blue' : 'default'}
          className="tag-no-margin"
        >
          {EMPLOYMENT_TYPE_LABEL[type]}
        </Tag>
      ),
    },
    {
      title: 'Lương giờ',
      dataIndex: 'hourlyWage',
      align: 'right',
      width: 110,
      sorter: (a, b) => a.hourlyWage - b.hourlyWage,
      render: (value: number) => (
        <span className="numeric-cell">{formatVND(value)}</span>
      ),
    },
    {
      title: 'Lương cứng',
      dataIndex: 'baseSalary',
      align: 'right',
      width: 130,
      sorter: (a, b) => a.baseSalary - b.baseSalary,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 190,
      render: (_, row) => (
        <span>
          <Text className="emp-line">{row.phone}</Text>
          <Text type="secondary" className="emp-email">
            {row.email}
          </Text>
        </span>
      ),
    },
    {
      title: 'Vào làm',
      dataIndex: 'joinedAt',
      width: 110,
      sorter: (a, b) => a.joinedAt.localeCompare(b.joinedAt),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 130,
      fixed: 'right',
      render: (status: Employee['status']) => <RecordStatusTag status={status} />,
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
            title="Xoá nhân viên?"
            description={`Xoá "${row.fullName}" khỏi danh sách?`}
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
        { header: 'Mã NV', accessor: (row) => row.code },
        { header: 'Họ tên', accessor: (row) => row.fullName },
        { header: 'Vị trí', accessor: (row) => row.position },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        { header: 'Vai trò', accessor: (row) => USER_ROLE_LABEL[row.role] },
        { header: 'Ca mặc định', accessor: (row) => SHIFT_SHORT_LABEL[row.defaultShift] },
        {
          header: 'Hợp đồng',
          accessor: (row) => EMPLOYMENT_TYPE_LABEL[row.employmentType],
        },
        { header: 'Lương giờ', accessor: (row) => row.hourlyWage },
        { header: 'Lương cứng', accessor: (row) => row.baseSalary },
        { header: 'Điện thoại', accessor: (row) => row.phone },
        { header: 'Email', accessor: (row) => row.email },
        { header: 'Ngày vào làm', accessor: (row) => row.joinedAt },
      ],
      'Danh sach nhan vien Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="DANH MỤC & NHÂN SỰ / MODULE 4"
        title="Quản lý nhân viên"
        description="Danh sách nhân sự, ca làm việc được phân công, chi nhánh và vai trò hệ thống."
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm nhân viên
            </Button>
            <Tag color="red" className="tag-no-margin">
              {filtered.length} / {scoped.length} nhân sự
            </Tag>
          </Space>
        }
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo tên, mã NV, email, số điện thoại..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setBranchFilter(null);
            setShiftFilter(null);
            setTypeFilter(null);
          }}
        />

        <Table<Employee>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="middle"
          scroll={{ x: 1700 }}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showTotal: (total) => `${total} nhân sự`,
          }}
        />
      </Card>

      <EmployeeFormModal />
    </>
  );
};