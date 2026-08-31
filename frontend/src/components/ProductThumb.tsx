import type { CSSProperties, FC } from 'react';
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

const FALLBACK_CATEGORY: Record<string, { name: string; icon: string; color: string }> = {
  'cat-01': { name: 'Thức uống', icon: '☕', color: '#8B5CF6' },
  'cat-02': { name: 'Thực phẩm', icon: '🍱', color: '#F97316' },
  'cat-03': { name: 'Pha chế', icon: '🧋', color: '#EC4899' },
  'cat-04': { name: 'Bánh', icon: '🍩', color: '#EAB308' },
  'cat-05': { name: 'Snack', icon: '🍿', color: '#22C55E' },
};

export const ProductThumb: FC<ProductThumbProps> = ({
  categoryId,
  size = 44,
  imageUrl,
  productName,
}) => {
  const category = FALLBACK_CATEGORY[categoryId] ?? { name: 'Sản phẩm', icon: '📦', color: BRAND.textSecondary };
  const color = category.color ?? BRAND.textSecondary;

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