# Jira Scrum Board — ERP Cửa Hàng Tiện Lợi

> **Project Key:** `ERP`  
> **Tổng thời gian:** 3 Sprint × 7 ngày = 21 ngày (24/08/2026 – 13/09/2026)  
> **Team:** 1 BA · 1 Tech Lead · 2 Backend (BE) · 2 Frontend (FE) · 1 Tester  
> **Phiên bản:** FINAL (Chi tiết, phân quyền rõ ràng, bao quát 8 bước luồng Demo, Đã bổ sung Deadline)  

---

## SPRINT 1 — Nền Tảng, Khách Hàng, Khuyến Mãi & Kho Hàng
**Thời gian:** 24/08 – 30/08  
**Sprint Goal:** Khởi tạo dự án, đăng nhập, CRUD master data, có dữ liệu khách hàng/khuyến mãi, và chạy được bước 1, 2, 3 trong luồng Demo (Cấp vốn -> Nhập hàng -> Kế toán trả tiền).

### ERP-S1-01: Khởi tạo Project & Database
**Type:** Task | **Assignee:** Tech Lead | **Priority:** 🔴 Highest | **Deadline:** 25/08  
**Chi tiết:** 
- Khởi tạo React Vite (FE), Spring Boot (BE), Neon PostgreSQL (DB).
- Tạo Entity cho 22 bảng (bao gồm Khách hàng, Khuyến mãi, Yêu cầu nhập hàng).
- Viết DataSeeder tự động tạo 1 Kho Tổng, 2 Chi nhánh, 5 loại tài khoản, danh mục, sản phẩm, và Nhà cung cấp.

### ERP-S1-02: Đăng nhập & Phân quyền (RBAC)
**Type:** Story | **Assignee:** BE 1, FE 1 | **Priority:** 🔴 Highest | **Deadline:** 26/08  
**Chi tiết:**
- **BE:** Viết API Login, trả về JWT. Viết Middleware chặn quyền truy cập trái phép. Lọc dữ liệu theo `id_chi_nhanh` của nhân viên.
- **FE:** Code trang Login. Code App Shell (Sidebar/Header) tự động ẩn hiện menu tùy theo 5 Role (Admin, Kế toán, Quản lý, Thu ngân, Thủ kho).

### ERP-S1-03: Quản lý Danh mục, Sản phẩm, Chi nhánh, Nhân viên, NCC
**Type:** Story | **Assignee:** BE 2, FE 2 | **Priority:** High | **Deadline:** 28/08  
**Chi tiết:**
- **BE + FE:** Các API và Giao diện CRUD (Thêm, Sửa, Đọc, Khóa) cho các bảng master data thiết yếu.
- Giao diện bắt buộc phải có cho Admin thao tác tạo mới và cấu hình hệ thống.

### ERP-S1-04: Quản lý Khách Hàng & Khuyến Mãi (NEW)
**Type:** Story | **Assignee:** BE 1, FE 1 | **Priority:** High | **Deadline:** 28/08  
**Chi tiết:**
- **BE + FE (Khách hàng):** Admin/Quản lý tạo và quản lý thông tin Khách Hàng (Tên, SĐT).
- **BE + FE (Khuyến mãi):** Admin/Quản lý tạo Mã giảm giá (Ví dụ: `GIAM10`), loại giảm (Theo % hoặc theo VND), mức giảm tối đa, hóa đơn tối thiểu, thời hạn.

### ERP-S1-05: Cấp vốn & Nhập kho từ Nhà Cung Cấp
**Type:** Story | **Assignee:** BE 2, FE 2 | **Priority:** 🔴 Critical Path | **Deadline:** 29/08  
**Chi tiết:**
- **Admin:** Giao diện thêm Phiếu Thu 1 Tỷ VND vào Sổ quỹ để làm vốn lưu động.
- **Thủ kho:** Giao diện lập Phiếu nhập hàng từ NCC (Tồn Kho Tổng tự động tăng).
- **Kế toán:** Giao diện duyệt chi thanh toán tiền cho NCC dựa trên phiếu nhập hàng (Tiền trong Sổ quỹ giảm xuống).

### ERP-S1-06: Test Sprint 1
**Type:** Task | **Assignee:** Tester | **Priority:** High | **Deadline:** 30/08  
**Chi tiết:**
- Viết Test case và test: Đăng nhập có chặn đúng quyền? Nhập hàng Tồn Kho Tổng có tăng đúng không? Kế toán chi tiền có bị trừ Sổ quỹ không?

---

## SPRINT 2 — Yêu Cầu Nhập Hàng, Xuất Kho & Nhận Hàng
**Thời gian:** 31/08 – 06/09  
**Sprint Goal:** Hoàn thành các bước luân chuyển nội bộ từ dưới lên trên và từ trên xuống dưới (Bước 4, 5, 6, 7 trong Demo).

### ERP-S2-01: Thu ngân lập Yêu cầu nhập hàng
**Type:** Story | **Assignee:** BE 1, FE 1 | **Priority:** 🔴 Critical Path | **Deadline:** 01/09  
**Chi tiết:**
- **Thu ngân:** Giao diện xem danh sách hàng sắp hết, chọn sản phẩm, điền số lượng cần nhập, và bấm "Gửi Yêu Cầu" (Trạng thái `CHO_DUYET`).

### ERP-S2-02: Quản lý duyệt Yêu cầu nhập hàng
**Type:** Story | **Assignee:** BE 1, FE 1 | **Priority:** High | **Deadline:** 02/09  
**Chi tiết:**
- **Quản lý CN:** Giao diện xem danh sách các Yêu cầu từ Thu ngân trong chi nhánh. Bấm "Duyệt" để phiếu tự động đẩy lên Thủ kho (Trạng thái `DA_DUYET`).

### ERP-S2-03: Thủ kho xuất hàng xuống chi nhánh
**Type:** Story | **Assignee:** BE 2, FE 2 | **Priority:** 🔴 Critical Path | **Deadline:** 03/09  
**Chi tiết:**
- **Thủ kho:** Xem các Yêu cầu đang chờ ở kho tổng. Tạo Phiếu Xuất Kho chuyển hàng xuống cửa hàng tương ứng. Trạng thái phiếu xuất là `CHO_NHAN`. Tồn kho tổng tạm thời bị trừ đi, nhưng tồn chi nhánh chưa được cộng.

### ERP-S2-04: Quản lý xác nhận nhận hàng (Giao dịch nguyên tử)
**Type:** Story | **Assignee:** BE 2, FE 2 | **Priority:** 🔴 Critical Path | **Deadline:** 04/09  
**Chi tiết:**
- **Quản lý CN:** Khi xe chở hàng tới cửa hàng, Quản lý vào mục Phiếu Xuất Kho Đang Chờ, kiểm đếm thực tế và bấm nút "Xác nhận nhận hàng".
- **BE (Transaction):** Hệ thống chính thức Cộng Tồn Chi nhánh, sinh 2 dòng Thẻ kho để lưu lịch sử chuyển/nhận hàng. Trạng thái Phiếu cập nhật thành `DA_NHAN`.

### ERP-S2-05: Kiểm kê & Cân bằng kho
**Type:** Story | **Assignee:** BE 1, FE 1 | **Priority:** Medium | **Deadline:** 05/09  
**Chi tiết:**
- **Quản lý CN / Thủ kho:** Tạo phiếu kiểm đếm, nhập số lượng hàng đếm được bằng tay.
- Hệ thống tự tính chênh lệch, cân bằng lại tồn kho thực tế, sinh dòng Thẻ kho cân bằng.

### ERP-S2-06: Test Sprint 2 (Luồng cung ứng nội bộ)
**Type:** Task | **Assignee:** Tester | **Priority:** High | **Deadline:** 06/09  
**Chi tiết:**
- Chạy liên hoàn: Thu Ngân yêu cầu -> Quản lý duyệt -> Thủ kho xuất -> Quản lý bấm nhận. Xác minh Tồn kho tăng/giảm chính xác.

---

## SPRINT 3 — POS Bán Hàng, Bảng Lương & Hoàn Thiện Demo
**Thời gian:** 07/09 – 13/09  
**Sprint Goal:** Hoàn thiện khâu bán hàng cuối cùng (Bước 8) và chốt số liệu báo cáo, tổng kết Demo.

### ERP-S3-01: Giao diện POS Bán Hàng (Tích hợp CRM & Khuyến mãi)
**Type:** Story | **Assignee:** FE 1, FE 2 | **Priority:** 🔴 Critical Path | **Deadline:** 09/09  
**Chi tiết:**
- **Thu ngân:** Giao diện quét/tìm mã vạch sản phẩm, giỏ hàng, nhập tiền khách đưa, tính tiền thối (POS).
- **Thu ngân:** Nút bấm cho phép Chọn Khách hàng (hiện Modal danh sách khách hàng).
- **Thu ngân:** Ô nhập Mã Khuyến Mãi. Hệ thống Validate mã và tự động trừ Tiền Giảm Giá vào Tổng tiền thanh toán.

### ERP-S3-02: Xử lý giao dịch POS (Backend)
**Type:** Story | **Assignee:** BE 1, BE 2 | **Priority:** 🔴 Critical Path | **Deadline:** 09/09  
**Chi tiết:**
- **BE (Transaction):** Khi Thu ngân bấm Thanh toán, thực hiện đồng thời: Tạo Hóa đơn (có lưu `id_khach_hang` và `id_khuyen_mai`), Trừ tồn kho cửa hàng, Ghi thẻ kho loại Xuất Bán Hàng, Tạo phiếu THU trong Sổ quỹ làm tăng doanh thu.

### ERP-S3-03: Chấm công & Bảng Lương
**Type:** Story | **Assignee:** BE 1, FE 1 | **Priority:** Medium | **Deadline:** 10/09  
**Chi tiết:**
- **Mọi nhân viên:** Giao diện Check-in, Check-out để tính giờ làm.
- **Quản lý CN:** Xác nhận giờ làm nhân viên (Duyệt tầng 1).
- **Kế toán:** Bấm chi lương (Duyệt tầng 2) -> Sinh ra các phiếu CHI trả lương trong Sổ quỹ, tiền Sổ quỹ tiếp tục bị trừ đi.

### ERP-S3-04: Báo cáo Dashboard
**Type:** Story | **Assignee:** BE 2, FE 2 | **Priority:** Medium | **Deadline:** 11/09  
**Chi tiết:**
- **Admin/Kế toán:** Trang Dashboard hiển thị 4 biểu đồ/card tóm tắt: Tổng Doanh Thu (từ POS), Tổng Chi Nhập Hàng, Tổng Chi Lương, và Tổng Tồn Kho hiện tại.

### ERP-S3-05: Chạy Test End-To-End (Rehearsal)
**Type:** Task | **Assignee:** Tester, BA, Tech Lead | **Priority:** 🔴 Highest | **Deadline:** 13/09  
**Chi tiết:**
- Test 100% kịch bản 8 bước: Cấp vốn -> Nhập hàng -> Kế toán trả tiền -> Yêu cầu hàng -> Duyệt -> Xuất -> Nhận hàng -> Bán POS.
- Fix gấp mọi lỗi block Demo (P0, P1) chuẩn bị bảo vệ.
