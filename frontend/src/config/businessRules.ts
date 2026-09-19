/**
 * Các hằng số nghiệp vụ dùng chung ở frontend.
 *
 * ID được đồng bộ với dữ liệu seed trong backend/sql:
 * - chi_nhanh.sql: Kho Tổng (CK-DC01)
 * - danh_muc.sql: Thức uống pha chế (DM-03)
 *
 * Không đổi các giá trị này sang tên hiển thị. Backend và dữ liệu tồn kho
 * đều tham chiếu bằng UUID.
 */

/** UUID của chi nhánh Kho Tổng, nguồn nhập hàng và xuất điều chuyển. */
export const DISTRIBUTION_CENTER_ID =
  'a1b2c3d4-0001-0000-0000-000000000001' as const;

/** Các danh mục có quy tắc xử lý riêng trong POS. */
export const CATEGORY_ID = {
  /** Thức uống pha chế, bán trực tiếp tại quầy; không yêu cầu tồn Kho Tổng. */
  MadeToOrder: 'e5f6a7b8-0001-0000-0000-000000000003',
} as const;

