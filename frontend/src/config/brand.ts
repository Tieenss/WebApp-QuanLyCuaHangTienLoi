/**
 * Bảng màu & hằng số nhận diện thương hiệu Circle K Việt Nam.
 * Mọi component phải lấy màu từ đây, không hard-code hex rải rác.
 */
export const BRAND = {
  /** Đỏ Circle K — màu chủ đạo, dùng cho primary action & nhấn mạnh. */
  primaryRed: '#E31837',
  primaryRedHover: '#C41230',
  primaryRedActive: '#A60F28',
  /** Đỏ nhạt dùng làm nền hover của bảng, tag. */
  primaryRedSoft: '#FFF1F3',

  /** Vàng Circle K — màu phụ, dùng cho cảnh báo & điểm nhấn thứ cấp. */
  accentYellow: '#FFC72C',
  accentYellowHover: '#E6B428',
  accentYellowSoft: '#FFF8E6',

  /** Trung tính đậm — nền sidebar, header, chữ tiêu đề. */
  neutralDark: '#1C1C1C',
  neutralDarker: '#111315',
  neutralDarkSoft: '#2A2A2A',

  /** Nền sáng. */
  bgLayout: '#F4F6F8',
  bgContainer: '#FFFFFF',

  /** Màu trạng thái. */
  success: '#10B981',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',

  /** Màu chữ. */
  textHeading: '#111827',
  textBody: '#374151',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',

  border: '#E5E7EB',
} as const;

/**
 * Dải màu dùng cho biểu đồ (recharts). Thứ tự được chọn để 2 màu cạnh nhau
 * luôn phân biệt được, đồng thời mở đầu bằng đỏ - vàng thương hiệu.
 */
export const CHART_COLORS: readonly string[] = [
  BRAND.primaryRed,
  BRAND.accentYellow,
  BRAND.success,
  '#6366F1',
  '#0EA5E9',
  '#F97316',
  '#8B5CF6',
  '#14B8A6',
];

/** Tên hệ thống hiển thị trên sidebar và tiêu đề trang. */
export const APP_NAME = 'Circle K ERP';
export const APP_FULL_NAME = 'Hệ Thống ERP Quản Lý Chuỗi Cửa Hàng Tiện Lợi';
export const APP_VERSION = 'MVP 1.0';

/** Key lưu phiên đăng nhập trong localStorage. */
export const AUTH_STORAGE_KEY = 'circlek_erp_auth';