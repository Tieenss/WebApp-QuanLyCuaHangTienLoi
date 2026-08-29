import {
  CASH_CATEGORY,
  CASH_FLOW_DIRECTION,
  DOCUMENT_STATUS,
  PAYMENT_METHOD,
  type CashBookSummary,
  type CashCategory,
  type CashEntry,
  type PaymentMethod,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import { activeStores, branchNameById } from './branches';
import { completedOrders, sumRevenue } from './salesOrders';
import { mockPayroll } from './employees';
import { createRandom, randomInt, randomPick, roundTo } from './seed';

/**
 * Module 12 – Sổ quỹ (Thu/Chi).
 *
 * Phiếu thu doanh thu được sinh từ hoá đơn POS thật (`completedOrders`) để
 * số liệu sổ quỹ khớp với dashboard, không phải số bịa độc lập.
 */

const random = createRandom(31071988);

/** Số ngày lịch sử sổ quỹ. */
const CASHBOOK_DAYS = 30;

/** Số dư quỹ đầu kỳ của toàn hệ thống. */
export const OPENING_BALANCE = 850_000_000;

interface RawCashEntry {
  direction: (typeof CASH_FLOW_DIRECTION)[keyof typeof CASH_FLOW_DIRECTION];
  category: CashCategory;
  branchId: string | null;
  entryDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  counterparty: string;
  referenceCode: string | null;
  description: string;
}

/**
 * Chi phí vận hành định kỳ theo tháng của mỗi cửa hàng.
 *
 * Đặc tả chỉ có 5 hạng mục (`so_quy.hang_muc`), không tách riêng thuê mặt bằng
 * / điện nước / bảo trì, nên tất cả ghi vào `KHAC` và phân biệt bằng `label`.
 */
const monthlyFixedCosts: readonly {
  category: CashCategory;
  label: string;
  counterparty: string;
  min: number;
  max: number;
}[] = [
  {
    category: CASH_CATEGORY.Other,
    label: 'Tiền thuê mặt bằng tháng',
    counterparty: 'Chủ mặt bằng',
    min: 45_000_000,
    max: 95_000_000,
  },
  {
    category: CASH_CATEGORY.Other,
    label: 'Tiền điện, nước, internet',
    counterparty: 'Nhà cung cấp dịch vụ',
    min: 12_000_000,
    max: 26_000_000,
  },
  {
    category: CASH_CATEGORY.Other,
    label: 'Bảo trì tủ mát, máy pha chế',
    counterparty: 'Nhà cung cấp dịch vụ',
    min: 2_500_000,
    max: 9_000_000,
  },
];

const buildRawEntries = (): RawCashEntry[] => {
  const entries: RawCashEntry[] = [];

  // 1) Phiếu thu doanh thu bán hàng – gộp theo ngày và chi nhánh.
  for (let dayOffset = CASHBOOK_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = dayjs().subtract(dayOffset, 'day');
    const isoDate = date.format('YYYY-MM-DD');

    for (const branch of activeStores) {
      const dayOrders = completedOrders.filter(
        (order) => order.branchId === branch.id && order.soldAt.startsWith(isoDate),
      );
      if (dayOrders.length === 0) continue;

      const cashOrders = dayOrders.filter(
        (order) => order.paymentMethod === PAYMENT_METHOD.Cash,
      );
      const cashlessOrders = dayOrders.filter(
        (order) => order.paymentMethod !== PAYMENT_METHOD.Cash,
      );

      if (cashOrders.length > 0) {
        entries.push({
          direction: CASH_FLOW_DIRECTION.Receipt,
          category: CASH_CATEGORY.SalesRevenue,
          branchId: branch.id,
          entryDate: isoDate,
          amount: sumRevenue(cashOrders),
          paymentMethod: PAYMENT_METHOD.Cash,
          counterparty: 'Khách hàng tại quầy',
          referenceCode: `TONGHOP-${isoDate.replace(/-/g, '')}-${branch.code}`,
          description: `Doanh thu tiền mặt ${cashOrders.length} hoá đơn ngày ${date.format('DD/MM')}`,
        });
      }

      if (cashlessOrders.length > 0) {
        entries.push({
          direction: CASH_FLOW_DIRECTION.Receipt,
          category: CASH_CATEGORY.SalesRevenue,
          branchId: branch.id,
          entryDate: isoDate,
          amount: sumRevenue(cashlessOrders),
          paymentMethod: PAYMENT_METHOD.BankTransfer,
          counterparty: 'Cổng thanh toán / Ngân hàng',
          referenceCode: `TONGHOP-${isoDate.replace(/-/g, '')}-${branch.code}-CK`,
          description: `Doanh thu không dùng tiền mặt ${cashlessOrders.length} hoá đơn ngày ${date.format('DD/MM')}`,
        });
      }
    }
  }

  // 2) Phiếu chi thanh toán nhà cung cấp – rải rác trong kỳ.
  const supplierNames = [
    'Công Ty TNHH Pepsico Việt Nam',
    'Công Ty Cổ Phần Sữa Việt Nam (Vinamilk)',
    'Công Ty TNHH Acecook Việt Nam',
    'Công Ty TNHH Nestlé Việt Nam',
    'Công Ty TNHH Thực Phẩm C.P. Việt Nam',
  ];

  for (let index = 0; index < 26; index += 1) {
    const date = dayjs().subtract(randomInt(random, 0, CASHBOOK_DAYS - 1), 'day');
    entries.push({
      direction: CASH_FLOW_DIRECTION.Payment,
      category: CASH_CATEGORY.PurchaseGoods,
      branchId: null,
      entryDate: date.format('YYYY-MM-DD'),
      amount: roundTo(randomInt(random, 28_000_000, 180_000_000), 100_000),
      paymentMethod: PAYMENT_METHOD.BankTransfer,
      counterparty: randomPick(random, supplierNames),
      referenceCode: `PN-${date.format('YYYYMMDD')}-${String(randomInt(random, 1, 48)).padStart(3, '0')}`,
      description: 'Thanh toán đơn nhập hàng từ nhà cung cấp',
    });
  }

  // 3) Chi phí cố định hàng tháng của từng cửa hàng (hạng mục KHAC).
  for (const branch of activeStores) {
    for (const cost of monthlyFixedCosts) {
      const date = dayjs().startOf('month').add(randomInt(random, 0, 6), 'day');
      entries.push({
        direction: CASH_FLOW_DIRECTION.Payment,
        category: cost.category,
        branchId: branch.id,
        entryDate: date.format('YYYY-MM-DD'),
        amount: roundTo(randomInt(random, cost.min, cost.max), 100_000),
        paymentMethod: PAYMENT_METHOD.BankTransfer,
        counterparty: cost.counterparty,
        referenceCode: null,
        description: `${cost.label} — ${branch.name}`,
      });
    }
  }

  // 4) Chi lương – tổng hợp từ bảng lương module 11.
  const payrollDate = dayjs().startOf('month').add(4, 'day');
  for (const branch of activeStores) {
    const branchPayroll = mockPayroll.filter((row) => row.branchId === branch.id);
    if (branchPayroll.length === 0) continue;
    entries.push({
      direction: CASH_FLOW_DIRECTION.Payment,
      category: CASH_CATEGORY.Salary,
      branchId: branch.id,
      entryDate: payrollDate.format('YYYY-MM-DD'),
      amount: branchPayroll.reduce((sum, row) => sum + row.netPay, 0),
      paymentMethod: PAYMENT_METHOD.BankTransfer,
      counterparty: `${branchPayroll.length} nhân viên`,
      referenceCode: `BL-${dayjs().format('YYYYMM')}-${branch.code}`,
      description: `Chi lương kỳ ${dayjs().format('MM/YYYY')} — ${branch.name}`,
    });
  }

  // 5) Chi marketing cấp chuỗi (hạng mục KHAC).
  for (let index = 0; index < 5; index += 1) {
    const date = dayjs().subtract(randomInt(random, 0, CASHBOOK_DAYS - 1), 'day');
    entries.push({
      direction: CASH_FLOW_DIRECTION.Payment,
      category: CASH_CATEGORY.Other,
      branchId: null,
      entryDate: date.format('YYYY-MM-DD'),
      amount: roundTo(randomInt(random, 15_000_000, 60_000_000), 500_000),
      paymentMethod: PAYMENT_METHOD.BankTransfer,
      counterparty: 'Agency truyền thông',
      referenceCode: null,
      description: 'Chi phí truyền thông thương hiệu toàn chuỗi',
    });
  }

  // 6) Nộp tiền mặt từ két cửa hàng vào ngân hàng (hạng mục KHAC).
  for (const branch of activeStores) {
    for (let index = 0; index < 3; index += 1) {
      const date = dayjs().subtract(randomInt(random, 0, CASHBOOK_DAYS - 1), 'day');
      entries.push({
        direction: CASH_FLOW_DIRECTION.Payment,
        category: CASH_CATEGORY.Other,
        branchId: branch.id,
        entryDate: date.format('YYYY-MM-DD'),
        amount: roundTo(randomInt(random, 20_000_000, 90_000_000), 1_000_000),
        paymentMethod: PAYMENT_METHOD.Cash,
        counterparty: 'Ngân hàng Techcombank',
        referenceCode: null,
        description: `Nộp tiền mặt cuối ngày — ${branch.name}`,
      });
    }
  }

  return entries;
};

/** Số thứ tự phiếu theo ngày, tách riêng cho phiếu thu và phiếu chi. */
const buildCashEntries = (): CashEntry[] => {
  const raw = buildRawEntries().sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate),
  );

  const sequenceMap = new Map<string, number>();
  let runningBalance = OPENING_BALANCE;

  const entries: CashEntry[] = raw.map((item, index) => {
    const prefix = item.direction === CASH_FLOW_DIRECTION.Receipt ? 'PT' : 'PC';
    const sequenceKey = `${prefix}-${item.entryDate}`;
    const sequence = (sequenceMap.get(sequenceKey) ?? 0) + 1;
    sequenceMap.set(sequenceKey, sequence);

    // Số dư lũy kế: thu làm tăng, chi làm giảm.
    runningBalance +=
      item.direction === CASH_FLOW_DIRECTION.Receipt ? item.amount : -item.amount;

    return {
      id: `cash-${String(index + 1).padStart(5, '0')}`,
      code: `${prefix}-${item.entryDate.replace(/-/g, '')}-${String(sequence).padStart(3, '0')}`,
      direction: item.direction,
      category: item.category,
      branchId: item.branchId,
      branchName: branchNameById(item.branchId),
      entryDate: item.entryDate,
      amount: item.amount,
      paymentMethod: item.paymentMethod,
      counterparty: item.counterparty,
      referenceCode: item.referenceCode,
      description: item.description,
      status: DOCUMENT_STATUS.Completed,
      createdBy: 'Hệ thống tổng hợp',
      runningBalance,
    };
  });

  // Hiển thị mới nhất trước.
  return entries.reverse();
};

/**
 * Sổ quỹ 30 ngày gần nhất.
 *
 * Dữ liệu SEED — `cashbookSlice` nạp làm state khởi tạo rồi tự quản lý. Bán
 * hàng và duyệt chi lương phải ghi thêm phiếu vào đó, nên component đọc từ
 * `useAppSelector((s) => s.cashbook.entries)` thay vì mảng này.
 */
export const seedCashEntries: CashEntry[] = buildCashEntries();

/** Tổng hợp sổ quỹ theo tập phiếu đã lọc. */
export const summarizeCashBook = (
  entries: readonly CashEntry[],
): CashBookSummary => {
  const totalReceipt = entries
    .filter((entry) => entry.direction === CASH_FLOW_DIRECTION.Receipt)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalPayment = entries
    .filter((entry) => entry.direction === CASH_FLOW_DIRECTION.Payment)
    .reduce((sum, entry) => sum + entry.amount, 0);

  const cashOnHand = entries
    .filter((entry) => entry.paymentMethod === PAYMENT_METHOD.Cash)
    .reduce(
      (sum, entry) =>
        sum +
        (entry.direction === CASH_FLOW_DIRECTION.Receipt ? entry.amount : -entry.amount),
      0,
    );

  const bankBalance = entries
    .filter((entry) => entry.paymentMethod !== PAYMENT_METHOD.Cash)
    .reduce(
      (sum, entry) =>
        sum +
        (entry.direction === CASH_FLOW_DIRECTION.Receipt ? entry.amount : -entry.amount),
      0,
    );

  return {
    openingBalance: OPENING_BALANCE,
    totalReceipt,
    totalPayment,
    closingBalance: OPENING_BALANCE + totalReceipt - totalPayment,
    cashOnHand: Math.max(0, cashOnHand),
    bankBalance: OPENING_BALANCE + bankBalance,
  };
};