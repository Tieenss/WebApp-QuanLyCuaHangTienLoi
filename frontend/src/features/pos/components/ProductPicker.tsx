import { useMemo, useRef, type FC, type KeyboardEvent } from 'react';
import {
  App as AntdApp,
  Badge,
  Card,
  Empty,
  Input,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import { BarcodeOutlined, SearchOutlined } from '@ant-design/icons';
import { ProductThumb } from '@/components/ProductThumb';
import { BRAND } from '@/config/brand';
import './ProductPicker.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addToCart,
  setActiveCategory,
  setSearchKeyword,
} from '@/store/slices/posSlice';
import { mockCategories } from '@/mockData/categories';
import { productByBarcode, sellableProducts } from '@/mockData/products';
import { stockOf } from '@/store/slices/stockSlice';
import { formatVND } from '@/utils/formatters';
import { matchKeyword } from '@/utils/formatters';

const { Text } = Typography;

/**
 * Khu vực chọn sản phẩm của màn hình POS.
 *
 * Hai đường vào đơn: quét mã vạch (ô input riêng, Enter là thêm ngay) và bấm
 * vào thẻ sản phẩm. Ô quét được ưu tiên vì thao tác chính tại quầy là quét.
 */
export const ProductPicker: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const barcodeRef = useRef<string>('');

  const { branchId, activeCategoryId, searchKeyword } = useAppSelector(
    (state) => state.pos,
  );
  const cartLines = useAppSelector((state) => state.pos.lines);
  /** Tồn kho hiện hành — cập nhật ngay sau mỗi lần bán. */
  const balances = useAppSelector((state) => state.stock.balances);

  /** Số lượng đang có trong giỏ theo từng sản phẩm, để hiện badge trên thẻ. */
  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cartLines) {
      map.set(line.productId, line.quantity);
    }
    return map;
  }, [cartLines]);

  /** Sản phẩm sau khi áp bộ lọc danh mục và từ khoá tìm kiếm. */
  const visibleProducts = useMemo(
    () =>
      sellableProducts.filter((product) => {
        const matchCategory =
          activeCategoryId === null || product.categoryId === activeCategoryId;
        const matchSearch = matchKeyword(searchKeyword, [
          product.name,
          product.sku,
          product.barcode,
        ]);
        return matchCategory && matchSearch;
      }),
    [activeCategoryId, searchKeyword],
  );

  /** Tuỳ chọn danh mục, kèm mục "Tất cả" ở đầu. */
  const categoryOptions = useMemo(
    () => [
      { label: 'Tất cả', value: '__ALL__' },
      ...mockCategories.map((category) => ({
        label: `${category.icon} ${category.name}`,
        value: category.id,
      })),
    ],
    [],
  );

  /** Xử lý khi máy quét gửi Enter: tra mã vạch rồi thêm vào giỏ. */
  const handleBarcodeSubmit = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter') return;
    const code = barcodeRef.current.trim();
    if (code === '') return;

    const product = productByBarcode(code);
    if (!product) {
      message.error(`Không tìm thấy sản phẩm với mã vạch ${code}`);
      return;
    }

    dispatch(
      addToCart({
        product,
        availableStock: stockOf(balances, branchId, product.id),
      }),
    );
    message.success(`Đã thêm: ${product.name}`);

    // Xoá ô để chuẩn bị cho lần quét tiếp theo.
    barcodeRef.current = '';
    (event.target as HTMLInputElement).value = '';
  };

  return (
    <Card
      styles={{ body: { padding: 16 } }}
      title={
        <Space size={10} wrap>
          <Text strong>Chọn sản phẩm</Text>
          <Tag color="red" className="picker-count-tag">
            {visibleProducts.length} mặt hàng
          </Tag>
        </Space>
      }
    >
      <Space direction="vertical" size={12} className="picker-body">
        <Space.Compact className="picker-compact">
          <Input
            size="large"
            allowClear
            autoFocus
            placeholder="Quét mã vạch rồi nhấn Enter..."
            prefix={<BarcodeOutlined className="picker-barcode-icon" />}
            onChange={(event) => {
              barcodeRef.current = event.target.value;
            }}
            onKeyDown={handleBarcodeSubmit}
            className="picker-barcode-input"
          />
          <Input
            size="large"
            allowClear
            placeholder="Tìm theo tên hoặc SKU..."
            prefix={<SearchOutlined className="picker-search-icon" />}
            value={searchKeyword}
            onChange={(event) => dispatch(setSearchKeyword(event.target.value))}
          />
        </Space.Compact>

        <div className="picker-category-scroll">
          <Segmented
            value={activeCategoryId ?? '__ALL__'}
            options={categoryOptions}
            onChange={(value) =>
              dispatch(setActiveCategory(value === '__ALL__' ? null : String(value)))
            }
          />
        </div>

        {visibleProducts.length === 0 ? (
          <Empty
            description="Không có sản phẩm khớp điều kiện tìm kiếm"
            className="picker-empty"
          />
        ) : (
          <div className="pos-product-grid">
              {visibleProducts.map((product) => {
                const available = stockOf(balances, branchId, product.id);
              // Hàng pha chế tại quầy không quản tồn nên vẫn bán được khi tồn 0.
              const isMadeToOrder = product.categoryId === 'cat-03';
              const isOutOfStock = available <= 0 && !isMadeToOrder;
              const inCart = cartQuantityMap.get(product.id) ?? 0;

              return (
                <Badge
                  key={product.id}
                  count={inCart}
                  color={BRAND.primaryRed}
                  offset={[-6, 6]}
                >
                  <button
                    type="button"
                      className="pos-product-card"
                      disabled={isOutOfStock}
                      onClick={() =>
                        dispatch(addToCart({ product, availableStock: available }))
                      }
                    >
                    <Space size={8} align="start">
                      <ProductThumb
                        categoryId={product.categoryId}
                        size={38}
                        productName={product.name}
                      />
                      <span
                        className={`picker-stock-label${isOutOfStock ? ' is-out' : ''}`}
                      >
                        {isMadeToOrder
                          ? 'Pha chế'
                          : isOutOfStock
                            ? 'Hết hàng'
                            : `Tồn ${available}`}
                      </span>
                    </Space>

                    <span className="pos-product-name">{product.name}</span>

                    <span className="picker-price-row">
                      <span className="pos-product-price">
                        {formatVND(product.salePrice)}
                      </span>
                      <span className="picker-sku">{product.sku}</span>
                    </span>
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
      </Space>
    </Card>
  );
};