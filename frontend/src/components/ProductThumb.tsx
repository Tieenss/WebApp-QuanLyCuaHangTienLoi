import type { CSSProperties, FC } from 'react';
import { categoryById } from '@/mockData/categories';
import { BRAND } from '@/config/brand';
import './ProductThumb.css';

interface ProductThumbProps {
  categoryId: string;
  /** Kích thước cạnh (px). */
  size?: number;
  /** Đường dẫn ảnh thật; nếu rỗng sẽ dùng emoji của danh mục. */
  imageUrl?: string;
  productName?: string;
}

/**
 * Ảnh đại diện sản phẩm.
 *
 * MVP không host ảnh sản phẩm nên mặc định render emoji + màu của danh mục.
 * Cách này giữ lưới POS hiển thị tức thì và không phụ thuộc mạng ngoài; khi có
 * ảnh thật chỉ cần truyền `imageUrl` là component tự đổi.
 */
export const ProductThumb: FC<ProductThumbProps> = ({
  categoryId,
  size = 44,
  imageUrl,
  productName,
}) => {
  const category = categoryById(categoryId);
  const color = category?.color ?? BRAND.textSecondary;

  if (imageUrl !== undefined && imageUrl !== '') {
    return (
      <img
        src={imageUrl}
        alt={productName ?? 'Sản phẩm'}
        width={size}
        height={size}
        className="product-thumb-img"
      />
    );
  }

  return (
    <div
      aria-label={category?.name ?? 'Sản phẩm'}
      role="img"
      className="product-thumb-emoji"
      style={
        {
          '--thumb-size': `${size}px`,
          '--thumb-color': color,
        } as CSSProperties
      }
    >
      {category?.icon ?? '📦'}
    </div>
  );
};