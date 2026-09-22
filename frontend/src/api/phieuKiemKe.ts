import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

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
  tenNguoiTao?: string;
  tenNguoiDuyet?: string;
}

export interface ChiTietKiemKeDTO {
  id?: string;
  /** Backend assigns this when creating lines under /with-lines. */
  idPhieuKiemKe?: string;
  idSanPham: string;
  tonHeThong: number;
  tonThucTe: number;
  soLuongLech: number;
  lyDoLech?: string;
  donGiaVon: number;
  giaTriLech: number;
}

/** Dữ liệu người dùng nhập khi lập phiếu; các giá trị chênh lệch do backend tự tính. */
export interface CreateStocktakeLineRequest {
  idSanPham: string;
  tonThucTe: number;
  lyDoLech?: string;
}

const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
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
    lines: CreateStocktakeLineRequest[];
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
  /** Chỉ cập nhật metadata phiếu; không được dùng để đổi trạng thái kho. */
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
  /** Cân bằng tồn kho, ghi thẻ kho ADJUSTMENT và đổi trạng thái trong một transaction. */
  submit: async (id: string): Promise<PhieuKiemKeDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke/${id}/submit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Không thể gửi duyệt phiếu kiểm kê');
    }
    return response.json();
  },
  balance: async (id: string): Promise<PhieuKiemKeDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke/${id}/balance`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Không thể cân bằng phiếu kiểm kê');
    }
    return response.json();
  },
  cancel: async (id: string): Promise<PhieuKiemKeDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-kiem-ke/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Không thể hủy phiếu kiểm kê');
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
