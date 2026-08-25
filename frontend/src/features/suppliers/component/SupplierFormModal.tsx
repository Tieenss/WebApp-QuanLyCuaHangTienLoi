import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import type { SupplierFormValues } from '../../../types/supplierTypes';
import {
    addSupplier,
    updateSupplier,
    setModalOpen,
} from '../../../store/slices/supplierSlice';

export const SupplierFormModal: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const { isModalOpen, selectedSupplier } = useSelector(
        (state: RootState) => state.supplier
    );

    const isEditing = !!selectedSupplier;

    useEffect(() => {
        if (isModalOpen) {
            if (selectedSupplier) {
                form.setFieldsValue(selectedSupplier);
            } else {
                form.resetFields();
                form.setFieldsValue({
                    paymentTerms: 'Công nợ 30 ngày',
                    status: 'Active',
                    categories: ['Nước giải khát'],
                });
            }
        }
    }, [isModalOpen, selectedSupplier, form]);

    const handleSubmit = async () => {
        try {
            const values: SupplierFormValues = await form.validateFields();
            if (isEditing && selectedSupplier) {
                dispatch(updateSupplier({ id: selectedSupplier.id, values }));
                message.success('Cập nhật thông tin nhà cung cấp thành công!');
            } else {
                dispatch(addSupplier(values));
                message.success('Thêm mới nhà cung cấp thành công!');
            }
            dispatch(setModalOpen(false));
        } catch (err) {
            // Validation error handled by Form
        }
    };

    return (
        <Modal
            title={
                <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
          {isEditing ? `Chỉnh Sửa Nhà Cung Cấp (${selectedSupplier?.code})` : 'Thêm Nhà Cung Cấp Mới'}
        </span>
            }
            open={isModalOpen}
            onOk={handleSubmit}
            onCancel={() => dispatch(setModalOpen(false))}
            okText={isEditing ? 'Lưu Thay Đổi' : 'Thêm Nhà Cung Cấp'}
            cancelText="Hủy Bỏ"
            okButtonProps={{ style: { backgroundColor: '#E31837', borderColor: '#E31837' } }}
            width={700}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                <Row gutter={16}>
                    <Col span={14}>
                        <Form.Item
                            name="name"
                            label="Tên Nhà Cung Cấp"
                            rules={[{ required: true, message: 'Vui lòng nhập tên nhà cung cấp!' }]}
                        >
                            <Input placeholder="Ví dụ: Công Ty TNHH Pepsico Việt Nam" />
                        </Form.Item>
                    </Col>
                    <Col span={10}>
                        <Form.Item
                            name="taxCode"
                            label="Mã Số Thuế"
                            rules={[{ required: true, message: 'Vui lòng nhập mã số thuế!' }]}
                        >
                            <Input placeholder="Ví dụ: 0300845912" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="phone"
                            label="Số Điện Thoại Liên Hệ"
                            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}
                        >
                            <Input placeholder="028 3821 9999" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="email"
                            label="Email Liên Hệ"
                            rules={[
                                { required: true, message: 'Vui lòng nhập email!' },
                                { type: 'email', message: 'Email không hợp lệ!' },
                            ]}
                        >
                            <Input placeholder="contact@supplier.com.vn" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="address"
                    label="Địa Chỉ Trụ Sở / Kho Hàng"
                    rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                >
                    <Input placeholder="Địa chỉ chi tiết..." />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="categories"
                            label="Danh Mục Hàng Cung Cấp"
                            rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 danh mục!' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn danh mục"
                                options={[
                                    { value: 'Nước giải khát', label: 'Nước giải khát' },
                                    { value: 'Snack & Bánh kẹo', label: 'Snack & Bánh kẹo' },
                                    { value: 'Sữa & Chế phẩm', label: 'Sữa & Chế phẩm' },
                                    { value: 'Đồ ăn nhanh', label: 'Đồ ăn nhanh' },
                                    { value: 'Mì ăn liền', label: 'Mì ăn liền' },
                                    { value: 'Thực phẩm tươi sống', label: 'Thực phẩm tươi sống' },
                                    { value: 'Cà phê & Cacao', label: 'Cà phê & Cacao' },
                                    { value: 'Mỹ phẩm & Tiện ích', label: 'Mỹ phẩm & Tiện ích' },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item
                            name="paymentTerms"
                            label="Điều Khoản Công Nợ"
                            rules={[{ required: true }]}
                        >
                            <Select
                                options={[
                                    { value: 'Thanh toán ngay', label: 'Thanh toán ngay' },
                                    { value: 'Công nợ 15 ngày', label: 'Công nợ 15 ngày' },
                                    { value: 'Công nợ 30 ngày', label: 'Công nợ 30 ngày' },
                                    { value: 'Công nợ 45 ngày', label: 'Công nợ 45 ngày' },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="status" label="Trạng Thái" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { value: 'Active', label: 'Đang hợp tác' },
                                    { value: 'Inactive', label: 'Ngưng hợp tác' },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
};
