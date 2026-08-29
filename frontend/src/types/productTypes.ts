import type { ID, RecordStatus, VND } from './commonTypes';

/**
 * Module 5 — Danh mục & Sản phẩm.
 *
 * Đặc thù cửa hàng tiện lợi: hàng có hạn sử dụng ngắn (đồ ăn nóng) nên
 * `shelfLifeDays` và `isPerishable` là dữ liệu bắt buộc để tính hao hụt (module 13).
 */
export const PRODUCT_UNIT = {
  Piece: 'PIECE',
  Bottle: 'BOTTLE',
  Can: 'CAN',
  Box: 'BOX',
  Pack: 'PACK',
  Cup: 'CUP',
  Kg: 'KG',
} as const;

export type ProductUnit = (typeof PRODUCT_UNIT)[keyof typeof PRODUCT_UNIT];

export const PRODUCT_UNIT_LABEL: Record<ProductUnit, string> = {
  PIECE: 'Cái',
  BOTTLE: 'Chai',
  CAN: 'Lon',
  BOX: 'Thùng',
  PACK: 'Gói',
  CUP: 'Ly',
  KG: 'Kg',
};

/** Nhóm danh mục cấp 1 theo cách Circle K phân loại quầy hàng. */
export interface Category {
  id: ID;
  code: string;
  name: string;
  /** `null` nếu là danh mục gốc. */
  parentId: ID | null;
  description: string;
  /** Icon hiển thị trên lưới sản phẩm POS (emoji để không cần asset). */
  icon: string;
  /** Màu nền chip danh mục, dùng chung với biểu đồ báo cáo. */
  color: string;
  productCount: number;
  displayOrder: number;
  status: RecordStatus;
}

export type CategoryFormValues = Omit<Category, 'id' | 'code' | 'productCount'>;

export interface Product {
  id: ID;
  /** Mã nội bộ / SKU, ví dụ CK-FROSTER-01. */
  sku: string;
  /** Mã vạch EAN-13 dùng cho máy quét tại POS. */
  barcode: string;
  name: string;
  categoryId: ID;
  categoryName: string;
  unit: ProductUnit;
  /** Giá nhập bình quân từ nhà cung cấp. */
  costPrice: VND;
  /** Giá bán niêm yết tại quầy. */
  salePrice: VND;
  /** Thuế VAT áp dụng (%), thường 8 hoặc 10. */
  vatPercent: number;
  supplierId: ID;
  supplierName: string;
  /** Ngưỡng tồn kho tối thiểu, dưới mức này sẽ vào danh sách cảnh báo. */
  minStock: number;
  /** Tồn kho tối đa cho một cửa hàng, dùng để gợi ý số lượng đặt hàng. */
  maxStock: number;
  /** Hàng dễ hỏng: đồ ăn nóng, sữa, thực phẩm tươi. */
  isPerishable: boolean;
  /** Số ngày hạn sử dụng kể từ ngày nhập. `0` nếu không áp dụng. */
  shelfLifeDays: number;
  imageUrl: string;
  status: RecordStatus;
  createdAt: string;
}

export type ProductFormValues = Omit<
  Product,
  'id' | 'categoryName' | 'supplierName' | 'createdAt'
>;

/** Lợi nhuận gộp trên một đơn vị sản phẩm. */
export interface ProductMargin {
  productId: ID;
  grossProfit: VND;
  marginPercent: number;
}