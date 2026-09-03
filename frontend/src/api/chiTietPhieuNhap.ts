const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ChiTietPhieuNhapDTO {
  id: string;
  idPhieuNhap: string;
  idSanPham: string;
  soLuongDat: number;
  soLuongNhan: number;
  donGiaNhap: number;
  vatPhantram: number;
  thanhTien: number;
  hanSuDung?: string;
  thuTu: number;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const chiTietPhieuNhapApi = {
  getByPhieuNhap: async (idPhieuNhap: string): Promise<ChiTietPhieuNhapDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-phieu-nhap/by-phieu/${idPhieuNhap}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  create: async (data: ChiTietPhieuNhapDTO): Promise<ChiTietPhieuNhapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-phieu-nhap`, {
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
  createBatch: async (items: ChiTietPhieuNhapDTO[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-phieu-nhap/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(items),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create');
    }
  },
};