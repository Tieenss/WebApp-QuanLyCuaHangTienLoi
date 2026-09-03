import { createAction, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { ORDER_STATUS, type SalesOrder } from '@/types';
import { saleCompleted } from './posSlice';

/**
 * Module — Lịch sử hoá đơn bán hàng.
 *
 * Vòng đời một hoá đơn:
 *   1. Thu ngân chốt đơn tại POS → `posSlice` gọi `buildSalesOrder()`.
 *   2. `posSlice` dispatch `saleCompleted` (action dùng chung cho cả transaction
 *      bán hàng — xem giải thích ở `posSlice.ts`).
 *   3. Bốn slice cùng lắng nghe action đó và xử lý song song:
 *        - `posSlice`      → lưu `lastCompletedSale`, xoá giỏ
 *        - `stockSlice`    → trừ tồn + ghi thẻ kho `SALE_OUT`
 *        - `cashbookSlice` → tạo phiếu thu `BAN_HANG`
 *        - `salesOrderSlice` (slice này) → push hoá đơn vào lịch sử
 *
 *   Redux Toolkit chạy hết reducer của một dispatch rồi mới thông báo cho UI,
 *   nên người dùng không bao giờ thấy trạng thái trung gian.
 *
 * Vì sao tách khỏi `posSlice`:
 *   `posSlice` chỉ giữ trạng thái runtime của quầy (giỏ hàng, thanh toán,
 *   ca làm việc...) — KHÔNG có mảng `orders[]`. Nếu nhét lịch sử vào đây thì
 *   state sẽ phình vô hạn theo thời gian bán hàng và phải reset khi đăng
 *   xuất. Tách slice riêng giúp slice nhỏ, mục đích rõ ràng.
 */
export interface SalesOrderState {
  /** Toàn bộ hoá đơn, mới nhất lên đầu. */
  orders: SalesOrder[];
  /** Hoá đơn đang mở chi tiết; `null` khi không có. */
  selectedOrderId: string | null;
}

const initialState: SalesOrderState = {
  orders: [],
  selectedOrderId: null,
};

/**
 * Action dùng chung cho transaction hoàn tiền hoá đơn.
 *
 * Tương tự mô hình "1 action, nhiều slice" của `saleCompleted`: khi thu ngân
 * đổi trạng thái hoá đơn sang REFUNDED, ba slice cùng lắng nghe và xử lý
 * song song để đảm bảo tính nguyên tử:
 *   - `salesOrderSlice` → set status = REFUNDED, lưu `refundedBy`/`refundedAt`
 *   - `stockSlice`       → cộng lại tồn kho + ghi thẻ kho `SALE_RETURN`
 *   - `cashbookSlice`    → tạo phiếu chi HOAN_TIEN (chỉ khi tiền mặt)
 *
 * MVP chỉ hỗ trợ hoàn toàn bộ hoá đơn (không cho chọn dòng), ghi nhận tiền
 * mặt đơn giản — tiền từ MoMo/VNPay… thực tế hoàn qua cổng nhưng sổ quỹ vẫn
 * ghi chi tiền mặt để đơn giản hoá sổ sách.
 */
export const orderRefunded = createAction<{
  order: SalesOrder;
  /** Người thực hiện, dạng "Họ Tên (NV-0003)". */
  performedBy: string;
  /** Thời điểm hoàn, ISO string. */
  refundedAt: string;
}>('salesOrder/refunded');

/**
 * Action dùng chung cho transaction huỷ đơn.
 *
 * Khác `orderRefunded` ở ý nghĩa nghiệp vụ:
 *   - REFUNDED: khách trả hàng SAU KHI thanh toán → phải trả lại tiền.
 *   - CANCELLED: lỗi nhập / khách đổi ý TRƯỚC KHI giao nhận — không phát sinh
 *     dòng tiền thực nào ngoài đời (thu ngân chưa kịp bỏ tiền vào két, hoặc
 *     khoá két chưa chốt). Do đó chỉ 2 slice lắng nghe:
 *       - `salesOrderSlice` → set status = CANCELLED, ghi dấu
 *       - `stockSlice`       → cộng lại tồn + ghi thẻ kho SALE_RETURN
 *     `cashbookSlice` KHÔNG lắng nghe — không tạo phiếu chi.
 *
 * Ràng buộc: chỉ cho huỷ đơn trong ngày (soldAt cùng ngày với hiện tại);
 * quá ngày phải dùng "Hoàn tiền" để truy vết dòng tiền chính xác.
 */
export const orderCancelled = createAction<{
  order: SalesOrder;
  /** Người thực hiện, dạng "Họ Tên (NV-0003)". */
  performedBy: string;
  /** Thời điểm huỷ, ISO string. */
  cancelledAt: string;
}>('salesOrder/cancelled');

/**
 * Action phát sau khi POS lưu hoá đơn xuống DB thành công: thay bản ghi local
 * (id `so-live-...`) bằng bản ghi thật (id UUID + mã HD do backend sinh) để
 * lịch sử hoá đơn và drawer chi tiết truy vấn đúng dữ liệu đã lưu.
 */
export const orderSaved = createAction<{
  /** Id local của hoá đơn vừa chốt ở POS. */
  localId: string;
  /** Bản ghi thật trả về từ API. */
  order: SalesOrder;
}>('salesOrder/saved');

export const salesOrderSlice = createSlice({
  name: 'salesOrder',
  initialState,
  reducers: {
    /** Mở/đóng drawer chi tiết hoá đơn. */
    setSelectedOrder: (state, action: PayloadAction<string | null>) => {
      state.selectedOrderId = action.payload;
    },
    /** Sửa ghi chú hoá đơn (không ảnh hưởng kho/tiền). */
    updateOrderNote: (
      state,
      action: PayloadAction<{ id: string; note: string }>,
    ) => {
      const order = state.orders.find((item) => item.id === action.payload.id);
      if (!order) return;
      order.note = action.payload.note;
    },
  },

  extraReducers: (builder) => {
    // Bước 4 của transaction bán hàng: lưu hoá đơn vào lịch sử. Mới nhất
    // lên đầu để bảng danh sách không phải sort mỗi lần render.
    builder.addCase(saleCompleted, (state, action) => {
      state.orders.unshift(action.payload.order);
    });

    // Transaction hoàn tiền: cập nhật status trong slice này; các slice
    // khác (stock, cashbook) lắng nghe cùng action để xử lý phần của mình.
    builder.addCase(orderRefunded, (state, action) => {
      const order = state.orders.find(
        (item) => item.id === action.payload.order.id,
      );
      if (!order) return;
      order.status = ORDER_STATUS.Refunded;
      // Tận dụng `note` để ghi lại lịch sử hoàn — không tốn schema mới.
      const refundStamp = `[Hoàn ${action.payload.refundedAt.slice(0, 16).replace('T', ' ')} bởi ${action.payload.performedBy}]`;
      order.note =
        order.note === '' ? refundStamp : `${order.note}\n${refundStamp}`;
    });

    // Transaction huỷ đơn: tương tự hoàn tiền nhưng set CANCELLED.
    builder.addCase(orderCancelled, (state, action) => {
      const order = state.orders.find(
        (item) => item.id === action.payload.order.id,
      );
      if (!order) return;
      order.status = ORDER_STATUS.Cancelled;
      const cancelStamp = `[Huỷ ${action.payload.cancelledAt.slice(0, 16).replace('T', ' ')} bởi ${action.payload.performedBy}]`;
      order.note =
        order.note === '' ? cancelStamp : `${order.note}\n${cancelStamp}`;
    });

    // POS lưu DB thành công: thay bản ghi local bằng bản ghi thật.
    builder.addCase(orderSaved, (state, action) => {
      const index = state.orders.findIndex(
        (item) => item.id === action.payload.localId,
      );
      if (index !== -1) state.orders[index] = action.payload.order;
      if (state.selectedOrderId === action.payload.localId) {
        state.selectedOrderId = action.payload.order.id;
      }
    });
  },
});

export const { setSelectedOrder, updateOrderNote } = salesOrderSlice.actions;

export default salesOrderSlice.reducer;
