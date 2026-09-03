import { createAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  DOCUMENT_STATUS,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from '@/types';
import { phieuNhapApi, type PhieuNhapDTO } from '@/api/phieuNhap';

/**
 * Module 8 — Nhập kho từ nhà cung cấp (dữ liệu ghi được).
 *
 * BR-05: chỉ nhập vào Kho Tổng. Cửa hàng bán lẻ nhận hàng qua phiếu xuất kho
 * nội bộ (module 9), không nhận trực tiếp từ NCC.
 *
 * Khi lưu phiếu nhập, hệ thống làm 4 việc trong cùng một transaction
 * (`luong_nghiep_vu.md` mục 3.1):
 *   1. Tạo phiếu nhập + các dòng chi tiết          → `purchaseSlice`
 *   2. Cộng tồn kho tại Kho Tổng                    → `stockSlice`
 *   3. Ghi thẻ kho NHAP_NCC (số lượng dương)        → `stockSlice`
 *   4. Tạo phiếu chi sổ quỹ CHI / NHAP_HANG         → `cashbookSlice`
 *
 * Cùng mô hình "một action, nhiều slice lắng nghe" như `saleCompleted` và
 * `payrollPaid`: Redux Toolkit chạy hết reducer của một dispatch rồi mới thông
 * báo cho UI, nên không có trạng thái trung gian nào lộ ra.
 */

export interface PurchaseState {
  orders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
}

const initialState: PurchaseState = {
  orders: [],
  loading: false,
  error: null,
};

const mapDtoToOrder = (dto: PhieuNhapDTO): PurchaseOrder => ({
  id: dto.id,
  code: dto.maPhieu,
  supplierId: dto.idNcc || '',
  supplierName: '',
  branchId: dto.idChiNhanh || '',
  branchName: '',
  orderDate: dto.ngayDatHang || '',
  expectedDate: dto.ngayDuKienGiao || null,
  receivedDate: dto.ngayNhanThucTe || null,
  status: (dto.trangThai as any) || 'PENDING',
  subTotal: dto.subTotal || 0,
  vatTotal: dto.vatTotal || 0,
  discount: dto.giamGia || 0,
  grandTotal: dto.grandTotal || 0,
  paidAmount: dto.daThanhToan || 0,
  debtAmount: dto.congNo || 0,
  note: dto.ghiChu || '',
  createdAt: dto.ngayTao || '',
  createdBy: '',
  idNguoiNhap: dto.idNguoiNhap || '',
  lines: [],
});

export const fetchPurchaseOrders = createAsyncThunk(
  'purchase/fetchAll',
  async () => {
    const data = await phieuNhapApi.getAll();
    return data.map(mapDtoToOrder);
  },
);

/** Một dòng hàng người dùng nhập trên form. */
export interface PurchaseDraftLine {
  productId: string;
  quantity: number;
  unitCost: number;
}

/** Action dùng chung cho cả transaction nhập kho. */
export const purchaseReceived = createAction<{
  order: PurchaseOrder;
  /** Người thực hiện, dạng "Họ Tên (NV-0003)". */
  performedBy: string;
}>('purchase/received');

/**
 * Dựng `PurchaseOrder` hoàn chỉnh từ dữ liệu form.
 *
 * Đặt ngoài reducer vì `stockSlice` và `cashbookSlice` cũng cần chính đối tượng
 * này để cộng tồn kho và lập phiếu chi.
 *
 * Số thực nhận bằng số đặt: phiếu chỉ được lập khi Thủ kho đã kiểm đếm xong
 * hàng thực tế trên xe (`luong_nghiep_vu.md` mục 3.1), nên không có khái niệm
 * "chờ giao" ở bước này.
 */
export const buildPurchaseOrder = (input: {
  supplierId: string;
  supplierName: string;
  lines: PurchaseDraftLine[];
  orderDate: string;
  note: string;
  createdBy: string;
  existingCount: number;
}): PurchaseOrder | null => {
  const lines: PurchaseOrderLine[] = [];

  input.lines.forEach((draft, index) => {
    if (draft.quantity <= 0) return;

    lines.push({
      id: `pol-live-${input.existingCount}-${index}`,
      productId: draft.productId,
      sku: '',
      productName: '',
      unit: '',
      orderedQuantity: draft.quantity,
      receivedQuantity: draft.quantity,
      unitCost: draft.unitCost,
      vatPercent: 0,
      lineTotal: draft.quantity * draft.unitCost,
      expiryDate: null,
    });
  });

  if (lines.length === 0) return null;

  const subTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const vatTotal = Math.round(
    lines.reduce((sum, line) => sum + (line.lineTotal * line.vatPercent) / 100, 0),
  );
  const grandTotal = subTotal + vatTotal;

  return {
    id: `po-live-${Date.now()}`,
    code: `PN-${input.orderDate.replace(/-/g, '')}-${String(
      input.existingCount + 1,
    ).padStart(3, '0')}`,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    branchId: '',
    branchName: '',
    orderDate: input.orderDate,
    expectedDate: input.orderDate,
    receivedDate: input.orderDate,
    status: DOCUMENT_STATUS.Completed,
    lines,
    subTotal,
    vatTotal,
    discount: 0,
    grandTotal,
    paidAmount: grandTotal,
    createdBy: input.createdBy,
    note: input.note,
  };
};

export const purchaseSlice = createSlice({
  name: 'purchase',
  initialState,
  reducers: {
    /** Sửa ghi chú của một phiếu đã lập (thông tin không ảnh hưởng kho/tiền). */
    updatePurchaseNote: (
      state,
      action: PayloadAction<{ id: string; note: string }>,
    ) => {
      const order = state.orders.find((item) => item.id === action.payload.id);
      if (!order) return;
      order.note = action.payload.note;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Lỗi tải phiếu nhập';
      });
    // Bước 1: lưu phiếu nhập, mới nhất lên đầu.
    builder.addCase(purchaseReceived, (state, action) => {
      state.orders.unshift(action.payload.order);
    });
  },
});

export const { updatePurchaseNote } = purchaseSlice.actions;

export default purchaseSlice.reducer;
