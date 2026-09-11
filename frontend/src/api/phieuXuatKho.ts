import { API_BASE_URL } from '@/config/api';

export interface PhieuXuatKhoDTO {
  id: string;
  maPhieu: string;
  idChiNhanhXuat?: string;
  idChiNhanhNhan?: string;
  idNguoiTao?: string;
  idNguoiDuyet?: string;
  idNguoiNhan?: string;
  ngayYeuCau?: string;
  ngayXuatThucTe?: string;
  ngayNhanThucTe?: string;
  trangThai?: string;
  ghiChu?: string;
  ngayTao?: string;
  ngayCapNhat?: string;
}

export interface ChiTietPhieuXuatDTO {
  id: string;
  idPhieuXuat: string;
  idSanPham: string;
  soLuongYeuCau: number;
  soLuongXuat: number;
  soLuongNhan: number;
  donGiaVon: number;
  thanhTien: number;
  hanSuDung?: string;
  thuTu: number;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const phieuXuatKhoApi = {
  getAll: async (): Promise<PhieuXuatKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-xuat-kho`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  getByBranchXuat: async (idChiNhanh: string): Promise<PhieuXuatKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-xuat-kho/by-branch-xuat/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  create: async (data: PhieuXuatKhoDTO): Promise<PhieuXuatKhoDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-xuat-kho`, {
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
  /** Thủ kho xác nhận xuất: PENDING → SHIPPED, trừ tồn kho xuất + thẻ kho. */
  ship: async (
    id: string,
    body: { idNguoiThucHien: string; lines: { idSanPham: string; soLuong: number }[] },
  ): Promise<PhieuXuatKhoDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-xuat-kho/${id}/ship`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || "Lỗi xác nhận xuất kho");
    }
    return response.json();
  },
  /** Chi nhánh xác nhận đã nhận: SHIPPED → COMPLETED, cộng tồn chi nhánh. */
  receive: async (
    id: string,
    body: { idNguoiThucHien: string; lines?: { idSanPham: string; soLuong: number }[] },
  ): Promise<PhieuXuatKhoDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/phieu-xuat-kho/${id}/receive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || "Lỗi xác nhận nhận hàng");
    }
    return response.json();
  },
};

export const chiTietPhieuXuatApi = {
  getByPhieuXuat: async (idPhieuXuat: string): Promise<ChiTietPhieuXuatDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-phieu-xuat/by-phieu/${idPhieuXuat}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  createBatch: async (items: ChiTietPhieuXuatDTO[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/chi-tiet-phieu-xuat/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(items),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create');
    }
  },
};