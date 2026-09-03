import type { LoginFormValues, LoginResult } from '@/types/authTypes';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const authApi = {
  login: async (values: LoginFormValues): Promise<LoginResult> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: values.username,
        password: values.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Đăng nhập thất bại');
    }

    const data = await response.json();
    return {
      user: {
        id: data.user.id,
        employeeCode: data.user.tenDangNhap || data.user.tenDangNhap,
        fullName: data.user.hoTen || data.user.tenDangNhap,
        email: data.user.email || '',
        phone: data.user.soDienThoai || '',
        role: data.user.vaiTro || 'THU_NGAN',
        branchId: data.user.idChiNhanh,
        allowedBranchIds: [],
        avatarText: (data.user.hoTen || data.user.tenDangNhap)?.charAt(0) || 'U',
        status: data.user.trangThai || 'ACTIVE',
      },
      token: data.token,
      expiresAt: data.expiresAt,
    };
  },
};

export interface TaiKhoanDTO {
  id: string;
  tenDangNhap: string;
  email?: string;
  hoTen?: string;
  vaiTro?: string;
  idNhanVien?: string;
  idChiNhanh?: string;
  trangThai: string;
}

export interface CreateTaiKhoanRequest {
  tenDangNhap: string;
  matKhau: string;
  idNhanVien?: string;
  vaiTro?: string;
  idChiNhanh?: string;
}

export interface UpdateTaiKhoanRequest {
  matKhau?: string;
  trangThai?: string;
  vaiTro?: string;
}

export const taiKhoanApi = {
  getAll: async (): Promise<TaiKhoanDTO[]> => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  getById: async (id: string): Promise<TaiKhoanDTO> => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  create: async (data: CreateTaiKhoanRequest): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create');
    }
  },

  update: async (id: string, data: UpdateTaiKhoanRequest): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
  },

  delete: async (id: string): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to delete');
  },

  getNhanVienChuaCoTaiKhoan: async (): Promise<any[]> => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/api/tai-khoan/nhan-vien`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
};
