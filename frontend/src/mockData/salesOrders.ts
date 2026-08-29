import {
  ORDER_STATUS,
  PAYMENT_IS_CASH,
  PAYMENT_METHOD,
  SHIFT_CODE,
  type OrderLine,
  type PaymentMethod,
  type SalesOrder,
  type ShiftCode,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import { activeStores } from './branches';
import { sellableProducts } from './products';
import { cashiersOfBranch } from './employees';
import { createRandom, randomInt, randomPick, roundTo } from './seed';

/**
 * Module 2 — Lịch sử hoá đơn POS.
 *
 * Đây là dữ liệu gốc để dashboard (module 1) và báo cáo (module 13) tổng hợp,
 * nên phân bổ phải hợp lý: giờ cao điểm nhiều đơn hơn, cuối tuần cao hơn ngày thường.
 */

const random = createRandom(88112026);

/** Số ngày lịch sử bán hàng được sinh sẵn. */
export const SALES_HISTORY_DAYS = 30;

/** Trọng số lượng đơn theo từng giờ trong ngày (0..23). */
const HOURLY_WEIGHT: readonly number[] = [
  0.3, 0.2, 0.15, 0.15, 0.2, 0.4, 0.9, 1.4, 1.6, 1.1, 0.9, 1.2, 1.8, 1.3, 0.9, 0.9,
  1.1, 1.5, 1.9, 1.7, 1.3, 1.0, 0.7, 0.45,
];

/** Ca làm việc tương ứng một giờ trong ngày. */
const shiftOfHour = (hour: number): ShiftCode => {
  if (hour >= 6 && hour < 14) return SHIFT_CODE.Morning;
  if (hour >= 14 && hour < 22) return SHIFT_CODE.Afternoon;
  return SHIFT_CODE.Night;
};

/** Tỷ lệ phương thức thanh toán — tiền mặt vẫn chiếm phần lớn tại cửa hàng tiện lợi. */
const paymentPool: PaymentMethod[] = [
  PAYMENT_METHOD.Cash,
  PAYMENT_METHOD.Cash,
  PAYMENT_METHOD.Cash,
  PAYMENT_METHOD.Cash,
  PAYMENT_METHOD.MoMo,
  PAYMENT_METHOD.MoMo,
  PAYMENT_METHOD.MoMo,
  PAYMENT_METHOD.ZaloPay,
  PAYMENT_METHOD.ZaloPay,
  PAYMENT_METHOD.VnPay,
  PAYMENT_METHOD.Card,
  PAYMENT_METHOD.Card,
];

/** Hệ số doanh thu theo chi nhánh, phản ánh vị trí và lưu lượng khách. */
const branchTrafficFactor: Record<string, number> = {
  'br-0101': 1.35,
  'br-0102': 1.05,
  'br-0103': 1.2,
  'br-0104': 0.9,
  'br-0201': 1.1,
  'br-0202': 1.0,
  'br-0301': 0.65,
};

/** Số điện thoại thành viên Circle K Club giả lập. */
const memberPhones = [
  '0903118224',
  '0912447889',
  '0987220116',
  '0938551020',
  '0977314668',
];

const buildOrders = (): SalesOrder[] => {
  const orders: SalesOrder[] = [];
  /** Bộ đếm số hoá đơn theo ngày, để mã hoá đơn tăng dần trong ngày. */
  const dailySequence = new Map<string, number>();

  for (let dayOffset = SALES_HISTORY_DAYS - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = dayjs().subtract(dayOffset, 'day');
    const isWeekend = date.day() === 0 || date.day() === 6;
    const weekendFactor = isWeekend ? 1.25 : 1;

    for (const branch of activeStores) {
      const cashiers = cashiersOfBranch(branch.id);
      if (cashiers.length === 0) continue;

      const traffic = branchTrafficFactor[branch.id] ?? 1;
      // Hôm nay chỉ sinh đơn tới giờ hiện tại để dashboard "Hôm nay" hợp lý.
      const maxHour = dayOffset === 0 ? dayjs().hour() : 23;

      for (let hour = 0; hour <= maxHour; hour += 1) {
        const weight = HOURLY_WEIGHT[hour] ?? 1;
        const orderCount = Math.round(
          weight * traffic * weekendFactor * randomInt(random, 2, 4),
        );

        for (let n = 0; n < orderCount; n += 1) {
          const isoDate = date.format('YYYY-MM-DD');
          const sequence = (dailySequence.get(isoDate) ?? 0) + 1;
          dailySequence.set(isoDate, sequence);

          const soldAt = date
            .hour(hour)
            .minute(randomInt(random, 0, 59))
            .second(randomInt(random, 0, 59));

          // Giỏ hàng tiện lợi thường 1-5 mặt hàng.
          const lineCount = randomInt(random, 1, 5);
          const pickedIds = new Set<string>();
          const lines: OrderLine[] = [];

          for (let l = 0; l < lineCount; l += 1) {
            const product = randomPick(random, sellableProducts);
            if (pickedIds.has(product.id)) continue;
            pickedIds.add(product.id);

            const quantity = randomInt(random, 1, 3);
            // ~8% dòng có giảm giá khuyến mãi.
            const lineDiscount =
              random() < 0.08
                ? roundTo(product.salePrice * quantity * 0.1, 500)
                : 0;

            lines.push({
              id: `ol-${isoDate}-${sequence}-${l}`,
              productId: product.id,
              sku: product.sku,
              productName: product.name,
              unit: product.unit,
              unitPrice: product.salePrice,
              quantity,
              lineDiscount,
              vatPercent: product.vatPercent,
              lineTotal: product.salePrice * quantity - lineDiscount,
              unitCost: product.costPrice,
            });
          }

          if (lines.length === 0) continue;

          const subTotal = lines.reduce(
            (sum, line) => sum + line.unitPrice * line.quantity,
            0,
          );
          const discountTotal = lines.reduce(
            (sum, line) => sum + line.lineDiscount,
            0,
          );
          // VAT tính trên giá đã trừ giảm giá của từng dòng.
          const vatTotal = Math.round(
            lines.reduce(
              (sum, line) => sum + (line.lineTotal * line.vatPercent) / 100,
              0,
            ),
          );
          const grandTotal = subTotal - discountTotal + vatTotal;

          const paymentMethod = randomPick(random, paymentPool);
          const isCash = PAYMENT_IS_CASH[paymentMethod];
          // Khách trả tiền mặt thường đưa tròn tới 10.000đ.
          const tendered = isCash ? roundTo(grandTotal + randomInt(random, 0, 50_000), 10_000) : grandTotal;

          const shift = shiftOfHour(hour);
          // Ưu tiên thu ngân đúng ca, nếu không có thì lấy bất kỳ ai.
          const shiftCashiers = cashiers.filter(
            (cashier) => cashier.defaultShift === shift,
          );
          const cashier = randomPick(
            random,
            shiftCashiers.length > 0 ? shiftCashiers : cashiers,
          );

          // ~1,5% đơn bị hoàn/huỷ để báo cáo có dữ liệu ngoại lệ.
          const statusRoll = random();
          const status =
            statusRoll < 0.008
              ? ORDER_STATUS.Refunded
              : statusRoll < 0.015
                ? ORDER_STATUS.Cancelled
                : ORDER_STATUS.Completed;

          orders.push({
            id: `so-${isoDate}-${branch.code}-${sequence}`,
            code: `HD-${isoDate.replace(/-/g, '')}-${String(sequence).padStart(4, '0')}`,
            branchId: branch.id,
            branchName: branch.name,
            cashierId: cashier.id,
            cashierName: cashier.fullName,
            shiftCode: shift,
            soldAt: soldAt.toISOString(),
            lines,
            subTotal,
            discountTotal,
            vatTotal,
            grandTotal,
            paymentMethod,
            tenderedAmount: tendered,
            changeAmount: Math.max(0, tendered - grandTotal),
            status,
            memberPhone: random() < 0.22 ? randomPick(random, memberPhones) : null,
            note: '',
          });
        }
      }
    }
  }

  // Mới nhất trước — khớp thứ tự hiển thị mặc định trên bảng.
  return orders.sort((a, b) => b.soldAt.localeCompare(a.soldAt));
};

/** Toàn bộ hoá đơn 30 ngày gần nhất. */
export const mockSalesOrders: SalesOrder[] = buildOrders();

/** Chỉ các hoá đơn hoàn tất — dùng khi tính doanh thu. */
export const completedOrders = mockSalesOrders.filter(
  (order) => order.status === ORDER_STATUS.Completed,
);

/** Lọc hoá đơn theo chi nhánh (`null` = toàn chuỗi). */
export const ordersOfBranch = (branchId: string | null): SalesOrder[] =>
  branchId === null
    ? completedOrders
    : completedOrders.filter((order) => order.branchId === branchId);

/** Lọc hoá đơn trong một ngày cụ thể. */
export const ordersOnDate = (
  branchId: string | null,
  isoDate: string,
): SalesOrder[] =>
  ordersOfBranch(branchId).filter((order) => order.soldAt.startsWith(isoDate));

/** Tổng doanh thu của một tập hoá đơn. */
export const sumRevenue = (orders: readonly SalesOrder[]): number =>
  orders.reduce((sum, order) => sum + order.grandTotal, 0);

/** Tổng giá vốn hàng bán của một tập hoá đơn. */
export const sumCogs = (orders: readonly SalesOrder[]): number =>
  orders.reduce(
    (sum, order) =>
      sum +
      order.lines.reduce((lineSum, line) => lineSum + line.unitCost * line.quantity, 0),
    0,
  );

/** Tổng số lượng sản phẩm đã bán. */
export const sumQuantity = (orders: readonly SalesOrder[]): number =>
  orders.reduce(
    (sum, order) =>
      sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );