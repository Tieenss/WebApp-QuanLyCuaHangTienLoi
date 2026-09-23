import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

export interface LoHangDTO {
  id: string;
  maLo: string;
  idSanPham: string;
  tenSanPham?: string;
  sku?: string;
  idChiNhanh: string;
  tenChiNhanh?: string;
  soLuongTon: number;
  hanSuDung?: string | null;
  ngaySanXuat?: string | null;
  giaVon: number;
  trangThai: 'ACTIVE' | 'EXPIRED' | 'DISPOSED';
  ngayTao?: string;
  ngayCapNhat?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const loHangApi = {
  getByProduct: async (idSanPham: string, idChiNhanh: string): Promise<LoHangDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/lo-hang/by-product/${idSanPham}/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Không thể tải danh sách lô hàng');
    return response.json();
  },

  disposeLot: async (id: string, lyDo?: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/lo-hang/${id}/dispose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ lyDo: lyDo || 'Hết hạn sử dụng' }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Lỗi huỷ lô hàng');
    }
    return response.json();
  },
};
