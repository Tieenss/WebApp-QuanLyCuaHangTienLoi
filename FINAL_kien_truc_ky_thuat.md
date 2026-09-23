# Thiết kế Kiến trúc Kỹ thuật — CHÍNH THỨC

> **Dự án:** ERP Chuỗi Cửa Hàng Tiện Lợi  
> **Mô hình:** Hub & Spoke (Kho Tổng + Cửa hàng bán lẻ)  
> **Phiên bản:** FINAL (Bao gồm hệ thống CRM & Yêu cầu nhập hàng)  

---

## 1. Công Nghệ (Tech Stack)

*   **Frontend (Ứng dụng Web):**
    *   **Core:** React.js (khởi tạo qua Vite).
    *   **Ngôn ngữ:** TypeScript.
    *   **UI/Styling:** **Ant Design (antd)** kết hợp với CSS/SCSS.
    *   **State Management:** Redux Toolkit.
    *   **Routing:** React Router v6.
*   **Backend (API Server):**
    *   **Framework:** Spring Boot 3.3.1 (Java 21).
    *   **ORM:** Spring Data JPA / Hibernate.
*   **Database:**
    *   **Cơ sở dữ liệu:** Neon PostgreSQL.
*   **IDE & Quản lý Mã Nguồn:**
    *   **Môi trường:** IntelliJ IDEA (BE), WebStorm / VS Code (FE).
    *   **Cấu trúc Repo:** Monorepo.

---

## 2. Thiết kế Cơ Sở Dữ Liệu

> [!IMPORTANT]
> **Nguồn chính thức duy nhất:** [`FINAL_co_so_du_lieu.md`](file:///d:/Documents/Nam4/WebApp-QuanLyCuaHangTienLoi/FINAL_co_so_du_lieu.md)  
> Tổng cộng **22 bảng**, chia thành 10 khối nghiệp vụ.

### Tổng quan 10 khối
| Khối | Mô tả |
|:---|:---|
| Trung tâm | Quản lý chi nhánh |
| Nhân sự & Lương | Quản lý nhân viên, chấm công, duyệt lương |
| Hàng hóa | Danh mục, Sản phẩm |
| Kho hàng | Tồn kho, Thẻ kho |
| Kiểm kê | Phiếu kiểm kê, chi tiết |
| Bán hàng & CRM | Khách hàng, Khuyến mãi, Hóa đơn |
| Mua hàng & Nhập kho | Nhà cung cấp, Phiếu nhập NCC |
| Luân chuyển nội bộ | Phiếu yêu cầu nhập hàng, Phiếu xuất kho |
| Tài chính | Sổ quỹ Thu/Chi |

---

## 3. Quyết Định Thiết Kế Quan Trọng

### 3.1 Giao dịch nguyên tử (Atomic Transactions)
Các thao tác sau BẮT BUỘC chạy trong 1 database transaction (sử dụng `@Transactional`):
- **Bán hàng:** Tạo hóa đơn (áp dụng khuyến mãi) + Trừ tồn kho + Ghi thẻ kho + Tạo sổ quỹ THU.
- **Nhập kho NCC:** Tạo phiếu nhập + Cộng tồn kho Kho Tổng + Ghi thẻ kho + Tạo sổ quỹ CHI.
- **Xác nhận nhận hàng:** Trừ tồn Kho Tổng + Cộng tồn Chi nhánh + Ghi 2 dòng thẻ kho.
- **Duyệt chi lương:** Chuyển trạng thái bảng lương + Tạo sổ quỹ CHI.

### 3.2 Luồng Yêu cầu & Luân chuyển hàng (Supply Chain Flow)
- Thay vì để chi nhánh gọi điện thoại trực tiếp, hệ thống số hóa quy trình bằng **Phiếu Yêu cầu Nhập Hàng** (Thu ngân lập -> Quản lý duyệt -> Thủ kho xuất). Tồn kho chi nhánh chỉ được cập nhật sau khi Quản lý có thao tác **Xác nhận nhận hàng** vật lý.

---

## 4. Kiến Trúc API (Dự Kiến)

```
/api/auth              — Login, Logout, Refresh Token
/api/chi-nhanh         — CRUD chi nhánh
/api/nhan-vien         — CRUD nhân viên
/api/danh-muc          — CRUD danh mục
/api/san-pham          — CRUD sản phẩm
/api/khach-hang        — CRUD khách hàng
/api/khuyen-mai        — CRUD khuyến mãi
/api/nha-cung-cap      — CRUD nhà cung cấp
/api/ton-kho           — Xem tồn kho
/api/the-kho           — Xem lịch sử thẻ kho
/api/phieu-nhap        — Nhập kho từ NCC
/api/phieu-yeu-cau     — Thu ngân yêu cầu, Quản lý duyệt
/api/phieu-xuat        — Xuất kho nội bộ, Xác nhận nhận hàng
/api/kiem-ke           — Kiểm kê kho
/api/hoa-don           — POS bán hàng
/api/cham-cong         — Check-in/out
/api/bang-luong        — Bảng lương & duyệt
/api/so-quy            — Sổ quỹ
/api/dashboard         — Dữ liệu tổng quan
```
