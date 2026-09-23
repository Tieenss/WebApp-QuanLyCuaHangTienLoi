import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

export interface NhaCungCapDTO {
  id: string;
  maNcc: string;
  tenNcc: string;
  maSoThue?: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  nguoiLienHe?: string;
  chucDanhLienHe?: string;
  sdtLienHe?: string;
  categoryIds?: string[];
  categories?: Array<{
    id: string;
    tenDanhMuc: string;
    iconEmoji?: string;
    mauHex?: string;
  }>;
  dieuKhoanThanhToan?: string;
  soNgayDuocNo?: number;
  tongCongNo?: number;
  tongDonHang?: number;
  dangHoatDong?: boolean;
  ghiChu?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

const parseError = async (response: Response, fallback: string): Promise<Error> => {
  try {
    const body = await response.json();
    return new Error(body?.message || fallback);
  } catch {
    return new Error(fallback);
  }
};

export const nhaCungCapApi = {
  getAll: async (): Promise<NhaCungCapDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/nha-cung-cap`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getActive: async (): Promise<NhaCungCapDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/nha-cung-cap/active`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: NhaCungCapDTO): Promise<NhaCungCapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nha-cung-cap`, {
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

  update: async (id: string, data: Partial<NhaCungCapDTO>): Promise<NhaCungCapDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/nha-cung-cap/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseError(response, 'Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/nha-cung-cap/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw await parseError(response, 'Failed to delete');
  },
};
