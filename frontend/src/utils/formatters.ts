import type { VND } from '@/types';

/**
 * Định dạng số tiền sang VND đầy đủ ký hiệu.
 * @example formatVND(48520000) // "48.520.000 ₫"
 */
export const formatVND = (amount: VND): string =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * Định dạng số tiền không kèm ký hiệu tiền tệ, dùng trong bảng cho gọn cột.
 * @example formatAmount(48520000) // "48.520.000"
 */
export const formatAmount = (amount: VND): string =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * Rút gọn số tiền lớn cho nhãn biểu đồ và StatCard.
 * @example formatVNDCompact(48520000) // "48,5 tr"
 * @example formatVNDCompact(1250000000) // "1,25 tỷ"
 */
export const formatVNDCompact = (amount: VND): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${trimDecimal(abs / 1_000_000_000, 2)} tỷ`;
  }

  if (abs >= 1_000_000) {
    return `${sign}${trimDecimal(abs / 1_000_000, 1)} tr`;
  }

  if (abs >= 1_000) {
    return `${sign}${trimDecimal(abs / 1_000, 0)}k`;
  }

  return `${sign}${abs}`;
};

/**
 * Cắt phần thập phân dư và đổi dấu chấm sang dấu phẩy kiểu Việt Nam.
 */
const trimDecimal = (value: number, digits: number): string =>
  value.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',');

/**
 * Định dạng số nguyên có dấu phân cách hàng nghìn.
 * @example formatNumber(1250) // "1.250"
 */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('vi-VN').format(value);

/**
 * Định dạng phần trăm kèm dấu +/-.
 * @example formatPercent(12.5) // "+12,5%"
 */
export const formatPercent = (value: number, digits = 1): string => {
  const sign = value > 0 ? '+' : '';

  return `${sign}${value.toFixed(digits).replace('.', ',')}%`;
};

/**
 * Định dạng phần trăm không kèm dấu, dùng cho tỷ trọng.
 * @example formatRatio(42) // "42%"
 */
export const formatRatio = (value: number, digits = 0): string =>
  `${value.toFixed(digits).replace('.', ',')}%`;

/**
 * Định dạng số lượng kèm đơn vị.
 * @example formatQuantity(120, 'Chai') // "120 Chai"
 */
export const formatQuantity = (
  quantity: number,
  unitLabel: string,
): string => `${formatNumber(quantity)} ${unitLabel}`;

/**
 * Sinh 2 chữ cái đầu làm avatar text (ưu tiên họ + tên).
 * @example initialsOf('Phạm Quốc Hưng') // "PH"
 */
export const initialsOf = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? 'N';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? 'V') : 'V';
  return `${first}${last}`.toUpperCase();
};

/**
 * Chuẩn hóa chuỗi Việt Nam để so sánh khi tìm kiếm:
 * bỏ dấu, chuyển về chữ thường.
 *
 * Nhờ đó gõ "ca phe" vẫn tìm ra "Cà Phê Sữa Đá".
 */
export const normalizeSearch = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

/**
 * Kiểm tra `keyword` có khớp bất kỳ trường nào trong `fields`
 * (bỏ qua dấu).
 */
export const matchKeyword = (
  keyword: string,
  fields: readonly string[],
): boolean => {
  const normalized = normalizeSearch(keyword);

  if (!normalized) return true;

  return fields.some((field) =>
    normalizeSearch(field).includes(normalized),
  );
};