import { API_BASE_URL } from '@/config/api';
import { getAuthHeaders } from './http';

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


const getHeaders = (): HeadersInit => {
  return getAuthHeaders();
};

export const tonKhoApi = {
  getAll: async (): Promise<TonKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/ton-kho`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },

  /**
   * Tồn kho một chi nhánh. Backend kiểm tra chi nhánh trong JWT, vì vậy UI
   * không thể dùng path này để đọc kho của chi nhánh khác.
   */
  getByBranch: async (branchId: string): Promise<TonKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/ton-kho/by-branch/${branchId}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`Không tải được tồn kho chi nhánh (HTTP ${response.status})`);
    return response.json();
  },

  getAvailableForTransfer: async (): Promise<TonKhoDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/ton-kho/available-for-transfer`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch transfer stock');
    return response.json();
  },
};

