import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';
import { parseApiError } from '@/utils/apiError';

export interface DanhMucDTO {
  id: string;
  maDanhMuc: string;
  tenDanhMuc: string;
  parentId?: string;
  moTa?: string;
  iconEmoji?: string;
  imageUrl?: string;
  mauHex?: string;
  thuTuHienThi?: number;
  productCount?: number;
  dangHoatDong?: boolean;
  ngayTao?: string;
  ngayCapNhat?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const danhMucApi = {
  getAll: async (): Promise<DanhMucDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getActive: async (): Promise<DanhMucDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc/active`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: DanhMucDTO): Promise<DanhMucDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc`, {
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

  update: async (id: string, data: Partial<DanhMucDTO>): Promise<DanhMucDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xóa danh mục');
    return response.json();
  },

  restore: async (id: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc/${id}/restore`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể khôi phục danh mục');
    return response.json();
  },

  moveUp: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc/${id}/move-up`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể di chuyển lên');
  },

  moveDown: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/danh-muc/${id}/move-down`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể di chuyển xuống');
  },
};
