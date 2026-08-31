import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  CASH_CATEGORY,
  CASH_FLOW_DIRECTION,
  DOCUMENT_STATUS,
  PAYMENT_IS_CASH,
  PAYMENT_METHOD,
  type CashEntry,
  type CashFlowDirection,
  type PayrollRow,
} from '@/types';
import { payrollPaid } from './payrollSlice';
import { saleCompleted } from './posSlice';
import { purchaseReceived } from './purchaseSlice';
import { orderRefunded } from './salesOrderSlice';

/** Số dư quỹ đầu kỳ toàn hệ thống. */
export const OPENING_BALANCE = 50_000_000;

/**
 * Module 12 — Sổ quỹ (dữ liệu ghi được).
 *
 * Mọi dòng tiền của hệ thống đi qua đây. Ba nguồn sinh phiếu tự động theo đặc
 * tả (`luong_nghiep_vu.md`):
 * - Bán hàng POS      → phiếu THU, hạng mục BAN_HANG
 * - Duyệt chi lương   → phiếu CHI, hạng mục TRA_LUONG (mỗi nhân viên một phiếu)
 * - Nhập kho từ NCC   → phiếu CHI, hạng mục NHAP_HANG
 *
 * Ngoài ra Admin tạo tay phiếu THU hạng mục CAP_VON — cơ chế "khoá van" để
 * kiểm soát dòng tiền: không cấp vốn thì Kế toán không có tiền duyệt chi.
 *
 * `runningBalance` được tính lại toàn bộ mỗi khi danh sách đổi (`reindex`), vì
 * số dư luỹ kế phụ thuộc thứ tự thời gian — chèn một phiếu vào giữa sẽ làm sai
 * mọi phiếu sau nó.
 */

export interface CashbookState {
  /** Sổ quỹ, mới nhất trước. */
  entries: CashEntry[];
}

/**
 * Sinh mã phiếu `PT-YYYYMMDD-NNN` (thu) hoặc `PC-YYYYMMDD-NNN` (chi).
 * Số thứ tự đếm riêng theo từng ngày và từng chiều.
 */
const nextCode = (
  entries: readonly CashEntry[],
  direction: CashFlowDirection,
  entryDate: string,
): string => {
  const prefix = direction === CASH_FLOW_DIRECTION.Receipt ? 'PT' : 'PC';
  const sameDay = entries.filter(
    (entry) => entry.direction === direction && entry.entryDate === entryDate,
  ).length;
  return `${prefix}-${entryDate.replace(/-/g, '')}-${String(sameDay + 1).padStart(3, '0')}`;
};

/**
 * Tính lại `runningBalance` cho toàn bộ sổ quỹ.
 *
 * Sắp xếp tăng theo ngày để cộng dồn, rồi đảo lại thành mới-nhất-trước cho
 * bảng hiển thị. Phiếu cùng ngày giữ nguyên thứ tự tương đối (sort ổn định).
 */
const reindex = (entries: CashEntry[]): CashEntry[] => {
  const ascending = [...entries].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate),
  );

  let balance = OPENING_BALANCE;
  for (const entry of ascending) {
    balance +=
      entry.direction === CASH_FLOW_DIRECTION.Receipt ? entry.amount : -entry.amount;
    entry.runningBalance = balance;
  }

  return ascending.reverse();
};

const initialState: CashbookState = {
  entries: [],
};

/** Dữ liệu tối thiểu để tạo một phiếu mới; phần còn lại slice tự điền. */
interface NewEntryInput {
  direction: CashFlowDirection;
  category: CashEntry['category'];
  branchId: string | null;
  entryDate: string;
  amount: number;
  paymentMethod: CashEntry['paymentMethod'];
  counterparty: string;
  referenceCode: string | null;
  description: string;
  createdBy: string;
}

/** Dựng phiếu hoàn chỉnh và chèn vào sổ, luôn kèm tính lại số dư. */
const insertEntry = (state: CashbookState, input: NewEntryInput): void => {
  const entry: CashEntry = {
    id: `cash-live-${Date.now()}-${state.entries.length}`,
    code: nextCode(state.entries, input.direction, input.entryDate),
    direction: input.direction,
    category: input.category,
    branchId: input.branchId,
    branchName: input.branchId || '',
    entryDate: input.entryDate,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    counterparty: input.counterparty,
    referenceCode: input.referenceCode,
    description: input.description,
    status: DOCUMENT_STATUS.Completed,
    createdBy: input.createdBy,
    runningBalance: 0,
  };

  state.entries.push(entry);
  state.entries = reindex(state.entries);
};

/**
 * Phiếu chi lương cho một nhân viên.
 *
 * Trả lương bằng chuyển khoản (Cách A trong luồng nghiệp vụ) — việc chuyển tiền
 * thực hiện ngoài hệ thống, sổ quỹ chỉ ghi nhận.
 */
const insertPayrollEntry = (
  state: CashbookState,
  row: PayrollRow,
  entryDate: string,
  createdBy: string,
): void => {
  insertEntry(state, {
    direction: CASH_FLOW_DIRECTION.Payment,
    category: CASH_CATEGORY.Salary,
    branchId: row.branchId,
    entryDate,
    amount: row.netPay,
    paymentMethod: PAYMENT_METHOD.BankTransfer,
    counterparty: `${row.employeeName} (${row.employeeCode})`,
    referenceCode: `BL-${row.period.replace('-', '')}-${row.employeeCode}`,
    description: `Chi lương kỳ ${row.period} cho ${row.employeeName}`,
    createdBy,
  });
};

export const cashbookSlice = createSlice({
  name: 'cashbook',
  initialState,
  reducers: {
    /**
     * Admin cấp vốn — phiếu THU hạng mục CAP_VON.
     * Chỉ Admin gọi được; kiểm tra quyền ở tầng component.
     */
    addCapitalInjection: (
      state,
      action: PayloadAction<{
        amount: number;
        entryDate: string;
        description: string;
        createdBy: string;
      }>,
    ) => {
      insertEntry(state, {
        direction: CASH_FLOW_DIRECTION.Receipt,
        category: CASH_CATEGORY.CapitalInjection,
        // Cấp vốn thuộc quỹ tổng công ty, không gắn chi nhánh nào.
        branchId: null,
        entryDate: action.payload.entryDate,
        amount: action.payload.amount,
        paymentMethod: PAYMENT_METHOD.BankTransfer,
        counterparty: 'Chủ đầu tư / Giám đốc',
        referenceCode: null,
        description:
          action.payload.description === ''
            ? 'Cấp vốn hoạt động cho quỹ tổng công ty'
            : action.payload.description,
        createdBy: action.payload.createdBy,
      });
    },

    /** Phiếu thu/chi lập tay (hạng mục KHAC hoặc chi phí vận hành). */
    addManualEntry: (state, action: PayloadAction<NewEntryInput>) => {
      insertEntry(state, action.payload);
    },

    /**
     * Kế toán duyệt chi lương — một phiếu CHI cho mỗi nhân viên.
     *
     * Giữ lại làm action độc lập cho trường hợp cần lập phiếu tay; luồng chính
     * đi qua `payrollPaid` ở `extraReducers` bên dưới.
     */
    addPayrollPayments: (
      state,
      action: PayloadAction<{
        rows: PayrollRow[];
        entryDate: string;
        createdBy: string;
      }>,
    ) => {
      for (const row of action.payload.rows) {
        insertPayrollEntry(
          state,
          row,
          action.payload.entryDate,
          action.payload.createdBy,
        );
      }
    },

    /** Thủ kho lưu phiếu nhập — sinh phiếu CHI hạng mục NHAP_HANG. */
    addPurchasePayment: (
      state,
      action: PayloadAction<{
        branchId: string;
        supplierName: string;
        amount: number;
        entryDate: string;
        referenceCode: string;
        createdBy: string;
      }>,
    ) => {
      insertEntry(state, {
        direction: CASH_FLOW_DIRECTION.Payment,
        category: CASH_CATEGORY.PurchaseGoods,
        branchId: action.payload.branchId,
        entryDate: action.payload.entryDate,
        amount: action.payload.amount,
        paymentMethod: PAYMENT_METHOD.BankTransfer,
        counterparty: action.payload.supplierName,
        referenceCode: action.payload.referenceCode,
        description: `Thanh toán nhập hàng từ ${action.payload.supplierName}`,
        createdBy: action.payload.createdBy,
      });
    },
  },

  extraReducers: (builder) => {
    /**
     * Bước 4 của transaction bán hàng: phiếu THU hạng mục BAN_HANG.
     *
     * Hình thức thanh toán của phiếu quỹ lấy đúng theo hoá đơn, để cột "Tiền
     * mặt tại quầy" trên trang Sổ quỹ phản ánh đúng số tiền trong két.
     */
    builder.addCase(saleCompleted, (state, action) => {
      const { order } = action.payload;

      insertEntry(state, {
        direction: CASH_FLOW_DIRECTION.Receipt,
        category: CASH_CATEGORY.SalesRevenue,
        branchId: order.branchId,
        entryDate: order.soldAt.slice(0, 10),
        amount: order.grandTotal,
        paymentMethod: order.paymentMethod,
        counterparty: PAYMENT_IS_CASH[order.paymentMethod]
          ? 'Khách lẻ (tiền mặt)'
          : 'Khách lẻ (không dùng tiền mặt)',
        referenceCode: order.code,
        description: `Doanh thu hoá đơn ${order.code} · ${order.lines.length} mặt hàng`,
        createdBy: order.cashierName,
      });
    });

    /**
     * Kế toán duyệt chi lương → phiếu CHI hạng mục TRA_LUONG cho mỗi nhân viên.
     * Cùng lúc `payrollSlice` chuyển bảng lương sang `DA_THANH_TOAN`.
     */
    builder.addCase(payrollPaid, (state, action) => {
      const entryDate = action.payload.paidAt.slice(0, 10);
      for (const row of action.payload.rows) {
        insertPayrollEntry(state, row, entryDate, action.payload.approvedBy);
      }
    });

    /**
     * Bước 4 của transaction nhập kho: phiếu CHI hạng mục NHAP_HANG.
     *
     * Thanh toán ngay khi nhập hàng (MVP không theo dõi công nợ NCC), nên phiếu
     * chi sinh cùng lúc với phiếu nhập thay vì để Kế toán lập tay về sau.
     */
    builder.addCase(purchaseReceived, (state, action) => {
      const { order } = action.payload;

      insertEntry(state, {
        direction: CASH_FLOW_DIRECTION.Payment,
        category: CASH_CATEGORY.PurchaseGoods,
        branchId: order.branchId,
        entryDate: order.orderDate,
        amount: order.grandTotal,
        paymentMethod: PAYMENT_METHOD.BankTransfer,
        counterparty: order.supplierName,
        referenceCode: order.code,
        description: `Thanh toán nhập hàng ${order.code} · ${order.lines.length} mặt hàng`,
        createdBy: action.payload.performedBy,
      });
    });

    /**
     * Transaction hoàn tiền hoá đơn: phiếu CHI hạng mục KHAC (hoàn tiền).
     *
     * MVP chỉ hỗ trợ hoàn toàn bộ hoá đơn, ghi nhận tiền mặt đơn giản — kể
     * cả khi khách trả bằng MoMo/VNPay… vẫn ghi chi tiền mặt để đơn giản
     * hoá sổ sách. Việc chuyển tiền thực tế qua cổng thanh toán nằm ngoài
     * phạm vi hệ thống này.
     */
    builder.addCase(orderRefunded, (state, action) => {
      const { order } = action.payload;

      insertEntry(state, {
        direction: CASH_FLOW_DIRECTION.Payment,
        category: CASH_CATEGORY.Other,
        branchId: order.branchId,
        entryDate: action.payload.refundedAt.slice(0, 10),
        amount: order.grandTotal,
        paymentMethod: PAYMENT_METHOD.Cash,
        counterparty: `Khách hoàn đơn ${order.code}`,
        referenceCode: order.code,
        description: `Hoàn tiền hoá đơn ${order.code} · ${order.lines.length} mặt hàng`,
        createdBy: action.payload.performedBy,
      });
    });
  },
});

export const {
  addCapitalInjection,
  addManualEntry,
  addPayrollPayments,
  addPurchasePayment,
} = cashbookSlice.actions;

export default cashbookSlice.reducer;
