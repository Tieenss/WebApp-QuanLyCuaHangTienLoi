/**
 * Xuất dữ liệu bảng ra file .csv mở được bằng Excel.
 *
 * Chọn CSV thay vì .xlsx để không phải kéo thêm dependency nặng (xlsx ~1MB).
 * Có ghi BOM UTF-8 ở đầu file, nếu thiếu thì Excel trên Windows sẽ hiển thị
 * sai toàn bộ tiếng Việt có dấu.
 */

/** Định nghĩa một cột khi xuất file. */
export interface ExportColumn<T> {
  /** Tiêu đề cột trong file. */
  header: string;
  /** Lấy giá trị ô từ một dòng dữ liệu. */
  accessor: (row: T) => string | number | null | undefined;
}

/** Ký tự BOM giúp Excel nhận đúng encoding UTF-8. */
const UTF8_BOM = '\uFEFF';

/** Excel bản tiếng Việt dùng dấu chấm phẩy làm dấu phân cách cột. */
const DELIMITER = ';';

/** Bọc giá trị theo chuẩn RFC 4180: escape dấu ngoặc kép, xuống dòng, delimiter. */
const escapeCell = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (
    text.includes('"') ||
    text.includes(DELIMITER) ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

/** Ghép dữ liệu thành nội dung CSV. */
export const buildCsv = <T>(rows: readonly T[], columns: readonly ExportColumn<T>[]): string => {
  const headerLine = columns.map((column) => escapeCell(column.header)).join(DELIMITER);
  const bodyLines = rows.map((row) =>
    columns.map((column) => escapeCell(column.accessor(row))).join(DELIMITER),
  );
  return [headerLine, ...bodyLines].join('\r\n');
};

/** Tải nội dung text về máy dưới dạng file. */
const downloadTextFile = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Giải phóng bộ nhớ sau khi trình duyệt đã bắt đầu tải.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Xuất danh sách bản ghi ra file CSV (mở bằng Excel).
 * @param rows Dữ liệu cần xuất (thường là dữ liệu đã lọc trên bảng).
 * @param columns Cấu hình cột.
 * @param fileName Tên file, không cần đuôi mở rộng.
 */
export const exportToExcel = <T>(
  rows: readonly T[],
  columns: readonly ExportColumn<T>[],
  fileName: string,
): void => {
  const csv = UTF8_BOM + buildCsv(rows, columns);
  downloadTextFile(csv, `${sanitizeFileName(fileName)}.csv`, 'text/csv;charset=utf-8;');
};

/** Bỏ ký tự không hợp lệ trong tên file và thêm hậu tố ngày giờ. */
export const sanitizeFileName = (input: string): string => {
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, '-');
  const safe = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${safe}_${stamp}`;
};

/**
 * Mở cửa sổ in cho một khối HTML (dùng để in hoá đơn POS 80mm).
 * @param html Nội dung HTML thân hoá đơn.
 * @param title Tiêu đề cửa sổ in.
 */
export const printHtml = (html: string, title: string): void => {
  const printWindow = window.open('', '_blank', 'width=380,height=640');
  if (!printWindow) {
    // Trình duyệt chặn popup — thông báo ở tầng gọi.
    throw new Error('POPUP_BLOCKED');
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    color: #000;
    margin: 0;
    padding: 8px 10px;
    width: 80mm;
  }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; letter-spacing: 1px; }
  .muted { color: #444; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  .total-row td { font-size: 14px; font-weight: 700; padding-top: 4px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>${html}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};