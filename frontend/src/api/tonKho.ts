const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface TonKhoDTO {
  idSanPham: string;
  idChiNhanh: string;
  soLuongTon?: number;
  giaVonTrungBinh?: number;
  giaTriTon?: number;
  tonToiThieu?: number;
  tonToiDa?: number;
  hanSuDungGanNhat?: string;
  lanBienDongCuoi?: string;
}

export interface TheKhoDTO {
  id: string;
  ngayPhatSinh: string;
  idSanPham: string;
  idChiNhanh: string;
  loaiGiaoDich: string;
  soLuong: number;
  donGia?: number;
  thanhTien?: number;
  tonTruoc?: number;
  tonSau?: number;
  maChungTu?: string;
  nguoiThucHien?: string;
  hanSuDung?: string;
  ghiChu?: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const tonKhoApi = {
  getAll: async (): Promise<TonKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/ton-kho`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
};

export const theKhoApi = {
  getAll: async (): Promise<TheKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/the-kho`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
};