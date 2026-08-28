import {
  LEDGER_TYPE,
  STOCK_LEVEL,
  type LedgerType,
  type StockBalance,
  type StockLedgerEntry,
  type StockLevel,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import { activeStores, branchById, DISTRIBUTION_CENTER_ID } from './branches';
import { mockProducts, sellableProducts } from './products';
import { createRandom, randomInt, randomPick, roundTo } from './seed';

/**
 * Module 7 — Tồn kho & Thẻ kho.
 *
 * Dữ liệu được sinh deterministic từ seed để số liệu ổn định giữa các lần load.
 * Kho tổng giữ tồn lớn (hệ số 8x) so với cửa hàng, phản ánh vai trò phân phối.
 */

const random = createRandom(20260826);

/** Danh sách kho có phát sinh tồn: kho tổng + các cửa hàng đang hoạt động. */
const stockLocations = [
  branchById(DISTRIBUTION_CENTER_ID),
  ...activeStores,
].filter((branch): branch is NonNullable<typeof branch> => branch !== undefined);

/** Xác định mức cảnh báo tồn kho từ số lượng thực tế. */
export const resolveStockLevel = (
  quantity: number,
  minStock: number,
  maxStock: number,
): StockLevel => {
  if (quantity <= 0) return STOCK_LEVEL.OutOfStock;
  if (quantity < minStock * 0.5) return STOCK_LEVEL.Critical;
  if (quantity < minStock) return STOCK_LEVEL.Low;
  if (quantity > maxStock) return STOCK_LEVEL.Overstock;
  return STOCK_LEVEL.Healthy;
};

/** Nhân viên thực hiện, gán ngẫu nhiên cho các dòng thẻ kho. */
const performers = [
  'Trần Văn Anh (NV-0002)',
  'Nguyễn Văn Minh (NV-0014)',
  'Lê Hoàng Nam (NV-0004)',
  'Đỗ Thanh Tuyến (NV-0005)',
  'Phạm Quốc Hưng (NV-0001)',
];

const buildStockBalances = (): StockBalance[] => {
  const balances: StockBalance[] = [];

  for (const branch of stockLocations) {
    const isWarehouse = branch.id === DISTRIBUTION_CENTER_ID;
    const scale = isWarehouse ? 8 : 1;

    for (const product of sellableProducts) {
      // Kho tổng không giữ hàng pha chế tại quầy (Froster, cà phê).
      if (isWarehouse && product.categoryId === 'cat-03') continue;

      const min = product.minStock * scale;
      const max = product.maxStock * scale;
      // Phần lớn mặt hàng ở mức khỏe, ~18% rơi xuống dưới ngưỡng tối thiểu
      // để trang cảnh báo tồn kho có dữ liệu thật sự.
      const roll = random();
      let quantity: number;
      if (roll < 0.06) {
        quantity = randomInt(random, 0, Math.max(1, Math.floor(min * 0.4)));
      } else if (roll < 0.18) {
        quantity = randomInt(random, Math.floor(min * 0.5), min - 1);
      } else if (roll < 0.94) {
        quantity = randomInt(random, min, max);
      } else {
        quantity = randomInt(random, max + 1, Math.floor(max * 1.25));
      }

      // Giá vốn bình quân xê dịch nhẹ quanh giá nhập niêm yết.
      const averageCost = roundTo(
        product.costPrice * (0.97 + random() * 0.06),
        100,
      );

      const daysToExpiry = product.isPerishable
        ? randomInt(random, -1, Math.max(1, Math.floor(product.shelfLifeDays * 0.8)))
        : null;

      balances.push({
        id: `stk-${branch.id}-${product.id}`,
        branchId: branch.id,
        branchName: branch.name,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        categoryName: product.categoryName,
        unit: product.unit,
        quantity,
        minStock: min,
        maxStock: max,
        averageCost,
        stockValue: quantity * averageCost,
        nearestExpiryDate:
          daysToExpiry === null
            ? null
            : dayjs().add(daysToExpiry, 'day').format('YYYY-MM-DD'),
        lastMovementAt: dayjs()
          .subtract(randomInt(random, 0, 72), 'hour')
          .toISOString(),
      });
    }
  }

  return balances;
};

/** Tồn kho hiện tại của toàn hệ thống. */
export const mockStockBalances: StockBalance[] = buildStockBalances();

/** Các loại biến động thường gặp và tần suất tương đối khi sinh thẻ kho. */
const ledgerTypePool: LedgerType[] = [
  LEDGER_TYPE.SaleOut,
  LEDGER_TYPE.SaleOut,
  LEDGER_TYPE.SaleOut,
  LEDGER_TYPE.SaleOut,
  LEDGER_TYPE.PurchaseIn,
  LEDGER_TYPE.PurchaseIn,
  LEDGER_TYPE.TransferIn,
  LEDGER_TYPE.TransferOut,
  LEDGER_TYPE.DisposalOut,
  LEDGER_TYPE.Adjustment,
  LEDGER_TYPE.SaleReturn,
];

/** Tiền tố mã phiếu tương ứng từng loại biến động. */
const referencePrefix: Record<LedgerType, string> = {
  PURCHASE_IN: 'PN',
  TRANSFER_IN: 'PX',
  TRANSFER_OUT: 'PX',
  SALE_OUT: 'HD',
  DISPOSAL_OUT: 'HH',
  ADJUSTMENT: 'KK',
  SALE_RETURN: 'HT',
};

/** Ghi chú mặc định theo loại biến động. */
const ledgerNote: Record<LedgerType, string> = {
  PURCHASE_IN: 'Nhập hàng theo đơn mua từ nhà cung cấp',
  TRANSFER_IN: 'Nhận hàng luân chuyển từ kho tổng',
  TRANSFER_OUT: 'Xuất luân chuyển sang chi nhánh khác',
  SALE_OUT: 'Xuất bán qua quầy POS',
  DISPOSAL_OUT: 'Hủy hàng hết hạn sử dụng',
  ADJUSTMENT: 'Điều chỉnh sau kiểm kê định kỳ',
  SALE_RETURN: 'Khách trả hàng, nhập lại kho',
};

const buildLedgerEntries = (count: number): StockLedgerEntry[] => {
  const entries: StockLedgerEntry[] = [];
  /** Tồn đang mô phỏng cho từng cặp kho-sản phẩm khi đi ngược thời gian. */
  const runningBalance = new Map<string, number>();

  for (let index = 0; index < count; index += 1) {
    const branch = randomPick(random, stockLocations);
    const product = randomPick(random, sellableProducts);
    const key = `${branch.id}-${product.id}`;

    const seedBalance =
      mockStockBalances.find((balance) => balance.id === `stk-${key}`)?.quantity ??
      product.minStock;
    const balanceAfter = runningBalance.get(key) ?? seedBalance;

    const type = randomPick(random, ledgerTypePool);
    const magnitude = randomInt(
      random,
      1,
      Math.max(2, Math.floor(product.minStock * 0.4)),
    );

    let quantityChange: number;
    switch (type) {
      case LEDGER_TYPE.PurchaseIn:
      case LEDGER_TYPE.TransferIn:
      case LEDGER_TYPE.SaleReturn:
        quantityChange = magnitude;
        break;
      case LEDGER_TYPE.Adjustment:
        // Cân bằng kho có thể tăng hoặc giảm, nhưng lượng nhỏ.
        quantityChange =
          (random() < 0.65 ? -1 : 1) * Math.max(1, Math.floor(magnitude * 0.3));
        break;
      default:
        quantityChange = -magnitude;
        break;
    }

    // Đi ngược thời gian: tồn "trước" của bản ghi cũ hơn phải bù lại thay đổi.
    const balanceBefore = balanceAfter - quantityChange;
    runningBalance.set(key, balanceBefore);

    const occurredAt = dayjs()
      .subtract(index * 37 + randomInt(random, 0, 30), 'minute')
      .toISOString();

    entries.push({
      id: `led-${String(index + 1).padStart(4, '0')}`,
      occurredAt,
      branchId: branch.id,
      branchName: branch.name,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      type,
      quantityChange,
      balanceBefore,
      balanceAfter,
      unitCost: product.costPrice,
      referenceCode: `${referencePrefix[type]}-${dayjs(occurredAt).format(
        'YYYYMMDD',
      )}-${String(randomInt(random, 1, 199)).padStart(3, '0')}`,
      performedBy: randomPick(random, performers),
      note: ledgerNote[type],
    });
  }

  return entries;
};

/** Thẻ kho toàn hệ thống, sắp xếp mới nhất trước. */
export const mockStockLedger: StockLedgerEntry[] = buildLedgerEntries(320);

/** Tồn kho của một sản phẩm tại một chi nhánh. */
export const stockOf = (branchId: string, productId: string): number =>
  mockStockBalances.find(
    (balance) => balance.branchId === branchId && balance.productId === productId,
  )?.quantity ?? 0;

/** Tổng tồn kho toàn chuỗi của một sản phẩm. */
export const totalStockOf = (productId: string): number =>
  mockStockBalances
    .filter((balance) => balance.productId === productId)
    .reduce((sum, balance) => sum + balance.quantity, 0);

/** Danh sách mặt hàng dưới ngưỡng tồn tối thiểu. */
export const lowStockBalances = (branchId: string | null): StockBalance[] =>
  mockStockBalances
    .filter((balance) => (branchId === null ? true : balance.branchId === branchId))
    .filter((balance) => balance.quantity < balance.minStock)
    .sort((a, b) => a.quantity / a.minStock - b.quantity / b.minStock);

/** Tổng giá trị tồn kho, lọc theo chi nhánh nếu cần. */
export const totalStockValue = (branchId: string | null): number =>
  mockStockBalances
    .filter((balance) => (branchId === null ? true : balance.branchId === branchId))
    .reduce((sum, balance) => sum + balance.stockValue, 0);

/** Số mặt hàng đang có mặt trong kho (SKU khác nhau). */
export const distinctSkuCount = (branchId: string | null): number =>
  new Set(
    mockStockBalances
      .filter((balance) => (branchId === null ? true : balance.branchId === branchId))
      .filter((balance) => balance.quantity > 0)
      .map((balance) => balance.productId),
  ).size;

/** Tổng số sản phẩm đang kinh doanh, dùng cho KPI dashboard. */
export const activeProductCount = sellableProducts.length;

/** Tổng số sản phẩm kể cả ngừng bán. */
export const allProductCount = mockProducts.length;