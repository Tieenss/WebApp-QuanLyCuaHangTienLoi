import { useEffect, useMemo, useState, type FC } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  buildPurchaseOrder,
  fetchPurchaseOrders,
  purchaseReceived,
  type PurchaseDraftLine,
} from '@/store/slices/purchaseSlice';
import { stockOf } from '@/store/slices/stockSlice';
import { phieuNhapApi } from '@/api/phieuNhap';
import { fetchKhoTong } from '@/store/slices/branchSlice';
import { PRODUCT_UNIT_LABEL } from '@/types';
import { dayjs, today } from '@/utils/dateUtils';
import { formatVND } from '@/utils/formatters';
import type { Dayjs } from 'dayjs';
import './PurchaseFormModal.css';

const DISTRIBUTION_CENTER_ID = 'br-dc-001';

const { Text, Paragraph } = Typography;

interface PurchaseFormValues {
  supplierId: string;
  orderDate: Dayjs;
  note: string;
}

/** Một dòng hàng trên form, `productId` rỗng nghĩa là dòng chưa chọn sản phẩm. */
interface DraftRow extends PurchaseDraftLine {
  key: string;
}

interface PurchaseFormModalProps {
  open: boolean;
  onClose: () => void;
}

const emptyRow = (): DraftRow => ({
  key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  quantity: 0,
  unitCost: 0,
});

/**
 * Form lập phiếu nhập hàng từ nhà cung cấp (module 8).
 *
 * Luồng theo `luong_nghiep_vu.md` mục 3.1: Thủ kho kiểm đếm hàng thực tế trên
 * xe giao, đối chiếu với đơn hàng, rồi lập phiếu. Vì vậy form không có khái
 * niệm "số đặt / số thực nhận" tách rời — số nhập trên form là số đã đếm.
 *
 * BR-05: hàng luôn vào Kho Tổng, không cho chọn chi nhánh.
 * Chỉ hiện sản phẩm do chính nhà cung cấp đã chọn cung ứng.
 */
export const PurchaseFormModal: FC<PurchaseFormModalProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<PurchaseFormValues>();

  const user = useAppSelector((state) => state.auth.user);
  const suppliers = useAppSelector((state) => state.supplier.suppliers);
  const orderCount = useAppSelector((state) => state.purchase.orders.length);
  const balances = useAppSelector((state) => state.stock.balances);
  const products = useAppSelector((state) => state.product.products);
  const branches = useAppSelector((state) => state.branch.branches);

  useEffect(() => {
    dispatch(fetchKhoTong());
  }, [dispatch]);

  const sellableProducts = products.filter((p) => p.status === 'Active');
  const branchNameById = (id: string): string => {
    const branch = branches.find((b) => b.id === id);
    return branch?.name ?? 'Kho Tổng';
  };

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);

  /**
   * Dọn form sau khi modal đóng hẳn.
   *
   * Đặt ở `afterClose` (một sự kiện) thay vì `useEffect` theo `open`: reset
   * trong effect sẽ kích hoạt thêm một lượt render mỗi lần mở, và React cảnh
   * báo đúng về việc đó. Chạy sau khi đóng cũng tránh người dùng thấy dữ liệu
   * biến mất giữa lúc modal còn đang hiển thị.
   */
  const handleAfterClose = (): void => {
    form.resetFields();
    setSupplierId(null);
    setBranchId(null);
    setRows([emptyRow()]);
  };

  /** Chỉ sản phẩm của NCC đang chọn — tránh nhập sai nguồn hàng. */
  const supplierProducts = useMemo(
    () =>
      supplierId === null
        ? []
        : sellableProducts.filter((product) => product.supplierId === supplierId),
    [supplierId],
  );

  /** Sản phẩm đã có trên form, để không cho chọn trùng. */
  const usedProductIds = useMemo(
    () => new Set(rows.map((row) => row.productId).filter((id) => id !== '')),
    [rows],
  );

  const validRows = useMemo(
    () => rows.filter((row) => row.productId !== '' && row.quantity > 0),
    [rows],
  );

  const totals = useMemo(() => {
    const subTotal = validRows.reduce(
      (sum, row) => sum + row.quantity * row.unitCost,
      0,
    );
    const vatTotal = validRows.reduce((sum, row) => {
      const product = sellableProducts.find((item) => item.id === row.productId);
      const vatPercent = product?.vatPercent ?? 0;
      return sum + (row.quantity * row.unitCost * vatPercent) / 100;
    }, 0);

    return {
      subTotal,
      vatTotal: Math.round(vatTotal),
      grandTotal: subTotal + Math.round(vatTotal),
    };
  }, [validRows]);

  const updateRow = (key: string, patch: Partial<DraftRow>): void => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  /** Đổi NCC làm các dòng hàng cũ không còn hợp lệ, nên xoá hết. */
  const handleSupplierChange = (value: string): void => {
    setSupplierId(value);
    setRows([emptyRow()]);
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();

      if (validRows.length === 0) {
        message.error('Phiếu nhập phải có ít nhất một dòng hàng hợp lệ.');
        return;
      }

      const supplierName = suppliers.find((s) => s.id === values.supplierId)?.name ?? '';

      // Lưu phiếu + dòng chi tiết trong 1 transaction (phieu_nhap +
      // chi_tiet_phieu_nhap + the_kho + ton_kho qua trigger/hàm DB).
      const createdOrder = await phieuNhapApi.createWithLines({
        idChiNhanh: branchId,
        idNcc: values.supplierId,
        idNguoiNhap: user?.idNhanVien ?? null,
        ngayDatHang: values.orderDate.format('YYYY-MM-DD'),
        trangThai: 'COMPLETED',
        ghiChu: values.note?.trim() ?? '',
        lines: validRows.map((row) => {
          const product = sellableProducts.find((item) => item.id === row.productId);
          return {
            idSanPham: row.productId,
            soLuong: row.quantity,
            soLuongNhan: row.quantity,
            donGiaNhap: row.unitCost,
            vatPhantram: product?.vatPercent ?? 8,
          };
        }),
      });

      // Vẫn dispatch để update Redux state với tên sản phẩm + NCC
      const order = buildPurchaseOrder({
        supplierId: values.supplierId,
        supplierName,
        lines: validRows.map(({ productId, quantity, unitCost }) => ({
          productId,
          quantity,
          unitCost,
        })),
        orderDate: values.orderDate.format('YYYY-MM-DD'),
        note: values.note?.trim() ?? '',
        createdBy:
          user === null ? 'Không xác định' : `${user.fullName} (${user.employeeCode})`,
        existingCount: orderCount,
      });
      if (order !== null) {
        dispatch(
          purchaseReceived({
            order: { ...order, id: createdOrder.id, code: createdOrder.maPhieu },
            performedBy:
              user === null
                ? 'Không xác định'
                : `${user.fullName} (${user.employeeCode})`,
          }),
        );
        message.success(
          `Đã lưu phiếu ${createdOrder.maPhieu}: cộng tồn Kho Tổng, ghi thẻ kho và lập phiếu chi ${formatVND(createdOrder.grandTotal ?? 0)}.`,
        );
      } else {
        message.success(`Đã lưu phiếu nhập ${createdOrder.maPhieu}.`);
      }
      dispatch(fetchPurchaseOrders());
      onClose();
    } catch (error: any) {
      message.error(error?.message || 'Có lỗi xảy ra khi lưu phiếu nhập');
    }
  };

  const lineColumns: ColumnsType<DraftRow> = [
    {
      title: 'Sản phẩm',
      dataIndex: 'productId',
      render: (value: string, row) => (
        <Select
          className="purchase-line-product"
          value={value === '' ? undefined : value}
          placeholder={
            supplierId === null ? 'Chọn nhà cung cấp trước' : 'Chọn sản phẩm'
          }
          disabled={supplierId === null}
          showSearch
          optionFilterProp="label"
          onChange={(productId: string) => {
            const product = sellableProducts.find((item) => item.id === productId);
            // Điền sẵn giá nhập niêm yết để Thủ kho chỉ sửa khi giá thay đổi.
            updateRow(row.key, {
              productId,
              unitCost: product?.costPrice ?? 0,
            });
          }}
          options={supplierProducts.map((product) => ({
            value: product.id,
            label: `${product.name} (${product.sku})`,
            // Đã có trên phiếu thì không cho chọn lại.
            disabled: usedProductIds.has(product.id) && product.id !== value,
          }))}
        />
      ),
    },
    {
      title: 'Tồn Kho Tổng',
      key: 'currentStock',
      align: 'right',
      width: 110,
      render: (_, row) =>
        row.productId === '' ? (
          <Text type="secondary">—</Text>
        ) : (
          <span className="numeric-cell">
            {stockOf(balances, branchId || DISTRIBUTION_CENTER_ID, row.productId)}
          </span>
        ),
    },
    {
      title: 'Số lượng nhập',
      dataIndex: 'quantity',
      align: 'right',
      width: 130,
      render: (value: number, row) => (
        <InputNumber<number>
          className="purchase-line-input"
          min={0}
          step={12}
          value={value}
          disabled={row.productId === ''}
          onChange={(quantity) => updateRow(row.key, { quantity: quantity ?? 0 })}
        />
      ),
    },
    {
      title: 'Đơn giá nhập',
      dataIndex: 'unitCost',
      align: 'right',
      width: 150,
      render: (value: number, row) => (
        <InputNumber<number>
          className="purchase-line-input"
          min={0}
          step={1_000}
          value={value}
          disabled={row.productId === ''}
          formatter={(input) => `${input ?? 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={(input) => Number((input ?? '0').replace(/\./g, ''))}
          onChange={(unitCost) => updateRow(row.key, { unitCost: unitCost ?? 0 })}
        />
      ),
    },
    {
      title: 'Thành tiền',
      key: 'lineTotal',
      align: 'right',
      width: 140,
      render: (_, row) => (
        <Text strong className="numeric-cell">
          {formatVND(row.quantity * row.unitCost)}
        </Text>
      ),
    },
    {
      title: 'Đơn vị',
      key: 'unit',
      align: 'center',
      width: 80,
      render: (_, row) => {
        const product = sellableProducts.find((item) => item.id === row.productId);
        return product === undefined ? (
          <Text type="secondary">—</Text>
        ) : (
          <Text className="purchase-line-unit">
            {PRODUCT_UNIT_LABEL[product.unit]}
          </Text>
        );
      },
    },
    {
      key: 'actions',
      align: 'center',
      width: 50,
      render: (_, row) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          // Luôn giữ lại ít nhất một dòng để form không trống trơn.
          disabled={rows.length === 1}
          onClick={() =>
            setRows((current) => current.filter((item) => item.key !== row.key))
          }
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Lập phiếu nhập hàng từ nhà cung cấp"
      okText="Lưu phiếu nhập"
      cancelText="Huỷ"
      onOk={handleSubmit}
      onCancel={onClose}
      afterClose={handleAfterClose}
      destroyOnHidden
      width={1000}
    >
      <Alert
        type="info"
        showIcon
        className="purchase-alert"
        message={`Hàng nhập vào ${branchNameById(branchId || DISTRIBUTION_CENTER_ID)}`}
        description="Khi lưu, hệ thống cộng tồn kho, ghi thẻ kho (NHAP_NCC) và lập phiếu chi sổ quỹ. Cửa hàng bán lẻ nhận hàng qua phiếu xuất kho nội bộ."
      />

      <Form<PurchaseFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        // Ngày nhập mặc định là hôm nay; `afterClose` sẽ đưa về lại giá trị này.
        initialValues={{ orderDate: dayjs(today()), note: '' }}
      >
        <Space size={16} wrap className="purchase-head-fields">
          <Form.Item
            name="supplierId"
            label="Nhà cung cấp"
            rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp.' }]}
            className="purchase-field-supplier"
          >
            <Select
              placeholder="Chọn nhà cung cấp"
              showSearch
              optionFilterProp="label"
              onChange={handleSupplierChange}
              options={suppliers
                .filter((supplier) => supplier.status === 'Active')
                .map((supplier) => ({
                  value: supplier.id,
                  label: `${supplier.code} — ${supplier.name}`,
                }))}
            />
          </Form.Item>

          <Form.Item
            label="Kho nhận (chỉ Kho Tổng)"
            required
          >
            <Select
              placeholder="Chọn kho tổng"
              value={branchId}
              onChange={setBranchId}
              loading={branches.length === 0}
              showSearch
              optionFilterProp="label"
              options={branches.map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` }))}
            />
          </Form.Item>

          <Form.Item
            name="orderDate"
            label="Ngày nhập kho"
            rules={[{ required: true, message: 'Vui lòng chọn ngày.' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              allowClear={false}
              // Không ghi nhận hàng nhập ở tương lai.
              maxDate={dayjs(today())}
            />
          </Form.Item>
        </Space>

        <Form.Item name="note" label="Ghi chú">
          <Input placeholder="Ví dụ: Giao thiếu 2 thùng, NCC hẹn bù tuần sau." />
        </Form.Item>
      </Form>

      {supplierId !== null && supplierProducts.length === 0 && (
        <Alert
          type="warning"
          showIcon
          className="purchase-alert"
          message="Nhà cung cấp này chưa có sản phẩm nào trong danh mục."
          description="Cần gán sản phẩm cho nhà cung cấp ở module Danh mục & Sản phẩm trước khi lập phiếu."
        />
      )}

      <Table<DraftRow>
        columns={lineColumns}
        dataSource={rows}
        rowKey="key"
        size="small"
        pagination={false}
        className="purchase-line-table"
      />

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        disabled={supplierId === null}
        className="purchase-add-row"
        onClick={() => setRows((current) => [...current, emptyRow()])}
      >
        Thêm dòng hàng
      </Button>

      <Descriptions bordered size="small" column={3} className="purchase-totals">
        <Descriptions.Item label="Tiền hàng">
          {formatVND(totals.subTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Thuế VAT">
          {formatVND(totals.vatTotal)}
        </Descriptions.Item>
        <Descriptions.Item label="Tổng phải trả">
          <Text strong className="purchase-grand-total">
            {formatVND(totals.grandTotal)}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <Paragraph type="secondary" className="purchase-foot-note">
        {validRows.length} dòng hàng hợp lệ. Thanh toán ngay khi nhập hàng, hệ thống
        không theo dõi công nợ nhà cung cấp.
      </Paragraph>
    </Modal>
  );
};
