const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ChamCongDTO {
  id: string;
  idNhanVien: string;
  tenNhanVien?: string;
  workDate: string;
  caLamViec: string;
  checkInAt?: string;
  checkOutAt?: string;
  clockInAt?: string;
  clockOutAt?: string;
  diTrePhut?: number;
  overtimeHours?: number;
  breakHours?: number;
  tongGioLam?: number;
  trangThai?: string;
  daThanhToan?: boolean;
  ghiChu?: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const chamCongApi = {
  getAll: async (): Promise<ChamCongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chấm công');
    return response.json();
  },

  getById: async (id: string): Promise<ChamCongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chấm công');
    return response.json();
  },

  getByNhanVien: async (idNhanVien: string): Promise<ChamCongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/by-employee/${idNhanVien}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chấm công');
    return response.json();
  },

  /** Lấy toàn bộ chấm công trong 1 ngày. */
  getByDate: async (workDate: string): Promise<ChamCongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/by-date/${workDate}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chấm công');
    return response.json();
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<ChamCongDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/by-date-range?start=${startDate}&end=${endDate}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chấm công');
    return response.json();
  },

  create: async (data: ChamCongDTO): Promise<ChamCongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create');
    return response.json();
  },

  /** Sinh lịch ca cho 1 nhân viên trong 1 ngày (dựa trên ca mặc định). */
  scheduleForEmployee: async (idNhanVien: string, workDate?: string): Promise<ChamCongDTO[]> => {
    const q = workDate ? `?workDate=${workDate}` : '';
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/schedule/${idNhanVien}${q}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to schedule');
    return response.json();
  },

  /** Sinh lịch ca cho 1 nhân viên trong khoảng ngày. */
  scheduleRange: async (idNhanVien: string, fromDate: string, toDate: string): Promise<ChamCongDTO[]> => {
    const response = await fetch(
      `${API_BASE_URL}/api/cham-cong/schedule-range/${idNhanVien}?fromDate=${fromDate}&toDate=${toDate}`,
      { method: 'POST', headers: getHeaders() },
    );
    if (!response.ok) throw new Error('Failed to schedule');
    return response.json();
  },

  /** Check-in: ghi clock_in_at = now. */
  clockIn: async (id: string): Promise<ChamCongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/${id}/clock-in`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to clock in');
    return response.json();
  },

  /** Check-out: ghi clock_out_at = now + tính tong_gio_lam. */
  clockOut: async (id: string): Promise<ChamCongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/${id}/clock-out`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to clock out');
    return response.json();
  },

  update: async (id: string, data: Partial<ChamCongDTO>): Promise<ChamCongDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/cham-cong/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },
};
