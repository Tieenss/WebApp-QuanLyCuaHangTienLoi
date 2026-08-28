/**
 * Bộ sinh số giả ngẫu nhiên có hạt giống (deterministic).
 *
 * Mock data cần "trông thật" nhưng phải ổn định giữa các lần render, nếu dùng
 * `Math.random()` thì mỗi lần hot-reload số liệu lại nhảy, không so sánh được
 * và biểu đồ nháy liên tục. Thuật toán mulberry32 đủ tốt cho mục đích này.
 */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Số nguyên trong khoảng [min, max]. */
export const randomInt = (
  random: () => number,
  min: number,
  max: number,
): number => Math.floor(random() * (max - min + 1)) + min;

/** Chọn ngẫu nhiên một phần tử; mảng phải không rỗng. */
export const randomPick = <T>(random: () => number, items: readonly T[]): T => {
  if (items.length === 0) {
    throw new Error('randomPick: mảng rỗng');
  }
  const index = Math.floor(random() * items.length);
  // Index luôn hợp lệ do đã chặn mảng rỗng ở trên.
  return items[index] as T;
};

/** Làm tròn tới bội số gần nhất, dùng để số tiền trông "tự nhiên". */
export const roundTo = (value: number, step: number): number =>
  Math.round(value / step) * step;

/** Sinh mã phiếu dạng PREFIX-YYYYMMDD-NNN. */
export const buildDocumentCode = (
  prefix: string,
  isoDate: string,
  sequence: number,
): string =>
  `${prefix}-${isoDate.replace(/-/g, '')}-${String(sequence).padStart(3, '0')}`;