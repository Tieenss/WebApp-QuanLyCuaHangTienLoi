# Đặc tả Chức năng MVP — CHÍNH THỨC

> **Dự án:** ERP Chuỗi Cửa Hàng Tiện Lợi  
> **Mô hình:** Hub & Spoke (Kho Tổng + Cửa hàng bán lẻ)  
> **Phiên bản:** FINAL (Đã cập nhật Khách hàng, Khuyến mãi & Yêu cầu nhập hàng)  
> **Trạng thái:** FINAL  

---

## A. Phạm Vi MVP

```text
ERP CHUỖI CỬA HÀNG TIỆN LỢI — MVP
│
├── 0. Đăng nhập & Phân quyền
├── 1. Tổng quan (Dashboard)
├── 2. Bán hàng (POS)
├── 3. Quản lý Khách hàng & Khuyến mãi (NEW)
├── 4. Quản lý Chi nhánh & Nhân viên
├── 5. Danh mục & Sản phẩm
├── 6. Nhà cung cấp
├── 7. Kho hàng (Tồn kho & Thẻ kho)
├── 8. Nhập kho từ NCC
├── 9. Yêu cầu nhập hàng từ chi nhánh (NEW)
├── 10. Xuất kho nội bộ (Kho Tổng → Chi nhánh)
├── 11. Kiểm kê & Cân bằng kho
├── 12. Chấm công & Bảng lương
└── 13. Sổ quỹ (Tài chính Thu/Chi)
```

### Modules ĐÃ LOẠI khỏi MVP
| Module | Lý do loại |
|:---|:---|
| Tích điểm khách hàng | Tập trung lưu thông tin cơ bản cho demo |
| Cài đặt hệ thống | Hardcode thông tin trong seed data |
| Công nợ NCC | Thanh toán sòng phẳng khi nhập hàng |

---

## B. Đặc tả Chức năng Chi Tiết

### 0. Đăng Nhập & Phân Quyền
- 5 vai trò: `ADMIN`, `KE_TOAN`, `THU_KHO`, `QUAN_LY`, `THU_NGAN`.
- Dữ liệu giới hạn theo `id_chi_nhanh` (Quản lý/Thu ngân chỉ thấy chi nhánh mình).

### 1. Tổng Quan (Dashboard)
- Doanh thu, Chi phí nhập, Chi phí lương, Tồn kho.

### 2. Bán Hàng (POS)
- **Ai dùng:** Quản lý, Thu ngân.
- **Luồng:** Quét mã vạch → Chọn Khách hàng (Tùy chọn) → Nhập mã Khuyến mãi (Tùy chọn) → Nhập tiền khách đưa → Hoàn tất.
- **Transaction:**
  1. Tạo `hoa_don` (áp dụng giảm giá nếu có)
  2. Trừ `ton_kho`
  3. Ghi `the_kho` BAN_HANG (âm)
  4. Tạo `so_quy` THU

### 3. Khách Hàng & Khuyến Mãi
- **Khách hàng:** Lưu tên, SĐT (Unique). Không tích điểm.
- **Khuyến mãi:** Tạo mã giảm giá (VD: SALE10) theo Phần trăm hoặc Tiền mặt. Áp dụng trên TỔNG hóa đơn.

### 4. Quản Lý Chi Nhánh & Nhân Viên
- CRUD chi nhánh và tài khoản nhân viên.

### 5. Danh Mục & Sản Phẩm
- CRUD sản phẩm, danh mục, cấu hình giá bán.

### 6. Nhà Cung Cấp
- Quản lý NCC cơ bản.

### 7. Kho Hàng
- Xem tồn kho và lịch sử giao dịch (thẻ kho).

### 8. Nhập Kho Từ NCC
- **Ai dùng:** Thủ kho (Nhập vào Kho Tổng).
- Transaction: Tạo `phieu_nhap` → Tồn kho tăng → Ghi `the_kho` → Tạo `so_quy` CHI (để Kế toán thanh toán sau).

### 9. Yêu Cầu Nhập Hàng
- **Ai dùng:** Thu ngân (Tạo), Quản lý CN (Duyệt).
- Thu ngân báo cáo mặt hàng sắp hết -> Quản lý duyệt -> Gửi lên Kho Tổng.

### 10. Xuất Kho Nội Bộ & Nhận Hàng
- **Ai dùng:** Thủ kho (Xuất), Quản lý (Nhận).
- **Luồng:** Thủ kho chọn phiếu yêu cầu đã duyệt → Tạo `phieu_xuat_kho` (Trạng thái CHO_NHAN). Quản lý chi nhánh đếm hàng thực tế, bấm Xác nhận nhận hàng (Trạng thái DA_NHAN).
- **Transaction khi Xác nhận nhận hàng:**
  - Kho tổng trừ tồn, Chi nhánh cộng tồn. 2 dòng thẻ kho được sinh ra.

### 11. Kiểm Kê
- Kiểm đếm thực tế, ghi nhận chênh lệch và tự động cân bằng.

### 12. Chấm Công & Bảng Lương
- Duyệt 2 tầng: Quản lý chốt giờ → Kế toán duyệt chi tiền.

### 13. Sổ Quỹ
- Admin cấp vốn bằng 1 khoản THU. Kế toán dùng vốn để duyệt CHI.

---

## C. Quy Tắc Kinh Doanh (Business Rules)

| # | Quy tắc | Xử lý hệ thống |
|:--|:---|:---|
| BR-01 | Tồn kho ≤ 0 | CHẶN thanh toán POS, CHẶN xuất kho |
| BR-02 | Khuyến mãi | Chỉ áp dụng 1 mã/hóa đơn, giảm trên tổng bill, tối đa bằng giới hạn cài đặt |
| BR-03 | Xác nhận nhận hàng | Tồn kho chi nhánh CHỈ tăng khi Quản lý bấm nhận hàng |
| BR-04 | Duyệt lương | 2 tầng, không tự duyệt cho mình |
| BR-05 | Thẻ kho | Immutable — không xóa, không sửa |
| BR-06 | Hủy hóa đơn | Không hỗ trợ trong MVP |
