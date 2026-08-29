import { createAction, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  DOCUMENT_STATUS,
  type StockTransfer,
  type TransferLine,
} from '@/types';
import { seedTransfers } from '@/mockData/warehouseDocuments';
import { DISTRIBUTION_CENTER_ID, branchNameById } from '@/mockData/branches';
import { productById } from '@/mockData/products';

/**
 * Module 9 — Xuất kho nội bộ (dữ liệu ghi được).
 *
 * BR-06: chỉ đi từ Kho Tổng ra cửa hàng bán lẻ. Không có điều chuyển ngang
 * giữa các cửa hàng trong MVP.
 *
 * Khi Thủ kho xác nhận xuất kho, hệ thống làm 4 việc trong cùng một transaction
 * (`luong_nghiep_vu.md` mục 3.2):
 *   1. Tạo phiếu xuất + các dòng chi tiết       → `transferSlice`
 *   2. Trừ tồn kho tại Kho Tổng                  → `stockSlice`
 *   3. Cộng tồn kho tại cửa hàng nhận            → `stockSlice`
 *   4. Ghi 2 dòng thẻ kho: XUAT_CHI_NHANH (âm)   → `stockSlice`
 *      tại Kho Tổng và NHAN_TU_KHO (dương) tại cửa hàng
 *
 * Khác hai transaction kia: KHÔNG sinh phiếu sổ quỹ, vì luân chuyển nội bộ
 * không phát sinh dòng tiền — hàng chỉ đổi chỗ trong cùng một hệ thống.
 *
 * `phieu_xuat_kho.trang_thai` chỉ có duy nhất `HOAN_THANH`: cửa hàng nhận hàng
 * ngay khi Thủ kho xuất, không có bước xác nhận riêng.
 */

export interface TransferState {
  transfers: StockTransfer[];
}

const initialState: TransferState = {
  transfers: seedTransfers,
};

/** Một dòng hàng người dùng nhập trên form. */
export interface TransferDraftLine {
  productId: string;
  quantity: number;
}

/** Action dùng chung cho cả transaction xuất kho nội bộ. */
export const transferShipped = createAction<{
  transfer: StockTransfer;
  /** Người thực hiện, dạng "Họ Tên (NV-0003)". */
  performedBy: string;
}>('transfer/shipped');

/**
 * Dựng `StockTransfer` hoàn chỉnh từ dữ liệu form.
 *
 * Đặt ngoài reducer vì `stockSlice` cũng cần chính đối tượng này để trừ/cộng
 * tồn hai đầu và ghi hai dòng thẻ kho.
 *
 * Ba trường số lượng (`requested` / `shipped` / `received`) bằng nhau: Thủ kho
 * xuất bao nhiêu thì cửa hàng nhận đúng bấy nhiêu, không có thất thoát trên
 * đường trong mô hình MVP.
 */
export const buildTransfer = (input: {
  toBranchId: string;
  lines: TransferDraftLine[];
  requestDate: string;
  note: string;
  /** Người tạo phiếu (Thủ kho), dạng "Họ Tên (NV-0003)". */
  createdBy: string;
  /** Số phiếu đã có, dùng để sinh mã tiếp theo. */
  existingCount: number;
}): StockTransfer | null => {
  const lines: TransferLine[] = [];

  input.lines.forEach((draft, index) => {
    const product = productById(draft.productId);
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

  return {
    id: `tr-live-${Date.now()}`,
    code: `PX-${input.requestDate.replace(/-/g, '')}-${String(
      input.existingCount + 1,
    ).padStart(3, '0')}`,
    // BR-06: nguồn xuất luôn là Kho Tổng.
    fromBranchId: DISTRIBUTION_CENTER_ID,
    fromBranchName: branchNameById(DISTRIBUTION_CENTER_ID),
    toBranchId: input.toBranchId,
    toBranchName: branchNameById(input.toBranchId),
    requestDate: input.requestDate,
    shippedDate: input.requestDate,
    receivedDate: input.requestDate,
    status: DOCUMENT_STATUS.Completed,
    lines,
    totalValue: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    requestedBy: branchNameById(input.toBranchId),
    approvedBy: input.createdBy,
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
  },

  extraReducers: (builder) => {
    // Bước 1: lưu phiếu xuất, mới nhất lên đầu.
    builder.addCase(transferShipped, (state, action) => {
      state.transfers.unshift(action.payload.transfer);
    });
  },
});

export const { updateTransferNote } = transferSlice.actions;

export default transferSlice.reducer;
