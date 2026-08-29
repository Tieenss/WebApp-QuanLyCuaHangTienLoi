/**
 * Các type dùng chung cho toàn bộ hệ thống ERP Circle K.
 *
 * Lưu ý kỹ thuật: project bật `erasableSyntaxOnly`, vì vậy KHÔNG dùng `enum`.
 * Thay vào đó dùng cặp `const object` + `union type` suy ra từ object đó.
 */

/** Khoá định danh bản ghi (mock data dùng string cho dễ đọc). */
export type ID = string;

/** Số tiền tính bằng VND (đơn vị đồng, không có phần thập phân). */
export type VND = number;

/** Trạng thái hoạt động chung của các bản ghi danh mục. */
export const RECORD_STATUS = {
  Active: 'ACTIVE',
  Inactive: 'INACTIVE',
} as const;

export type RecordStatus = (typeof RECORD_STATUS)[keyof typeof RECORD_STATUS];

/** Trạng thái phiếu (nhập/xuất/kiểm kê/thu chi) theo luồng duyệt. */
export const DOCUMENT_STATUS = {
  Draft: 'DRAFT',
  Pending: 'PENDING',
  Approved: 'APPROVED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  Balanced: 'BALANCED',
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã huỷ',
  BALANCED: 'Đã cân bằng',
};

/** Màu Tag của antd tương ứng từng trạng thái phiếu. */
export const DOCUMENT_STATUS_COLOR: Record<DocumentStatus, string> = {
  DRAFT: 'default',
  PENDING: 'gold',
  APPROVED: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
  BALANCED: 'purple',
};

/** Option chuẩn cho Select/Segmented của antd. */
export interface SelectOption<TValue extends string | number = string> {
  label: string;
  value: TValue;
}

/** Trường audit gắn vào mọi bản ghi nghiệp vụ. */
export interface AuditInfo {
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** Khoảng thời gian dạng ISO date (YYYY-MM-DD). */
export interface DateRange {
  from: string;
  to: string;
}

/** Kết quả phân trang trả về từ mock service. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Trạng thái tải dữ liệu dùng trong các Redux slice. */
export const LOADING_STATUS = {
  Idle: 'idle',
  Loading: 'loading',
  Succeeded: 'succeeded',
  Failed: 'failed',
} as const;

export type LoadingStatus = (typeof LOADING_STATUS)[keyof typeof LOADING_STATUS];

/** State nền tảng mà mọi slice dữ liệu đều kế thừa. */
export interface BaseAsyncState {
  status: LoadingStatus;
  error: string | null;
}

/** Xu hướng tăng/giảm của một chỉ số KPI. */
export interface TrendValue {
  /** Phần trăm thay đổi, ví dụ 12.5 nghĩa là +12.5%. */
  changePercent: number;
  /** Mốc so sánh, ví dụ "so với hôm qua". */
  comparedTo: string;
}