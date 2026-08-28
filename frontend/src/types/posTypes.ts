import type { ID, VND } from './commonTypes';

/**
 * Module 2 — Bán hàng (POS).
 *
 * Giỏ hàng POS được giữ trong Redux (`posSlice`) để thu ngân có thể
 * chuyển tab mà không mất đơn đang thao tác.
 */
export const PAYMENT_METHOD = {
  Cash: 'CASH',
  Card: 'CARD',
  MoMo: 'MOMO',
  ZaloPay: 'ZALOPAY',
  VnPay: 'VNPAY',
  BankTransfer: 'BANK_TRANSFER',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ ngân hàng',
  MOMO: 'Ví MoMo',
  ZALOPAY: 'ZaloPay',
  VNPAY: 'VNPay QR',
  BANK_TRANSFER: 'Chuyển khoản',
};

/** Nhóm phương thức để đối chiếu sổ quỹ: tiền mặt vào két, còn lại vào tài khoản. */
export const PAYMENT_IS_CASH: Record<PaymentMethod, boolean> = {
  CASH: true,
  CARD: false,
  MOMO: false,
  ZALOPAY: false,
  VNPAY: false,
  BANK_TRANSFER: false,
};

export const ORDER_STATUS = {
  Completed: 'COMPLETED',
  Refunded: 'REFUNDED',
  Cancelled: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  COMPLETED: 'Hoàn tất',
  REFUNDED: 'Đã hoàn tiền',
  CANCELLED: 'Đã huỷ',
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  COMPLETED: 'green',
  REFUNDED: 'gold',
  CANCELLED: 'red',
};

/** Một dòng trong giỏ hàng đang thao tác tại quầy. */
export interface CartLine {
  productId: ID;
  sku: string;
  barcode: string;
  productName: string;
  unit: string;
  unitPrice: VND;
  quantity: number;
  /** Giảm giá theo dòng (số tiền tuyệt đối). */
  lineDiscount: VND;
  vatPercent: number;
  /** Tồn kho khả dụng tại chi nhánh, dùng để chặn bán vượt tồn. */
  availableStock: number;
}

/** Tổng hợp tiền của giỏ hàng, tính lại mỗi khi giỏ thay đổi. */
export interface CartTotals {
  /** Tổng tiền hàng trước giảm giá và VAT. */
  subTotal: VND;
  /** Tổng giảm giá theo dòng + giảm giá đơn. */
  discountTotal: VND;
  vatTotal: VND;
  /** Khách phải trả. */
  grandTotal: VND;
  totalQuantity: number;
  totalLines: number;
}

/** Dòng chi tiết đã chốt trên hoá đơn. */
export interface OrderLine {
  id: ID;
  productId: ID;
  sku: string;
  productName: string;
  unit: string;
  unitPrice: VND;
  quantity: number;
  lineDiscount: VND;
  vatPercent: number;
  /** Thành tiền dòng = unitPrice * quantity - lineDiscount. */
  lineTotal: VND;
  /** Giá vốn tại thời điểm bán, dùng tính lợi nhuận (module 13). */
  unitCost: VND;
}

/** Hoá đơn bán hàng đã hoàn tất. */
export interface SalesOrder {
  id: ID;
  /** Mã hoá đơn dạng HD-20260826-0042. */
  code: string;
  branchId: ID;
  branchName: string;
  cashierId: ID;
  cashierName: string;
  /** Ca bán hàng phát sinh hoá đơn. */
  shiftCode: string;
  soldAt: string;
  lines: OrderLine[];
  subTotal: VND;
  discountTotal: VND;
  vatTotal: VND;
  grandTotal: VND;
  paymentMethod: PaymentMethod;
  /** Tiền khách đưa (chỉ có ý nghĩa với tiền mặt). */
  tenderedAmount: VND;
  /** Tiền thừa trả khách = tenderedAmount - grandTotal. */
  changeAmount: VND;
  status: OrderStatus;
  /** Số điện thoại thành viên Circle K Club, `null` nếu khách lẻ. */
  memberPhone: string | null;
  note: string;
}

/** Đối soát két tiền cuối ca của thu ngân. */
export interface ShiftReconciliation {
  id: ID;
  branchId: ID;
  branchName: string;
  cashierName: string;
  shiftCode: string;
  workDate: string;
  openingCash: VND;
  cashSales: VND;
  cashlessSales: VND;
  /** Tiền mặt đếm thực tế cuối ca. */
  countedCash: VND;
  /** Lệch = countedCash - (openingCash + cashSales). */
  variance: VND;
  orderCount: number;
}