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
