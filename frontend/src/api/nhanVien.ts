const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface NhanVienDTO {
  id: string;
  maNhanVien?: string;
  hoTen: string;
  email?: string;
  soDienThoai?: string;
  vaiTro?: string;
  viTri?: string;
  loaiHopDong?: string;
  caMacDinh?: string;
  luongTheoGio?: number;
  luongCung?: number;
  idChiNhanh?: string;
  trangThai?: string;
  soTaiKhoan?: string;
  tenNganHang?: string;
  ngayVaoLam?: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const nhanVienApi = {
  getAll: async (): Promise<NhanVienDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch nhân viên');
    return response.json();
  },

  getById: async (id: string): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch nhân viên');
    return response.json();
  },

  create: async (data: NhanVienDTO): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien`, {
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

  update: async (id: string, data: Partial<NhanVienDTO>): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },
};