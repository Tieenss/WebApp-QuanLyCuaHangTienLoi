import { createAction, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  ORDER_STATUS,
  PAYMENT_METHOD,
  type CartLine,
  type CartTotals,
  type OrderLine,
  type PaymentMethod,
  type Product,
  type SalesOrder,
} from '@/types';

/**
 * Module 2 – State quầy bán hàng POS.
 *
 * Giỏ hàng nằm trong Redux (không phải local state) để thu ngân có thể rời
 * khỏi màn hình POS và quay lại mà đơn đang thao tác vẫn còn.
 */

/** Hoá đơn vừa chốt, dùng để hiển thị modal thành công + in hoá đơn. */
export interface CompletedSale {
  order: SalesOrder;
  /** Tiền khách đưa, để in dòng "Tiền thừa". */
  tendered: number;
}

/**
 * Action dùng chung cho cả transaction bán hàng.
 *
 * Đặc tả (`dac_ta_chuc_nang` mục 2) yêu cầu 4 việc xảy ra cùng lúc khi chốt
 * hoá đơn: tạo hoá đơn, trừ tồn kho, ghi thẻ kho, tạo phiếu thu sổ quỹ. Bốn
 * việc này thuộc 3 slice khác nhau, nên thay vì dispatch 3 action rời (UI sẽ
 * render với state dở dang), mọi slice cùng lắng nghe action này qua
 * `extraReducers`:
 *
 * - `posSlice`   → lưu hoá đơn, xoá giỏ hàng
 * - `stockSlice` → trừ tồn kho + ghi thẻ kho
 * - `cashbookSlice` → tạo phiếu thu BAN_HANG
 *
 * Redux Toolkit chạy hết reducer của một dispatch rồi mới thông báo cho UI, nên
 * người dùng không bao giờ thấy trạng thái trung gian.
 *
 * Khai báo tại đây (không phải ở stockSlice) để tránh phụ thuộc vòng: stock và
 * cashbook đều import từ pos, còn pos không import ngược lại.
 */
export const saleCompleted = createAction<CompletedSale>('pos/saleCompleted');

/**
 * Dựng `SalesOrder` từ giỏ hàng hiện tại.
 *
 * Đặt ngoài reducer vì cả 3 slice trong transaction đều cần chính đối tượng
 * này; nếu dựng bên trong `posSlice` thì `stockSlice` và `cashbookSlice` không
 * có cách nào đọc được.
 */
export const buildSalesOrder = (input: {
  state: PosState;
  cashierId: string;
  cashierName: string;
  shiftCode: string;
  /** Giá vốn từng sản phẩm tại thời điểm bán, để tính lợi nhuận về sau. */
  unitCosts: Record<string, number>;
  /** Thời điểm chốt đơn, ISO string. */
  soldAt: string;
}): CompletedSale | null => {
  const { state, soldAt } = input;
  if (state.lines.length === 0) return null;

  const totals = calculateTotals(state.lines, state.orderDiscount);
  const sequence = state.sessionOrderCount + 1;
  const isoDate = soldAt.slice(0, 10);

  const orderLines: OrderLine[] = state.lines.map((line, index) => ({
    id: `ol-live-${sequence}-${index}`,
    productId: line.productId,
    sku: line.sku,
    productName: line.productName,
    unit: line.unit,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    lineDiscount: line.lineDiscount,
    vatPercent: line.vatPercent,
    lineTotal: line.unitPrice * line.quantity - line.lineDiscount,
    unitCost: input.unitCosts[line.productId] ?? 0,
  }));

  const tendered =
    state.paymentMethod === PAYMENT_METHOD.Cash
      ? Math.max(state.tenderedAmount, totals.grandTotal)
      : totals.grandTotal;

  const order: SalesOrder = {
    id: `so-live-${soldAt}-${sequence}`,
    code: `HD-${isoDate.replace(/-/g, '')}-${String(9000 + sequence).padStart(4, '0')}`,
    branchId: state.branchId,
    branchName: '',
    cashierId: input.cashierId,
    cashierName: input.cashierName,
    shiftCode: input.shiftCode,
    soldAt,
    lines: orderLines,
    subTotal: totals.subTotal,
    discountTotal: totals.discountTotal,
    vatTotal: totals.vatTotal,
    grandTotal: totals.grandTotal,
    paymentMethod: state.paymentMethod,
    tenderedAmount: tendered,
    changeAmount: tendered - totals.grandTotal,
    status: ORDER_STATUS.Completed,
    memberPhone: state.memberPhone.trim() === '' ? null : state.memberPhone.trim(),
    note: '',
  };

  return { order, tendered };
};

export interface PosState {
  /** Chi nhánh đang bán; quyết định tồn kho khả dụng. */
  branchId: string;
  lines: CartLine[];
  /** Giảm giá trên toàn đơn (số tiền tuyệt đối). */
  orderDiscount: number;
  paymentMethod: PaymentMethod;
  /** Tiền khách đưa; chỉ dùng khi thanh toán tiền mặt. */
  tenderedAmount: number;
  /** SĐT thành viên Circle K Club. */
  memberPhone: string;
  /** Danh mục đang chọn ở lưới sản phẩm; `null` = tất cả. */
  activeCategoryId: string | null;
  searchKeyword: string;
  /** Hoá đơn vừa hoàn tất; `null` khi chưa thanh toán xong. */
  lastCompletedSale: CompletedSale | null;
  /** Số hoá đơn đã lập trong phiên làm việc hiện tại, dùng sinh mã. */
  sessionOrderCount: number;
}

const initialState: PosState = {
  branchId: 'br-0101',
  lines: [],
  orderDiscount: 0,
  paymentMethod: PAYMENT_METHOD.Cash,
  tenderedAmount: 0,
  memberPhone: '',
  activeCategoryId: null,
  searchKeyword: '',
  lastCompletedSale: null,
  sessionOrderCount: 0,
};

/**
 * Tính lại toàn bộ tiền của giỏ hàng.
 *
 * Quy tắc: VAT tính trên giá đã trừ giảm giá dòng; giảm giá toàn đơn được trừ
 * sau cùng và không làm giảm VAT (đơn giản hoá cho MVP).
 */
export const calculateTotals = (
  lines: readonly CartLine[],
  orderDiscount: number,
): CartTotals => {
  const subTotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const lineDiscountTotal = lines.reduce((sum, line) => sum + line.lineDiscount, 0);
  const vatTotal = Math.round(
    lines.reduce((sum, line) => {
      const netLine = line.unitPrice * line.quantity - line.lineDiscount;
      return sum + (netLine * line.vatPercent) / 100;
    }, 0),
  );

  const discountTotal = lineDiscountTotal + orderDiscount;
  // Không cho tổng tiền âm khi giảm giá vượt giá trị đơn.
  const grandTotal = Math.max(0, subTotal - discountTotal + vatTotal);

  return {
    subTotal,
    discountTotal,
    vatTotal,
    grandTotal,
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalLines: lines.length,
  };
};

export const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    /** Đổi chi nhánh bán hàng. Giỏ hàng bị xoá vì tồn kho khác nhau. */
    setPosBranch: (state, action: PayloadAction<string>) => {
      if (state.branchId === action.payload) return;
      state.branchId = action.payload;
      state.lines = [];
      state.orderDiscount = 0;
      state.tenderedAmount = 0;
    },

    /**
     * Thêm sản phẩm vào giỏ. Nếu đã có thì tăng số lượng.
     *
     * `availableStock` do component truyền vào (đọc từ `state.stock.balances`)
     * vì reducer không đọc được slice khác. Số lượng bị chặn theo tồn kho khả
     * dụng tại chi nhánh — quy tắc BR-01 "không bán vượt tồn".
     */
    addToCart: (
      state,
      action: PayloadAction<{
        product: Product;
        availableStock: number;
        quantity?: number;
      }>,
    ) => {
      const { product, availableStock, quantity = 1 } = action.payload;
      const existing = state.lines.find((line) => line.productId === product.id);

      if (existing) {
        // Hàng pha chế tại quầy (tồn 0 trong kho) vẫn phải bán được.
        const cap = availableStock > 0 ? availableStock : Number.MAX_SAFE_INTEGER;
        existing.quantity = Math.min(existing.quantity + quantity, cap);
        // Tồn có thể đã đổi sau lần thêm trước (ví dụ vừa bán xong đơn khác).
        existing.availableStock = availableStock;
        return;
      }

      state.lines.unshift({
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        productName: product.name,
        unit: product.unit,
        unitPrice: product.salePrice,
        quantity,
        lineDiscount: 0,
        vatPercent: product.vatPercent,
        availableStock,
      });
    },

    /** Cập nhật số lượng một dòng; số lượng <= 0 sẽ xoá dòng. */
    updateLineQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) => {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        state.lines = state.lines.filter((line) => line.productId !== productId);
        return;
      }
      const line = state.lines.find((item) => item.productId === productId);
      if (!line) return;
      const cap =
        line.availableStock > 0 ? line.availableStock : Number.MAX_SAFE_INTEGER;
      line.quantity = Math.min(quantity, cap);
    },

    /** Đặt giảm giá cho một dòng, không vượt quá giá trị dòng đó. */
    setLineDiscount: (
      state,
      action: PayloadAction<{ productId: string; discount: number }>,
    ) => {
      const line = state.lines.find(
        (item) => item.productId === action.payload.productId,
      );
      if (!line) return;
      const maxDiscount = line.unitPrice * line.quantity;
      line.lineDiscount = Math.min(Math.max(0, action.payload.discount), maxDiscount);
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter((line) => line.productId !== action.payload);
    },

    /** Xoá sạch giỏ hàng và các thông tin thanh toán kèm theo. */
    clearCart: (state) => {
      state.lines = [];
      state.orderDiscount = 0;
      state.tenderedAmount = 0;
      state.memberPhone = '';
    },

    setOrderDiscount: (state, action: PayloadAction<number>) => {
      state.orderDiscount = Math.max(0, action.payload);
    },

    setPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      state.paymentMethod = action.payload;
      // Thanh toán không dùng tiền mặt thì không cần nhập tiền khách đưa.
      if (action.payload !== PAYMENT_METHOD.Cash) {
        state.tenderedAmount = 0;
      }
    },

    setTenderedAmount: (state, action: PayloadAction<number>) => {
      state.tenderedAmount = Math.max(0, action.payload);
    },

    setMemberPhone: (state, action: PayloadAction<string>) => {
      state.memberPhone = action.payload;
    },

    setActiveCategory: (state, action: PayloadAction<string | null>) => {
      state.activeCategoryId = action.payload;
    },

    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },

    /** Đóng modal hoá đơn thành công. */
    dismissCompletedSale: (state) => {
      state.lastCompletedSale = null;
    },
  },

  extraReducers: (builder) => {
    /**
     * Bước 1 của transaction bán hàng: lưu hoá đơn vừa chốt và dọn giỏ hàng.
     *
     * Hoá đơn được dựng ở `buildSalesOrder` (phía component) thay vì trong
     * reducer, vì `stockSlice` và `cashbookSlice` cũng cần chính đối tượng đó —
     * nếu dựng bên trong thì hai slice kia không có cách nào đọc được.
     */
    builder.addCase(saleCompleted, (state, action) => {
      state.lastCompletedSale = action.payload;
      state.sessionOrderCount += 1;
      state.lines = [];
      state.orderDiscount = 0;
      state.tenderedAmount = 0;
      state.memberPhone = '';
    });
  },
});

export const {
  setPosBranch,
  addToCart,
  updateLineQuantity,
  setLineDiscount,
  removeFromCart,
  clearCart,
  setOrderDiscount,
  setPaymentMethod,
  setTenderedAmount,
  setMemberPhone,
  setActiveCategory,
  setSearchKeyword,
  dismissCompletedSale,
} = posSlice.actions;

export default posSlice.reducer;