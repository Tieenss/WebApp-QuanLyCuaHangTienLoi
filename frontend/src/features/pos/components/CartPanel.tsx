import { useMemo, type FC } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Segmented,
  Space,
  Typography,
} from 'antd';
import {
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  MinusOutlined,
  PlusOutlined,
  QrcodeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import './CartPanel.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  buildSalesOrder,
  calculateTotals,
  clearCart,
  removeFromCart,
  saleCompleted,
  setMemberPhone,
  setOrderDiscount,
  setPaymentMethod,
  setTenderedAmount,
  updateLineQuantity,
} from '@/store/slices/posSlice';
import { orderSaved } from '@/store/slices/salesOrderSlice';
import {
  PAYMENT_IS_CASH,
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABEL,
  SHIFT_CODE,
  type PaymentMethod,
  type ShiftCode,
} from '@/types';
import { stockOf } from '@/store/slices/stockSlice';
import { nowIso } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';

const { Text } = Typography;

/** Các phương thức thanh toán hiển thị tại quầy, kèm icon nhận diện. */
const PAYMENT_OPTIONS: readonly { value: PaymentMethod; icon: FC }[] = [
  { value: PAYMENT_METHOD.Cash, icon: DollarOutlined },
  { value: PAYMENT_METHOD.Card, icon: CreditCardOutlined },
  { value: PAYMENT_METHOD.MoMo, icon: QrcodeOutlined },
  { value: PAYMENT_METHOD.ZaloPay, icon: QrcodeOutlined },
  { value: PAYMENT_METHOD.VnPay, icon: QrcodeOutlined },
];

/** Mệnh giá gợi ý để thu ngân bấm nhanh khi khách trả tiền mặt. */
const QUICK_TENDER: readonly number[] = [
  20_000, 50_000, 100_000, 200_000, 500_000,
];

/** Ca làm việc suy ra từ giờ hiện tại, dùng gán cho hoá đơn. */
const currentShift = (): ShiftCode => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return SHIFT_CODE.Morning;
  if (hour >= 14 && hour < 22) return SHIFT_CODE.Afternoon;
  return SHIFT_CODE.Night;
};

/**
 * Giỏ hàng và thanh toán.
 *
 * Tổng tiền tính lại bằng `calculateTotals` — cùng hàm mà reducer `checkout`
 * dùng, nên số hiển thị luôn khớp con số ghi vào hoá đơn.
 */
export const CartPanel: FC = () => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { user } = useAppSelector((state) => state.auth);
  const posState = useAppSelector((state) => state.pos);
  const balances = useAppSelector((state) => state.stock.balances);
  const products = useAppSelector((state) => state.product.products);
  const employees = useAppSelector((state) => state.employee.employees);
  const {
    branchId,
    lines,
    orderDiscount,
    paymentMethod,
    tenderedAmount,
    memberPhone,
  } = posState;

  const productById = (id: string) => products.find((p) => p.id === id);
  const cashiersOfBranch = (branch: string | null) =>
    employees.filter((e) => e.branchId === branch && e.status === 'Active');

  const totals = useMemo(
    () => calculateTotals(lines, orderDiscount),
    [lines, orderDiscount],
  );

  const isCash = PAYMENT_IS_CASH[paymentMethod];
  /** Tiền thừa; chỉ có ý nghĩa khi khách đưa đủ tiền mặt. */
  const changeAmount = Math.max(0, tenderedAmount - totals.grandTotal);
  const isTenderInsufficient = isCash && tenderedAmount < totals.grandTotal;

  /** Kiểm tra tồn kho tại thời điểm thanh toán (BR-01). */
  const hasOutOfStockLines = useMemo(() => {
    return lines.some((line) => {
      const currentStock = stockOf(balances, branchId, line.productId);
      if (currentStock > 0) return false;
      const product = productById(line.productId);
      return product?.categoryId !== 'cat-03';
    });
  }, [lines, balances, branchId]);

  /**
   * Chốt hoá đơn — một dispatch duy nhất cho cả 4 bước của transaction:
   * lưu hoá đơn, trừ tồn kho, ghi thẻ kho, tạo phiếu thu sổ quỹ.
   */
  const handleCheckout = (): void => {
    if (lines.length === 0) {
      message.warning('Giỏ hàng đang trống.');
      return;
    }
    if (isTenderInsufficient) {
      message.error('Số tiền khách đưa chưa đủ để thanh toán.');
      return;
    }
    if (hasOutOfStockLines) {
      const outOfStockLine = lines.find((line) => {
        const currentStock = stockOf(balances, branchId, line.productId);
        if (currentStock > 0) return false;
        const product = productById(line.productId);
        return product?.categoryId !== 'cat-03';
      });
      message.error(
        `Sản phẩm "${outOfStockLine?.productName}" đã hết hàng, không thể thanh toán.`,
      );
      return;
    }

    // Thu ngân đang đăng nhập; nếu là quản lý thì lấy người trực ca tại quầy.
    const fallbackCashier = cashiersOfBranch(branchId)[0];
    const cashierId = user?.id ?? fallbackCashier?.id ?? 'unknown';
    const cashierName = user?.fullName ?? fallbackCashier?.fullName ?? 'Thu ngân';

    // Giá vốn lấy tại thời điểm bán để báo cáo lợi nhuận không bị lệch về sau.
    const unitCosts: Record<string, number> = {};
    for (const line of lines) {
      unitCosts[line.productId] = productById(line.productId)?.costPrice ?? 0;
    }

const sale = buildSalesOrder({
      state: posState,
      cashierId,
      cashierName,
      shiftCode: currentShift(),
      unitCosts,
      soldAt: nowIso(),
    });
    if (sale === null) return;

    dispatch(saleCompleted(sale));

    // Persist hoá đơn xuống DB trong 1 transaction (hoa_don + chi_tiet_hoa_don),
    // rồi thay hoá đơn local bằng bản ghi thật (mã HD do backend sinh) để
    // "Lịch sử hoá đơn" hiển thị đúng dữ liệu đã lưu.
    void (async () => {
      try {
        const created = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/hoa-don/with-lines`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify({
              idChiNhanh: sale.order.branchId,
              idThuNgan: user?.idNhanVien ?? cashierId,
              caLamViec: sale.order.shiftCode,
              ngayBan: sale.order.soldAt,
              hinhThucTt: sale.order.paymentMethod,
              sdtThanhVien: sale.order.memberPhone || undefined,
              subTotal: sale.order.subTotal,
              giamGia: sale.order.discountTotal,
              vatTotal: sale.order.vatTotal,
              grandTotal: sale.order.grandTotal,
              tienKhachDua: sale.tendered,
              tienThoi: sale.order.changeAmount,
              lines: sale.order.lines.map((line) => ({
                idSanPham: line.productId,
                soLuong: line.quantity,
                donGia: line.unitPrice,
                giamGiaDong: line.lineDiscount,
                vatPhantram: line.vatPercent,
                thanhTien: line.lineTotal,
                donGiaVon: line.unitCost,
              })),
            }),
          },
        );
        if (!created.ok) {
          const err = await created.json().catch(() => null);
          console.warn('Không lưu được hoá đơn xuống DB:', err);
          return;
        }
        const saved = await created.json();
        dispatch(
          orderSaved({
            localId: sale.order.id,
            order: {
              ...sale.order,
              id: saved.id,
              code: saved.maHoaDon ?? sale.order.code,
              branchName: saved.tenChiNhanh ?? '',
              cashierName: saved.tenThuNgan ?? sale.order.cashierName,
            },
          }),
        );
      } catch (e) {
        console.warn('Không lưu được hoá đơn xuống DB:', e);
      }
    })();
  };

  return (
    <Card
      className="pos-cart-panel"
      styles={{ body: { padding: 16 } }}
      title={
        <Space size={8}>
          <Text strong>Giỏ hàng</Text>
          <Text type="secondary" className="cart-header-count">
            {totals.totalLines} mặt hàng · {totals.totalQuantity} đơn vị
          </Text>
        </Space>
      }
      extra={
        lines.length > 0 && (
          <Popconfirm
            title="Xoá toàn bộ giỏ hàng?"
            okText="Xoá"
            cancelText="Không"
            okButtonProps={{ danger: true }}
            onConfirm={() => dispatch(clearCart())}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />}>
              Xoá giỏ
            </Button>
          </Popconfirm>
        )
      }
    >
      {lines.length === 0 ? (
        <Empty
          description="Quét mã vạch hoặc chọn sản phẩm để bắt đầu"
          className="cart-empty"
        />
      ) : (
        <div className="pos-cart-lines">
          {lines.map((line) => (
            <div className="pos-cart-line" key={line.productId}>
              <div className="cart-line-info">
                <Text strong className="cart-line-name">
                  {line.productName}
                </Text>
                <Text type="secondary" className="cart-line-price">
                  {formatVND(line.unitPrice)} / {line.unit}
                  {line.lineDiscount > 0 && ` · giảm ${formatVND(line.lineDiscount)}`}
                </Text>

                <Space size={4} className="cart-line-qty">
                  <Button
                    size="small"
                    icon={<MinusOutlined />}
                    onClick={() =>
                      dispatch(
                        updateLineQuantity({
                          productId: line.productId,
                          quantity: line.quantity - 1,
                        }),
                      )
                    }
                  />
                  <InputNumber
                    size="small"
                    min={1}
                    value={line.quantity}
                    className="cart-line-qty-input"
                    onChange={(value) =>
                      dispatch(
                        updateLineQuantity({
                          productId: line.productId,
                          quantity: value ?? 1,
                        }),
                      )
                    }
                  />
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      dispatch(
                        updateLineQuantity({
                          productId: line.productId,
                          quantity: line.quantity + 1,
                        }),
                      )
                    }
                  />
                </Space>
              </div>

              <div className="cart-line-total">
                <Text strong className="numeric-cell cart-line-amount">
                  {formatVND(line.unitPrice * line.quantity - line.lineDiscount)}
                </Text>
                <br />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => dispatch(removeFromCart(line.productId))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Space direction="vertical" size={10} className="cart-footer">
        <Input
          size="small"
          placeholder="SĐT thành viên Circle K Club (tuỳ chọn)"
          prefix={<UserOutlined className="cart-member-icon" />}
          value={memberPhone}
          onChange={(event) => dispatch(setMemberPhone(event.target.value))}
        />

        <div className="pos-total-row">
          <Text type="secondary">Tiền hàng</Text>
          <Text className="numeric-cell">{formatVND(totals.subTotal)}</Text>
        </div>

        <div className="pos-total-row">
          <Text type="secondary">Giảm giá đơn</Text>
          <InputNumber
            size="small"
            min={0}
            max={totals.subTotal}
            step={1000}
            value={orderDiscount}
            className="cart-discount-input"
            formatter={(value) =>
              `${value ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            }
            parser={(value) => Number((value ?? '0').replace(/\./g, ''))}
            onChange={(value) => dispatch(setOrderDiscount(value ?? 0))}
          />
        </div>

        <div className="pos-total-row">
          <Text type="secondary">Thuế VAT</Text>
          <Text className="numeric-cell">{formatVND(totals.vatTotal)}</Text>
        </div>

        <div className="pos-grand-total">
          <Text strong>KHÁCH PHẢI TRẢ</Text>
          <span className="pos-grand-total-value">{formatVND(totals.grandTotal)}</span>
        </div>

        <Segmented<PaymentMethod>
          block
          value={paymentMethod}
          onChange={(value) => dispatch(setPaymentMethod(value))}
          options={PAYMENT_OPTIONS.map(({ value, icon: Icon }) => ({
            value,
            label: (
              <Space size={4} className="cart-payment-label">
                <Icon />
                {PAYMENT_METHOD_LABEL[value].replace('Ví ', '').replace(' ngân hàng', '')}
              </Space>
            ),
          }))}
        />

        {isCash && (
          <>
            <InputNumber
              size="large"
              min={0}
              step={10_000}
              value={tenderedAmount}
              className="cart-tender-input"
              placeholder="Tiền khách đưa"
              status={isTenderInsufficient ? 'error' : undefined}
              formatter={(value) =>
                `${value ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
              }
              parser={(value) => Number((value ?? '0').replace(/\./g, ''))}
              onChange={(value) => dispatch(setTenderedAmount(value ?? 0))}
            />

            <Space size={6} wrap>
              <Button
                size="small"
                onClick={() => dispatch(setTenderedAmount(totals.grandTotal))}
              >
                Đủ tiền
              </Button>
              {QUICK_TENDER.map((amount) => (
                <Button
                  key={amount}
                  size="small"
                  onClick={() => dispatch(setTenderedAmount(tenderedAmount + amount))}
                >
                  +{amount / 1000}k
                </Button>
              ))}
            </Space>

            <div className="pos-total-row">
              <Text type="secondary">Tiền thừa trả khách</Text>
              <Text
                strong
                className={`numeric-cell${changeAmount > 0 ? ' cart-change-positive' : ''}`}
              >
                {formatVND(changeAmount)}
              </Text>
            </div>
          </>
        )}

        <Button
          type="primary"
          size="large"
          block
          className="cart-checkout-btn"
          disabled={lines.length === 0 || isTenderInsufficient || hasOutOfStockLines}
          onClick={handleCheckout}
        >
          Thanh toán {totals.grandTotal > 0 && formatVND(totals.grandTotal)}
        </Button>
      </Space>
    </Card>
  );
};