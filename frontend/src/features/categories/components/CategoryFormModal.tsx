import { useEffect, type FC } from 'react';
import {
  App as AntdApp,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
} from 'antd';
import { useAppDispatch } from '@/store/hooks';
import {
  addCategory,
  updateCategory,
} from '@/store/slices/categorySlice';
import {
  RECORD_STATUS,
  type Category,
  type CategoryFormValues,
} from '@/types';
import { CHART_COLORS } from '@/config/brand';
import './CategoryFormModal.css';

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Truyền vào khi sửa; bỏ trống khi thêm mới. */
  editing: Category | null;
}

const STATUS_OPTIONS = [
  { value: RECORD_STATUS.Active, label: 'Đang hoạt động' },
  { value: RECORD_STATUS.Inactive, label: 'Ngừng hoạt động' },
];

/**
 * Form thêm / sửa danh mục hàng hoá.
 *
 * Tách ra file riêng theo cùng pattern với `ProductFormModal` để trang
 * `CategoriesPage` chỉ lo layout bảng.
 */
export const CategoryFormModal: FC<CategoryFormModalProps> = ({
  open,
  onClose,
  editing,
}) => {
  const [form] = Form.useForm<CategoryFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();
  const isEditing = editing !== null;

  // Reset form mỗi khi mở modal; prefill nếu là sửa.
  useEffect(() => {
    if (!open) return;
    if (editing !== null) {
      form.setFieldsValue(editing);
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      parentId: null,
      icon: '📦',
      color: CHART_COLORS[0] ?? '#E31837',
      displayOrder: 1,
      status: RECORD_STATUS.Active,
      description: '',
    });
  }, [open, editing, form]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      if (isEditing) {
        dispatch(updateCategory({ id: editing.id, values }));
        message.success('Đã cập nhật danh mục.');
      } else {
        dispatch(addCategory(values));
        message.success('Đã thêm danh mục mới.');
      }
      onClose();
    } catch {
      // Lỗi validate đã hiển thị tại field tương ứng.
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? `Sửa danh mục ${editing?.code}` : 'Thêm danh mục'}
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm danh mục'}
      cancelText="Huỷ"
      width={560}
      onOk={handleSubmit}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form<CategoryFormValues> form={form} layout="vertical" className="category-form">
        <Form.Item
          name="name"
          label="Tên danh mục"
          rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
        >
          <Input placeholder="VD: Đồ ăn nóng" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Mô tả ngắn về nhóm hàng" />
        </Form.Item>

        <Form.Item
          name="icon"
          label="Icon (emoji)"
          tooltip="Một emoji đơn lẻ để hiển thị ở lưới sản phẩm POS."
        >
          <Input placeholder="VD: 🌭" maxLength={4} />
        </Form.Item>

        <Form.Item
          name="color"
          label="Màu đại diện"
          rules={[{ required: true, message: 'Chọn màu.' }]}
        >
          <ColorPicker
            showText
            format="hex"
            presets={[
              {
                label: 'Thương hiệu',
                colors: CHART_COLORS.slice(0, 8),
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="displayOrder"
          label="Thứ tự hiển thị"
          rules={[{ required: true, message: 'Nhập thứ tự.' }]}
        >
          <InputNumber min={1} step={1} className="category-order-input" />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: 'Chọn trạng thái.' }]}
        >
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
