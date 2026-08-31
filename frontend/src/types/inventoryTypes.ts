import type { DocumentStatus, ID, VND } from './commonTypes';

/**
 * Module 7 — Kho hàng (Tồn kho & Thẻ kho)
 * Module 8 — Nhập kho từ NCC
 * Module 9 — Xuất kho nội bộ
 * Module 10 — Kiểm kê & Cân bằng kho
 *
 * Nguyên tắc dữ liệu: `StockLedgerEntry` (thẻ kho) là nguồn sự thật duy nhất.
 * `StockBalance` là số liệu tổng hợp đọc nhanh, luôn suy ra được từ thẻ kho.
 */

/** Loại biến động thẻ kho. */
export const LEDGER_TYPE = {
  /** Nhập từ nhà cung cấp (module 8). */
  PurchaseIn: 'PURCHASE_IN',
  /** Nhận hàng luân chuyển nội bộ (module 9, phía nhận). */
  TransferIn: 'TRANSFER_IN',
  /** Xuất luân chuyển nội bộ (module 9, phía gửi). */
  TransferOut: 'TRANSFER_OUT',
  /** Xuất bán qua POS (module 2). */
  SaleOut: 'SALE_OUT',
  /** Huỷ hàng hết hạn / hư hỏng. */
  DisposalOut: 'DISPOSAL_OUT',
  /** Cân bằng kho sau kiểm kê (module 10), lượng có thể âm hoặc dương. */
  Adjustment: 'ADJUSTMENT',
  /** Khách trả hàng. */
  SaleReturn: 'SALE_RETURN',
} as const;

export type LedgerType = (typeof LEDGER_TYPE)[keyof typeof LEDGER_TYPE];

export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  PURCHASE_IN: 'Nhập từ NCC',
  TRANSFER_IN: 'Nhận luân chuyển',
  TRANSFER_OUT: 'Xuất luân chuyển',
  SALE_OUT: 'Xuất bán POS',
  DISPOSAL_OUT: 'Huỷ hàng',
  ADJUSTMENT: 'Cân bằng kiểm kê',
  SALE_RETURN: 'Khách trả hàng',
};

export const LEDGER_TYPE_COLOR: Record<LedgerType, string> = {
  PURCHASE_IN: 'green',
  TRANSFER_IN: 'cyan',
  TRANSFER_OUT: 'orange',
  SALE_OUT: 'red',
  DISPOSAL_OUT: 'volcano',
  ADJUSTMENT: 'purple',
  SALE_RETURN: 'blue',
};

/** Chiều tác động lên tồn kho của từng loại biến động. */
export const LEDGER_DIRECTION: Record<LedgerType, 'IN' | 'OUT' | 'BOTH'> = {
  PURCHASE_IN: 'IN',
  TRANSFER_IN: 'IN',
  SALE_RETURN: 'IN',
  TRANSFER_OUT: 'OUT',
  SALE_OUT: 'OUT',
  DISPOSAL_OUT: 'OUT',
  ADJUSTMENT: 'BOTH',
};

/** Mức độ cảnh báo tồn kho, suy ra từ quantity so với minStock. */
export const STOCK_LEVEL = {
  OutOfStock: 'OUT_OF_STOCK',
  Critical: 'CRITICAL',
  Low: 'LOW',
  Healthy: 'HEALTHY',
  Overstock: 'OVERSTOCK',
} as const;

export type StockLevel = (typeof STOCK_LEVEL)[keyof typeof STOCK_LEVEL];

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  OUT_OF_STOCK: 'Hết hàng',
  CRITICAL: 'Nguy cấp',
  LOW: 'Sắp hết',
  HEALTHY: 'Ổn định',
  OVERSTOCK: 'Tồn nhiều',
};

export const STOCK_LEVEL_COLOR: Record<StockLevel, string> = {
  OUT_OF_STOCK: '#DC2626',
  CRITICAL: '#E31837',
  LOW: '#FFC72C',
  HEALTHY: '#10B981',
  OVERSTOCK: '#6366F1',
};

/** Tồn kho hiện tại của 1 sản phẩm tại 1 chi nhánh/kho. */
export interface StockBalance {
  id: ID;
  branchId: ID;
  branchName: string;
  productId: ID;
  sku: string;
  productName: string;
  categoryName: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  /** Giá vốn bình quân tại thời điểm hiện tại. */
  averageCost: VND;
  /** Giá trị tồn = quantity * averageCost. */
  stockValue: VND;
  /** Ngày hết hạn gần nhất trong lô đang tồn, `null` nếu hàng không có HSD. */
  nearestExpiryDate: string | null;
  lastMovementAt: string;
}

/** Một dòng thẻ kho (immutable, chỉ ghi thêm). */
export interface StockLedgerEntry {
  id: ID;
  /** Thời điểm phát sinh, ISO string. */
  occurredAt: string;
  branchId: ID;
  branchName: string;
  productId: ID;
  sku: string;
  productName: string;
  type: LedgerType;
  /** Số lượng đã áp dấu: dương là nhập, âm là xuất. */
  quantityChange: number;
  /** Tồn trước biến động. */
  balanceBefore: number;
  /** Tồn sau biến động = balanceBefore + quantityChange. */
  balanceAfter: number;
  unitCost: VND;
  /** Mã phiếu nguồn (PN-xxx, PX-xxx, HD-xxx...). */
  referenceCode: string;
  performedBy: string;
  note: string;
}

/** Module 8 — Dòng chi tiết phiếu nhập / đơn mua hàng. */
export interface PurchaseOrderLine {
  id: ID;
  productId: ID;
  sku: string;
  productName: string;
  unit: string;
  orderedQuantity: number;
  /** Số lượng thực nhận, có thể nhỏ hơn khi NCC giao thiếu. */
  receivedQuantity: number;
  unitCost: VND;
  vatPercent: number;
  /** Thành tiền trước VAT = receivedQuantity * unitCost. */
  lineTotal: VND;
  expiryDate: string | null;
}

/** Module 8 — Phiếu nhập kho / Đơn mua hàng (PO). */
export interface PurchaseOrder {
    id: ID;
    /** Mã phiếu dạng PN-20260826-001. */
    code: string;
    supplierId: ID;
    supplierName: string;
    /** Kho nhận hàng. */
    branchId: ID;
    branchName: string;
    orderDate: string;
    expectedDate: string;
    receivedDate: string | null;
    status: DocumentStatus;
    lines: PurchaseOrderLine[];
    /** Tổng tiền hàng trước VAT. */
    subTotal: VND;
    vatTotal: VND;
    discount: VND;
    /** Tổng phải trả = subTotal + vatTotal - discount. */
    grandTotal: VND;
    /** Đã thanh toán cho NCC. */
    paidAmount: VND;
    createdBy: string;
    note: string;
}

/** Module 9 — Dòng chi tiết phiếu xuất nội bộ. */
export interface TransferLine {
  id: ID;
  productId: ID;
  sku: string;
  productName: string;
  unit: string;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  unitCost: VND;
  lineTotal: VND;
}

/** Module 9 — Phiếu luân chuyển hàng hoá giữa các kho/chi nhánh. */
export interface StockTransfer {
  id: ID;
  /** Mã phiếu dạng PX-20260826-001. */
  code: string;
  fromBranchId: ID;
  fromBranchName: string;
  toBranchId: ID;
  toBranchName: string;
  requestDate: string;
  shippedDate: string | null;
  receivedDate: string | null;
  status: DocumentStatus;
  lines: TransferLine[];
  totalValue: VND;
  requestedBy: string;
  approvedBy: string | null;
  note: string;
}

/** Module 10 — Dòng chi tiết phiếu kiểm kê. */
export interface StocktakeLine {
  id: ID;
  productId: ID;
  sku: string;
  productName: string;
  unit: string;
  /** Tồn theo sổ sách tại thời điểm chốt kiểm kê. */
  systemQuantity: number;
  /** Tồn đếm thực tế. */
  countedQuantity: number;
  /** Lệch = countedQuantity - systemQuantity. Âm là thiếu hụt. */
  varianceQuantity: number;
  unitCost: VND;
  /** Giá trị lệch = varianceQuantity * unitCost. */
  varianceValue: VND;
  reason: string;
}

/** Module 10 — Phiếu kiểm kê & cân bằng kho. */
export interface Stocktake {
  id: ID;
  /** Mã phiếu dạng KK-20260826-001. */
  code: string;
  branchId: ID;
  branchName: string;
  countDate: string;
  status: DocumentStatus;
  lines: StocktakeLine[];
  totalItemsCounted: number;
  /** Số mặt hàng có lệch tồn. */
  totalVarianceItems: number;
  /** Tổng giá trị lệch (thường âm do hao hụt). */
  totalVarianceValue: VND;
  countedBy: string;
  approvedBy: string | null;
  note: string;
}