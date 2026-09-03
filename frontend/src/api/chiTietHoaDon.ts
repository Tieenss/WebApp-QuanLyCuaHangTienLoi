const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ChiTietHoaDonDTO {
  id: string;
  idHoaDon: string;
  idSanPham: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  giamGia?: number;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const chiTietHoaDonApi = {
  /** Lấy tất cả dòng chi tiết theo hoá đơn. */
  getByHoaDon: async (idHoaDon: string): Promise<ChiTietHoaDonDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-hoa-don/by-hoa-don/${idHoaDon}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chi tiết hoá đơn');
    return response.json();
  },

  /** Gửi một dòng chi tiết. */
  create: async (data: ChiTietHoaDonDTO): Promise<ChiTietHoaDonDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-hoa-don`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create chi tiết');
    return response.json();
  },

  /** Gửi nhiều dòng chi tiết cùng lúc (dùng khi checkout POS). */
  createBatch: async (items: ChiTietHoaDonDTO[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-hoa-don/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(items),
    });
    if (!response.ok) throw new Error('Failed to create batch chi tiết');
  },
};
