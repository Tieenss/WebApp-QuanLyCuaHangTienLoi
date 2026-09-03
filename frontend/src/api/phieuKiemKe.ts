const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface PhieuKiemKeDTO {
  id?: string;
  maPhieu?: string | null;
  idChiNhanh?: string;
  idNguoiTao?: string;
  idNguoiDuyet?: string;
  ngayKiemKe?: string;
  ngayCanBang?: string;
  trangThai?: string;
  ghiChu?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
}

export interface ChiTietKiemKeDTO {
  id?: string;
  idPhieuKiemKe: string;
  idSanPham: string;
  tonHeThong: number;
  tonThucTe: number;
  soLuongLech: number;
  lyDoLech?: string;
  donGiaVon: number;
  giaTriLech: number;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const phieuKiemKeApi = {
  getAll: async (): Promise<PhieuKiemKeDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  getByBranch: async (idChiNhanh: string): Promise<PhieuKiemKeDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke/by-branch/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  create: async (data: PhieuKiemKeDTO): Promise<PhieuKiemKeDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to create');
    }
    return response.json();
  },
  /**
   * Tạo phiếu kiểm kê + toàn bộ chi tiết trong 1 transaction backend.
   * Tránh phiếu mồ côi (header có nhưng lines lỗi → commit một nửa).
   */
  createWithLines: async (data: {
    idChiNhanh: string;
    ngayKiemKe: string;
    ghiChu?: string;
    lines: ChiTietKiemKeDTO[];
  }): Promise<PhieuKiemKeDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke/with-lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to create');
    }
    return response.json();
  },
  /** Cập nhật phiếu (duyệt / cân bằng / huỷ) — persist xuống backend. */
  update: async (id: string, data: Partial<PhieuKiemKeDTO>): Promise<PhieuKiemKeDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to update');
    }
    return response.json();
  },
};

export const chiTietKiemKeApi = {
  getByPhieuKiemKe: async (idPhieuKiemKe: string): Promise<ChiTietKiemKeDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-kiem-ke/by-phieu/${idPhieuKiemKe}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  createBatch: async (items: ChiTietKiemKeDTO[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-kiem-ke/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(items),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to create');
    }
  },
};