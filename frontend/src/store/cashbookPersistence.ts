import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { RootState } from './index';
import {
  addCapitalInjection,
  addManualEntry,
} from './slices/cashbookSlice';
import { saleCompleted } from './slices/posSlice';
import { payrollPaid } from './slices/payrollSlice';
import { purchaseReceived } from './slices/purchaseSlice';
import { orderRefunded } from './slices/salesOrderSlice';
import { soQuyApi, type SoQuyDTO } from '@/api/soQuy';

/**
 * Listener middleware: sau khi các phiếu quỹ được tạo local (Redux), tự động
 * persist xuống backend bằng POST /api/so-quy.
 *
 * Backend tự sinh `ma_chung_tu` (trigger PT/PC-YYYYMMDD-NNN), tính lại
 * `running_balance` (trigger) và enforce các CHECK constraint, nên frontend
 * chỉ cần gửi các trường nghiệp vụ.
 *
 * `id_nguoi_tao` bắt buộc (NOT NULL FK tới nhan_vien) — lấy từ
 * `state.auth.user.idNhanVien`. Nếu không có (session cũ) thì backend
 * tự fallback NV đầu tiên.
 */
export const cashbookPersistence = createListenerMiddleware();

const postEntry = async (dto: Partial<SoQuyDTO>): Promise<void> => {
  try {
    await soQuyApi.create(dto as SoQuyDTO);
  } catch (e) {
    // Không chặn UI — log để debug.
    console.warn('Không persist được phiếu quỹ xuống backend:', e);
  }
};

const buildBase = (state: RootState): Partial<SoQuyDTO> => ({
  idNguoiTao: state.auth.user?.idNhanVien ?? undefined,
});

cashbookPersistence.startListening({
  actionCreator: addCapitalInjection,
  effect: async (action, api) => {
    const state = api.getState() as RootState;
    void postEntry({
      ...buildBase(state),
      direction: 'RECEIPT',
      hangMuc: 'CAP_VON',
      soTien: action.payload.amount,
      entryDate: action.payload.entryDate,
      hinhThucTt: 'BANK_TRANSFER',
      doiTuong: 'Chủ đầu tư / Giám đốc',
      dienGiai: action.payload.description || 'Cấp vốn hoạt động cho quỹ tổng công ty',
    });
  },
});

cashbookPersistence.startListening({
  actionCreator: addManualEntry,
  effect: async (action, api) => {
    const state = api.getState() as RootState;
    void postEntry({
      ...buildBase(state),
      direction: action.payload.direction,
      hangMuc: action.payload.category,
      soTien: action.payload.amount,
      entryDate: action.payload.entryDate,
      hinhThucTt: action.payload.paymentMethod,
      doiTuong: action.payload.counterparty,
      dienGiai: action.payload.description,
      maChungTuLienQuan: action.payload.referenceCode ?? undefined,
    });
  },
});

cashbookPersistence.startListening({
  type: saleCompleted.type,
  effect: async (action: any, api) => {
    const state = api.getState() as RootState;
    const { order } = action.payload;
    void postEntry({
      ...buildBase(state),
      direction: 'RECEIPT',
      hangMuc: 'BAN_HANG',
      soTien: order.grandTotal,
      entryDate: order.soldAt.slice(0, 10),
      hinhThucTt: order.paymentMethod,
      doiTuong: 'Khách lẻ',
      dienGiai: `Doanh thu hoá đơn ${order.code}`,
      maChungTuLienQuan: order.code,
    });
  },
});

cashbookPersistence.startListening({
  type: payrollPaid.type,
  effect: async (action: any, api) => {
    const state = api.getState() as RootState;
    for (const row of action.payload.rows) {
      void postEntry({
        ...buildBase(state),
        direction: 'PAYMENT',
        hangMuc: 'TRA_LUONG',
        soTien: row.netPay,
        entryDate: action.payload.paidAt.slice(0, 10),
        hinhThucTt: 'BANK_TRANSFER',
        doiTuong: `${row.employeeName} (${row.employeeCode})`,
        dienGiai: `Chi lương kỳ ${row.period} cho ${row.employeeName}`,
        maChungTuLienQuan: `BL-${row.period.replace('-', '')}-${row.employeeCode}`,
      });
    }
  },
});

cashbookPersistence.startListening({
  type: purchaseReceived.type,
  effect: async (action: any, api) => {
    const state = api.getState() as RootState;
    const { order } = action.payload;
    void postEntry({
      ...buildBase(state),
      direction: 'PAYMENT',
      hangMuc: 'NHAP_HANG',
      soTien: order.grandTotal,
      entryDate: order.orderDate,
      hinhThucTt: 'BANK_TRANSFER',
      doiTuong: order.supplierName,
      dienGiai: `Thanh toán nhập hàng ${order.code}`,
      maChungTuLienQuan: order.code,
    });
  },
});

cashbookPersistence.startListening({
  type: orderRefunded.type,
  effect: async (action: any, api) => {
    const state = api.getState() as RootState;
    const { order } = action.payload;
    void postEntry({
      ...buildBase(state),
      direction: 'PAYMENT',
      hangMuc: 'KHAC',
      soTien: order.grandTotal,
      entryDate: action.payload.refundedAt.slice(0, 10),
      hinhThucTt: 'CASH',
      doiTuong: `Khách hoàn đơn ${order.code}`,
      dienGiai: `Hoàn tiền hoá đơn ${order.code}`,
      maChungTuLienQuan: order.code,
    });
  },
});
