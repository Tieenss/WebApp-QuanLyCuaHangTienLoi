import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import { parseApiError } from '@/utils/apiError';

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
  idChiNhanh?: string | null;
  trangThai?: string;
  soTaiKhoan?: string;
  tenNganHang?: string;
  ngayVaoLam?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
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
    if (!response.ok) throw await parseApiError(response, 'Không thể tạo nhân viên');
    return response.json();
  },

  update: async (id: string, data: Partial<NhanVienDTO>): Promise<NhanVienDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cập nhật nhân viên');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nhan-vien/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xóa nhân viên');
  },
};
