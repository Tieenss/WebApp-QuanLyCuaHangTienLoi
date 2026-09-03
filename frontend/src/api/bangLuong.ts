const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface BangLuongDTO {
  id: string;
  idNhanVien: string;
  tenNhanVien?: string;
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
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const bangLuongApi = {
  getAll: async (): Promise<BangLuongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch bảng lương');
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

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/bang-luong/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },
};
