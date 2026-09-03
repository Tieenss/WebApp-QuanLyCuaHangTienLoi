const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface HoaDonDTO {
  id: string;
  maHoaDon?: string;
  idChiNhanh: string;
  tenChiNhanh?: string;
  idThuNgan: string;
  tenThuNgan?: string;
  caLamViec?: string;
  ngayBan?: string;
  hinhThucTt?: string;
  sdtThanhVien?: string;
  subTotal?: number;
  giamGia?: number;
  vatTotal?: number;
  grandTotal: number;
  tienKhachDua?: number;
  tienThoi?: number;
  trangThai?: string;
  idNguoiHoan?: string;
  ngayHoan?: string;
  lyDoHoan?: string;
  ghiChu?: string;
}

export interface ChiTietHoaDonDTO {
  id: string;
  idHoaDon: string;
  idSanPham: string;
  tenSanPham?: string;
  maVach?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  giamGia?: number;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const hoaDonApi = {
  getAll: async (): Promise<HoaDonDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch hoá đơn');
    return response.json();
  },

  getById: async (id: string): Promise<HoaDonDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch hoá đơn');
    return response.json();
  },

  getByBranch: async (idChiNhanh: string): Promise<HoaDonDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don/by-branch/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch hoá đơn');
    return response.json();
  },

  getByCashier: async (idThuNgan: string): Promise<HoaDonDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don/by-cashier/${idThuNgan}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch hoá đơn');
    return response.json();
  },

  getByStatus: async (trangThai: string): Promise<HoaDonDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don/by-status/${trangThai}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch hoá đơn');
    return response.json();
  },

  create: async (data: HoaDonDTO): Promise<HoaDonDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create');
    return response.json();
  },

  update: async (id: string, data: Partial<HoaDonDTO>): Promise<HoaDonDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/hoa-don/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },
};
