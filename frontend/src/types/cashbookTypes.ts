import type { DocumentStatus, ID, VND } from './commonTypes';
import type { PaymentMethod } from './posTypes';

/**
 * Module 12 — Sổ quỹ (Thu/Chi).
 *
 * Mỗi phiếu thu/chi gắn với một chi nhánh hoặc tổng công ty (`branchId = null`).
 * Số dư quỹ được tính lũy kế theo thứ tự thời gian.
 */
export const CASH_FLOW_DIRECTION = {
  Receipt: 'RECEIPT',
  Payment: 'PAYMENT',
} as const;

export type CashFlowDirection =
  (typeof CASH_FLOW_DIRECTION)[keyof typeof CASH_FLOW_DIRECTION];

export const CASH_FLOW_DIRECTION_LABEL: Record<CashFlowDirection, string> = {
  RECEIPT: 'Phiếu thu',
  PAYMENT: 'Phiếu chi',
};

/** Hạng mục thu/chi, phục vụ báo cáo cấu trúc chi phí. */
export const CASH_CATEGORY = {
  SalesRevenue: 'SALES_REVENUE',
  SupplierPayment: 'SUPPLIER_PAYMENT',
  Salary: 'SALARY',
  Rent: 'RENT',
  Utilities: 'UTILITIES',
  Marketing: 'MARKETING',
  Maintenance: 'MAINTENANCE',
  BankTransferIn: 'BANK_TRANSFER_IN',
  Other: 'OTHER',
} as const;

export type CashCategory = (typeof CASH_CATEGORY)[keyof typeof CASH_CATEGORY];

export const CASH_CATEGORY_LABEL: Record<CashCategory, string> = {
  SALES_REVENUE: 'Doanh thu bán hàng',
  SUPPLIER_PAYMENT: 'Thanh toán nhà cung cấp',
  SALARY: 'Chi lương nhân viên',
  RENT: 'Tiền thuê mặt bằng',
  UTILITIES: 'Điện / Nước / Internet',
  MARKETING: 'Marketing & Khuyến mãi',
  MAINTENANCE: 'Bảo trì thiết bị',
  BANK_TRANSFER_IN: 'Nộp tiền vào ngân hàng',
  OTHER: 'Khác',
};

/** Hạng mục nào hợp lệ với chiều thu, hạng mục nào với chiều chi. */
export const CASH_CATEGORY_BY_DIRECTION: Record<CashFlowDirection, CashCategory[]> = {
  RECEIPT: [
    CASH_CATEGORY.SalesRevenue,
    CASH_CATEGORY.BankTransferIn,
    CASH_CATEGORY.Other,
  ],
  PAYMENT: [
    CASH_CATEGORY.SupplierPayment,
    CASH_CATEGORY.Salary,
    CASH_CATEGORY.Rent,
    CASH_CATEGORY.Utilities,
    CASH_CATEGORY.Marketing,
    CASH_CATEGORY.Maintenance,
    CASH_CATEGORY.Other,
  ],
};

/** Một phiếu thu hoặc phiếu chi trong sổ quỹ. */
export interface CashEntry {
  id: ID;
  /** Mã phiếu dạng PT-20260826-001 (thu) hoặc PC-20260826-001 (chi). */
  code: string;
  direction: CashFlowDirection;
  category: CashCategory;
  /** `null` nghĩa là quỹ tổng công ty. */
  branchId: ID | null;
  branchName: string;
  /** Ngày hạch toán dạng YYYY-MM-DD. */
  entryDate: string;
  amount: VND;
  paymentMethod: PaymentMethod;
  /** Đối tượng nộp / nhận tiền. */
  counterparty: string;
  /** Mã phiếu nghiệp vụ liên quan (hoá đơn, phiếu nhập...). */
  referenceCode: string | null;
  description: string;
  status: DocumentStatus;
  createdBy: string;
  /** Số dư quỹ lũy kế sau phiếu này. */
  runningBalance: VND;
}

export type CashEntryFormValues = Omit<
  CashEntry,
  'id' | 'code' | 'runningBalance' | 'branchName' | 'createdBy' | 'status'
>;

/** Tổng hợp sổ quỹ theo kỳ, hiển thị trên các StatCard. */
export interface CashBookSummary {
  openingBalance: VND;
  totalReceipt: VND;
  totalPayment: VND;
  closingBalance: VND;
  cashOnHand: VND;
  bankBalance: VND;
}