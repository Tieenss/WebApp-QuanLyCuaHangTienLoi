const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ChiNhanhDTO {
  id: string;
  maChiNhanh: string;
  tenChiNhanh: string;
  diaChi?: string;
  diaChiChiTiet?: string;
  tinhThanh?: string;
  quanHuyen?: string;
  vungMien?: string;
  soDienThoai?: string;
  gioMoCua?: string;
  dienTichM2?: number;
  doanhThuThang?: number;
  ngayKhaiTruong?: string;
  trangThai?: string;
  /** Column `loai` — NOT NULL, có giá trị cho seed data. */
  loai?: string;
  /** Column `loai_chi_nhanh` — nullable, seed data không set → null. */
  loaiChiNhanh?: string;
  idQuanLy?: string;
  tenQuanLy?: string;
  dangHoatDong?: boolean;
  nguoiTao?: string;
  nguoiCapNhat?: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const chiNhanhApi = {
  getAll: async (): Promise<ChiNhanhDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chi nhánh');
    return response.json();
  },

  getById: async (id: string): Promise<ChiNhanhDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chi nhánh');
    return response.json();
  },

  getActive: async (): Promise<ChiNhanhDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/active`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getKhoTong: async (): Promise<ChiNhanhDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/kho-tong`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getCuaHang: async (): Promise<ChiNhanhDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/cua-hang`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: ChiNhanhDTO): Promise<ChiNhanhDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh`, {
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

  update: async (id: string, data: Partial<ChiNhanhDTO>): Promise<ChiNhanhDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },

  assignQuanLy: async (id: string, idQuanLy: string): Promise<ChiNhanhDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-nhanh/${id}/quan-ly/${idQuanLy}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign');
    }
    return response.json();
  },
};