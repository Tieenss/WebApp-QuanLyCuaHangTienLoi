import { createAction, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  DOCUMENT_STATUS,
  type DocumentStatus,
  type StockTransfer,
  type TransferLine,
} from '@/types';

/**
 * Module 9 — Xuất kho nội bộ (dữ liệu ghi được).
 *
 * BR-06: chỉ đi từ Kho Tổng ra cửa hàng bán lẻ. Không có điều chuyển ngang
 * giữa các cửa hàng trong MVP.
 *
 * Vòng đời phiếu (mở rộng để Quản lý chi nhánh cùng tham gia):
 *   1. Quản lý chi nhánh (hoặc Thủ kho/Admin) tạo yêu cầu với `status = PENDING`
 *      — chỉ ghi vào `transferSlice`, CHƯA đụng tồn kho.
 *   2. Thủ kho/Admin duyệt (`approveTransfer`): chuyển `PENDING → COMPLETED`
 *      và dispatch `transferShipped` để:
 *        - Trừ tồn kho tại Kho Tổng            → `stockSlice`
 *        - Cộng tồn kho tại cửa hàng nhận      → `stockSlice`
 *        - Ghi 2 dòng thẻ kho TransferOut/In   → `stockSlice`
 *   3. Thủ kho/Admin từ chối (`rejectTransfer`): chuyển `PENDING → CANCELLED`,
 *      tồn kho hai đầu giữ nguyên.
 *
 * Khác hai transaction kia: KHÔNG sinh phiếu sổ quỹ, vì luân chuyển nội bộ
 * không phát sinh dòng tiền — hàng chỉ đổi chỗ trong cùng một hệ thống.
 */

export interface TransferState {
  transfers: StockTransfer[];
}

const initialState: TransferState = {
  transfers: [],
};

/** Một dòng hàng người dùng nhập trên form. */
export interface TransferDraftLine {
  productId: string;
  quantity: number;
}

/**
 * Action dùng chung cho transaction xuất kho — chỉ dispatch khi phiếu được
 * DUYỆT (PENDING → COMPLETED). Cửa hàng nhận hàng ngay khi Thủ kho duyệt,
 * không có bước xác nhận riêng.
 */
export const transferShipped = createAction<{
  transfer: StockTransfer;
  /** Người thực hiện, dạng "Họ Tên (NV-0003)". */
  performedBy: string;
}>('transfer/shipped');

export const DISTRIBUTION_CENTER_ID = 'br-0001';
export const DISTRIBUTION_CENTER_NAME = 'Kho Tổng';

/**
 * Dựng `StockTransfer` hoàn chỉnh từ dữ liệu form.
 *
 * Đặt ngoài reducer vì `stockSlice` cũng cần chính đối tượng này để trừ/cộng
 * tồn hai đầu và ghi hai dòng thẻ kho.
 *
 * Ba trường số lượng (`requested` / `shipped` / `received`) bằng nhau: Thủ kho
 * xuất bao nhiêu thì cửa hàng nhận đúng bấy nhiêu, không có thất thoát trên
 * đường trong mô hình MVP.
 *
 * `initialStatus` cho phép lập phiếu với `PENDING` (yêu cầu chờ duyệt) hoặc
 * `COMPLETED` (Thủ kho/Admin trực tiếp xuất, bỏ qua bước duyệt). Ngày
 * xuất/nhận chỉ được gán khi phiếu ở trạng thái COMPLETED.
 */
export const buildTransfer = (input: {
  toBranchId: string;
  toBranchName: string;
  lines: TransferDraftLine[];
  requestDate: string;
  note: string;
  /** Người tạo phiếu, dạng "Họ Tên (NV-0003)". */
  createdBy: string;
  /** Số phiếu đã có, dùng để sinh mã tiếp theo. */
  existingCount: number;
  initialStatus: DocumentStatus;
  /** Function to get product by id - provided by caller */
  getProductById: (productId: string) => { id: string; sku: string; name: string; unit: string; costPrice: number } | undefined;
}): StockTransfer | null => {
  const lines: TransferLine[] = [];

  input.lines.forEach((draft, index) => {
    const product = input.getProductById(draft.productId);
    if (!product || draft.quantity <= 0) return;

    lines.push({
      id: `tl-live-${input.existingCount}-${index}`,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      unit: product.unit,
      requestedQuantity: draft.quantity,
      shippedQuantity: draft.quantity,
      receivedQuantity: draft.quantity,
      unitCost: product.costPrice,
      lineTotal: draft.quantity * product.costPrice,
    });
  });

  if (lines.length === 0) return null;

  const isCompleted = input.initialStatus === DOCUMENT_STATUS.Completed;

  return {
    id: `tr-live-${Date.now()}`,
    code: `PX-${input.requestDate.replace(/-/g, '')}-${String(
      input.existingCount + 1,
    ).padStart(3, '0')}`,
    fromBranchId: DISTRIBUTION_CENTER_ID,
    fromBranchName: DISTRIBUTION_CENTER_NAME,
    toBranchId: input.toBranchId,
    toBranchName: input.toBranchName,
    requestDate: input.requestDate,
    shippedDate: isCompleted ? input.requestDate : null,
    receivedDate: isCompleted ? input.requestDate : null,
    status: input.initialStatus,
    lines,
    totalValue: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    requestedBy: input.toBranchName,
    approvedBy: null,
    note: input.note,
  };
};

export const transferSlice = createSlice({
  name: 'transfer',
  initialState,
  reducers: {
    /** Sửa ghi chú của một phiếu đã lập (không ảnh hưởng tồn kho). */
    updateTransferNote: (
      state,
      action: PayloadAction<{ id: string; note: string }>,
    ) => {
      const transfer = state.transfers.find((item) => item.id === action.payload.id);
      if (!transfer) return;
      transfer.note = action.payload.note;
    },

    /**
     * Duyệt yêu cầu xuất kho: chuyển PENDING → COMPLETED, set ngày xuất/nhận
     * và người duyệt. KHÔNG đụng tồn kho ở đây — caller phải dispatch
     * `transferShipped` để stockSlice xử lý transaction trừ/cộng tồn.
     */
    approveTransfer: (
      state,
      action: PayloadAction<{
        id: string;
        approvedBy: string;
        approvedDate: string;
      }>,
    ) => {
      const transfer = state.transfers.find((item) => item.id === action.payload.id);
      if (!transfer || transfer.status !== DOCUMENT_STATUS.Pending) return;
      transfer.status = DOCUMENT_STATUS.Completed;
      transfer.shippedDate = action.payload.approvedDate;
      transfer.receivedDate = action.payload.approvedDate;
      transfer.approvedBy = action.payload.approvedBy;
    },

    /**
     * Từ chối yêu cầu xuất kho: chuyển PENDING → CANCELLED. Tồn kho hai đầu
     * giữ nguyên vì chưa từng bị đụng tới.
     */
    rejectTransfer: (
      state,
      action: PayloadAction<{ id: string; rejectedBy: string }>,
    ) => {
      const transfer = state.transfers.find((item) => item.id === action.payload.id);
      if (!transfer || transfer.status !== DOCUMENT_STATUS.Pending) return;
      transfer.status = DOCUMENT_STATUS.Cancelled;
      transfer.approvedBy = action.payload.rejectedBy;
    },
  },

  extraReducers: (builder) => {
    // Bước 1: lưu phiếu xuất (áp dụng cho cả PENDING và COMPLETED), mới nhất
    // lên đầu. Khi status = PENDING, tồn kho chưa bị đụng — stockSlice không
    // lắng nghe action này (xem extraReducers bên dưới).
    builder.addCase(transferShipped, (state, action) => {
      state.transfers.unshift(action.payload.transfer);
    });
  },
});

export const {
  updateTransferNote,
  approveTransfer,
  rejectTransfer,
} = transferSlice.actions;

export default transferSlice.reducer;
