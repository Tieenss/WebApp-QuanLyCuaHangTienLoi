import {
  DOCUMENT_STATUS,
  type DocumentStatus,
  type PurchaseOrder,
  type PurchaseOrderLine,
  type StockTransfer,
  type Stocktake,
  type StocktakeLine,
  type TransferLine,
} from '@/types';
import { dayjs } from '@/utils/dateUtils';
import { activeStores, branchById, DISTRIBUTION_CENTER_ID } from './branches';
import { mockSuppliers } from './suppliers';
import { sellableProducts } from './products';
import { seedStockBalances } from './inventory';
import { buildDocumentCode, createRandom, randomInt, randomPick, roundTo } from './seed';

/**
 * Module 8 – Nhập kho từ NCC, Module 9 – Xuất kho nội bộ,
 * Module 10 – Kiểm kê & Cân bằng kho.
 */

const random = createRandom(77220914);

const activeSuppliers = mockSuppliers.filter(
  (supplier) => supplier.status === 'Active',
);

const buyers = [
  'Phạm Quốc Hưng (NV-0001)',
  'Nguyễn Thị Thu Hà (NV-0010)',
  'Trần Văn Anh (NV-0002)',
];

/** Phân bố trạng thái phiếu: phần lớn đã hoàn tất, ít phiếu đang chờ. */
const documentStatusPool: DocumentStatus[] = [
  DOCUMENT_STATUS.Completed,
  DOCUMENT_STATUS.Completed,
  DOCUMENT_STATUS.Completed,
  DOCUMENT_STATUS.Completed,
  DOCUMENT_STATUS.Completed,
  DOCUMENT_STATUS.Approved,
  DOCUMENT_STATUS.Approved,
  DOCUMENT_STATUS.Pending,
  DOCUMENT_STATUS.Draft,
  DOCUMENT_STATUS.Cancelled,
];

/** Trạng thái đã chốt kho, phiếu chưa tới trạng thái này thì chưa cộng tồn. */
const isSettled = (status: DocumentStatus): boolean =>
  status === DOCUMENT_STATUS.Completed;

const buildPurchaseOrders = (count: number): PurchaseOrder[] => {
  const orders: PurchaseOrder[] = [];

  for (let index = 0; index < count; index += 1) {
    const supplier = randomPick(random, activeSuppliers);
    /**
     * BR-05: nhập hàng từ NCC CHỈ vào Kho Tổng. Cửa hàng bán lẻ nhận hàng qua
     * phiếu xuất kho nội bộ, không nhận trực tiếp từ nhà cung cấp.
     */
    const branch = branchById(DISTRIBUTION_CENTER_ID);
    if (!branch) continue;

    const orderDate = dayjs().subtract(randomInt(random, 0, 45), 'day');
    const status = randomPick(random, documentStatusPool);
    const settled = isSettled(status);

    // Chỉ lấy sản phẩm do chính NCC này cung ứng.
    const supplierProducts = sellableProducts.filter(
      (product) => product.supplierId === supplier.id,
    );
    if (supplierProducts.length === 0) continue;

    const lineCount = Math.min(
      supplierProducts.length,
      randomInt(random, 2, 6),
    );
    const chosen = new Set<string>();
    const lines: PurchaseOrderLine[] = [];

    for (let l = 0; l < lineCount; l += 1) {
      const product = randomPick(random, supplierProducts);
      if (chosen.has(product.id)) continue;
      chosen.add(product.id);

      // Đặt hàng theo thùng, làm tròn về bội số 12 cho giống thực tế.
      const ordered = roundTo(randomInt(random, 24, product.maxStock), 12) || 12;
      // Phiếu đã hoàn tất mới có số thực nhận; NCC đôi khi giao thiếu.
      const received = settled
        ? random() < 0.85
          ? ordered
          : ordered - randomInt(random, 1, Math.max(1, Math.floor(ordered * 0.1)))
        : 0;

      lines.push({
        id: `pol-${index}-${l}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        unit: product.unit,
        orderedQuantity: ordered,
        receivedQuantity: received,
        unitCost: product.costPrice,
        vatPercent: product.vatPercent,
        lineTotal: (settled ? received : ordered) * product.costPrice,
        expiryDate: product.isPerishable
          ? orderDate.add(product.shelfLifeDays, 'day').format('YYYY-MM-DD')
          : null,
      });
    }

    if (lines.length === 0) continue;

    const subTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const vatTotal = Math.round(
      lines.reduce((sum, line) => sum + (line.lineTotal * line.vatPercent) / 100, 0),
    );
    // Chiết khấu thương mại 0-3% tuỳ đơn.
    const discount = roundTo(subTotal * (random() < 0.4 ? 0.02 : 0), 1_000);
    const grandTotal = subTotal + vatTotal - discount;

    orders.push({
      id: `po-${String(index + 1).padStart(4, '0')}`,
      code: buildDocumentCode('PN', orderDate.format('YYYY-MM-DD'), index + 1),
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: branch.id,
      branchName: branch.name,
      orderDate: orderDate.format('YYYY-MM-DD'),
      expectedDate: orderDate.add(randomInt(random, 1, 5), 'day').format('YYYY-MM-DD'),
      receivedDate: settled
        ? orderDate.add(randomInt(random, 1, 6), 'day').format('YYYY-MM-DD')
        : null,
      status,
      lines,
      subTotal,
      vatTotal,
      discount,
      grandTotal,
      // Đơn "thanh toán ngay" trả đủ, đơn công nợ trả một phần.
      paidAmount:
        supplier.paymentTerms === 'Thanh toán ngay'
          ? grandTotal
          : settled
            ? roundTo(grandTotal * (random() < 0.5 ? 1 : 0.5), 1_000)
            : 0,
      createdBy: randomPick(random, buyers),
      note: settled ? '' : 'Đang chờ nhà cung cấp xác nhận lịch giao.',
    });
  }

  return orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
};

/** Danh sách đơn mua hàng / phiếu nhập kho. */
export const mockPurchaseOrders: PurchaseOrder[] = buildPurchaseOrders(48);

const buildTransfers = (count: number): StockTransfer[] => {
  const transfers: StockTransfer[] = [];

  for (let index = 0; index < count; index += 1) {
    /**
     * BR-06: luân chuyển nội bộ CHỈ đi từ Kho Tổng ra cửa hàng bán lẻ. Không có
     * điều chuyển ngang giữa các cửa hàng trong MVP.
     */
    const fromBranch = branchById(DISTRIBUTION_CENTER_ID);
    if (!fromBranch) continue;
    const toBranch = randomPick(random, activeStores);

    const requestDate = dayjs().subtract(randomInt(random, 0, 30), 'day');
    /**
     * `phieu_xuat_kho.trang_thai` chỉ có duy nhất `HOAN_THANH`: Thủ kho xuất
     * hàng là tồn kho chuyển ngay, cửa hàng không cần bước xác nhận nhận hàng.
     */
    const status = DOCUMENT_STATUS.Completed;

    const lineCount = randomInt(random, 2, 7);
    const chosen = new Set<string>();
    const lines: TransferLine[] = [];

    for (let l = 0; l < lineCount; l += 1) {
      const product = randomPick(random, sellableProducts);
      // Hàng pha chế tại quầy không luân chuyển.
      if (product.categoryId === 'cat-03') continue;
      if (chosen.has(product.id)) continue;
      chosen.add(product.id);

      const requested = roundTo(randomInt(random, 12, product.maxStock), 6) || 6;

      lines.push({
        id: `tl-${index}-${l}`,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        unit: product.unit,
        requestedQuantity: requested,
        shippedQuantity: requested,
        receivedQuantity: requested,
        unitCost: product.costPrice,
        lineTotal: requested * product.costPrice,
      });
    }

    if (lines.length === 0) continue;

    transfers.push({
      id: `tr-${String(index + 1).padStart(4, '0')}`,
      code: buildDocumentCode('PX', requestDate.format('YYYY-MM-DD'), index + 1),
      fromBranchId: fromBranch.id,
      fromBranchName: fromBranch.name,
      toBranchId: toBranch.id,
      toBranchName: toBranch.name,
      requestDate: requestDate.format('YYYY-MM-DD'),
      shippedDate: requestDate.format('YYYY-MM-DD'),
      receivedDate: requestDate.format('YYYY-MM-DD'),
      status,
      lines,
      totalValue: lines.reduce((sum, line) => sum + line.lineTotal, 0),
      requestedBy: toBranch.managerName,
      approvedBy: fromBranch.managerName,
      note: '',
    });
  }

  return transfers.sort((a, b) => b.requestDate.localeCompare(a.requestDate));
};

/**
 * Phiếu luân chuyển nội bộ ban đầu.
 * Dữ liệu SEED cho `transferSlice` — xem ghi chú ở `seedStockBalances`.
 */
export const seedTransfers: StockTransfer[] = buildTransfers(36);

/** Nguyên nhân lệch tồn thường gặp khi kiểm kê. */
const varianceReasons = [
  'Hao hụt tự nhiên hàng đồ ăn nóng',
  'Sai sót nhập liệu tại quầy POS',
  'Hàng hư hỏng chưa lập phiếu huỷ',
  'Thất thoát chưa xác định nguyên nhân',
  'Nhân viên sử dụng nội bộ',
];

const buildStocktakes = (count: number): Stocktake[] => {
  const stocktakes: Stocktake[] = [];

  for (let index = 0; index < count; index += 1) {
    const branch = randomPick(random, activeStores);
    const countDate = dayjs().subtract(randomInt(random, 0, 60), 'day');
    const status = randomPick(random, documentStatusPool);

    // Chỉ kiểm kê các mặt hàng đang có tồn tại chi nhánh đó. Dùng tồn kho seed
    // vì đây là dữ liệu lịch sử, sinh một lần lúc khởi tạo.
    const branchBalances = seedStockBalances.filter(
      (balance) => balance.branchId === branch.id,
    );
    if (branchBalances.length === 0) continue;

    const lineCount = Math.min(branchBalances.length, randomInt(random, 8, 18));
    const lines: StocktakeLine[] = [];
    const chosen = new Set<string>();

    for (let l = 0; l < lineCount; l += 1) {
      const balance = randomPick(random, branchBalances);
      if (chosen.has(balance.productId)) continue;
      chosen.add(balance.productId);

      const systemQuantity = balance.quantity;
      // ~35% mặt hàng có lệch, phần lớn là thiếu hụt.
      const hasVariance = random() < 0.35;
      const variance = hasVariance
        ? (random() < 0.75 ? -1 : 1) *
          randomInt(random, 1, Math.max(1, Math.floor(systemQuantity * 0.06) + 1))
        : 0;

      lines.push({
        id: `stl-${index}-${l}`,
        productId: balance.productId,
        sku: balance.sku,
        productName: balance.productName,
        unit: balance.unit,
        systemQuantity,
        countedQuantity: systemQuantity + variance,
        varianceQuantity: variance,
        unitCost: balance.averageCost,
        varianceValue: variance * balance.averageCost,
        reason: variance === 0 ? '' : randomPick(random, varianceReasons),
      });
    }

    if (lines.length === 0) continue;

    const varianceLines = lines.filter((line) => line.varianceQuantity !== 0);

    stocktakes.push({
      id: `st-${String(index + 1).padStart(4, '0')}`,
      code: buildDocumentCode('KK', countDate.format('YYYY-MM-DD'), index + 1),
      branchId: branch.id,
      branchName: branch.name,
      countDate: countDate.format('YYYY-MM-DD'),
      status,
      lines,
      totalItemsCounted: lines.length,
      totalVarianceItems: varianceLines.length,
      totalVarianceValue: varianceLines.reduce(
        (sum, line) => sum + line.varianceValue,
        0,
      ),
      countedBy: branch.managerName,
      approvedBy: isSettled(status) ? 'Phạm Quốc Hưng (NV-0001)' : null,
      note: '',
    });
  }

  return stocktakes.sort((a, b) => b.countDate.localeCompare(a.countDate));
};

/** Danh sách phiếu kiểm kê. */
export const mockStocktakes: Stocktake[] = buildStocktakes(22);