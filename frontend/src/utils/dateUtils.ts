import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import type { Dayjs } from 'dayjs';
import type { DateRange } from '@/types';

dayjs.locale('vi');

/** Định dạng dùng khi lưu trữ / so sánh (ISO date). */
export const DATE_FORMAT_ISO = 'YYYY-MM-DD';
/** Định dạng hiển thị cho người dùng Việt Nam. */
export const DATE_FORMAT_VN = 'DD/MM/YYYY';
export const DATETIME_FORMAT_VN = 'DD/MM/YYYY HH:mm';
export const TIME_FORMAT = 'HH:mm';

/**
 * Hiển thị ngày theo chuẩn Việt Nam.
 * @example formatDate('2026-08-26') // "26/08/2026"
 */
export const formatDate = (value: string | Date | null | undefined): string =>
  value ? dayjs(value).format(DATE_FORMAT_VN) : '—';

/**
 * Hiển thị ngày kèm giờ.
 * @example formatDateTime('2026-08-26T08:28:00') // "26/08/2026 08:28"
 */
export const formatDateTime = (value: string | Date | null | undefined): string =>
  value ? dayjs(value).format(DATETIME_FORMAT_VN) : '—';

/** Chỉ hiển thị giờ:phút, dùng cho lịch sử giao dịch trong ngày. */
export const formatTime = (value: string | Date | null | undefined): string =>
  value ? dayjs(value).format(TIME_FORMAT) : '—';

/** Chuẩn hoá về chuỗi ISO date để lưu vào state. */
export const toIsoDate = (value: Dayjs | Date | string): string =>
  dayjs(value).format(DATE_FORMAT_ISO);

/** Ngày hôm nay dạng ISO. */
export const today = (): string => dayjs().format(DATE_FORMAT_ISO);

/** Thời điểm hiện tại dạng ISO đầy đủ, dùng khi tạo bản ghi mới. */
export const nowIso = (): string => dayjs().toISOString();

/**
 * Khoảng ngày cho các preset lọc báo cáo.
 * `days = 1` nghĩa là chỉ hôm nay.
 */
export const lastNDays = (days: number): DateRange => ({
  from: dayjs()
    .subtract(days - 1, 'day')
    .format(DATE_FORMAT_ISO),
  to: dayjs().format(DATE_FORMAT_ISO),
});

/** Khoảng ngày của tháng hiện tại. */
export const thisMonthRange = (): DateRange => ({
  from: dayjs().startOf('month').format(DATE_FORMAT_ISO),
  to: dayjs().endOf('month').format(DATE_FORMAT_ISO),
});

/** Kiểm tra một ngày có nằm trong khoảng (bao gồm 2 đầu). */
export const isWithinRange = (value: string, range: DateRange): boolean => {
  const date = dayjs(value);
  return (
    !date.isBefore(dayjs(range.from), 'day') && !date.isAfter(dayjs(range.to), 'day')
  );
};

/**
 * Số ngày còn lại tới hạn sử dụng. Giá trị âm nghĩa là đã quá hạn.
 * Dùng để tô màu cảnh báo hàng cận hạn trong module kho.
 */
export const daysUntil = (value: string | null): number | null => {
  if (!value) return null;
  return dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day');
};

/** Nhãn kỳ lương dạng "Tháng 08/2026" từ chuỗi YYYY-MM. */
export const formatPeriod = (period: string): string => {
  // period dạng MM-YYYY (ví dụ "09-2026") — parse thủ công để không bị Invalid Date.
  const m = /^(\d{2})-(\d{4})$/.exec(period.trim());
  if (m) {
    const [, mm, yyyy] = m;
    const monthNum = parseInt(mm, 10);
    const names = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ];
    return `${names[monthNum - 1] ?? `Tháng ${mm}`}/${yyyy}`;
  }
  const parsed = dayjs(`${period}-01`);
  return `Tháng ${parsed.format('MM/YYYY')}`;
};

export { dayjs };