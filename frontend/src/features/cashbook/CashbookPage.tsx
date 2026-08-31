import { useMemo, useState, type FC } from 'react';
import { Button, Card, DatePicker, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BankOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { SummaryStrip, type SummaryItem } from '@/components/SummaryStrip';
import { TableToolbar, type ToolbarFilter } from '@/components/TableToolbar';
import { BRAND } from '@/config/brand';
import { useAppSelector } from '@/store/hooks';
import {
  CASH_CATEGORY,
  CASH_CATEGORY_LABEL,
  CASH_FLOW_DIRECTION,
  CASH_FLOW_DIRECTION_LABEL,
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  USER_ROLE,
  type CashEntry,
  type CashFlowDirection,
  type CashBookSummary,
} from '@/types';
import { dayjs, formatDate, lastNDays } from '@/utils/dateUtils';
import { formatVND, matchKeyword } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { CapitalInjectionModal } from './components/CapitalInjectionModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import './CashbookPage.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * Module 12 – Sổ quỹ (Thu/Chi).
 *
 * Bảng nhấn màu theo chiều tiền: thu màu xanh, chi màu đỏ. Cột "Số dư" là số
 * lũy kế theo thời gian nên chỉ đúng khi xem toàn bộ (không lọc chi nhánh).
 *
 * Phiếu được sinh tự động từ 3 nguồn (bán hàng POS, duyệt chi lương, nhập kho);
 * Admin lập tay phiếu cấp vốn.
 */
export const CashbookPage: FC = () => {
  const { user, activeBranchId } = useAppSelector((state) => state.auth);
  const allEntries = useAppSelector((state) => state.cashbook.entries);

  const canInjectCapital = user?.role === USER_ROLE.Admin;
  const [isCapitalModalOpen, setCapitalModalOpen] = useState(false);
  const [isManualModalOpen, setManualModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(activeBranchId);
  const [range, setRange] = useState(() => lastNDays(30));

  const filtered = useMemo(
    () =>
      allEntries.filter((entry) => {
        const matchSearch = matchKeyword(search, [
          entry.code,
          entry.counterparty,
          entry.description,
          entry.referenceCode ?? '',
        ]);
        const matchDirection =
          directionFilter === null || entry.direction === directionFilter;
        const matchCategory =
          categoryFilter === null || entry.category === categoryFilter;
        const matchBranch =
          branchFilter === null || entry.branchId === branchFilter;
        const matchRange =
          entry.entryDate >= range.from && entry.entryDate <= range.to;
        return (
          matchSearch && matchDirection && matchCategory && matchBranch && matchRange
        );
      }),
    [allEntries, search, directionFilter, categoryFilter, branchFilter, range],
  );

  const summarizeCashBook = (entries: CashEntry[]): CashBookSummary => {
    const totalReceipt = entries
      .filter((e) => e.direction === CASH_FLOW_DIRECTION.Receipt)
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPayment = entries
      .filter((e) => e.direction === CASH_FLOW_DIRECTION.Payment)
      .reduce((sum, e) => sum + e.amount, 0);
    const lastEntry = entries[0];
    return {
      openingBalance: 50_000_000,
      totalReceipt,
      totalPayment,
      closingBalance: lastEntry?.runningBalance ?? 50_000_000,
      cashOnHand: entries
        .filter((e) => e.paymentMethod === PAYMENT_METHOD.Cash)
        .reduce((sum, e) => sum + (e.direction === CASH_FLOW_DIRECTION.Receipt ? e.amount : -e.amount), 0),
      bankBalance: entries
        .filter((e) => e.paymentMethod !== PAYMENT_METHOD.Cash)
        .reduce((sum, e) => sum + (e.direction === CASH_FLOW_DIRECTION.Receipt ? e.amount : -e.amount), 0),
    };
  };

  const bookSummary = useMemo(() => summarizeCashBook(filtered), [filtered]);

  const summary = useMemo<SummaryItem[]>(
    () => [
      {
        key: 'receipt',
        title: 'Tổng thu trong kỳ',
        value: formatVND(bookSummary.totalReceipt),
        color: BRAND.success,
      },
      {
        key: 'payment',
        title: 'Tổng chi trong kỳ',
        value: formatVND(bookSummary.totalPayment),
        color: BRAND.error,
      },
      {
        key: 'net',
        title: 'Dòng tiền thuần',
        value: formatVND(bookSummary.totalReceipt - bookSummary.totalPayment),
        color:
          bookSummary.totalReceipt >= bookSummary.totalPayment
            ? BRAND.success
            : BRAND.error,
      },
      {
        key: 'cash',
        title: 'Tiền mặt tại quầy',
        value: formatVND(bookSummary.cashOnHand),
        color: BRAND.primaryRed,
      },
      {
        key: 'closing',
        title: 'Số dư quỹ cuối kỳ',
        value: formatVND(bookSummary.closingBalance),
        color: BRAND.neutralDark,
      },
    ],
    [bookSummary],
  );

  const branches = useAppSelector((state) => state.branch.branches);
  const filters: ToolbarFilter[] = [
    {
      key: 'direction',
      placeholder: 'Thu / Chi',
      value: directionFilter,
      onChange: setDirectionFilter,
      options: Object.values(CASH_FLOW_DIRECTION).map((direction) => ({
        value: direction,
        label: CASH_FLOW_DIRECTION_LABEL[direction],
      })),
    },
    {
      key: 'category',
      placeholder: 'Hạng mục',
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: Object.values(CASH_CATEGORY).map((category) => ({
        value: category,
        label: CASH_CATEGORY_LABEL[category],
      })),
      span: 5,
    },
    {
      key: 'branch',
      placeholder: 'Chi nhánh',
      value: branchFilter,
      onChange: setBranchFilter,
      options: branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      })),
      span: 5,
    },
  ];

  const columns: ColumnsType<CashEntry> = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      width: 165,
      fixed: 'left',
      render: (code: string) => <span className="mono-code">{code}</span>,
    },
    {
      title: 'Ngày',
      dataIndex: 'entryDate',
      width: 105,
      sorter: (a, b) => a.entryDate.localeCompare(b.entryDate),
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Loại',
      dataIndex: 'direction',
      align: 'center',
      width: 110,
      render: (direction: CashFlowDirection) =>
        direction === CASH_FLOW_DIRECTION.Receipt ? (
          <Tag color="green" className="tag-no-margin">
            <ArrowUpOutlined /> Thu
          </Tag>
        ) : (
          <Tag color="red" className="tag-no-margin">
            <ArrowDownOutlined /> Chi
          </Tag>
        ),
    },
    {
      title: 'Hạng mục',
      dataIndex: 'category',
      width: 200,
      render: (category: CashEntry['category']) => (
        <Text className="cash-text-12-5">{CASH_CATEGORY_LABEL[category]}</Text>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'description',
      width: 320,
      render: (value: string, row) => (
        <span>
          <Text className="cash-desc">{value}</Text>
          <Text type="secondary" className="cash-sub">
            {row.counterparty}
            {row.referenceCode !== null && ` · ${row.referenceCode}`}
          </Text>
        </span>
      ),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      width: 190,
      render: (value: string) => (
        <Text className="cash-text-12-5">{value}</Text>
      ),
    },
    {
      title: 'Hình thức',
      dataIndex: 'paymentMethod',
      width: 130,
      render: (method: CashEntry['paymentMethod']) => (
        <Tag
          color={method === PAYMENT_METHOD.Cash ? 'gold' : 'blue'}
          className="tag-no-margin"
        >
          {PAYMENT_METHOD_LABEL[method]}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      align: 'right',
      width: 150,
      sorter: (a, b) => a.amount - b.amount,
      render: (value: number, row) => (
        <Text
          strong
          className={`numeric-cell ${
            row.direction === CASH_FLOW_DIRECTION.Receipt
              ? 'amount-in'
              : 'amount-out'
          }`}
        >
          {row.direction === CASH_FLOW_DIRECTION.Receipt ? '+' : '-'}
          {formatVND(value)}
        </Text>
      ),
    },
    {
      title: 'Số dư luỹ kế',
      dataIndex: 'runningBalance',
      align: 'right',
      width: 160,
      fixed: 'right',
      render: (value: number) => (
        <Text className="numeric-cell cash-balance">
          {formatVND(value)}
        </Text>
      ),
    },
  ];

  const handleExport = (): void => {
    exportToExcel(
      filtered,
      [
        { header: 'Mã phiếu', accessor: (row) => row.code },
        { header: 'Ngày', accessor: (row) => row.entryDate },
        {
          header: 'Loại',
          accessor: (row) => CASH_FLOW_DIRECTION_LABEL[row.direction],
        },
        { header: 'Hạng mục', accessor: (row) => CASH_CATEGORY_LABEL[row.category] },
        { header: 'Nội dung', accessor: (row) => row.description },
        { header: 'Đối tượng', accessor: (row) => row.counterparty },
        { header: 'Chi nhánh', accessor: (row) => row.branchName },
        {
          header: 'Hình thức',
          accessor: (row) => PAYMENT_METHOD_LABEL[row.paymentMethod],
        },
        {
          header: 'Số tiền',
          accessor: (row) =>
            row.direction === CASH_FLOW_DIRECTION.Receipt ? row.amount : -row.amount,
        },
        { header: 'Chứng từ liên quan', accessor: (row) => row.referenceCode ?? '' },
        { header: 'Số dư luỹ kế', accessor: (row) => row.runningBalance },
      ],
      'So quy thu chi Circle K',
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="TÀI CHÍNH & BÁO CÁO / MODULE 12"
        title="Sổ quỹ thu chi"
        description="Theo dõi dòng tiền mặt và chuyển khoản tại cửa hàng cùng tổng công ty."
        extra={
          <Space wrap>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setManualModalOpen(true)}
            >
              Thêm phiếu
            </Button>
            {canInjectCapital && (
              <Button
                type="primary"
                icon={<BankOutlined />}
                onClick={() => setCapitalModalOpen(true)}
              >
                Cấp vốn
              </Button>
            )}
            <RangePicker
              value={[dayjs(range.from), dayjs(range.to)]}
              format="DD/MM/YYYY"
              allowClear={false}
              onChange={(values) => {
                if (values === null) return;
                const [from, to] = values;
                if (from === null || to === null) return;
                setRange({
                  from: from.format('YYYY-MM-DD'),
                  to: to.format('YYYY-MM-DD'),
                });
              }}
            />
          </Space>
        }
      />

      <SummaryStrip items={summary} columns={5} />

      <Card styles={{ body: { padding: '18px 18px 8px' } }}>
        <TableToolbar
          searchValue={search}
          searchPlaceholder="Tìm theo mã phiếu, nội dung, đối tượng..."
          onSearchChange={setSearch}
          filters={filters}
          onExport={handleExport}
          onReset={() => {
            setSearch('');
            setDirectionFilter(null);
            setCategoryFilter(null);
            setBranchFilter(null);
            setRange(lastNDays(30));
          }}
        />

        <Table<CashEntry>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          size="small"
          scroll={{ x: 1800 }}
          className="dense-table"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `${total} phiếu thu chi`,
          }}
        />
      </Card>

      <CapitalInjectionModal
        open={isCapitalModalOpen}
        onClose={() => setCapitalModalOpen(false)}
      />
      <ManualEntryModal
        open={isManualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />
    </>
  );
};