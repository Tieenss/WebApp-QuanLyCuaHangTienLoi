import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

export interface BangLuongDTO {
  id: string;
  idNhanVien: string;
  tenNhanVien?: string;
  maNhanVien?: string;
  vaiTro?: string;
  idChiNhanh: string;
  tenChiNhanh?: string;
  loaiHopDong: string;
  thangNam: string;
  tongGioLam: number;
  overtimeHours: number;
  tongSoCa: number;
  gioDieuChinh?: number | null;
  lyDoDieuChinh?: string;
  luongTheoGio: number;
  luongCung: number;
  luongCungThucTe: number;
  tienCongTheoGio: number;
  tienOt: number;
  thuong: number;
  khauTru: number;
  tongTienLuong: number;
  trangThai: string;
  idNguoiXacNhan?: string;
  tenNguoiXacNhan?: string;
  ngayXacNhan?: string;
  idNguoiDuyetChi?: string;
  tenNguoiDuyetChi?: string;
  ngayDuyetChi?: string;
  idNguoiThanhToan?: string;
  tenNguoiThanhToan?: string;
  ngayThanhToan?: string;
  maPhieuChi?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const bangLuongApi = {
  getAll: async (period?: string): Promise<BangLuongDTO[]> => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const response = await fetch(`${API_BASE_URL}/api/bang-luong${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương');
    return response.json();
  },

  getMine: async (period?: string): Promise<BangLuongDTO[]> => {
    const query = period ? `?period=${encodeURIComponent(period)}` : '';
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/me${query}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương của bạn');
    return response.json();
  },

  getById: async (id: string): Promise<BangLuongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương');
    return response.json();
  },

  getByNhanVien: async (idNhanVien: string): Promise<BangLuongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/by-employee/${idNhanVien}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương');
    return response.json();
  },

  getByThangNam: async (thangNam: string): Promise<BangLuongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/by-month/${thangNam}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương');
    return response.json();
  },

  getByStatus: async (trangThai: string): Promise<BangLuongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/by-status/${trangThai}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương');
    return response.json();
  },

  /** Tự tổng hợp bảng lương 1 tháng từ dữ liệu chấm công. */
  generate: async (thangNam: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/generate/${thangNam}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to generate bảng lương');
    }
  },

  create: async (data: BangLuongDTO): Promise<BangLuongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create');
    return response.json();
  },

  update: async (id: string, data: Partial<BangLuongDTO>): Promise<BangLuongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  adjustHours: async (id: string, hours: number, reason: string): Promise<BangLuongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}/hours-adjustment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ hours, reason }),
    });
    if (!response.ok) {
      throw new Error((await response.json().catch(() => null))?.message || 'Không thể lưu điều chỉnh giờ');
    }
    return response.json();
  },

  confirmHours: async (id: string): Promise<BangLuongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}/confirm-hours`, {
      method: 'POST', headers: getHeaders(),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Không thể xác nhận giờ làm');
    return response.json();
  },

  approvePayment: async (id: string): Promise<BangLuongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}/approve-payment`, {
      method: 'POST', headers: getHeaders(),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Không thể duyệt chi lương');
    return response.json();
  },

  approvePaymentBatch: async (ids: string[]): Promise<BangLuongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/approve-payment/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || 'Không thể duyệt chi các bảng lương đã chọn');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },
};
