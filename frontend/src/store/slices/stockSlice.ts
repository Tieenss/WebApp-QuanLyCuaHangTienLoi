import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  DOCUMENT_STATUS,
  LEDGER_TYPE,
  STOCK_LEVEL,
  type PurchaseOrder,
  type SalesOrder,
  type StockBalance,
  type StockLedgerEntry,
  type StockLevel,
  type StockTransfer,
} from '@/types';
import { seedStockBalances, seedStockLedger } from '@/mockData/inventory';
import { purchaseReceived } from './purchaseSlice';
import { saleCompleted } from './posSlice';
import { transferShipped } from './transferSlice';
import { orderRefunded, orderCancelled } from './salesOrderSlice';

/**
 * Module 7 — Tồn kho & Thẻ kho (dữ liệu ghi được).
 *
 * Vì sao tồn kho phải nằm trong Redux thay vì mảng const ở mockData:
 * đặc tả yêu cầu bán hàng phải TRỪ tồn kho và GHI thẻ kho trong cùng một
 * transaction (`dac_ta_chuc_nang` mục 2). Với mảng const thì phía ghi của ứng
 * dụng không tồn tại — bán 100 lần tồn vẫn không đổi.
 *
 * `the_kho` (ledger) là sổ cái immutable: chỉ ghi thêm, không sửa, không xoá
 * (`kien_truc_ky_thuat.md` mục 3.1). `balances` là số liệu tổng hợp đọc nhanh,
 * luôn suy ra được từ ledger.
 *
 * Cách phối hợp nhiều slice trong một "transaction": mọi slice liên quan cùng
 * lắng nghe một action duy nhất qua `extraReducers`. Redux Toolkit chạy toàn bộ
 * reducer của một `dispatch` đồng bộ rồi mới thông báo cho UI, nên không có
 * trạng thái trung gian nào bị nhìn thấy — đúng tinh thần nguyên tử. Nếu dùng
 * thunk dispatch 3 action rời thì UI sẽ render 3 lần với state dở dang.
 */

export interface StockState {
  balances: StockBalance[];
  /** Sổ cái kho, mới nhất trước. */
  ledger: StockLedgerEntry[];
}

const initialState: StockState = {
  balances: seedStockBalances,
  ledger: seedStockLedger,
};

/** Xác định mức cảnh báo tồn kho từ số lượng thực tế. */
export const resolveStockLevel = (
  quantity: number,
  minStock: number,
  maxStock: number,
): StockLevel => {
  if (quantity <= 0) return STOCK_LEVEL.OutOfStock;
  if (quantity < minStock * 0.5) return STOCK_LEVEL.Critical;
  if (quantity < minStock) return STOCK_LEVEL.Low;
  if (quantity > maxStock) return STOCK_LEVEL.Overstock;
  return STOCK_LEVEL.Healthy;
};

/*
 * ── Hàm dẫn xuất ──────────────────────────────────────────────────
 *
 * Nhận `balances` làm tham số thay vì đọc state trực tiếp, để component gọi
 * được sau `useAppSelector` và `mockData/analytics` cũng dùng lại được.
 */

/** Tồn kho của một sản phẩm tại một chi nhánh. */
export const stockOf = (
  balances: readonly StockBalance[],
  branchId: string,
  productId: string,
): number =>
  balances.find(
    (balance) => balance.branchId === branchId && balance.productId === productId,
  )?.quantity ?? 0;

/** Tổng tồn kho toàn chuỗi của một sản phẩm. */
export const totalStockOf = (
  balances: readonly StockBalance[],
  productId: string,
): number =>
  balances
    .filter((balance) => balance.productId === productId)
    .reduce((sum, balance) => sum + balance.quantity, 0);

/** Mặt hàng dưới ngưỡng tồn tối thiểu, thiếu nhiều nhất lên đầu. */
export const lowStockBalances = (
  balances: readonly StockBalance[],
  branchId: string | null,
): StockBalance[] =>
  balances
    .filter((balance) => (branchId === null ? true : balance.branchId === branchId))
    .filter((balance) => balance.quantity < balance.minStock)
    .sort((a, b) => a.quantity / a.minStock - b.quantity / b.minStock);

/** Tổng giá trị tồn kho, lọc theo chi nhánh nếu cần. */
export const totalStockValue = (
  balances: readonly StockBalance[],
  branchId: string | null,
): number =>
  balances
    .filter((balance) => (branchId === null ? true : balance.branchId === branchId))
    .reduce((sum, balance) => sum + balance.stockValue, 0);

/** Số mặt hàng đang thực có trong kho (SKU khác nhau, tồn > 0). */
export const distinctSkuCount = (
  balances: readonly StockBalance[],
  branchId: string | null,
): number =>
  new Set(
    balances
      .filter((balance) => (branchId === null ? true : balance.branchId === branchId))
      .filter((balance) => balance.quantity > 0)
      .map((balance) => balance.productId),
  ).size;

/**
 * Ghi một dòng thẻ kho và cập nhật số dư tương ứng.
 *
 * Dùng chung cho mọi nghiệp vụ biến động kho (bán hàng, nhập NCC, luân chuyển,
 * cân bằng kiểm kê) để hai nguồn số liệu không bao giờ lệch nhau.
 *
 * Trả về `false` khi không tìm thấy dòng tồn kho — nghĩa là chi nhánh chưa từng
 * có mặt hàng này, phía gọi cần xử lý (thường là chặn nghiệp vụ).
 */
const applyMovement = (
  state: StockState,
  input: {
    branchId: string;
    branchName: string;
    productId: string;
    /** Dương = nhập kho, âm = xuất kho. */
    quantityChange: number;
    type: StockLedgerEntry['type'];
    referenceCode: string;
    performedBy: string;
    note: string;
    occurredAt: string;
    /** Số thứ tự trong cùng một lần dispatch, để id không trùng. */
    sequence: number;
  },
): boolean => {
  const balance = state.balances.find(
    (item) => item.branchId === input.branchId && item.productId === input.productId,
  );
  if (!balance) return false;

  const balanceBefore = balance.quantity;
  const balanceAfter = balanceBefore + input.quantityChange;

  balance.quantity = balanceAfter;
  balance.stockValue = balanceAfter * balance.averageCost;
  balance.lastMovementAt = input.occurredAt;

  // Sổ cái chỉ ghi thêm; dòng mới nhất nằm đầu để bảng thẻ kho không phải sort.
  state.ledger.unshift({
    id: `led-live-${input.occurredAt}-${input.sequence}`,
    occurredAt: input.occurredAt,
    branchId: input.branchId,
    branchName: input.branchName,
    productId: input.productId,
    sku: balance.sku,
    productName: balance.productName,
    type: input.type,
    quantityChange: input.quantityChange,
    balanceBefore,
    balanceAfter,
    unitCost: balance.averageCost,
    referenceCode: input.referenceCode,
    performedBy: input.performedBy,
    note: input.note,
  });

  return true;
};

/** Trừ tồn kho + ghi thẻ kho cho một hoá đơn bán lẻ. */
const applySale = (state: StockState, order: SalesOrder): void => {
  order.lines.forEach((line, index) => {
    applyMovement(state, {
      branchId: order.branchId,
      branchName: order.branchName,
      productId: line.productId,
      // Xuất bán: số lượng âm theo quy ước `the_kho.so_luong`.
      quantityChange: -line.quantity,
      type: LEDGER_TYPE.SaleOut,
      referenceCode: order.code,
      performedBy: `${order.cashierName} (${order.cashierId})`,
      note: 'Xuất bán qua quầy POS',
      occurredAt: order.soldAt,
      sequence: index,
    });
  });
};

/**
 * Hoàn tồn cho một hoá đơn bị REFUNDED.
 *
 * Phép tính ngược lại của `applySale`: cộng lại số lượng từng dòng và ghi
 * một dòng thẻ kho `SALE_RETURN` (số dương) tại cùng chi nhánh đã bán. Đây
 * là nguồn sự thật duy nhất để cập nhật tồn — KHÔNG tự tính từ `grandTotal`
 * hay trừ `paidAmount` như một số hệ thống cũ vẫn làm.
 *
 * `occurredAt` dùng thời điểm hoàn (do payload truyền vào), không dùng
 * `order.soldAt` — vì hai mốc thời gian có thể cách nhau nhiều ngày.
 */
const applyReturn = (
  state: StockState,
  order: SalesOrder,
  performedBy: string,
  refundedAt: string,
): void => {
  order.lines.forEach((line, index) => {
    applyMovement(state, {
      branchId: order.branchId,
      branchName: order.branchName,
      productId: line.productId,
      // Hoàn nhập: số lượng dương.
      quantityChange: line.quantity,
      type: LEDGER_TYPE.SaleReturn,
      referenceCode: order.code,
      performedBy,
      note: `Hoàn tiền hoá đơn ${order.code} (khách trả hàng)`,
      occurredAt: refundedAt,
      sequence: index,
    });
  });
};

/**
 * Cộng tồn kho + ghi thẻ kho cho một phiếu nhập từ NCC.
 *
 * Giá vốn bình quân gia quyền được tính lại theo công thức
 * `kien_truc_ky_thuat.md` mục 3.2:
 *   giá vốn mới = (tồn cũ × giá cũ + nhập mới × giá nhập) / (tồn cũ + nhập mới)
 *
 * Phải tính TRƯỚC khi `applyMovement` đổi `quantity`, vì công thức cần tồn cũ.
 */
const applyPurchase = (
  state: StockState,
  order: PurchaseOrder,
  performedBy: string,
): void => {
  order.lines.forEach((line, index) => {
    const balance = state.balances.find(
      (item) => item.branchId === order.branchId && item.productId === line.productId,
    );

    if (balance) {
      const oldQuantity = balance.quantity;
      const newQuantity = oldQuantity + line.receivedQuantity;
      if (newQuantity > 0) {
        balance.averageCost = Math.round(
          (oldQuantity * balance.averageCost +
            line.receivedQuantity * line.unitCost) /
            newQuantity,
        );
      }

      // Hàng có hạn dùng: cập nhật lô cận hạn nhất.
      if (
        line.expiryDate !== null &&
        (balance.nearestExpiryDate === null ||
          line.expiryDate < balance.nearestExpiryDate)
      ) {
        balance.nearestExpiryDate = line.expiryDate;
      }
    }

    applyMovement(state, {
      branchId: order.branchId,
      branchName: order.branchName,
      productId: line.productId,
      // Nhập kho: số lượng dương.
      quantityChange: line.receivedQuantity,
      type: LEDGER_TYPE.PurchaseIn,
      referenceCode: order.code,
      performedBy,
      note: `Nhập hàng từ ${order.supplierName}`,
      occurredAt: `${order.orderDate}T09:00:00.000Z`,
      sequence: index,
    });
  });
};

/**
 * Luân chuyển nội bộ: trừ tồn kho nguồn, cộng tồn kho đích, ghi 2 dòng thẻ kho.
 *
 * Mỗi mặt hàng sinh đúng 2 dòng sổ cái (`luong_nghiep_vu.md` mục 3.2):
 *   - `XUAT_CHI_NHANH` số âm tại kho xuất
 *   - `NHAN_TU_KHO`   số dương tại kho nhận
 *
 * Nếu cửa hàng nhận chưa từng có mặt hàng này thì chưa có dòng tồn kho để cộng
 * vào; khi đó `applyMovement` trả `false` và ta tạo dòng mới, kế thừa ngưỡng
 * min/max cùng giá vốn từ kho xuất.
 */
const applyTransfer = (
  state: StockState,
  transfer: StockTransfer,
  performedBy: string,
): void => {
  transfer.lines.forEach((line, index) => {
    const source = state.balances.find(
      (item) =>
        item.branchId === transfer.fromBranchId && item.productId === line.productId,
    );

    // Bảo đảm kho nhận có dòng tồn kho trước khi cộng vào.
    const hasTarget = state.balances.some(
      (item) =>
        item.branchId === transfer.toBranchId && item.productId === line.productId,
    );
    if (!hasTarget && source) {
      state.balances.push({
        ...source,
        id: `stk-${transfer.toBranchId}-${line.productId}`,
        branchId: transfer.toBranchId,
        branchName: transfer.toBranchName,
        quantity: 0,
        stockValue: 0,
        // Cửa hàng giữ tồn nhỏ hơn Kho Tổng (hệ số 8x khi sinh dữ liệu seed).
        minStock: Math.max(1, Math.round(source.minStock / 8)),
        maxStock: Math.max(2, Math.round(source.maxStock / 8)),
      });
    }

    // Xuất khỏi kho nguồn.
    applyMovement(state, {
      branchId: transfer.fromBranchId,
      branchName: transfer.fromBranchName,
      productId: line.productId,
      quantityChange: -line.shippedQuantity,
      type: LEDGER_TYPE.TransferOut,
      referenceCode: transfer.code,
      performedBy,
      note: `Xuất luân chuyển sang ${transfer.toBranchName}`,
      occurredAt: `${transfer.requestDate}T10:00:00.000Z`,
      sequence: index * 2,
    });

    // Nhập vào kho đích.
    applyMovement(state, {
      branchId: transfer.toBranchId,
      branchName: transfer.toBranchName,
      productId: line.productId,
      quantityChange: line.receivedQuantity,
      type: LEDGER_TYPE.TransferIn,
      referenceCode: transfer.code,
      performedBy,
      note: `Nhận hàng luân chuyển từ ${transfer.fromBranchName}`,
      occurredAt: `${transfer.requestDate}T10:00:00.000Z`,
      sequence: index * 2 + 1,
    });
  });
};

export const stockSlice = createSlice({
  name: 'stock',
  initialState,
  reducers: {
    /**
     * Điều chỉnh tồn kho sau kiểm kê (module 10).
     * `countedQuantity` là số đếm thực tế; hệ thống tự tính lượng lệch.
     */
    balanceAfterStocktake: (
      state,
      action: PayloadAction<{
        branchId: string;
        branchName: string;
        referenceCode: string;
        performedBy: string;
        occurredAt: string;
        lines: { productId: string; countedQuantity: number; reason: string }[];
      }>,
    ) => {
      action.payload.lines.forEach((line, index) => {
        const balance = state.balances.find(
          (item) =>
            item.branchId === action.payload.branchId &&
            item.productId === line.productId,
        );
        if (!balance) return;

        const variance = line.countedQuantity - balance.quantity;
        // Đếm khớp sổ sách thì không ghi thẻ kho, tránh rác trong sổ cái.
        if (variance === 0) return;

        applyMovement(state, {
          branchId: action.payload.branchId,
          branchName: action.payload.branchName,
          productId: line.productId,
          quantityChange: variance,
          type: LEDGER_TYPE.Adjustment,
          referenceCode: action.payload.referenceCode,
          performedBy: action.payload.performedBy,
          note: line.reason === '' ? 'Cân bằng sau kiểm kê' : line.reason,
          occurredAt: action.payload.occurredAt,
          sequence: index,
        });
      });
    },
  },

  extraReducers: (builder) => {
    // Bước 2 và 3 của transaction bán hàng: trừ tồn kho + ghi thẻ kho.
    builder.addCase(saleCompleted, (state, action) => {
      applySale(state, action.payload.order);
    });

    // Bước 2 và 3 của transaction nhập kho: cộng tồn Kho Tổng + ghi thẻ kho,
    // kèm tính lại giá vốn bình quân gia quyền.
    builder.addCase(purchaseReceived, (state, action) => {
      applyPurchase(state, action.payload.order, action.payload.performedBy);
    });

    // Luân chuyển nội bộ: trừ tồn kho nguồn, cộng tồn kho đích, ghi 2 dòng
    // thẻ kho. Không sinh phiếu sổ quỹ vì không phát sinh dòng tiền.
    //
    // Chỉ áp dụng khi phiếu đã được duyệt (COMPLETED) — phiếu PENDING chỉ mới
    // là yêu cầu, tồn kho chưa bị đụng tới. Cùng action `transferShipped`
    // nhưng hai bên sẽ lọc theo trạng thái phiếu.
    builder.addCase(transferShipped, (state, action) => {
      if (action.payload.transfer.status !== DOCUMENT_STATUS.Completed) return;
      applyTransfer(state, action.payload.transfer, action.payload.performedBy);
    });

    // Transaction hoàn tiền hoá đơn: cộng lại tồn kho + ghi thẻ kho SALE_RETURN.
    builder.addCase(orderRefunded, (state, action) => {
      applyReturn(
        state,
        action.payload.order,
        action.payload.performedBy,
        action.payload.refundedAt,
      );
    });

    // Transaction huỷ đơn: cũng cộng lại tồn kho vì đơn chưa giao nhận
    // nhưng tồn đã bị trừ lúc bán. KHÔNG tạo phiếu chi sổ quỹ (cashbook
    // không lắng nghe action này) vì không có dòng tiền thực phát sinh.
    builder.addCase(orderCancelled, (state, action) => {
      applyReturn(
        state,
        action.payload.order,
        action.payload.performedBy,
        action.payload.cancelledAt,
      );
    });
  },
});

export const { balanceAfterStocktake } = stockSlice.actions;

export default stockSlice.reducer;
