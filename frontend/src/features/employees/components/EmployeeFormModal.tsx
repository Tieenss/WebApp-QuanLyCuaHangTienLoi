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
  addEmployee,
  setEmployeeModalOpen,
  updateEmployee,
} from '@/store/slices/employeeSlice';
import {
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  type EmployeeFormValues,
} from '@/types';
import './EmployeeFormModal.css';

const ROLE_OPTIONS = Object.values(USER_ROLE).map((role) => ({
  value: role,
  label: USER_ROLE_LABEL[role],
}));

const BRANCH_OPTIONS = [
  { value: 'DISTRIBUTION_CENTER', label: 'Kho tổng' },
  { value: 'br-0101', label: 'Cửa hàng 0101' },
  { value: 'br-0102', label: 'Cửa hàng 0102' },
  { value: 'br-0103', label: 'Cửa hàng 0103' },
  { value: 'br-0104', label: 'Cửa hàng 0104' },
  { value: 'br-0201', label: 'Cửa hàng 0201' },
  { value: 'br-0202', label: 'Cửa hàng 0202' },
  { value: 'br-0301', label: 'Cửa hàng 0301' },
];

export const EmployeeFormModal: FC = () => {
  const [form] = Form.useForm<EmployeeFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedEmployee } = useAppSelector(
    (state) => state.employee,
  );
  const isEditing = selectedEmployee !== null;

  useEffect(() => {
    if (!isModalOpen) return;
    if (selectedEmployee !== null) {
      form.setFieldsValue(selectedEmployee);
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      employmentType: EMPLOYMENT_TYPE.FullTime,
      defaultShift: SHIFT_CODE.Morning,
      role: USER_ROLE.Cashier,
      status: RECORD_STATUS.Active,
      hourlyWage: 0,
      baseSalary: 0,
    });
  }, [isModalOpen, selectedEmployee, form]);

  const handleSubmit = async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      if (isEditing) {
        dispatch(updateEmployee({ id: selectedEmployee.id, values }));
        message.success('Đã cập nhật thông tin nhân viên.');
      } else {
        dispatch(addEmployee(values));
        message.success('Đã thêm nhân viên mới.');
      }
      dispatch(setEmployeeModalOpen(false));
    } catch {
      // Lỗi validate đã được antd Form hiển thị tại từng field.
    }
  };

  return (
    <Modal
      open={isModalOpen}
      title={
        isEditing
          ? `Chỉnh sửa nhân viên ${selectedEmployee?.code}`
          : 'Thêm nhân viên mới'
      }
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm nhân viên'}
      cancelText="Huỷ"
      width={720}
      onOk={handleSubmit}
      onCancel={() => dispatch(setEmployeeModalOpen(false))}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="employee-form">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="fullName"
              label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên.' }]}
            >
              <Input placeholder="Họ và tên nhân viên" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="code"
              label="Mã nhân viên"
              rules={[
                { required: true, message: 'Vui lòng nhập mã nhân viên.' },
              ]}
            >
              <Input placeholder="VD: NV-0042" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="position"
              label="Chức vụ"
              rules={[{ required: true, message: 'Vui lòng nhập chức vụ.' }]}
            >
              <Input placeholder="VD: Thủ quỹ, Quản lý..." />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="role"
              label="Vai trò hệ thống"
              rules={[{ required: true, message: 'Chọn vai trò.' }]}
            >
              <Select options={ROLE_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="branchId"
              label="Chi nhánh"
              rules={[{ required: true, message: 'Chọn chi nhánh.' }]}
            >
              <Select options={BRANCH_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="employmentType"
              label="Loại hợp đồng"
              rules={[{ required: true, message: 'Chọn loại hợp đồng.' }]}
            >
              <Select
                options={Object.values(EMPLOYMENT_TYPE).map((type) => ({
                  value: type,
                  label: EMPLOYMENT_TYPE_LABEL[type],
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="defaultShift"
              label="Ca mặc định"
              rules={[{ required: true, message: 'Chọn ca mặc định.' }]}
            >
              <Select
                options={Object.values(SHIFT_CODE).map((shift) => ({
                  value: shift,
                  label: SHIFT_LABEL[shift],
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="hourlyWage"
              label="Lương giờ (đồng)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Lương giờ phải >= 0.',
                },
              ]}
            >
              <InputNumber className="employee-amount-input" min={0} step={1000} addonAfter="₫" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="baseSalary"
              label="Lương cứng (đồng/tháng)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Lương cứng phải >= 0.',
                },
              ]}
            >
              <InputNumber className="employee-amount-input" min={0} step={100000} addonAfter="₫" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Chọn trạng thái.' }]}
            >
              <Select
                options={[
                  { value: 'Active', label: 'Đang hoạt động' },
                  { value: 'Inactive', label: 'Ngừng hoạt động' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email.' },
                { type: 'email', message: 'Email không đúng định dạng.' },
              ]}
            >
              <Input placeholder="nv@example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ required: true, message: 'Vui lòng nhập số điện thoại.' }]}
            >
              <Input placeholder="09xx xxx xxx" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};