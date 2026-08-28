import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  PAYMENT_METHOD,
  type CartLine,
  type CartTotals,
  type OrderLine,
  type PaymentMethod,
  type Product,
  type SalesOrder,
} from '@/types';
import { ORDER_STATUS } from '@/types';
import { nowIso } from '@/utils/dateUtils';
import { stockOf } from '@/mockData/inventory';
import { branchNameById } from '@/mockData/branches';

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
     * Số lượng bị chặn theo tồn kho khả dụng tại chi nhánh.
     */
    addToCart: (
      state,
      action: PayloadAction<{ product: Product; quantity?: number }>,
    ) => {
      const { product, quantity = 1 } = action.payload;
      const available = stockOf(state.branchId, product.id);
      const existing = state.lines.find((line) => line.productId === product.id);

      if (existing) {
        // Hàng pha chế tại quầy (tồn 0 trong kho) vẫn phải bán được.
        const cap = available > 0 ? available : Number.MAX_SAFE_INTEGER;
        existing.quantity = Math.min(existing.quantity + quantity, cap);
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
        availableStock: available,
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

    /**
     * Chốt hoá đơn: dựng `SalesOrder` từ giỏ hàng rồi xoá giỏ.
     * Payload cần thông tin thu ngân vì slice không truy cập được state auth.
     */
    checkout: (
      state,
      action: PayloadAction<{
        cashierId: string;
        cashierName: string;
        shiftCode: string;
        /** Giá vốn từng sản phẩm, để tính lợi nhuận về sau. */
        unitCosts: Record<string, number>;
      }>,
    ) => {
      if (state.lines.length === 0) return;

      const totals = calculateTotals(state.lines, state.orderDiscount);
      const sequence = state.sessionOrderCount + 1;
      const soldAt = nowIso();
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
        unitCost: action.payload.unitCosts[line.productId] ?? 0,
      }));

      const tendered =
        state.paymentMethod === PAYMENT_METHOD.Cash
          ? Math.max(state.tenderedAmount, totals.grandTotal)
          : totals.grandTotal;

      const order: SalesOrder = {
        id: `so-live-${soldAt}-${sequence}`,
        code: `HD-${isoDate.replace(/-/g, '')}-${String(9000 + sequence).padStart(4, '0')}`,
        branchId: state.branchId,
        branchName: branchNameById(state.branchId),
        cashierId: action.payload.cashierId,
        cashierName: action.payload.cashierName,
        shiftCode: action.payload.shiftCode,
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

      state.lastCompletedSale = { order, tendered };
      state.sessionOrderCount = sequence;
      state.lines = [];
      state.orderDiscount = 0;
      state.tenderedAmount = 0;
      state.memberPhone = '';
    },

    /** Đóng modal hoá đơn thành công. */
    dismissCompletedSale: (state) => {
      state.lastCompletedSale = null;
    },
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
  checkout,
  dismissCompletedSale,
} = posSlice.actions;

export default posSlice.reducer;