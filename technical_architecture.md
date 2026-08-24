# Thiết kế Kiến trúc Kỹ thuật — CHÍNH THỨC

> **Dự án:** ERP Chuỗi Cửa Hàng Tiện Lợi  
> **Mô hình:** Hub & Spoke (Kho Tổng + Cửa hàng bán lẻ)  
> **Phiên bản:** v2.0 — Cập nhật 24/08/2026  
> **Trạng thái:** FINAL  

---

## 1. Công Nghệ (Tech Stack)

*   **Frontend (Ứng dụng Web):**
    *   **Core:** React.js (khởi tạo qua Vite).
    *   **Ngôn ngữ:** TypeScript.
    *   **Styling:** Vanilla CSS (Module/Variables) — không dùng TailwindCSS.
    *   **State Management:** Zustand (Giỏ hàng POS, Phiên đăng nhập, Chi nhánh hiện tại).
    *   **Routing:** React Router v6.
*   **Backend (API Server):**
    *   **Framework:** Node.js với Express.js.
    *   **Ngôn ngữ:** TypeScript.
    *   **ORM:** Prisma (Giao tiếp với Database, migration, seed data).
*   **Database:**
    *   **Cơ sở dữ liệu:** PostgreSQL — đảm bảo ACID cho giao dịch tài chính và kho hàng.
*   **Authentication:**
    *   JWT (Access Token + Refresh Token).
    *   Mật khẩu hash bằng bcrypt.
    *   Middleware RBAC kiểm tra `vai_tro` trên mỗi request.
*   **Deployment (Dự kiến):**
    *   Frontend: Vercel / Netlify.
    *   Backend + Database: Render / Railway.
    *   Môi trường phát triển: Local (`npm run dev` + PostgreSQL local).

---

## 2. Thiết kế Cơ Sở Dữ Liệu

> [!IMPORTANT]
> **Nguồn chính thức duy nhất:** [`database_schema.md`](file:///d:/Documents/ERPCuaHangTienLoi/database_schema.md)  
> Tổng cộng **18 bảng**, chia thành 9 khối nghiệp vụ. Mọi thay đổi schema phải cập nhật tại file đó.

### Tổng quan 9 khối

| Khối | Bảng | Mô tả |
|:---|:---|:---|
| Trung tâm | `chi_nhanh` | Kho Tổng + Cửa hàng bán lẻ |
| Nhân sự & Lương | `nhan_vien`, `cham_cong`, `bang_luong` | 5 role, chấm công, duyệt lương 2 tầng |
| Hàng hóa | `danh_muc`, `san_pham` | Master data sản phẩm |
| Kho hàng | `ton_kho`, `the_kho` | Tồn kho theo chi nhánh, sổ cái kho |
| Kiểm kê | `phieu_kiem_ke`, `chi_tiet_kiem_ke` | Kiểm kê định kỳ, cân bằng kho |
| Bán hàng (POS) | `hoa_don`, `chi_tiet_hoa_don` | Hóa đơn bán lẻ tại chi nhánh |
| Mua hàng & Nhập kho | `nha_cung_cap`, `phieu_nhap`, `chi_tiet_phieu_nhap` | Nhập hàng từ NCC vào Kho Tổng |
| Luân chuyển nội bộ | `phieu_xuat_kho`, `chi_tiet_phieu_xuat` | Xuất hàng Kho Tổng → Chi nhánh |
| Tài chính | `so_quy` | Sổ quỹ Thu/Chi toàn hệ thống |

---

## 3. Quyết Định Thiết Kế Quan Trọng

### 3.1 Tồn kho theo Chi nhánh
- Bảng `ton_kho` dùng composite PK (`id_san_pham`, `id_chi_nhanh`) — mỗi sản phẩm có tồn riêng tại mỗi chi nhánh (bao gồm Kho Tổng).
- Bảng `the_kho` là sổ cái immutable, ghi nhận MỌI biến động. Không bao giờ xóa.

### 3.2 Giá vốn
- `san_pham.gia_von` lưu giá vốn trung bình (Bình quân gia quyền - BQGQ).
- Công thức: `Giá vốn mới = (Tồn cũ × Giá cũ + Nhập mới × Giá mới) / (Tồn cũ + Nhập mới)`.

### 3.3 Phân quyền & Giới hạn dữ liệu
- 5 vai trò: `ADMIN`, `KE_TOAN`, `THU_KHO`, `QUAN_LY`, `THU_NGAN`.
- Vai trò lưu trực tiếp trong trường `nhan_vien.vai_tro` (không cần bảng `vai_tro` riêng).
- Dữ liệu giới hạn theo `id_chi_nhanh` của nhân viên. Quản lý/Thu ngân chỉ thấy dữ liệu chi nhánh mình.

### 3.4 Transaction nguyên tử
Các thao tác sau BẮT BUỘC chạy trong 1 database transaction:
- **Bán hàng:** Tạo hóa đơn + Trừ tồn kho + Ghi thẻ kho + Tạo sổ quỹ THU.
- **Nhập kho NCC:** Tạo phiếu nhập + Cộng tồn kho Kho Tổng + Ghi thẻ kho + Tạo sổ quỹ CHI.
- **Xuất kho nội bộ:** Trừ tồn Kho Tổng + Cộng tồn Chi nhánh + Ghi 2 dòng thẻ kho.
- **Cân bằng kiểm kê:** Cập nhật tồn kho + Ghi thẻ kho.
- **Duyệt chi lương:** Chuyển trạng thái bảng lương + Tạo sổ quỹ CHI.

### 3.5 Ràng buộc nghiệp vụ
- **Không tồn âm:** Mọi thao tác trừ tồn phải kiểm tra `so_luong_ton >= so_luong_xuat`.
- **Không tự duyệt lương:** `id_nguoi_duyet_chi` ≠ `id_nhan_vien` trên bảng lương.
- **Sản phẩm có giao dịch không được xóa:** Chỉ chuyển `dang_hoat_dong = false`.

---

## 4. Kiến Trúc API (Dự Kiến)

```
/api/auth          — Login, Logout, Refresh Token
/api/chi-nhanh     — CRUD chi nhánh (Admin only)
/api/nhan-vien     — CRUD nhân viên (Admin only)
/api/danh-muc      — CRUD danh mục (Admin only)
/api/san-pham      — CRUD sản phẩm (Admin only)
/api/nha-cung-cap  — CRUD nhà cung cấp (Admin only)
/api/ton-kho       — Xem tồn kho (theo chi nhánh)
/api/the-kho       — Xem lịch sử thẻ kho
/api/phieu-nhap    — Nhập kho từ NCC (Admin, Thủ kho)
/api/phieu-xuat    — Xuất kho nội bộ (Admin, Thủ kho)
/api/kiem-ke       — Kiểm kê kho (Thủ kho, Quản lý)
/api/hoa-don       — POS bán hàng (Quản lý, Thu ngân)
/api/cham-cong     — Check-in/out (Tất cả)
/api/bang-luong    — Bảng lương & duyệt (Quản lý, Kế toán, Admin)
/api/so-quy        — Sổ quỹ (Admin, Kế toán)
/api/dashboard     — Dữ liệu tổng quan (Admin, Kế toán)
```

---

## ⚠️ Lưu Ý

> Các file thiết kế cũ (`functional_specification v1.0.md`, `ux_architecture.md`, `design_system phase2.md`, `figma_app_shell_brief.md`) thuộc phase thiết kế ban đầu cho mô hình **đơn cửa hàng** với các module Khách hàng, Khuyến mãi, Cài đặt. Những module đó **đã bị loại khỏi MVP** khi chuyển sang mô hình **chuỗi cửa hàng Hub & Spoke**.
> 
> **Nguồn chính thức cho MVP hiện tại:**
> - Database: [`database_schema.md`](file:///d:/Documents/ERPCuaHangTienLoi/database_schema.md)
> - Luồng nghiệp vụ: [`role_workflows.md`](file:///d:/Documents/ERPCuaHangTienLoi/role_workflows.md)
> - Kế hoạch triển khai: [`jira_scrum_board.md`](file:///d:/Documents/ERPCuaHangTienLoi/jira_scrum_board.md)
