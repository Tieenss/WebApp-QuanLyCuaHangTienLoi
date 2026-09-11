import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  DOCUMENT_STATUS,
  type DocumentStatus,
  type StockTransfer,
  type TransferLine,
} from '@/types';
import { phieuXuatKhoApi, type PhieuXuatKhoDTO } from '@/api/phieuXuatKho';

/**
 * Module 9 — Xuất kho nội bộ (dữ liệu ghi được).
 *
 * BR-06: chỉ đi từ Kho Tổng ra cửa hàng bán lẻ. Không có điều chuyển ngang
 * giữa các cửa hàng trong MVP.
 *
 * Vòng đời phiếu (luồng 3 bước):
 *   1. Quản lý chi nhánh tạo yêu cầu với `status = PENDING` (chờ duyệt).
 *   2. Thủ kho bấm Duyệt → form xác nhận xuất (điền SL thực xuất) → API
 *      `/ship`: trừ tồn Kho Tổng + ghi thẻ kho TRANSFER_OUT, phiếu thành
 *      `SHIPPED` (chờ nhận hàng).
 *   3. Quản lý chi nhánh bấm "Đã nhận hàng" → API `/receive`: cộng tồn chi
 *      nhánh + thẻ kho TRANSFER_IN, phiếu thành `COMPLETED`.
 *   Từ chối ở bước 1: PENDING → CANCELLED, tồn kho giữ nguyên.
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
 * Action dùng chung cho transaction xuất kho — dispatch khi Thủ kho xác nhận
 * XUẤT (PENDING → SHIPPED) hoặc khi Admin/Thủ kho lập phiếu xuất trực tiếp
 * (COMPLETED). Tồn kho thật do backend ghi qua `fn_ghi_the_kho_va_dieu_chinh_ton`;
 * UI refresh `fetchStock()` sau mỗi bước nên action này chỉ còn tác dụng cập
 * nhật danh sách phiếu trong session.
 */
export const transferShipped = createAction<{
  transfer: StockTransfer;
  /** Người thực hiện, dạng "Họ Tên (NV-0003)". */
  performedBy: string;
}>('transfer/shipped');

const mapDtoToTransfer = (dto: PhieuXuatKhoDTO): StockTransfer => ({
  id: dto.id,
  code: dto.maPhieu,
  fromBranchId: dto.idChiNhanhXuat || '',
  fromBranchName: '',
  toBranchId: dto.idChiNhanhNhan || '',
  toBranchName: '',
  createdById: dto.idNguoiTao || '',
  createdByName: '',
  approverId: dto.idNguoiDuyet || null,
  approverName: '',
  receiverId: dto.idNguoiNhan || null,
  receiverName: '',
  requestDate: dto.ngayYeuCau || '',
  shippedDate: dto.ngayXuatThucTe || null,
  receivedDate: dto.ngayNhanThucTe || null,
  status: (dto.trangThai as any) || 'PENDING',
  note: dto.ghiChu || '',
  lines: [],
});

export const fetchTransfers = createAsyncThunk('transfer/fetchAll', async () => {
  const data = await phieuXuatKhoApi.getAll();
  return data.map(mapDtoToTransfer);
});

export const DISTRIBUTION_CENTER_ID = 'a1b2c3d4-0001-0000-0000-000000000001'; // Kho Tổng Circle K Miền Nam
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
     * Thủ kho xác nhận xuất kho: PENDING → SHIPPED (chờ chi nhánh nhận hàng).
     * Tồn kho do backend cập nhật; UI refetch sau khi API thành công.
     */
    shipTransfer: (
      state,
      action: PayloadAction<{
        id: string;
        approvedBy: string;
        shippedDate: string;
      }>,
    ) => {
      const transfer = state.transfers.find((item) => item.id === action.payload.id);
      if (!transfer || transfer.status !== DOCUMENT_STATUS.Pending) return;
      transfer.status = DOCUMENT_STATUS.Shipped;
      transfer.shippedDate = action.payload.shippedDate;
      transfer.approvedBy = action.payload.approvedBy;
    },

    /**
     * Chi nhánh xác nhận đã nhận: SHIPPED → COMPLETED.
     */
    receiveTransfer: (
      state,
      action: PayloadAction<{ id: string; receivedDate: string }>,
    ) => {
      const transfer = state.transfers.find((item) => item.id === action.payload.id);
      if (!transfer || transfer.status !== DOCUMENT_STATUS.Shipped) return;
      transfer.status = DOCUMENT_STATUS.Completed;
      transfer.receivedDate = action.payload.receivedDate;
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
    builder
      .addCase(fetchTransfers.fulfilled, (state, action) => {
        state.transfers = action.payload;
      });
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
  shipTransfer,
  receiveTransfer,
  rejectTransfer,
} = transferSlice.actions;

export default transferSlice.reducer;
