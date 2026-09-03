import { useEffect, useMemo, useState, type FC } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CalculatorOutlined,
  DollarOutlined,
  EditOutlined,
  LoginOutlined,
  LogoutOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { AttendanceStatusTag } from '@/components/StatusTag';
import { BRAND } from '@/config/brand';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  canApprovePayment,
  canConfirmHours,
  confirmHours,
  fetchPayroll,
  generatePayroll,
  openHourAdjust,
  payrollPaid,
  resetHourAdjust,
} from '@/store/slices/payrollSlice';
import { clockInApi, clockOutApi, scheduleAttendance } from '@/store/slices/attendanceSlice';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  PAYROLL_STATUS,
  PAYROLL_STATUS_COLOR,
  PAYROLL_STATUS_LABEL,
  SHIFT_CODE,
  SHIFT_SHORT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  type AttendanceRecord,
  type AttendanceStatus,
  type PayrollRow,
  type PayrollStatus,
  type ShiftCode,
} from '@/types';
import { today } from '@/utils/dateUtils';
import { formatDate, formatDateTime, formatPeriod, formatTime, nowIso } from '@/utils/dateUtils';
import dayjs from 'dayjs';
import { formatNumber, formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { HourAdjustModal } from './components/HourAdjustModal';
import './AttendancePage.css';

/** Kỳ lương hiện tại theo tháng thực (MM-YYYY). */
const CURRENT_PAYROLL_PERIOD = dayjs().format('MM-YYYY');

const { Text } = Typography;

const ATTENDANCE_DISPLAY_LIMIT = 600;

export const AttendancePage: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const payrollRows = useAppSelector((state) => state.payroll.rows);
  const attendanceRecords = useAppSelector((state) => state.attendance.records);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('my-shifts');

  const handleClockIn = async (id: string): Promise<void> => {
    try {
      await dispatch(clockInApi(id)).unwrap();
      message.success('Đã check-in thành công.');
    } catch (e: any) {
      message.error(e?.message || 'Check-in thất bại');
    }
  };

  const handleClockOut = async (id: string): Promise<void> => {
    try {
      await dispatch(clockOutApi(id)).unwrap();
      message.success('Đã check-out thành công.');
    } catch (e: any) {
      message.error(e?.message || 'Check-out thất bại');
    }
  };

/**
   * Khi user vào trang lần đầu, tự sinh lịch 7 ngày tới.
   * Dùng `user.id` làm idNhanVien (phải khớp với nhan_vien.id trong DB).
   */
  useEffect(() => {
    if (user?.idNhanVien) {
      void dispatch(scheduleAttendance({ idNhanVien: user.idNhanVien, days: 7 }))
        .unwrap()
        .catch((e: any) => {
          console.warn('Không thể sinh lịch ca tự động:', e?.message || e);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.idNhanVien]);

  /** Tải bảng lương tháng từ backend khi vào trang. */
  useEffect(() => {
    void dispatch(fetchPayroll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Người đang thao tác — dùng cho mọi kiểm tra quyền duyệt. */
  const actor = useMemo(
    () => ({
      actorId: user?.id ?? '',
      actorName:
        user === null ? 'Không xác định' : `${user.fullName} (${user.employeeCode})`,
      actorRole: user?.role ?? USER_ROLE.Cashier,
    }),
    [user],
  );

  const myAttendance = useMemo(
    () =>
      attendanceRecords
        .filter((record) => record.employeeId === (user?.idNhanVien ?? user?.id))
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, ATTENDANCE_DISPLAY_LIMIT),
    [attendanceRecords, user?.idNhanVien, user?.id],
  );

  const attendanceRegister = useMemo(
    () =>
      attendanceRecords
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
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, ATTENDANCE_DISPLAY_LIMIT),
    [search, branchFilter, shiftFilter, statusFilter, attendanceRecords],
  );

  const payroll = useMemo(
    () =>
      payrollRows.filter((row) => {
        const matchSearch = matchKeyword(search, [row.employeeName, row.employeeCode]);
        const matchBranch = branchFilter === null || row.branchId === branchFilter;
        const matchStatus =
          payrollStatusFilter === null || row.status === payrollStatusFilter;
        return matchSearch && matchBranch && matchStatus;
      }),
    [payrollRows, search, branchFilter, payrollStatusFilter],
  );

  /** Dòng đang chọn mà người dùng thực sự được duyệt chi. */
  const approvableSelected = useMemo(
    () =>
      payrollRows.filter(
        (row) =>
          selectedIds.includes(row.id) &&
          canApprovePayment(row, actor.actorId, actor.actorRole),
      ),
    [payrollRows, selectedIds, actor],
  );

  const summary = useMemo<SummaryItem[]>(() => {
    const scoped = attendanceRecords.filter(
      (record) => branchFilter === null || record.branchId === branchFilter,
    );
    const late = scoped.filter((record) => record.status === ATTENDANCE_STATUS.Late);
    const absent = scoped.filter(
      (record) => record.status === ATTENDANCE_STATUS.Absent,
    );
    const totalHours = scoped.reduce((sum, record) => sum + record.workedHours, 0);

    const scopedPayroll = payrollRows.filter(
      (row) => branchFilter === null || row.branchId === branchFilter,
    );
    const totalNetPay = scopedPayroll.reduce((sum, row) => sum + row.netPay, 0);
    const pendingConfirm = scopedPayroll.filter(
      (row) => row.status === PAYROLL_STATUS.PendingConfirm,
    );
    const pendingPayment = scopedPayroll.filter(
      (row) => row.status === PAYROLL_STATUS.Confirmed,
    );

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
        title: 'Đi muộn / Vắng',
        value: `${formatNumber(late.length)} / ${formatNumber(absent.length)}`,
        suffix: 'lượt',
        color: BRAND.warning,
      },
      {
        key: 'pending',
        title: 'Chờ xác nhận giờ (Tầng 1)',
        value: formatNumber(pendingConfirm.length),
        suffix: 'bảng',
        color: BRAND.warning,
      },
      {
        key: 'awaiting',
        title: 'Chờ duyệt chi (Tầng 2)',
        value: formatNumber(pendingPayment.length),
        suffix: 'bảng',
        color: BRAND.info,
      },
      {
        key: 'payroll',
        title: `Tổng lương ${formatPeriod(CURRENT_PAYROLL_PERIOD)}`,
        value: formatVND(totalNetPay),
        color: BRAND.success,
      },
    ];
  }, [attendanceRecords, branchFilter, payrollRows]);

  const branches = useAppSelector((state) => state.branch.branches);
  const branchOptions = useMemo(
    () => branches.map((branch) => ({ value: branch.id, label: branch.name })),
    [branches],
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

  const payrollFilters: ToolbarFilter[] = [
    attendanceFilters[0] as ToolbarFilter,
    {
      key: 'payrollStatus',
      placeholder: 'Trạng thái duyệt',
      value: payrollStatusFilter,
      onChange: setPayrollStatusFilter,
      options: Object.values(PAYROLL_STATUS).map((status) => ({
        value: status,
        label: PAYROLL_STATUS_LABEL[status],
      })),
      span: 5,
    },
  ];

  const isOwnAndToday = (row: AttendanceRecord): boolean =>
    row.employeeId === (user?.idNhanVien ?? user?.id) && row.workDate === today();

  const renderClockIn = (value: string | null, row: AttendanceRecord) => {
    if (value === null && isOwnAndToday(row)) {
      return (
        <Button
          type="primary"
          size="small"
          icon={<LoginOutlined />}
          onClick={() => handleClockIn(row.id)}
        >
          Check In
        </Button>
      );
    }
    return formatTime(value);
  };

  const renderClockOut = (value: string | null, row: AttendanceRecord) => {
    if (value === null && isOwnAndToday(row) && row.clockInAt !== null) {
      return (
        <Button
          type="primary"
          size="small"
          icon={<LogoutOutlined />}
          onClick={() => handleClockOut(row.id)}
        >
          Check Out
        </Button>
      );
    }
    if (value === null && row.clockInAt === null) {
      return <Text type="secondary">Chưa check-in</Text>;
    }
    return formatTime(value);
  };

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
      title: 'Check In',
      dataIndex: 'clockInAt',
      align: 'center',
      width: 90,
      render: renderClockIn,
    },
    {
      title: 'Check Out',
      dataIndex: 'clockOutAt',
      align: 'center',
      width: 90,
      render: renderClockOut,
    },
    {
      title: 'Nghỉ',
      dataIndex: 'breakDuration',
      align: 'right',
      width: 70,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="numeric-cell">{value}h</Text>
        ),
    },
    {
      title: 'Thực tế',
      dataIndex: 'actualHours',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {value.toFixed(1)}h
        </Text>
      ),
    },
    {
      title: 'Đã trả lương',
      dataIndex: 'isPaid',
      align: 'center',
      width: 90,
      render: (value: boolean) =>
        value ? (
          <Tag color="green">Có</Tag>
        ) : (
          <Tag>Không</Tag>
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

  /** Tab "Ca của tôi" — chỉ hiện ca của người đang đăng nhập, nút chấm công bật. */
  const myShiftColumns: ColumnsType<AttendanceRecord> = [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      width: 110,
      fixed: 'left',
      render: (value: string) => formatDate(value),
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
      title: 'Check In',
      dataIndex: 'clockInAt',
      align: 'center',
      width: 90,
      render: renderClockIn,
    },
    {
      title: 'Check Out',
      dataIndex: 'clockOutAt',
      align: 'center',
      width: 90,
      render: renderClockOut,
    },
    {
      title: 'Nghỉ',
      dataIndex: 'breakDuration',
      align: 'right',
      width: 70,
      render: (value: number) =>
        value === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="numeric-cell">{value}h</Text>
        ),
    },
    {
      title: 'Thực tế',
      dataIndex: 'actualHours',
      align: 'right',
      width: 90,
      render: (value: number) => (
        <Text strong className="numeric-cell">
          {value.toFixed(1)}h
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 120,
      render: (status: AttendanceStatus) => <AttendanceStatusTag status={status} />,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      width: 200,
      render: (value: string) =>
        value === '' ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="att-note">{value}</Text>
        ),
    },
  ];

  /** Tầng 1 — Quản lý xác nhận giờ làm. */
  const handleConfirm = (row: PayrollRow): void => {
    dispatch(
      confirmHours({
        ...actor,
        id: row.id,
        actorBranchId: user?.branchId ?? null,
      }),
    );
    message.success(`Đã xác nhận giờ làm của ${row.employeeName}.`);
  };

  const handleApprove = (row: PayrollRow): void => {
    dispatch(
      payrollPaid({
        rows: [row],
        approvedBy: actor.actorName,
        paidAt: nowIso(),
      }),
    );
    message.success(
      `Đã duyệt chi ${formatVND(row.netPay)} cho ${row.employeeName}. Phiếu chi lương đã ghi vào sổ quỹ.`,
    );
  };

  const handleApproveBatch = (): void => {
    const rows = approvableSelected;
    const total = rows.reduce((sum, row) => sum + row.netPay, 0);

    dispatch(
      payrollPaid({
        rows,
        approvedBy: actor.actorName,
        paidAt: nowIso(),
      }),
    );
    setSelectedIds([]);
    message.success(
      `Đã duyệt chi ${rows.length} bảng lương, tổng ${formatVND(total)}. Đã ghi ${rows.length} phiếu chi vào sổ quỹ.`,
    );
  };

  /** Tạo bảng lương tháng từ dữ liệu chấm công, rồi tải lại. */
  const handleGeneratePayroll = async (): Promise<void> => {
    try {
      await dispatch(generatePayroll(CURRENT_PAYROLL_PERIOD)).unwrap();
      message.success(`Đã tạo bảng lương ${formatPeriod(CURRENT_PAYROLL_PERIOD)} từ chấm công.`);
    } catch (e: any) {
      message.error(e?.message || 'Lỗi tạo bảng lương');
    }
  };

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
            {row.employeeCode} · {USER_ROLE_LABEL[row.role]}
          </Text>
        </span>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 190,
      render: (value: string) => <Text className="pay-text-12-5">{value}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      width: 150,
      render: (status: PayrollStatus) => (
        <Tag color={PAYROLL_STATUS_COLOR[status]} className="tag-no-margin">
          {PAYROLL_STATUS_LABEL[status]}
        </Tag>
      ),
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
      key: 'hours',
      align: 'right',
      width: 130,
      render: (_, row) =>
        row.adjustedHours === null ? (
          <span className="numeric-cell">{row.totalHours.toFixed(1)}h</span>
        ) : (
          <Tooltip title={`Lý do: ${row.adjustReason}`}>
            <Space direction="vertical" size={0} className="pay-hours-stack">
              <Text strong className="numeric-cell pay-hours-adjusted">
                {row.adjustedHours.toFixed(1)}h
              </Text>
              <Text type="secondary" delete className="pay-hours-origin">
                {row.totalHours.toFixed(1)}h
              </Text>
            </Space>
          </Tooltip>
        ),
    },
    {
      title: 'Ngoài giờ',
      dataIndex: 'overtimeHours',
      align: 'right',
      width: 95,
      render: (value: number) => <span className="numeric-cell">{value}h</span>,
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
          <span className="numeric-cell pay-overtime">{formatVND(value)}</span>
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
          <span className="numeric-cell pay-bonus">+{formatVND(value)}</span>
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
            <span className="numeric-cell pay-deduction">-{formatVND(value)}</span>
          </Tooltip>
        ),
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netPay',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.netPay - b.netPay,
      render: (value: number) => (
        <Text strong className="numeric-cell pay-net">
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Duyệt bởi',
      key: 'approval',
      width: 230,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          {row.confirmedBy !== null && (
            <Text type="secondary" className="pay-approval-line">
              T1: {row.confirmedBy} · {formatDateTime(row.confirmedAt)}
            </Text>
          )}
          {row.paidBy !== null && (
            <Text type="secondary" className="pay-approval-line">
              T2: {row.paidBy} · {formatDateTime(row.paidAt)}
            </Text>
          )}
          {row.confirmedBy === null && row.paidBy === null && (
            <Text type="secondary">—</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'center',
      width: 130,
      fixed: 'right',
      render: (_, row) => {
        const canConfirm = canConfirmHours(
          row,
          actor.actorId,
          actor.actorRole,
          user?.branchId ?? null,
        );
        const canApprove = canApprovePayment(row, actor.actorId, actor.actorRole);
        const isOwnPayroll = row.employeeId === actor.actorId;

        if (row.status === PAYROLL_STATUS.Paid) {
          return <Text type="secondary">Hoàn tất</Text>;
        }

        return (
          <Space size={4}>
            {row.status === PAYROLL_STATUS.PendingConfirm && canConfirm && (
              <>
                <Tooltip title="Điều chỉnh giờ làm">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => dispatch(openHourAdjust(row.id))}
                  />
                </Tooltip>

                {row.adjustedHours !== null && (
                  <Tooltip title="Bỏ điều chỉnh, trả về giờ hệ thống">
                    <Button
                      type="text"
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={() => dispatch(resetHourAdjust(row.id))}
                    />
                  </Tooltip>
                )}

                <Popconfirm
                  title="Xác nhận giờ làm?"
                  description="Bảng lương sẽ chuyển sang chờ Kế toán duyệt chi."
                  okText="Xác nhận"
                  cancelText="Huỷ"
                  onConfirm={() => handleConfirm(row)}
                >
                  <Tooltip title="Xác nhận giờ làm (Tầng 1)">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckCircleOutlined className="pay-action-confirm" />}
                    />
                  </Tooltip>
                </Popconfirm>
              </>
            )}

            {row.status === PAYROLL_STATUS.Confirmed && canApprove && (
              <Popconfirm
                title="Duyệt chi lương?"
                description={`Chi ${formatVND(row.netPay)} cho ${row.employeeName}.`}
                okText="Duyệt chi"
                cancelText="Huỷ"
                onConfirm={() => handleApprove(row)}
              >
                <Button type="primary" size="small" icon={<DollarOutlined />}>
                  Duyệt chi
                </Button>
              </Popconfirm>
            )}

            {isOwnPayroll && (
              <Tooltip title="Không ai được tự duyệt lương cho chính mình.">
                <Text type="secondary" className="pay-own-note">
                  Lương của bạn
                </Text>
              </Tooltip>
            )}

            {!isOwnPayroll && !canConfirm && !canApprove && (
              <Text type="secondary">—</Text>
            )}
          </Space>
        );
      },
    },
  ];

  const handleExportAttendance = (): void => {
    const data = activeTab === 'my-shifts' ? myAttendance : attendanceRegister;
    exportToExcel(
      data,
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
        { header: 'Vai trò', accessor: (row) => USER_ROLE_LABEL[row.role] },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        {
          header: 'Loại hợp đồng',
          accessor: (row) => EMPLOYMENT_TYPE_LABEL[row.employmentType],
        },
        { header: 'Số ca', accessor: (row) => row.totalShifts },
        { header: 'Giờ hệ thống', accessor: (row) => row.totalHours },
        { header: 'Giờ điều chỉnh', accessor: (row) => row.adjustedHours ?? '' },
        { header: 'Lý do điều chỉnh', accessor: (row) => row.adjustReason },
        { header: 'Giờ ngoài', accessor: (row) => row.overtimeHours },
        { header: 'Lương cứng', accessor: (row) => row.baseSalary },
        { header: 'Lương theo ca', accessor: (row) => row.shiftPay },
        { header: 'Lương ngoài giờ', accessor: (row) => row.overtimePay },
        { header: 'Thưởng', accessor: (row) => row.bonus },
        { header: 'Khoản trừ', accessor: (row) => row.deduction },
        { header: 'Thực nhận', accessor: (row) => row.netPay },
        {
          header: 'Trạng thái',
          accessor: (row) => PAYROLL_STATUS_LABEL[row.status],
        },
        { header: 'Xác nhận giờ (T1)', accessor: (row) => row.confirmedBy ?? '' },
        { header: 'Duyệt chi (T2)', accessor: (row) => row.paidBy ?? '' },
      ],
      `Bang luong ${CURRENT_PAYROLL_PERIOD}`,
    );
  };

  const myShiftCount = myAttendance.length;
  const registerCount = attendanceRegister.length;

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
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'my-shifts',
              label: `Ca của tôi (${myShiftCount})`,
              children: (
                <>
                  <TableToolbar
                    searchValue={search}
                    searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
                    onSearchChange={setSearch}
                    filters={[]}
                    onExport={handleExportAttendance}
                    onReset={() => {
                      setSearch('');
                    }}
                  />

                  <Table<AttendanceRecord>
                    columns={myShiftColumns}
                    dataSource={myAttendance}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1000 }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} bản ghi`,
                    }}
                    locale={{ emptyText: 'Chưa có dữ liệu chấm công ca của bạn.' }}
                  />
                </>
              ),
            },
            {
              key: 'register',
              label: `Bảng chấm công (${registerCount})`,
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
                    dataSource={attendanceRegister}
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
                    filters={payrollFilters}
                    onExport={handleExportPayroll}
                    onReset={() => {
                      setSearch('');
                      setBranchFilter(null);
                      setPayrollStatusFilter(null);
                      setSelectedIds([]);
                    }}
                    actions={
                      <>
                        <Button
                          type="default"
                          icon={<CalculatorOutlined />}
                          onClick={() => void handleGeneratePayroll()}
                        >
                          Tạo bảng lương
                        </Button>
                        {approvableSelected.length > 0 && (
                          <Popconfirm
                            title={`Duyệt chi ${approvableSelected.length} bảng lương?`}
                            description={`Tổng chi ${formatVND(
                              approvableSelected.reduce(
                                (sum, row) => sum + row.netPay,
                                0,
                              ),
                            )}. Hành động này không hoàn tác được.`}
                            okText="Duyệt chi"
                            cancelText="Huỷ"
                            onConfirm={handleApproveBatch}
                          >
                            <Button type="primary" icon={<DollarOutlined />}>
                            Duyệt chi {approvableSelected.length} bảng
                          </Button>
                        </Popconfirm>
                        )}
                      </>
                    }
                  />

                  <Table<PayrollRow>
                    columns={payrollColumns}
                    dataSource={payroll}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 2100 }}
                    className="dense-table"
                    rowSelection={{
                      selectedRowKeys: selectedIds,
                      onChange: (keys) => setSelectedIds(keys as string[]),
                      getCheckboxProps: (row) => ({
                        disabled: !canApprovePayment(
                          row,
                          actor.actorId,
                          actor.actorRole,
                        ),
                      }),
                    }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (total) => `${total} nhân sự`,
                    }}
                    summary={(rows) => {
                      const totalNet = rows.reduce((sum, row) => sum + row.netPay, 0);
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={12}>
                            <Text strong>Tổng chi lương (trang hiện tại)</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={12} align="right">
                            <Text strong className="pay-net">
                              {formatVND(totalNet)}
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={13} colSpan={2} />
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

      <HourAdjustModal />
    </>
  );
};