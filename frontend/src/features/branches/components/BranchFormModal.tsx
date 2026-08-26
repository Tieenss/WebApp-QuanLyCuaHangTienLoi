import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Typography, message } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import type { BranchFormValues } from '../../../types/branchTypes';
import {
    addBranch,
    updateBranch,
    setModalOpen,
} from '../../../store/slices/branchSlice';
import './BranchFormModal.css';

const { Text } = Typography;

const STATUS_OPTIONS = [
    { value: 'Active', label: 'Đang hoạt động' },
    { value: 'Inactive', label: 'Tạm đóng' },
];

export const BranchFormModal: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const { isModalOpen, selectedBranch } = useSelector((state: RootState) => state.branch);

    const isEditing = !!selectedBranch;

    useEffect(() => {
        if (isModalOpen) {
            if (selectedBranch) {
                form.setFieldsValue(selectedBranch);
            } else {
                form.resetFields();
                form.setFieldsValue({ status: 'Active', staffCount: 8 });
            }
        }
    }, [isModalOpen, selectedBranch, form]);

    const handleSubmit = async () => {
        try {
            const values: BranchFormValues = await form.validateFields();
            if (isEditing && selectedBranch) {
                dispatch(updateBranch({ id: selectedBranch.id, values }));
                message.success(`Cập nhật chi nhánh ${selectedBranch.id} thành công!`);
            } else {
                dispatch(addBranch(values));
                message.success('Thêm chi nhánh mới thành công!');
            }
            dispatch(setModalOpen(false));
        } catch {
            // Validation error handled by Form
        }
    };

    return (
        <Modal
            title={
                <span className="branch-modal-title">
                    {isEditing
                        ? `Chỉnh Sửa Chi Nhánh (${selectedBranch?.id})`
                        : 'Thêm Chi Nhánh Mới'}
                </span>
            }
            open={isModalOpen}
            onOk={handleSubmit}
            onCancel={() => dispatch(setModalOpen(false))}
            okText={isEditing ? 'Lưu Thay Đổi' : 'Thêm Chi Nhánh'}
            cancelText="Hủy Bỏ"
            okButtonProps={{ className: 'branch-ok-btn' }}
            width={640}
            destroyOnClose
        >
            <Text type="secondary" className="branch-modal-hint">
                Mã chi nhánh được hệ thống tự sinh theo định dạng CK-XXXX.
            </Text>

            <Form form={form} layout="vertical" className="branch-form">
                <Form.Item
                    name="name"
                    label="Tên Chi Nhánh"
                    rules={[{ required: true, message: 'Vui lòng nhập tên chi nhánh!' }]}
                >
                    <Input placeholder="VD: Circle K - Quận 1 (Bùi Viện)" />
                </Form.Item>

                <Form.Item
                    name="address"
                    label="Địa Chỉ"
                    rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                >
                    <Input placeholder="Số nhà, tên đường..." />
                </Form.Item>

                <Form.Item
                    name="district"
                    label="Quận / Huyện, Thành Phố"
                    rules={[{ required: true, message: 'Vui lòng nhập quận/huyện!' }]}
                >
                    <Input placeholder="VD: Quận 1, TP.HCM" />
                </Form.Item>

                <Form.Item
                    name="phone"
                    label="Số Điện Thoại"
                    rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
                >
                    <Input placeholder="028 3836 8886" />
                </Form.Item>

                <Form.Item
                    name="managerName"
                    label="Quản Lý Chi Nhánh"
                    rules={[{ required: true, message: 'Vui lòng nhập tên quản lý!' }]}
                >
                    <Input placeholder="VD: Trần Văn Anh" />
                </Form.Item>

                <div className="branch-form-bottom-row">
                    <Form.Item
                        name="staffCount"
                        label="Số Nhân Sự"
                        rules={[{ required: true, message: 'Nhập số nhân sự!' }]}
                        className="branch-staff-item"
                    >
                        <InputNumber min={1} max={200} className="branch-number-input" />
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="Trạng Thái"
                        rules={[{ required: true }]}
                        className="branch-status-item"
                    >
                        <Select options={STATUS_OPTIONS} />
                    </Form.Item>
                </div>
            </Form>
        </Modal>
    );
};
