# Đặc tả Chức năng MVP — CHÍNH THỨC

> **Dự án:** ERP Chuỗi Cửa Hàng Tiện Lợi  
> **Mô hình:** Hub & Spoke (Kho Tổng + Cửa hàng bán lẻ)  
> **Phiên bản:** v2.0 — Cập nhật 24/08/2026  
> **Trạng thái:** FINAL  
> **Tham chiếu:** [`database_schema.md`](file:///d:/Documents/ERPCuaHangTienLoi/database_schema.md) · [`role_workflows.md`](file:///d:/Documents/ERPCuaHangTienLoi/role_workflows.md)

---

## A. Phạm Vi MVP

```text
ERP CHUỖI CỬA HÀNG TIỆN LỢI — MVP
│
├── 0. Đăng nhập & Phân quyền
├── 1. Tổng quan (Dashboard)
├── 2. Bán hàng (POS)
├── 3. Quản lý Chi nhánh
├── 4. Quản lý Nhân viên
├── 5. Danh mục & Sản phẩm
├── 6. Nhà cung cấp
├── 7. Kho hàng (Tồn kho & Thẻ kho)
├── 8. Nhập kho từ NCC
├── 9. Xuất kho nội bộ (Kho Tổng → Chi nhánh)
├── 10. Kiểm kê & Cân bằng kho
├── 11. Chấm công & Bảng lương
├── 12. Sổ quỹ (Tài chính Thu/Chi)
└── 13. Báo cáo
```

### Modules ĐÃ LOẠI khỏi MVP

| Module | Lý do loại |
|:---|:---|
| Khách hàng (CRM) | Không cần thiết cho vận hành chuỗi cửa hàng tiện lợi cơ bản |
| Khuyến mãi (Promotions) | Phức tạp, xếp vào phase sau |
| Cài đặt cửa hàng (Settings) | Hardcode thông tin cửa hàng trong seed data |
| Quên mật khẩu | Không cần cho đồ án |
| Đơn hàng riêng (Orders) | Hóa đơn POS (`hoa_don`) thay thế |
| Công nợ NCC | Thanh toán sòng phẳng khi nhập hàng |

---

## B. Đặc tả Chức năng Chi Tiết

### 0. Đăng Nhập & Phân Quyền
- Đăng nhập bằng `ten_dang_nhap` + `mat_khau`.
- Hệ thống trả JWT chứa `id`, `vai_tro`, `id_chi_nhanh`.
- 5 vai trò: `ADMIN`, `KE_TOAN`, `THU_KHO`, `QUAN_LY`, `THU_NGAN`.
- Middleware RBAC kiểm tra quyền trên mỗi route.
- Dữ liệu giới hạn theo `id_chi_nhanh` (Quản lý/Thu ngân chỉ thấy chi nhánh mình).
- Trang 403 Forbidden cho URL trái quyền.

### 1. Tổng Quan (Dashboard)
- **Ai xem:** Admin, Kế toán.
- **Nội dung:** Doanh thu theo chi nhánh, Chi phí nhập hàng, Chi phí lương, Tồn kho theo chi nhánh.
- Dữ liệu truy vấn từ bảng `so_quy`, `ton_kho`, `hoa_don`.

### 2. Bán Hàng (POS)
- **Ai dùng:** Quản lý, Thu ngân — CHỈ tại cửa hàng bán lẻ.
- **Ràng buộc:** Online-only, browser-based.
- **Luồng:** Quét/tìm mã vạch → Thêm giỏ hàng → Chọn hình thức thanh toán (Tiền mặt/Chuyển khoản) → Nhập tiền khách đưa → Tính tiền thối → Hoàn tất & In hóa đơn.
- **Transaction khi Hoàn tất:**
  1. Tạo `hoa_don` + `chi_tiet_hoa_don`
  2. Trừ `ton_kho` tại chi nhánh
  3. Ghi `the_kho` (BAN_HANG, số lượng âm)
  4. Tạo `so_quy` (THU, BAN_HANG)
- **Rule:** Tồn kho = 0 → CHẶN thanh toán.

### 3. Quản Lý Chi Nhánh
- **Ai dùng:** Admin.
- CRUD chi nhánh (Kho Tổng hoặc Cửa hàng bán lẻ).
- Khóa chi nhánh (`dang_hoat_dong = false`) thay vì xóa.

### 4. Quản Lý Nhân Viên
- **Ai dùng:** Admin.
- CRUD tài khoản nhân viên: tên đăng nhập, mật khẩu, họ tên, vai trò, chi nhánh, lương theo giờ, thông tin ngân hàng.
- Khóa tài khoản thay vì xóa.

### 5. Danh Mục & Sản Phẩm
- **Ai dùng:** Admin.
- CRUD danh mục (Nước uống, Bánh kẹo...).
- CRUD sản phẩm: mã vạch, tên, giá vốn, giá bán, danh mục, trạng thái.
- **Rule:** Sản phẩm có giao dịch KHÔNG ĐƯỢC XÓA, chỉ chuyển `dang_hoat_dong = false`.

### 6. Nhà Cung Cấp
- **Ai dùng:** Admin.
- CRUD: tên, SĐT, địa chỉ.
- Không quản lý công nợ.

### 7. Kho Hàng
- **Ai xem:** Admin (toàn bộ), Thủ kho (Kho Tổng), Quản lý (chi nhánh mình).
- Xem tồn kho theo chi nhánh (bảng `ton_kho`).
- Xem lịch sử thẻ kho (bảng `the_kho`).

### 8. Nhập Kho Từ NCC
- **Ai dùng:** Admin, Thủ kho.
- CHỈ nhập vào Kho Tổng.
- Tạo phiếu nhập: chọn NCC, thêm sản phẩm + số lượng + đơn giá nhập.
- **Transaction khi lưu:**
  1. Tạo `phieu_nhap` + `chi_tiet_phieu_nhap`
  2. Cộng `ton_kho` tại Kho Tổng
  3. Ghi `the_kho` (NHAP_NCC, số lượng dương)
  4. Tạo `so_quy` (CHI, NHAP_HANG)
  5. Tính lại giá vốn BQGQ trên `san_pham`

### 9. Xuất Kho Nội Bộ
- **Ai dùng:** Admin, Thủ kho.
- Xuất hàng từ Kho Tổng → Cửa hàng bán lẻ.
- **Transaction nguyên tử:**
  1. Trừ `ton_kho` tại Kho Tổng
  2. Cộng `ton_kho` tại Cửa hàng nhận
  3. Ghi `the_kho` XUAT_CHI_NHANH (âm) tại Kho Tổng
  4. Ghi `the_kho` NHAN_TU_KHO (dương) tại Cửa hàng
- **Rule:** Không xuất nếu tồn Kho Tổng không đủ.

### 10. Kiểm Kê & Cân Bằng Kho
- **Ai dùng:** Thủ kho (Kho Tổng), Quản lý (cửa hàng bán lẻ).
- Tạo phiếu kiểm kê → Nhập tồn thực tế → Ghi lý do lệch → Cân bằng kho.
- **Transaction khi cân bằng:**
  1. Cập nhật `ton_kho` = tồn thực tế
  2. Ghi `the_kho` (CAN_BANG_KIEM_KE)
  3. Chuyển trạng thái phiếu → DA_CAN_BANG

### 11. Chấm Công & Bảng Lương
- **Chấm công:** Mọi nhân viên Check-in/Check-out. Hệ thống tự tính `tong_gio`.
- **Bảng lương:** Tổng hợp giờ làm theo tháng.
- **Duyệt 2 tầng:**
  - Tầng 1 (Quản lý): Xác nhận giờ làm nhân viên chi nhánh → `DA_XAC_NHAN`
  - Tầng 2 (Kế toán): Duyệt chi lương → `DA_THANH_TOAN` + tạo `so_quy` CHI
  - **Đặc biệt:** Lương Kế toán do Admin duyệt. Lương Quản lý/Thủ kho bỏ qua tầng 1, Kế toán duyệt trực tiếp.
- **Rule:** Không tự duyệt lương cho chính mình.

### 12. Sổ Quỹ
- **Ai xem:** Admin (toàn bộ), Kế toán (toàn bộ), Quản lý (chi nhánh mình).
- Ghi nhận mọi dòng tiền THU/CHI: BAN_HANG, TRA_LUONG, NHAP_HANG, CAP_VON, KHAC.
- Admin có thể tạo phiếu THU hạng mục CAP_VON (cấp vốn).

### 13. Báo Cáo
- **Ai xem:** Admin, Kế toán.
- Dashboard tối thiểu: Doanh thu, Chi nhập hàng, Chi lương, Tồn kho theo chi nhánh.
- Dữ liệu tổng hợp từ `so_quy`, `hoa_don`, `ton_kho`.

---

## C. Quy Tắc Kinh Doanh (Business Rules)

| # | Quy tắc | Xử lý hệ thống |
|:--|:---|:---|
| BR-01 | Tồn kho ≤ 0 | CHẶN thanh toán POS, CHẶN xuất kho |
| BR-02 | Giá vốn thay đổi khi nhập hàng | Tính BQGQ tự động |
| BR-03 | Sản phẩm có giao dịch | KHÔNG cho xóa, chỉ tắt hoạt động |
| BR-04 | Duyệt lương | 2 tầng, không tự duyệt cho mình |
| BR-05 | Nhập kho NCC | CHỈ vào Kho Tổng |
| BR-06 | Xuất kho nội bộ | CHỈ từ Kho Tổng ra Chi nhánh |
| BR-07 | Thẻ kho | Immutable — không xóa, không sửa |
| BR-08 | Hủy hóa đơn | Không hỗ trợ trong MVP |

---

## D. Ma Trận Phân Quyền (5 Role)

> Tham chiếu đầy đủ: [`database_schema.md` dòng 581–601](file:///d:/Documents/ERPCuaHangTienLoi/database_schema.md#L581-L601)

| Chức năng | ADMIN | KE_TOAN | THU_KHO | QUAN_LY | THU_NGAN |
|:---|:---:|:---:|:---:|:---:|:---:|
| Quản lý Chi nhánh | ✅ | | | | |
| Quản lý Nhân viên | ✅ | | | | |
| Quản lý Danh mục & Sản phẩm | ✅ | | | | |
| Nhập hàng từ NCC | ✅ | | ✅ | | |
| Xuất kho cho Chi nhánh | ✅ | | ✅ | | |
| Kiểm kê Kho Tổng | ✅ | | ✅ | | |
| Kiểm kê Cửa hàng | ✅ | | | ✅ | |
| Bán hàng (POS) | | | | ✅ | ✅ |
| Xem Hóa đơn (chi nhánh mình) | ✅ | ✅ | | ✅ | ✅ |
| Check-in/Check-out | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xác nhận giờ làm NV (Tầng 1) | ✅ | | | ✅ | |
| Duyệt chi lương (Tầng 2) | ✅ | ✅ | | | |
| Duyệt lương cho Kế toán | ✅ | | | | |
| Xem Sổ quỹ toàn hệ thống | ✅ | ✅ | | | |
| Xem Sổ quỹ chi nhánh mình | ✅ | ✅ | | ✅ | |
| Cấp vốn | ✅ | | | | |
| Dashboard / Báo cáo | ✅ | ✅ | | | |

---

## E. Các File Tham Chiếu Chính

| File | Nội dung | Trạng thái |
|:---|:---|:---:|
| [`database_schema.md`](file:///d:/Documents/ERPCuaHangTienLoi/database_schema.md) | ERD + 18 bảng chi tiết + phân quyền | ✅ FINAL |
| [`role_workflows.md`](file:///d:/Documents/ERPCuaHangTienLoi/role_workflows.md) | Luồng nghiệp vụ 5 vai trò | ✅ FINAL |
| [`technical_architecture.md`](file:///d:/Documents/ERPCuaHangTienLoi/technical_architecture.md) | Tech stack + API + quyết định thiết kế | ✅ FINAL |
| [`jira_scrum_board.md`](file:///d:/Documents/ERPCuaHangTienLoi/jira_scrum_board.md) | Kế hoạch 3 Sprint triển khai | ✅ FINAL |
| [`design_system phase2.md`](file:///d:/Documents/ERPCuaHangTienLoi/design_system%20phase2.md) | Design System (tham khảo khi code UI) | 📎 Tham khảo |
| [`ux_architecture.md`](file:///d:/Documents/ERPCuaHangTienLoi/ux_architecture.md) | UX patterns (tham khảo) | 📎 Tham khảo |
| [`figma_app_shell_brief.md`](file:///d:/Documents/ERPCuaHangTienLoi/figma_app_shell_brief.md) | Figma brief (tham khảo) | 📎 Tham khảo |
