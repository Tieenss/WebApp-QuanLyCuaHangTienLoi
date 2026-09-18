import { API_BASE_URL } from '@/config/api';
import { parseApiError } from '@/utils/apiError';
import { getAuthHeaders } from './http';

export interface TaiKhoanDTO {
  id: string;
  tenDangNhap: string;
  email?: string;
  hoTen?: string;
  vaiTro?: string;
  idNhanVien?: string;
  idChiNhanh?: string;
  trangThai: string;
  ngayTao?: string;
}

export interface CreateTaiKhoanRequest {
  tenDangNhap: string;
  matKhau: string;
  idNhanVien?: string;
  // vaiTro?: string;
  // idChiNhanh?: string;
}

export interface UpdateTaiKhoanRequest {
  matKhau?: string;
  trangThai?: string;
  vaiTro?: string;
}

export const taiKhoanApi = {
  getAll: async (): Promise<TaiKhoanDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getById: async (id: string): Promise<TaiKhoanDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: CreateTaiKhoanRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể tạo tài khoản');
  },

  update: async (id: string, data: UpdateTaiKhoanRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể cập nhật tài khoản');
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw await parseApiError(response, 'Không thể xóa tài khoản');
  },

  changePassword: async (
      id: string,
      data: {
        currentPassword: string;
        newPassword: string;
      }
  ): Promise<void> => {
    const response = await fetch(
        `${API_BASE_URL}/api/tai-khoan/${id}/change-password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(data),
        }
    );

    if (!response.ok) throw await parseApiError(response, 'Đổi mật khẩu thất bại');
  },

  getNhanVienChuaCoTaiKhoan: async (): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/nhan-vien`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
};
