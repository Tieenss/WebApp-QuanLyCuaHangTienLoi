const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface TheKhoDTO {
  id?: string;
  idSanPham: string;
  tenSanPham?: string;
  maVach?: string;
  idChiNhanh: string;
  tenChiNhanh?: string;
  ngayPhieu?: string;
  loaiPhieu?: string;
  soPhieu?: string;
  soLuongNhap?: number;
  soLuongXuat?: number;
  soLuongTon?: number;
  donGia?: number;
  thanhTien?: number;
  ghiChu?: string;
}

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const theKhoApi = {
  getAll: async (): Promise<TheKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/the-kho`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch thẻ kho');
    return response.json();
  },

  getByProduct: async (idSanPham: string): Promise<TheKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/the-kho/by-product/${idSanPham}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch thẻ kho');
    return response.json();
  },

  getByBranch: async (idChiNhanh: string): Promise<TheKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/the-kho/by-branch/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch thẻ kho');
    return response.json();
  },

  getByProductAndBranch: async (idSanPham: string, idChiNhanh: string): Promise<TheKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/the-kho/by-product/${idSanPham}/by-branch/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch thẻ kho');
    return response.json();
  },
};
