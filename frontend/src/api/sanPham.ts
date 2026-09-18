import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import { parseApiError } from '@/utils/apiError';

export interface SanPhamDTO {
  id: string;
  idDanhMuc?: string;
  sku?: string;
  maVach?: string;
  tenSanPham: string;
  donVi?: string;
  imageUrl?: string;
  moTa?: string;
  dangHoatDong?: boolean;
  giaVon?: number;
  giaBan: number;
  vatPhantram?: number;
  idNhaCungCap?: string;
  tonToiThieu?: number;
  tonToiDa?: number;
  deHong?: boolean;
  hanSuDungNgay?: number;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const sanPhamApi = {
  getAll: async (): Promise<SanPhamDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getActive: async (): Promise<SanPhamDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham/active`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: SanPhamDTO): Promise<SanPhamDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể tạo sản phẩm');
    return response.json();
  },

  update: async (id: string, data: Partial<SanPhamDTO>): Promise<SanPhamDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cập nhật sản phẩm');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/san-pham/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xóa sản phẩm');
  },
};
