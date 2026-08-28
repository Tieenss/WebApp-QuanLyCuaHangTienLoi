import type { SalesOrder } from '@/types';
import { PAYMENT_METHOD_LABEL } from '@/types';
import { formatDateTime } from '@/utils/dateUtils';
import { formatAmount, formatVND } from '@/utils/formatters';
import { branchById } from '@/mockData/branches';

/**
 * Dựng HTML hoá đơn khổ 80mm cho máy in nhiệt.
 *
 * Trả về chuỗi HTML thuần (không phải JSX) vì nội dung được ghi sang cửa sổ in
 * riêng bằng `printHtml`, nơi React không kiểm soát DOM.
 */
export const buildReceiptHtml = (order: SalesOrder): string => {
  const branch = branchById(order.branchId);

  const lineRows = order.lines
    .map((line) => {
      const discountRow =
        line.lineDiscount > 0
          ? `<tr><td colspan="2" class="muted">&nbsp;&nbsp;Giảm giá</td><td class="right">-${formatAmount(
              line.lineDiscount,
            )}</td></tr>`
          : '';

      return `<tr>
  <td colspan="3">${escapeHtml(line.productName)}</td>
</tr>
<tr>
  <td class="muted">${line.quantity} ${escapeHtml(line.unit)}</td>
  <td class="muted right">x ${formatAmount(line.unitPrice)}</td>
  <td class="right">${formatAmount(line.unitPrice * line.quantity)}</td>
</tr>${discountRow}`;
    })
    .join('');

  const memberRow =
    order.memberPhone !== null
      ? `<tr><td>Thành viên</td><td class="right">${escapeHtml(order.memberPhone)}</td></tr>`
      : '';

  // Chỉ hiển thị tiền khách đưa / tiền thừa khi thanh toán bằng tiền mặt.
  const cashRows =
    order.changeAmount > 0 || order.tenderedAmount > order.grandTotal
      ? `<tr><td>Tiền khách đưa</td><td class="right">${formatAmount(order.tenderedAmount)}</td></tr>
<tr><td>Tiền thừa</td><td class="right">${formatAmount(order.changeAmount)}</td></tr>`
      : '';

  return `
<h1>CIRCLE K</h1>
<div class="center muted">${escapeHtml(branch?.name ?? order.branchName)}</div>
<div class="center muted">${escapeHtml(branch?.addressLine ?? '')}</div>
<div class="center muted">ĐT: ${escapeHtml(branch?.phone ?? '')}</div>
<hr />
<table>
  <tr><td>Số HĐ</td><td class="right bold">${escapeHtml(order.code)}</td></tr>
  <tr><td>Thời gian</td><td class="right">${formatDateTime(order.soldAt)}</td></tr>
  <tr><td>Thu ngân</td><td class="right">${escapeHtml(order.cashierName)}</td></tr>
  ${memberRow}
</table>
<hr />
<table>${lineRows}</table>
<hr />
<table>
  <tr><td>Tiền hàng</td><td class="right">${formatAmount(order.subTotal)}</td></tr>
  <tr><td>Giảm giá</td><td class="right">-${formatAmount(order.discountTotal)}</td></tr>
  <tr><td>Thuế VAT</td><td class="right">${formatAmount(order.vatTotal)}</td></tr>
  <tr class="total-row"><td>TỔNG CỘNG</td><td class="right">${formatVND(order.grandTotal)}</td></tr>
  <tr><td>Hình thức</td><td class="right">${PAYMENT_METHOD_LABEL[order.paymentMethod]}</td></tr>
  ${cashRows}
</table>
<hr />
<div class="center">Cảm ơn Quý khách và hẹn gặp lại!</div>
<div class="center muted">Hoá đơn in từ hệ thống Circle K ERP</div>
`;
};

/** Chặn HTML injection khi ghép tên sản phẩm / tên người vào chuỗi in. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');