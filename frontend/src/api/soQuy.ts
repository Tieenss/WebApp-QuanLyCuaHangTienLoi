const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * DTO khớp với backend `SoQuyDTO` (controller trả entity + resolve tên).
 *
 * Mapping với frontend `CashEntry` (cashbookTypes.ts):
 *   maChungTu ↔ code, hangMuc ↔ category, soTien ↔ amount,
 *   doiTuong ↔ counterparty, dienGiai ↔ description,
 *   maChungTuLienQuan ↔ referenceCode, entryDate ↔ entryDate,
 *   direction/hinhThucTt/trangThai giữ nguyên giá trị.
 */
export interface SoQuyDTO {
  id?: string;
  maChungTu?: string;
  maChungTuLienQuan?: string;
  direction: 'RECEIPT' | 'PAYMENT';
  hangMuc: 'BAN_HANG' | 'TRA_LUONG' | 'NHAP_HANG' | 'CAP_VON' | 'KHAC';
  idChiNhanh?: string;
  idNguoiTao?: string;
  tenNguoiTao?: string;
  tenChiNhanh?: string;
  entryDate?: string;
  soTien: number;
  hinhThucTt?: string;
  doiTuong: string;
  dienGiai?: string;
  runningBalance?: number;
  trangThai?: string;
}

/** Chuẩn hoá field: nhận cả camelCase (maChungTu) lẫn snake_case (ma_chung_tu). */
const normalize = (raw: any): SoQuyDTO => {
  const pick = <T>(camel: string, snake: string, fallback: T): T => {
    if (raw?.[camel] !== undefined && raw?.[camel] !== null) return raw[camel];
    if (raw?.[snake] !== undefined && raw?.[snake] !== null) return raw[snake];
    return fallback;
  };
  return {
    id: pick('id', 'id', undefined),
    maChungTu: pick('maChungTu', 'ma_chung_tu', ''),
    maChungTuLienQuan: pick('maChungTuLienQuan', 'ma_chung_tu_lien_quan', ''),
    direction: pick('direction', 'direction', 'RECEIPT'),
    hangMuc: pick('hangMuc', 'hang_muc', 'KHAC'),
    idChiNhanh: pick('idChiNhanh', 'id_chi_nhanh', undefined),
    idNguoiTao: pick('idNguoiTao', 'id_nguoi_tao', undefined),
    tenNguoiTao: pick('tenNguoiTao', 'ten_nguoi_tao', ''),
    tenChiNhanh: pick('tenChiNhanh', 'ten_chi_nhanh', ''),
    entryDate: pick('entryDate', 'entry_date', ''),
    soTien: Number(pick('soTien', 'so_tien', 0)),
    hinhThucTt: pick('hinhThucTt', 'hinh_thuc_tt', 'CASH'),
    doiTuong: pick('doiTuong', 'doi_tuong', ''),
    dienGiai: pick('dienGiai', 'dien_giai', ''),
    runningBalance: Number(pick('runningBalance', 'running_balance', 0)),
    trangThai: pick('trangThai', 'trang_thai', 'COMPLETED'),
  };
};

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const soQuyApi = {
  getAll: async (): Promise<SoQuyDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch sổ quỹ');
    const raw = await response.json();
    return (Array.isArray(raw) ? raw : []).map(normalize);
  },

  getById: async (id: string): Promise<SoQuyDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy/${id}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch sổ quỹ');
    return response.json();
  },

  getByBranch: async (idChiNhanh: string): Promise<SoQuyDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy/by-branch/${idChiNhanh}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch sổ quỹ');
    return response.json();
  },

  /** Backend nhận ?from=&to= (không phải start/end). */
  getByDateRange: async (from: string, to: string): Promise<SoQuyDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy/by-date-range?from=${from}&to=${to}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch sổ quỹ');
    return response.json();
  },

  /** Lọc theo chiều thu/chi — backend endpoint là /by-direction/{direction}. */
  getByDirection: async (direction: string): Promise<SoQuyDTO[]> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy/by-direction/${direction}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch sổ quỹ');
    return response.json();
  },

  create: async (data: SoQuyDTO): Promise<SoQuyDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Failed to create');
    }
    return normalize(await response.json());
  },

  update: async (id: string, data: Partial<SoQuyDTO>): Promise<SoQuyDTO> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update');
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/so-quy/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete');
  },
};
