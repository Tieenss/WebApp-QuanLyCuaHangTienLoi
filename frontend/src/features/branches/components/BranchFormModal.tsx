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
  addBranch,
  setBranchModalOpen,
  updateBranch,
} from '@/store/slices/branchSlice';
import {
  BRANCH_KIND,
  BRANCH_KIND_LABEL,
  REGION,
  REGION_LABEL,
  RECORD_STATUS,
  type BranchFormValues,
} from '@/types';
import './BranchFormModal.css';

const KIND_OPTIONS = Object.values(BRANCH_KIND).map((kind) => ({
  value: kind,
  label: BRANCH_KIND_LABEL[kind],
}));

const REGION_OPTIONS = Object.values(REGION).map((region) => ({
  value: region,
  label: REGION_LABEL[region],
}));

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Đang hoạt động' },
  { value: 'Inactive', label: 'Ngừng hoạt động' },
];

export const BranchFormModal: FC = () => {
  const [form] = Form.useForm<BranchFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedBranch } = useAppSelector(
    (state) => state.branch,
  );
  const isEditing = selectedBranch !== null;

  useEffect(() => {
    if (!isModalOpen) return;
    if (selectedBranch !== null) {
      form.setFieldsValue(selectedBranch);
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      kind: BRANCH_KIND.Store,
      status: RECORD_STATUS.Active,
      region: REGION.South,
    });
  }, [isModalOpen, selectedBranch, form]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      if (isEditing) {
        dispatch(updateBranch({ id: selectedBranch.id, values }));
        message.success('Đã cập nhật thông tin chi nhánh.');
      } else {
        dispatch(addBranch(values));
        message.success('Đã thêm chi nhánh mới.');
      }
      dispatch(setBranchModalOpen(false));
    } catch {
      // Lỗi validate đã được antd Form hiển thị tại từng field.
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa chi nhánh ${selectedBranch?.code}`
          : 'Thêm chi nhánh mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm chi nhánh'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setBranchModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="branch-form">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label="Mã chi nhánh"
              rules={[{ required: true, message: 'Vui lòng nhập mã chi nhánh.' }]}
            >
              <Input placeholder="VD: CK-0101" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Tên điểm bán"
              rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
            >
              <Input placeholder="Tên chi nhánh" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="kind"
              label="Loại điểm"
              rules={[{ required: true, message: 'Chọn loại điểm.' }]}
            >
              <Select options={KIND_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="region"
              label="Vùng miền"
              rules={[{ required: true, message: 'Chọn vùng miền.' }]}
            >
              <Select options={REGION_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="province"
              label="Tỉnh/Thành"
              rules={[{ required: true, message: 'Vui lòng nhập tỉnh/thành.' }]}
            >
              <Input placeholder="Tỉnh/Thành" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="district"
              label="Quận/Huyện"
              rules={[{ required: true, message: 'Vui lòng nhập quận/huyện.' }]}
            >
              <Input placeholder="Quận/Huyện" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="addressLine"
          label="Địa chỉ"
          rules={[{ required: true, message: 'Vui lòng nhập địa chỉ.' }]}
        >
          <Input placeholder="Số nhà, đường, phường/xã" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Điện thoại"
              rules={[{ required: true, message: 'Vui lòng nhập điện thoại.' }]}
            >
              <Input placeholder="028 xxxx xxxx" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="managerName"
              label="Quản lý"
              rules={[{ required: true, message: 'Vui lòng nhập tên quản lý.' }]}
            >
              <Input placeholder="Tên quản lý" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="openingHours"
              label="Giờ mở cửa"
              rules={[{ required: true, message: 'Vui lòng nhập giờ mở cửa.' }]}
            >
              <Input placeholder='VD: "24/7" hoặc "06:00 - 22:00"' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="areaSqm"
              label="Diện tích (m²)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Diện tích phải >= 0.',
                },
              ]}
            >
              <InputNumber className="branch-amount-input" min={0} step={10} addonAfter="m²" />
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