import { useEffect, type FC } from 'react';
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
  addProduct,
  setProductModalOpen,
  updateProduct,
} from '@/store/slices/productSlice';
import {
  PRODUCT_UNIT,
  PRODUCT_UNIT_LABEL,
  RECORD_STATUS,
  type ProductFormValues,
} from '@/types';
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
  const isEditing = selectedProduct !== null;

  useEffect(() => {
    if (!isModalOpen) return;
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
  }, [isModalOpen, selectedProduct, form]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      if (isEditing) {
        dispatch(updateProduct({ id: selectedProduct.id, values }));
        message.success('Đã cập nhật thông tin sản phẩm.');
      } else {
        dispatch(addProduct(values));
        message.success('Đã thêm sản phẩm mới.');
      }
      dispatch(setProductModalOpen(false));
    } catch {
      // Lỗi validate đã được antd Form hiển thị tại từng field.
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
              rules={[{ required: true, message: 'Vui lòng nhập SKU.' }]}
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
              rules={[{ required: true, message: 'Vui lòng nhập mã vạch.' }]}
            >
              <Input placeholder="EAN-13" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="categoryId"
              label="Danh mục"
              rules={[{ required: true, message: 'Chọn danh mục.' }]}
            >
              <Select placeholder="Chọn danh mục" options={[]} />
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
                  type: 'number',
                  min: 0,
                  message: 'Giá bán phải >= 0.',
                },
              ]}
            >
              <InputNumber className="product-amount-input" min={0} step={100} addonAfter="₫" />
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
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Tồn tối đa phải >= 0.',
                },
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