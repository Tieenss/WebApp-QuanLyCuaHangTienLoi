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
  createEmployee,
  fetchEmployees,
  setEmployeeModalOpen,
  updateEmployeeThunk,
} from '@/store/slices/employeeSlice';
import { fetchBranches } from '@/store/slices/branchSlice';
import {
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABEL,
  RECORD_STATUS,
  SHIFT_CODE,
  SHIFT_LABEL,
  USER_ROLE,
  USER_ROLE_LABEL,
  BRANCH_KIND,
  type EmployeeFormValues,
} from '@/types';
import './EmployeeFormModal.css';

const ROLE_OPTIONS = Object.values(USER_ROLE).map((role) => ({
  value: role,
  label: USER_ROLE_LABEL[role],
}));

export const EmployeeFormModal: FC = () => {
  const [form] = Form.useForm<EmployeeFormValues>();
  const dispatch = useAppDispatch();
  const { message } = AntdApp.useApp();

  const { isModalOpen, selectedEmployee } = useAppSelector(
    (state) => state.employee,
  );
  const branches = useAppSelector((state) => state.branch.branches);
  const isEditing = selectedEmployee !== null;

  // Lọc chi nhánh theo vai trò: THU_KHO chỉ được chọn Kho tổng
  const filterBranchesByRole = (role: string) => {
    if (role === 'THU_KHO') {
      return branches.filter((b) => b.kind === BRANCH_KIND.DistributionCenter);
    }
    return branches.filter((b) => b.kind === BRANCH_KIND.Store);
  };

  useEffect(() => {
    if (branches.length === 0) {
      dispatch(fetchBranches());
    }
  }, [branches.length, dispatch]);

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
      // Nếu vai trò là ADMIN/KE_TOAN → KHÔNG gửi branchId (DB constraint)
      if (values.role === 'ADMIN' || values.role === 'KE_TOAN') {
        values.branchId = '';
      }
      if (isEditing && selectedEmployee) {
        await dispatch(updateEmployeeThunk({ id: selectedEmployee.id, values })).unwrap();
        message.success('Đã cập nhật thông tin nhân viên.');
      } else {
        await dispatch(createEmployee(values)).unwrap();
        message.success('Đã thêm nhân viên mới.');
      }
      // Reload danh sách để cập nhật branchName từ Redux
      dispatch(fetchEmployees());
      dispatch(setEmployeeModalOpen(false));
    } catch (error: any) {
      message.error(error?.message || 'Có lỗi xảy ra');
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
              noStyle
              shouldUpdate={(prev, curr) => prev.role !== curr.role}
            >
              {({ getFieldValue }) => {
                const role = getFieldValue('role');
                const requiresBranch = !['ADMIN', 'KE_TOAN'].includes(role);
                const filteredBranches = requiresBranch ? filterBranchesByRole(role) : [];
                return (
                  <Form.Item
                    name="branchId"
                    label={`Chi nhánh${requiresBranch ? (role === 'THU_KHO' ? ' (Thủ kho chỉ được gán Kho tổng)' : '') : ' (không bắt buộc với Admin/Kế toán)'}`}
                    rules={
                      requiresBranch
                        ? [{ required: true, message: 'Chọn chi nhánh.' }]
                        : []
                    }
                  >
                    <Select
                      options={filteredBranches.map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` }))}
                      allowClear
                      disabled={!requiresBranch}
                      placeholder={
                        requiresBranch
                          ? role === 'THU_KHO'
                            ? 'Chọn Kho tổng'
                            : 'Chọn chi nhánh'
                          : 'Không cần chọn'
                      }
                    />
                  </Form.Item>
                );
              }}
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