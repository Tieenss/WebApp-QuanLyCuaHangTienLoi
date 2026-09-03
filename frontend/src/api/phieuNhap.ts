const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface PhieuNhapDTO {
  id: string;
  maPhieu: string;
  idChiNhanh?: string;
  idNcc?: string;
  idNguoiNhap?: string;
  nguoiNhapTen?: string;
  ngayDatHang?: string;
  ngayDuKienGiao?: string;
  ngayNhanThucTe?: string;
  subTotal?: number;
  vatTotal?: number;
  giamGia?: number;
  grandTotal?: number;
  daThanhToan?: number;
  congNo?: number;
  trangThai?: string;
  ghiChu?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const phieuNhapApi = {
  getAll: async (): Promise<PhieuNhapDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  create: async (data: PhieuNhapDTO): Promise<PhieuNhapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-nhap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create');
    }
    return response.json();
  },
};