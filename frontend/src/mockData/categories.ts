import { RECORD_STATUS, type Category } from '@/types';
import { BRAND, CHART_COLORS } from '@/config/brand';

/**
 * Module 5 – Danh mục hàng hoá theo cách phân quầy của cửa hàng tiện lợi.
 *
 * `icon` dùng emoji thay vì file ảnh để lưới sản phẩm POS render tức thì,
 * không phụ thuộc asset và không tốn request mạng.
 */
export const mockCategories: Category[] = [
  {
    id: 'cat-01',
    code: 'DM-01',
    name: 'Đồ ăn nóng',
    parentId: null,
    description: 'Bánh bao, hot dog, mì trộn, xúc xích – chế biến tại quầy.',
    icon: '🌭',
    color: BRAND.primaryRed,
    productCount: 6,
    displayOrder: 1,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-02',
    code: 'DM-02',
    name: 'Nước giải khát',
    parentId: null,
    description: 'Nước ngọt, trà, nước suối, nước tăng lực đóng chai/lon.',
    icon: '🥤',
    color: CHART_COLORS[4] ?? '#0EA5E9',
    productCount: 7,
    displayOrder: 2,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-03',
    code: 'DM-03',
    name: 'Thức uống pha chế',
    parentId: null,
    description: 'Froster, cà phê, trà sữa pha tại quầy.',
    icon: '☕',
    color: BRAND.accentYellow,
    productCount: 4,
    displayOrder: 3,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-04',
    code: 'DM-04',
    name: 'Bánh kẹo & Snack',
    parentId: null,
    description: 'Khoai tây chiên, bánh quy, socola, kẹo.',
    icon: '🍫',
    color: CHART_COLORS[3] ?? '#6366F1',
    productCount: 5,
    displayOrder: 4,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-05',
    code: 'DM-05',
    name: 'Sữa & Chế phẩm',
    parentId: null,
    description: 'Sữa tươi, sữa chua, phô mai – bảo quản lạnh.',
    icon: '🥛',
    color: BRAND.success,
    productCount: 4,
    displayOrder: 5,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-06',
    code: 'DM-06',
    name: 'Mì & Thực phẩm khô',
    parentId: null,
    description: 'Mì ăn liền, cháo gói, đồ hộp.',
    icon: '🍜',
    color: CHART_COLORS[5] ?? '#F97316',
    productCount: 4,
    displayOrder: 6,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-07',
    code: 'DM-07',
    name: 'Hàng tiêu dùng',
    parentId: null,
    description: 'Khăn giấy, pin, dao cạo, đồ dùng cá nhân.',
    icon: '🧴',
    color: CHART_COLORS[6] ?? '#8B5CF6',
    productCount: 4,
    displayOrder: 7,
    status: RECORD_STATUS.Active,
  },
  {
    id: 'cat-08',
    code: 'DM-08',
    name: 'Kem & Đồ đông lạnh',
    parentId: null,
    description: 'Kem que, kem hộp, thực phẩm đông lạnh.',
    icon: '🍦',
    color: CHART_COLORS[7] ?? '#14B8A6',
    productCount: 3,
    displayOrder: 8,
    status: RECORD_STATUS.Active,
  },
];

/** Tra cứu danh mục theo id. */
export const categoryById = (id: string): Category | undefined =>
  mockCategories.find((category) => category.id === id);

/** Tên danh mục theo id. */
export const categoryNameById = (id: string): string =>
  categoryById(id)?.name ?? 'Chưa phân loại';

/** Màu danh mục theo id, dùng đồng nhất giữa biểu đồ và tag. */
export const categoryColorById = (id: string): string =>
  categoryById(id)?.color ?? BRAND.textSecondary;