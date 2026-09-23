/**
 * Chỉ hiển thị loading của Table khi đang load lần đầu
 * và danh sách nguồn chưa có dữ liệu.
 *
 * Khi Redux đã có dữ liệu, các lần refresh/fetch tiếp theo
 * sẽ chạy nền mà không làm dim toàn bộ bảng.
 */
export const isInitialLoading = (
    loading: boolean,
    rows: readonly unknown[],
): boolean => loading && rows.length === 0;