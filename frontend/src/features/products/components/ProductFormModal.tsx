import { useEffect, useMemo, type FC } from 'react';
import {
  App as AntdApp,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
} from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createProduct,
  setProductModalOpen,
  updateProductThunk,
} from '@/store/slices/productSlice';
import { fetchSuppliers } from '@/store/slices/supplierSlice';
import { fetchCategories } from '@/store/slices/categorySlice';
import {
  PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL,
  RECORD_STATUS,
  type ProductFormValues,
} from '@/types';
import {
  applyFormErrors,
  getErrorMessage,
  isFormValidationError,
} from '@/utils/apiError';
import './ProductFormModal.css';

const UNIT_OPTIONS = Object.values(PRODUCT_UNIT).map((unit) => ({
  value: unit,
  label: PRODUCT_UNIT_LABEL[unit],
}));

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Đang kinh doanh' },
  { value: 'Inactive', label: 'Ngừng kinh doanh' },
];

export const ProductFormModal: FC = () => {
  const [form] = Form.useForm<ProductFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedProduct } = useAppSelector(
    (state) => state.product,
  );
  const categories = useAppSelector((state) => state.category.categories);
  const suppliers = useAppSelector((state) => state.supplier.suppliers);
  const categoryOptions = categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  // const supplierOptions = suppliers.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  const isEditing = selectedProduct !== null;
  const selectedCategoryId = Form.useWatch('categoryId', form);
  const selectedSupplierId = Form.useWatch('supplierId', form);

  /** NCC cung ứng danh mục đang chọn. Ưu tiên lọc theo `categoryIds` của NCC. */
  const supplierOptions = useMemo(() => {
    if (!selectedCategoryId) {
      return suppliers.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
    }
    const matched = suppliers.filter(
        (s) => s.status === 'Active' && s.categoryIds?.includes(selectedCategoryId),
    );
    // Sửa sản phẩm cũ: NCC đã lưu có thể không khớp danh mục (dữ liệu legacy) —
    // vẫn giữ trong danh sách để Select không hiển thị value rỗng.
    if (selectedSupplierId && !matched.some((s) => s.id === selectedSupplierId)) {
      const current = suppliers.find((s) => s.id === selectedSupplierId);
      if (current) matched.push(current);
    }
    return matched.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  }, [suppliers, selectedCategoryId, selectedSupplierId]);

  useEffect(() => {
    if (!isModalOpen) return;
    // Load dropdown data
    dispatch(fetchCategories());
    dispatch(fetchSuppliers());
    if (selectedProduct !== null) {
      form.setFieldsValue(selectedProduct);
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      unit: PRODUCT_UNIT.Piece,
      vatPercent: 8,
      minStock: 10,
      maxStock: 100,
      shelfLifeDays: 30,
      status: RECORD_STATUS.Active,
      isPerishable: false,
    });
  }, [isModalOpen, selectedProduct, form, dispatch]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      if (isEditing && selectedProduct) {
        await dispatch(updateProductThunk({ id: selectedProduct.id, values })).unwrap();
        message.success('Đã cập nhật thông tin sản phẩm.');
      } else {
        await dispatch(createProduct(values)).unwrap();
        message.success('Đã thêm sản phẩm mới.');
      }
      dispatch(setProductModalOpen(false));
    } catch (error: unknown) {
      if (isFormValidationError(error)) return;
      const errorMessage = getErrorMessage(error, 'Không thể lưu thông tin sản phẩm');
      const handled = applyFormErrors(form, errorMessage, {
        barcode: ['mã vạch'],
        sku: ['sku'],
        salePrice: ['giá bán'],
        maxStock: ['tồn tối đa'],
      });
      if (!handled) message.error(errorMessage);
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa sản phẩm ${selectedProduct?.sku}`
          : 'Thêm sản phẩm mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setProductModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="product-form">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
            >
              <Input placeholder="Tên sản phẩm" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="sku"
              label="SKU"
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng nhập SKU.' },
                { max: 50, message: 'SKU tối đa 50 ký tự.' },
              ]}
            >
              <Input placeholder="VD: CK-FROSTER-01" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="barcode"
              label="Mã vạch"
              rules={[
                { required: true, whitespace: true, message: 'Vui lòng nhập mã vạch.' },
                { pattern: /^\d{13}$/, message: 'Mã vạch phải đúng 13 chữ số.' },
              ]}
            >
              <Input placeholder="8934567000011" maxLength={13} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="categoryId"
              label="Danh mục"
              rules={[{ required: true, message: 'Chọn danh mục.' }]}
            >
              <Select placeholder="Chọn danh mục" options={categoryOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="unit"
              label="Đơn vị"
              rules={[{ required: true, message: 'Chọn đơn vị.' }]}
            >
              <Select options={UNIT_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="vatPercent"
              label="VAT (%)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  max: 100,
                  message: 'VAT từ 0-100%.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} max={100} step={1} addonAfter="%" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="supplierId"
              label="Nhà cung cấp"
              rules={[{ required: true, message: 'Chọn nhà cung cấp.' }]}
            >
              <Select placeholder="Chọn nhà cung cấp" options={supplierOptions} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="costPrice"
              label="Giá nhập (đồng)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Giá nhập phải >= 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={100} addonAfter="₫" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="salePrice"
              label="Giá bán (đồng)"
              rules={[
                {
                  required: !isEditing,
                  message: 'Vui lòng nhập giá bán.',
                },
                {
                  type: 'number',
                  min: 1,
                  message: 'Giá bán phải lớn hơn 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={1} step={100} addonAfter="₫" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="minStock"
              label="Tồn tối thiểu"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Tồn tối thiểu phải >= 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={1} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="maxStock"
              label="Tồn tối đa"
              dependencies={['minStock']}
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Tồn tối đa phải >= 0.',
                },
                ({ getFieldValue }) => ({
                  validator: (_rule, value: number | null | undefined) => {
                    const minStock = getFieldValue('minStock') as number | null | undefined;
                    if (value === undefined || value === null || value === 0
                      || minStock === undefined || minStock === null || value >= minStock) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error('Tồn tối đa phải lớn hơn hoặc bằng tồn tối thiểu.'),
                    );
                  },
                }),
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={1} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="shelfLifeDays"
              label="Hạn sử dụng (ngày)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'HSD phải >= 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={1} addonAfter="ngày" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="isPerishable"
              label="Hàng dễ hỏng"
            >
              <Select
                options={[
                  { value: true, label: 'Có' },
                  { value: false, label: 'Không' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Chọn trạng thái.' }]}
            >
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
