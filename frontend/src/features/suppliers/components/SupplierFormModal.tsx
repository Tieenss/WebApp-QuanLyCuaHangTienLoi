import { useEffect, type FC } from 'react';
import {
  App as AntdApp,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
} from 'antd';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createSupplier,
  setModalOpen,
  updateSupplierThunk,
} from '@/store/slices/supplierSlice';
import type { SupplierFormValues } from '@/types';
import './SupplierFormModal.css';

/** Nhóm hàng mà nhà cung cấp có thể cung ứng. */
const SUPPLY_CATEGORIES: readonly string[] = [
  'Nước giải khát',
  'Snack & Bánh kẹo',
  'Sữa & Chế phẩm',
  'Đồ ăn nhanh',
  'Mì ăn liền',
  'Thực phẩm tươi sống',
  'Cà phê & Cacao',
  'Bánh kẹo',
  'Kem & Đông lạnh',
  'Mỹ phẩm & Tiện ích',
  'Thức uống bổ dưỡng',
  'Vật tư & Bao bì',
];

/** Điều khoản công nợ — khớp union type trong `supplierTypes.ts`. */
const PAYMENT_TERMS: readonly SupplierFormValues['paymentTerms'][] = [
  'Thanh toán ngay',
  'Công nợ 15 ngày',
  'Công nợ 30 ngày',
  'Công nợ 45 ngày',
];

/**
 * Form thêm / sửa nhà cung cấp.
 *
 * Dùng chung một modal cho cả 2 chế độ: có `selectedSupplier` là sửa, không có
 * là thêm mới. Nhờ vậy chỉ phải bảo trì một bộ quy tắc kiểm tra dữ liệu.
 */
export const SupplierFormModal: FC = () => {
  const [form] = Form.useForm<SupplierFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedSupplier } = useAppSelector((state) => state.supplier);
  const isEditing = selectedSupplier !== null;

  // Nạp dữ liệu mỗi lần mở modal để không dùng lại giá trị của lần trước.
  useEffect(() => {
    if (!isModalOpen) return;

    if (selectedSupplier !== null) {
      form.setFieldsValue(selectedSupplier);
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      paymentTerms: 'Công nợ 30 ngày',
      status: 'Active',
      categories: [],
    });
  }, [isModalOpen, selectedSupplier, form]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();

      if (isEditing && selectedSupplier) {
        await dispatch(updateSupplierThunk({ id: selectedSupplier.id, values })).unwrap();
        message.success('Đã cập nhật thông tin nhà cung cấp.');
      } else {
        await dispatch(createSupplier(values)).unwrap();
        message.success('Đã thêm nhà cung cấp mới.');
      }

      dispatch(setModalOpen(false));
    } catch (error: any) {
      message.error(error?.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa nhà cung cấp ${selectedSupplier.code}`
          : 'Thêm nhà cung cấp mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm nhà cung cấp'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="supplier-form">
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item
              name="name"
              label="Tên nhà cung cấp"
              rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp.' }]}
            >
              <Input placeholder="Ví dụ: Công Ty TNHH Pepsico Việt Nam" />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item
              name="taxCode"
              label="Mã số thuế"
              rules={[
                { required: true, message: 'Vui lòng nhập mã số thuế.' },
                {
                  pattern: /^\d{10}(\d{3})?$/,
                  message: 'Mã số thuế gồm 10 hoặc 13 chữ số.',
                },
              ]}
            >
              <Input placeholder="0300845912" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }]}
            >
              <Input placeholder="028 3821 9999" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email liên hệ"
              rules={[
                { required: true, message: 'Vui lòng nhập email.' },
                { type: 'email', message: 'Email không đúng định dạng.' },
              ]}
            >
              <Input placeholder="contact@supplier.com.vn" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="address"
          label="Địa chỉ trụ sở / kho hàng"
          rules={[{ required: true, message: 'Vui lòng nhập địa chỉ.' }]}
        >
          <Input placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="categories"
              label="Nhóm hàng cung ứng"
              rules={[{ required: true, message: 'Chọn ít nhất một nhóm hàng.' }]}
            >
              <Select
                mode="multiple"
                placeholder="Chọn nhóm hàng"
                options={SUPPLY_CATEGORIES.map((item) => ({
                  value: item,
                  label: item,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={7}>
            <Form.Item
              name="paymentTerms"
              label="Điều khoản công nợ"
              rules={[{ required: true, message: 'Chọn điều khoản công nợ.' }]}
            >
              <Select
                options={PAYMENT_TERMS.map((term) => ({ value: term, label: term }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Chọn trạng thái.' }]}
            >
              <Select
                options={[
                  { value: 'Active', label: 'Đang hợp tác' },
                  { value: 'Inactive', label: 'Ngừng hợp tác' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};