import { useMemo, useState, type FC } from 'react';
import { Card, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { AttendanceStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppSelector } from '@/store/hooks';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  SHIFT_CODE,
  SHIFT_SHORT_LABEL,
  type AttendanceRecord,
  type AttendanceStatus,
  type PayrollRow,
  type ShiftCode,
} from '@/types';
import { mockBranches } from '@/mockData/branches';
import {
  CURRENT_PAYROLL_PERIOD,
  mockAttendance,
  mockPayroll,
} from '@/mockData/employees';
import { formatDate, formatPeriod, formatTime } from '@/utils/dateUtils';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import './AttendancePage.css';

const { Text } = Typography;

/** Số bản ghi chấm công tối đa hiển thị — 30 ngày × ~30 nhân sự là rất lớn. */
const ATTENDANCE_DISPLAY_LIMIT = 600;

/**
 * Module 11 — Chấm công & Bảng lương.
 *
 * Tab chấm công là dữ liệu gốc; tab bảng lương là kết quả tính từ chính dữ liệu
 * đó (giờ làm × lương giờ × hệ số ca, trừ vi phạm), nên hai tab luôn khớp nhau.
 */
export const AttendancePage: FC = () => {
  const activeBranchId = useAppSelector((state) => state.auth.activeBranchId);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const attendance = useMemo(
    () =>
      mockAttendance
        .filter((record) => {
          const matchSearch = matchKeyword(search, [
            record.employeeName,
            record.employeeCode,
          ]);
          const matchBranch =
            branchFilter === null || record.branchId === branchFilter;
          const matchShift = shiftFilter === null || record.shift === shiftFilter;
          const matchStatus = statusFilter === null || record.status === statusFilter;
          return matchSearch && matchBranch && matchShift && matchStatus;
        })
        // Mới nhất trước để nhân sự trực ca hiện tại nằm trên đầu.
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, ATTENDANCE_DISPLAY_LIMIT),
    [search, branchFilter, shiftFilter, statusFilter],
  );

  const payroll = useMemo(
    () =>
      mockPayroll.filter((row) => {
        const matchSearch = matchKeyword(search, [row.employeeName, row.employeeCode]);
        const matchBranch = branchFilter === null || row.branchId === branchFilter;
        return matchSearch && matchBranch;
      }),
    [search, branchFilter],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const scoped = mockAttendance.filter(
      (record) => branchFilter === null || record.branchId === branchFilter,
    );
    const late = scoped.filter((record) => record.status === ATTENDANCE_STATUS.Late);
    const absent = scoped.filter(
      (record) => record.status === ATTENDANCE_STATUS.Absent,
    );
    const totalHours = scoped.reduce((sum, record) => sum + record.workedHours, 0);

    const scopedPayroll = mockPayroll.filter(
      (row) => branchFilter === null || row.branchId === branchFilter,
    );
    const totalNetPay = scopedPayroll.reduce((sum, row) => sum + row.netPay, 0);

    return [
      {
        key: 'hours',
        title: 'Tổng giờ làm 30 ngày',
        value: formatNumber(Math.round(totalHours)),
        suffix: 'giờ',
        color: BRAND.primaryRed,
      },
      {
        key: 'late',
        title: 'Số lần đi muộn',
        value: formatNumber(late.length),
        suffix: 'lượt',
        color: BRAND.warning,
      },
      {
        key: 'absent',
        title: 'Vắng không phép',
        value: formatNumber(absent.length),
        suffix: 'lượt',
        color: BRAND.error,
      },
      {
        key: 'payroll',
        title: `Tổng lương ${formatPeriod(CURRENT_PAYROLL_PERIOD)}`,
        value: formatVND(totalNetPay),
        color: BRAND.success,
      },
    ];
  }, [branchFilter]);

  const branchOptions = useMemo(
    () => mockBranches.map((branch) => ({ value: branch.id, label: branch.name })),
    [],
  );

  const attendanceFilters: ToolbarFilter[] = [
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
      key: 'status',
      placeholder: 'Trạng thái',
      value: statusFilter,
      onChange: setStatusFilter,
      options: Object.values(ATTENDANCE_STATUS).map((status) => ({
        value: status,
        label: ATTENDANCE_STATUS_LABEL[status],
      })),
    },
  ];

  const attendanceColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      width: 110,
      fixed: 'left',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      width: 230,
      render: (name: string, row) => (
        <span>
          <Text strong className="att-name">
            {name}
          </Text>
          <Text type="secondary" className="att-sub">
            {row.employeeCode}
          </Text>
        </span>
      ),
    },
    {
      title: 'Ca',
      dataIndex: 'shift',
      align: 'center',
      width: 90,
      render: (shift: ShiftCode) => (
        <Tag color={shift === SHIFT_CODE.Night ? 'geekblue' : 'gold'} className="tag-no-margin">
          {SHIFT_SHORT_LABEL[shift]}
        </Tag>
      ),
    },
    {
      title: 'Giờ vào',
      dataIndex: 'checkInAt',
      align: 'center',
      width: 90,
      render: (value: string | null) =>
        value === null ? <Text type="secondary">—</Text> : formatTime(value),
    },
    {
      title: 'Giờ ra',
      dataIndex: 'checkOutAt',
      align: 'center',
      width: 90,
      render: (value: string | null) =>
        value === null ? <Text type="secondary">—</Text> : formatTime(value),
    },
    {
      title: 'Giờ làm',
      dataIndex: 'workedHours',
      align: 'right',
      width: 95,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {value.toFixed(1)}h
        </Text>
      ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimeHours',
      align: 'right',
      width: 95,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="numeric-cell overtime-info">
            +{value}h
          </Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 140,
      render: (status: AttendanceStatus) => <AttendanceStatusTag status={status} />,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      width: 220,
      render: (value: string) =>
        value === '' ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="att-note">{value}</Text>
        ),
    },
  ];

  const payrollColumns: ColumnsType<PayrollRow> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      width: 230,
      fixed: 'left',
      render: (name: string, row) => (
        <span>
          <Text strong className="pay-name">
            {name}
          </Text>
          <Text type="secondary" className="pay-sub">
            {row.employeeCode} · {EMPLOYMENT_TYPE_LABEL[row.employmentType]}
          </Text>
        </span>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 200,
      render: (value: string) => <Text className="pay-text-12-5">{value}</Text>,
    },
    {
      title: 'Số ca',
      dataIndex: 'totalShifts',
      align: 'center',
      width: 80,
      sorter: (a, b) => a.totalShifts - b.totalShifts,
    },
    {
      title: 'Giờ làm',
      dataIndex: 'totalHours',
      align: 'right',
      width: 95,
      render: (value: number) => (
        <span className="numeric-cell">{value.toFixed(1)}h</span>
      ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimeHours',
      align: 'right',
      width: 95,
      render: (value: number) => (
        <span className="numeric-cell">{value}h</span>
      ),
    },
    {
      title: 'Lương cứng',
      dataIndex: 'baseSalary',
      align: 'right',
      width: 130,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Lương theo ca',
      dataIndex: 'shiftPay',
      align: 'right',
      width: 130,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">{formatVND(value)}</span>
        ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimePay',
      align: 'right',
      width: 120,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell pay-overtime">
            {formatVND(value)}
          </span>
        ),
    },
    {
      title: 'Thưởng',
      dataIndex: 'bonus',
      align: 'right',
      width: 120,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell pay-bonus">
            +{formatVND(value)}
          </span>
        ),
    },
    {
      title: 'Trừ',
      dataIndex: 'deduction',
      align: 'right',
      width: 120,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Tooltip title="Trừ do đi muộn hoặc vắng không phép">
            <span className="numeric-cell pay-deduction">
              -{formatVND(value)}
            </span>
          </Tooltip>
        ),
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netPay',
      align: 'right',
      width: 150,
      fixed: 'right',
      sorter: (a, b) => a.netPay - b.netPay,
      render: (value: number) => (
        <Text strong className="numeric-cell pay-net">
          {formatVND(value)}
        </Text>
      ),
    },
  ];

  const handleExportAttendance = (): void => {
    exportToExcel(
      attendance,
      [
        { header: 'Ngày', accessor: (row) => row.workDate },
        { header: 'Mã NV', accessor: (row) => row.employeeCode },
        { header: 'Nhân viên', accessor: (row) => row.employeeName },
        { header: 'Ca', accessor: (row) => SHIFT_SHORT_LABEL[row.shift] },
        {
          header: 'Giờ vào',
          accessor: (row) => (row.checkInAt === null ? '' : formatTime(row.checkInAt)),
        },
        {
          header: 'Giờ ra',
          accessor: (row) => (row.checkOutAt === null ? '' : formatTime(row.checkOutAt)),
        },
        { header: 'Giờ làm', accessor: (row) => row.workedHours },
        { header: 'Ngoài giờ', accessor: (row) => row.overtimeHours },
        {
          header: 'Trạng thái',
          accessor: (row) => ATTENDANCE_STATUS_LABEL[row.status],
        },
        { header: 'Ghi chú', accessor: (row) => row.note },
      ],
      'Bang cham cong Circle K',
    );
  };

  const handleExportPayroll = (): void => {
    exportToExcel(
      payroll,
      [
        { header: 'Kỳ lương', accessor: (row) => row.period },
        { header: 'Mã NV', accessor: (row) => row.employeeCode },
        { header: 'Nhân viên', accessor: (row) => row.employeeName },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        {
          header: 'Loại hợp đồng',
          accessor: (row) => EMPLOYMENT_TYPE_LABEL[row.employmentType],
        },
        { header: 'Số ca', accessor: (row) => row.totalShifts },
        { header: 'Giờ làm', accessor: (row) => row.totalHours },
        { header: 'Giờ ngoài', accessor: (row) => row.overtimeHours },
        { header: 'Lương cứng', accessor: (row) => row.baseSalary },
        { header: 'Lương theo ca', accessor: (row) => row.shiftPay },
        { header: 'Lương ngoài giờ', accessor: (row) => row.overtimePay },
        { header: 'Thưởng', accessor: (row) => row.bonus },
        { header: 'Khoản trừ', accessor: (row) => row.deduction },
        { header: 'Thực nhận', accessor: (row) => row.netPay },
      ],
      `Bang luong ${CURRENT_PAYROLL_PERIOD} Circle K`,
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="TÀI CHÍNH & BÁO CÁO / MODULE 11"
        title="Chấm công & bảng lương"
        description={`Theo dõi ca làm việc 30 ngày gần nhất và bảng lương dự kiến ${formatPeriod(CURRENT_PAYROLL_PERIOD)}.`}
      />

      <SummaryStrip items={summary} />

      <Card styles={{ body: { padding: '8px 18px 8px' } }}>
        <Tabs
          defaultActiveKey="attendance"
          items={[
            {
              key: 'attendance',
              label: `Chấm công (${attendance.length})`,
              children: (
                <>
                  <TableToolbar
                    searchValue={search}
                    searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
                    onSearchChange={setSearch}
                    filters={attendanceFilters}
                    onExport={handleExportAttendance}
                    onReset={() => {
                      setSearch('');
                      setBranchFilter(null);
                      setShiftFilter(null);
                      setStatusFilter(null);
                    }}
                  />

                  <Table<AttendanceRecord>
                    columns={attendanceColumns}
                    dataSource={attendance}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1420 }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} bản ghi`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'payroll',
              label: `Bảng lương ${formatPeriod(CURRENT_PAYROLL_PERIOD)}`,
              children: (
                <>
                  <TableToolbar
                    searchValue={search}
                    searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
                    onSearchChange={setSearch}
                    filters={[attendanceFilters[0] as ToolbarFilter]}
                    onExport={handleExportPayroll}
                    onReset={() => {
                      setSearch('');
                      setBranchFilter(null);
                    }}
                  />

                  <Table<PayrollRow>
                    columns={payrollColumns}
                    dataSource={payroll}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1700 }}
                    className="dense-table"
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} nhân sự`,
                    }}
                    summary={(rows) => {
                      // Dòng tổng giúp đối chiếu nhanh với phiếu chi lương ở sổ quỹ.
                      const totalNet = rows.reduce((sum, row) => sum + row.netPay, 0);
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={10}>
                            <Text strong>Tổng chi lương</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={10} align="right">
                            <Text strong className="pay-net">
                              {formatVND(totalNet)}
                            </Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
};