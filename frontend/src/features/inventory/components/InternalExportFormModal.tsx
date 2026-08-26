import React, { useEffect } from 'react';
import {
    Modal,
    Form,
    Input,
    Select,
    DatePicker,
    InputNumber,
    Button,
    Typography,
    Row,
    Col,
    message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import type {
    InternalExportType,
    InternalExportStatus,
    InternalExportItem,
} from '../../../types/internalExportTypes';
import {
    addExport,
    updateExport,
    setModalOpen,
} from '../../../store/slices/internalExportSlice';
import { WAREHOUSE_OPTIONS, PRODUCT_OPTIONS } from '../mockInternalExports';
import { formatVND } from '../../../utils/formatters';
import './InternalExportFormModal.css';

const { Text } = Typography;

const EXPORT_TYPE_OPTIONS: { value: InternalExportType; label: InternalExportType }[] = [
    { value: 'Chuyển chi nhánh', label: 'Chuyển chi nhánh' },
    { value: 'Xuất hủy', label: 'Xuất hủy' },
    { value: 'Sử dụng nội bộ', label: 'Sử dụng nội bộ' },
    { value: 'Trả nhà cung cấp', label: 'Trả nhà cung cấp' },
];

const STATUS_OPTIONS: { value: InternalExportStatus; label: InternalExportStatus }[] = [
    { value: 'Nháp', label: 'Nháp' },
    { value: 'Chờ duyệt', label: 'Chờ duyệt' },
    { value: 'Đã duyệt', label: 'Đã duyệt' },
    { value: 'Hoàn tất', label: 'Hoàn tất' },
];

const PRODUCT_SELECT_OPTIONS = PRODUCT_OPTIONS.map((p) => ({
    value: p.productId,
    label: `${p.productName} (${p.sku})`,
}));

interface ExportRowValues {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export const InternalExportFormModal: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch = useDispatch();
    const { isModalOpen, selectedExport } = useSelector(
        (state: RootState) => state.internalExport
    );

    const isEditing = !!selectedExport;

    useEffect(() => {
        if (isModalOpen) {
            if (selectedExport) {
                form.setFieldsValue({
                    ...selectedExport,
                    exportDate: dayjs(selectedExport.exportDate),
                    items: selectedExport.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    })),
                });
            } else {
                form.resetFields();
                form.setFieldsValue({
                    exportDate: dayjs(),
                    sourceWarehouse: WAREHOUSE_OPTIONS[0].value,
                    exportType: 'Chuyển chi nhánh',
                    status: 'Chờ duyệt',
                    items: [
                        {
                            productId: PRODUCT_OPTIONS[0].productId,
                            quantity: 1,
                            unitPrice: PRODUCT_OPTIONS[0].unitPrice,
                        },
                    ],
                });
            }
        }
    }, [isModalOpen, selectedExport, form]);

    const watchedItems = Form.useWatch('items', form);
    const draftTotal = (watchedItems ?? []).reduce(
        (sum: number, item?: ExportRowValues) =>
            sum + (item ? (item.quantity || 0) * (item.unitPrice || 0) : 0),
        0
    );

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payloadItems: InternalExportItem[] = values.items.map(
                (row: ExportRowValues) => {
                    const product = PRODUCT_OPTIONS.find(
                        (p) => p.productId === row.productId
                    )!;
                    return {
                        productId: product.productId,
                        productName: product.productName,
                        sku: product.sku,
                        unit: product.unit,
                        quantity: row.quantity,
                        unitPrice: row.unitPrice,
                    };
                }
            );
            const payload = {
                exportDate: values.exportDate.format('YYYY-MM-DD'),
                sourceWarehouse: values.sourceWarehouse,
                exportType: values.exportType,
                destination: values.destination,
                reason: values.reason,
                status: values.status,
                items: payloadItems,
            };

            if (isEditing && selectedExport) {
                dispatch(updateExport({ id: selectedExport.id, values: payload }));
                message.success(`Cập nhật phiếu ${selectedExport.code} thành công!`);
            } else {
                dispatch(addExport(payload));
                message.success('Tạo phiếu xuất kho mới thành công!');
            }
            dispatch(setModalOpen(false));
        } catch {
            // Validation error handled by Form
        }
    };

    return (
        <Modal
            title={
                <span className="internal-export-modal-title">
                    {isEditing
                        ? `Chỉnh Sửa Phiếu Xuất (${selectedExport?.code})`
                        : 'Tạo Phiếu Xuất Kho Nội Bộ'}
                </span>
            }
            open={isModalOpen}
            onOk={handleSubmit}
            onCancel={() => dispatch(setModalOpen(false))}
            okText={isEditing ? 'Lưu Thay Đổi' : 'Tạo Phiếu Xuất'}
            cancelText="Hủy Bỏ"
            okButtonProps={{ className: 'internal-export-ok-btn' }}
            width={760}
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="internal-export-form">
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item
                            name="exportDate"
                            label="Ngày Xuất"
                            rules={[{ required: true, message: 'Vui lòng chọn ngày xuất!' }]}
                        >
                            <DatePicker className="export-date-picker" format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                    <Col span={9}>
                        <Form.Item
                            name="sourceWarehouse"
                            label="Kho Nguồn"
                            rules={[{ required: true, message: 'Vui lòng chọn kho nguồn!' }]}
                        >
                            <Select options={WAREHOUSE_OPTIONS} placeholder="Chọn kho" />
                        </Form.Item>
                    </Col>
                    <Col span={7}>
                        <Form.Item
                            name="status"
                            label="Trạng Thái"
                            rules={[{ required: true }]}
                        >
                            <Select options={STATUS_OPTIONS} />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={10}>
                        <Form.Item
                            name="exportType"
                            label="Loại Xuất"
                            rules={[{ required: true, message: 'Vui lòng chọn loại xuất!' }]}
                        >
                            <Select options={EXPORT_TYPE_OPTIONS} />
                        </Form.Item>
                    </Col>
                    <Col span={14}>
                        <Form.Item
                            name="destination"
                            label="Nơi Nhận / Đích Đến"
                            rules={[{ required: true, message: 'Vui lòng nhập nơi nhận!' }]}
                        >
                            <Input placeholder="VD: Circle K - Quận 3 (Trần Quốc Thảo)" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="reason"
                    label="Lý Do Xuất Kho"
                >
                    <Input.TextArea
                        rows={2}
                        placeholder="VD: Bổ sung hàng bán cho ca sáng, hủy hàng hết hạn..."
                    />
                </Form.Item>

                <div className="export-items-header">
                    <Text strong>Chi Tiết Hàng Hóa Xuất</Text>
                </div>

                <Form.List
                    name="items"
                    rules={[
                        {
                            validator: async (_, items) => {
                                if (!items || items.length === 0) {
                                    return Promise.reject(
                                        new Error('Phiếu xuất phải có ít nhất 1 mặt hàng!')
                                    );
                                }
                            },
                        },
                    ]}
                >
                    {(fields, { add, remove }, { errors }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <Row gutter={8} key={key} align="top">
                                    <Col span={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'productId']}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Chọn sản phẩm!',
                                                },
                                            ]}
                                        >
                                            <Select
                                                options={PRODUCT_SELECT_OPTIONS}
                                                placeholder="Chọn sản phẩm"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={4}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'quantity']}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Nhập SL!',
                                                },
                                            ]}
                                        >
                                            <InputNumber
                                                min={1}
                                                placeholder="SL"
                                                className="export-number-input"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'unitPrice']}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Nhập đơn giá!',
                                                },
                                            ]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={1000}
                                                placeholder="Đơn giá"
                                                className="export-number-input"
                                                formatter={(value) =>
                                                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                                                }
                                                parser={(value?: string) =>
                                                    Number((value ?? '0').replace(/,/g, ''))
                                                }
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={2}>
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => remove(name)}
                                            className="export-remove-row-btn"
                                        />
                                    </Col>
                                </Row>
                            ))}
                            <Form.ErrorList errors={errors} />
                            <Button
                                type="dashed"
                                onClick={() =>
                                    add({
                                        productId: PRODUCT_OPTIONS[0].productId,
                                        quantity: 1,
                                        unitPrice: PRODUCT_OPTIONS[0].unitPrice,
                                    })
                                }
                                block
                                icon={<PlusOutlined />}
                            >
                                Thêm Mặt Hàng
                            </Button>
                        </>
                    )}
                </Form.List>

                <div className="export-total-row">
                    <Text type="secondary">Tổng giá trị phiếu xuất:</Text>
                    <Text className="export-total-value">{formatVND(draftTotal)}</Text>
                </div>
            </Form>
        </Modal>
    );
};
