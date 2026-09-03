import type { CSSProperties, FC } from 'react';
import { BRAND } from '@/config/brand';
import { useAppSelector } from '@/store/hooks';
import './ProductThumb.css';

interface ProductThumbProps {
  categoryId: string;
  /** Kích thước cạnh (px). */
  size?: number;
  /** Đường dẫn ảnh thật; nếu rỗng sẽ dùng emoji của danh mục. */
  imageUrl?: string;
  productName?: string;
}

const FALLBACK = { name: 'Sản phẩm', icon: '📦', color: BRAND.textSecondary };

export const ProductThumb: FC<ProductThumbProps> = ({
  categoryId,
  size = 44,
  imageUrl,
  productName,
}) => {
  // Lấy category thật từ Redux (load từ DB)
  const categories = useAppSelector((state) => state.category.categories);
  const categoryFromDb = categories.find((c) => c.id === categoryId);
  const categoryImageUrl = (categoryFromDb as any)?.imageUrl || '';
  const category = categoryFromDb
    ? {
        name: categoryFromDb.name,
        icon: (categoryFromDb as any).iconEmoji || (categoryFromDb as any).icon || FALLBACK.icon,
        color: (categoryFromDb as any).colorHex || (categoryFromDb as any).color || FALLBACK.color,
      }
    : FALLBACK;
  const color = category.color ?? FALLBACK.color;

  // Ưu tiên: imageUrl truyền vào > imageUrl của danh mục > icon emoji
  const finalImageUrl = imageUrl || categoryImageUrl;

  if (finalImageUrl !== undefined && finalImageUrl !== '') {
    return (
      <img
        src={finalImageUrl}
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
      {category?.icon ?? FALLBACK.icon}
    </div>
  );
};