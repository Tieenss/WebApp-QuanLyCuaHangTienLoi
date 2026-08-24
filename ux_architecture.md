# UX Architecture Blueprint (Phase 1) — TÀI LIỆU THAM KHẢO

> ⚠️ **CẢNH BÁO:** File này thuộc phase thiết kế ban đầu cho mô hình **đơn cửa hàng** (4 role, 12 module). MVP hiện tại đã chuyển sang mô hình **chuỗi cửa hàng Hub & Spoke** (5 role, 13 module) với scope khác biệt đáng kể.
>
> **Các module không còn trong MVP:** Khách hàng (CRM), Khuyến mãi, Cài đặt cửa hàng, Đơn hàng riêng.  
> **Các module mới:** Chi nhánh, Xuất kho nội bộ, Chấm công & Lương, Sổ quỹ, Kiểm kê.
>
> **Nguồn chính thức:** [`functional_specification v1.0.md`](file:///d:/Documents/ERPCuaHangTienLoi/functional_specification%20v1.0.md) · [`database_schema.md`](file:///d:/Documents/ERPCuaHangTienLoi/database_schema.md) · [`role_workflows.md`](file:///d:/Documents/ERPCuaHangTienLoi/role_workflows.md)

---

Tài liệu này chuyển đổi Đặc tả Chức năng v1.0 thành Kiến trúc Trải nghiệm (UX Architecture) mạch lạc, làm nền tảng cho Phase 2 (Design System). Tất cả các giới hạn nghiệp vụ (Constraints) đều được tuân thủ nghiêm ngặt.

---

## A. Information Architecture Tree (Cây Kiến trúc Thông tin)

Cấu trúc ứng dụng được chia thành 3 không gian (Layouts) hoàn toàn độc lập để tối ưu hóa hiệu suất vận hành:

1.  **Auth Layout** (Bảo vệ lối vào)
    *   Đăng nhập (Login)
2.  **POS Layout** (Không gian bán hàng chuyên biệt)
    *   Bán hàng (Quét mã, Giỏ hàng, Khách hàng, Thanh toán, Khuyến mãi)
3.  **Admin Layout** (Không gian quản trị - Navigation chính)
    *   **Utility Surfaces (Topbar)**
        *   Tài khoản của tôi (Hồ sơ, Đổi mật khẩu, Đăng xuất)
    *   **Main Modules** (Xem chi tiết ở mục B)

---

## B. Main Navigation Structure (Cấu trúc Điều hướng Chính)

Navigation sidebar được tối ưu hóa cho thao tác hằng ngày, không tạo các mục top-level dư thừa. 
`Tài khoản của tôi` được đặt trên Global Account Menu (Topbar), không nằm trong Sidebar. `Nhà cung cấp`, `Danh mục`, `Phân quyền` được gom nhóm hợp lý.

*   **Tổng quan**
*   **Bán hàng** *(Chuyển sang POS Layout trên cùng application route, KHÔNG mở browser tab mới)*
*   **Sản phẩm**
    *   Sản phẩm
    *   Danh mục
*   **Kho hàng**
*   **Nhập hàng**
    *   Phiếu nhập
    *   Nhà cung cấp
*   **Đơn hàng**
*   **Khách hàng**
*   **Khuyến mãi**
*   **Báo cáo**
*   **Nhân viên**
    *   Nhân viên
    *   Vai trò & Phân quyền
*   **Cài đặt**

---

## C. Page Hierarchy (Hệ thống phân cấp Trang)

Các trang được thiết kế ưu tiên Drawer/Modal cho các thao tác phụ để giữ context cho người dùng, thay vì bắt chuyển trang (Redirect) liên tục.

*   **Sản phẩm (Product):** List Page → Create/Edit (Full Page) → Detail Page
*   **Danh mục (Category):** List Page → Create/Edit (Drawer)
*   **Kho hàng (Inventory):** Overview Page → Stock Detail Page (Tích hợp Adjustment History) → Adjustment (Drawer/Modal)
*   **Nhập hàng (Purchase):** Purchase List Page → Create Purchase (Full Page) → Detail Page → Receiving (Drawer)
*   **Nhà cung cấp (Supplier):** List Page → Detail Page → Create/Edit (Modal)
*   **Đơn hàng (Order):** List Page → Detail Page → Return/Refund/Cancel (Drawer)
*   **Khách hàng (Customer):** List Page → Detail Page → Create/Edit (Modal)
*   **Khuyến mãi (Promotion):** List Page → Create/Edit (Full Page)
*   **Báo cáo (Report):** Overview Page (với các Tabs riêng biệt)
*   **Nhân viên (Staff):** List Page → Assign Role/Permissions (Modal) → Create/Edit (Drawer)
*   **Tài khoản cá nhân (Profile):** Truy cập từ Topbar → Profile (Drawer)

---

## D. Role-Based Navigation Matrix (Ma trận Phân quyền Điều hướng)

Dựa trên mô hình quyền của hệ thống, Navigation Sidebar sẽ tự động ẩn/hiện. Truy cập URL trái phép sẽ render trang **403 Forbidden**.

| Navigation Item | Admin | Manager (Quản lý) | Cashier (Thu ngân) | Inventory Staff (Kho) |
| :--- | :---: | :---: | :---: | :---: |
| Tổng quan | X | X | | |
| Bán hàng (POS) | X | X | X | |
| Sản phẩm | X | X | | X |
| Kho hàng | X | X | | X |
| Nhập hàng | X | X | | X |
| Đơn hàng | X | X | X (Chỉ xem) | |
| Khách hàng | X | X | X | |
| Khuyến mãi | X | X | | |
| Báo cáo | X | X | | |
| Nhân viên | X | | | |
| Cài đặt | X | | | |

---

## E. Core User Journey Map (Hành trình Người dùng)

### FLOW 01 — LOGIN
*   **Entry:** Landing / Auth URL
*   **Action:** Nhập thông tin -> Đăng nhập
*   **Decision:** Dữ liệu hợp lệ?
*   **Success:** Chuyển hướng (Redirect) -> `Dashboard` (hoặc `POS` nếu role là Cashier)
*   **Error:** Hiển thị Inline error (Tài khoản sai)
*   **Exit:** `Dashboard`

### FLOW 02 — POS SALE
*   **Entry:** POS Layout
*   **Action:** Quét Barcode (hoặc Tìm kiếm) -> Thêm vào Giỏ (Cart) -> Đổi số lượng -> Chọn Khách hàng (Tùy chọn) -> Áp dụng Khuyến mãi -> Thanh toán
*   **Success:** Cập nhật Tồn kho -> Ghi nhận Đơn hàng -> Modal Thanh toán Thành công (Đã bao gồm Receipt) -> In Hóa đơn
*   **Error:** Tồn kho = 0 -> Chặn thanh toán (Hiển thị Toast đỏ)
*   **Exit:** Làm trống giỏ hàng, Focus lại vào ô Barcode.

### FLOW 03 — POS PAYMENT FAILURE
*   **Entry:** POS Modal Thanh toán
*   **Action:** Xác nhận Thanh toán
*   **Error:** Lỗi mạng/Hệ thống (Network error) -> Feedback đỏ rõ ràng
*   **Destination:** Giữ nguyên trạng thái Modal Thanh toán (Return to payment state) -> Nút `Thử lại (Retry)`

### FLOW 04 — PRODUCT MANAGEMENT
*   **Entry:** Product List
*   **Action:** Tìm kiếm/Lọc (Search/Filter) -> Click vào sản phẩm -> `Product Detail` -> Click Edit -> Lưu
*   **Success:** Bắn Success Toast -> Reload data
*   **Exit:** `Product Detail`

### FLOW 05 — CREATE PRODUCT
*   **Entry:** Product List
*   **Action:** Bấm `Add Product` -> Mở trang `Create Product` -> Điền thông tin -> Validation
*   **Success:** Lưu thành công -> Bắn Toast -> Chuyển về `Product Detail` (hoặc List)

### FLOW 06 — INVENTORY ADJUSTMENT
*   **Entry:** Inventory Overview
*   **Action:** Chọn sản phẩm -> `Stock Detail` -> `Create Adjustment` (Drawer) -> Nhập số lượng thực tế -> Hệ thống tính chênh lệch -> Chọn lý do -> Xác nhận
*   **Success:** Tồn kho cập nhật -> Lưu lịch sử (Activity recorded)
*   **Exit:** `Stock Detail`

### FLOW 07 — PURCHASE
*   **Entry:** Purchase List
*   **Action:** `Create Purchase` -> Chọn Nhà cung cấp -> Thêm Sản phẩm -> Nhập Số lượng -> Nhập Giá vốn (Cost) -> Lưu -> Bấm `Receive Goods` (Nhận hàng) -> Xác nhận số lượng
*   **Success:** Tồn kho tăng -> Giá vốn TB cập nhật -> Đóng phiếu
*   **Exit:** `Purchase Detail`

### FLOW 08 — PARTIAL RECEIVING
*   **Entry:** Purchase Detail
*   **Action:** Bấm `Receive` (Drawer) -> Nhập số lượng thực nhận (nhỏ hơn tổng) -> Confirm
*   **Success:** Tồn kho tăng theo thực nhận -> Trạng thái Phiếu cập nhật thành `Nhận một phần` (Partially Received)
*   **Exit:** `Purchase Detail`

### FLOW 09 — ORDER CANCELLATION
*   **Entry:** Order Detail
*   **Action:** Bấm `Cancel` -> Nhập lý do (Dialog) -> Confirm
*   **Success:** Hoàn tiền (Refund) -> Phục hồi Tồn kho (Restore inventory) -> Lưu Audit log
*   **Exit:** `Order Detail` (Trạng thái Đã hủy)

### FLOW 10 — RETURN / REFUND
*   **Entry:** Order Detail
*   **Action:** Bấm `Return` -> Mở (Drawer) chọn sản phẩm trả lại -> Nhập số lượng -> Nhập lý do -> Xác nhận Refund
*   **Success:** Hoàn tiền -> Phục hồi Tồn kho -> Return completed
*   **Exit:** `Order Detail`

### FLOW 11 — CUSTOMER
*   **Entry:** Customer List
*   **Action:** Tìm kiếm -> Click Customer -> Mở `Customer Detail` -> Xem `Order History` tab.
*   **Exit:** `Customer Detail`

### FLOW 12 — PROMOTION
*   **Entry:** Promotion List
*   **Action:** `Create` -> Nhập mức giảm (Discount) -> Nhập điều kiện (Conditions) -> Validation -> Save -> Activate
*   **Success:** Bắn Toast -> Về `Promotion List`

### FLOW 13 — STAFF / PERMISSIONS
*   **Entry:** Staff List
*   **Action:** Chọn nhân viên -> Bấm Assign Role (Modal) -> Chọn quyền -> Save
*   **Success:** Bắn Toast xanh

### FLOW 14 — SESSION EXPIRATION
*   **Entry:** Bất kỳ trang nào (Any page)
*   **Action:** Token hết hạn hoặc API báo 401
*   **Error:** Hiện cảnh báo (Warning Modal / Toast)
*   **Destination:** Redirect thẳng về màn hình `Login`.

---

## F. Screen Inventory (Kiểm kê Màn hình UX)

### Group A: Full Pages (Trang toàn màn hình)
1. **Login:** Thuộc Auth Layout. Purpose: Đăng nhập. Exit: Dashboard.
2. **Dashboard:** Thuộc Admin Layout. Purpose: Tổng quan. Entry: Từ Login.
3. **POS Terminal:** Thuộc POS Layout. Purpose: Bán hàng nhanh. Entry: Navigation / Bấm trực tiếp.
4. **Product List:** Thuộc Products.
5. **Product Detail:** Thuộc Products.
6. **Create/Edit Product:** Thuộc Products (Trang riêng do form phức tạp).
7. **Inventory Overview:** Thuộc Inventory.
8. **Stock Detail:** Thuộc Inventory. Mục đích: Xem thẻ kho và Lịch sử Điều chỉnh (Adjustment History).
9. **Purchase List:** Thuộc Purchase.
10. **Purchase Detail:** Thuộc Purchase.
11. **Create Purchase:** Thuộc Purchase.
12. **Order List:** Thuộc Orders.
13. **Order Detail:** Thuộc Orders.
14. **Customer List:** Thuộc Customers.
15. **Customer Detail:** Thuộc Customers.
16. **Promotion List:** Thuộc Promotions.
17. **Create/Edit Promotion:** Thuộc Promotions.
18. **Report Dashboard:** Thuộc Reports.
19. **Staff List:** Thuộc Staff.
20. **Store Settings:** Thuộc Settings.

### Group B: Modal
1. **POS Payment:** Xác nhận và nhập tiền mặt tại POS.
2. **POS Payment Success:** Màn hình thành công gom chung Hóa đơn (Receipt) vào một chỗ và có nút In.
3. **Assign Staff Role:** Gán quyền cho nhân viên.
4. **Create/Edit Supplier:** Nhanh chóng tạo NCC mà không cần rời trang.
5. **Create/Edit Customer:** Thêm Khách nhanh.

### Group C: Drawer (Trượt từ biên)
1. **My Account Profile:** Hồ sơ cá nhân & Đổi mật khẩu.
2. **Create/Edit Category:** Quản lý danh mục.
3. **Inventory Adjustment:** Điền form kiểm kho từ `Stock Detail`.
4. **Purchase Receiving:** Nhận hàng từ `Purchase Detail`.
5. **Order Return:** Quản lý trả hàng.
6. **Advanced Filters:** Dùng chung cho mọi bảng danh sách phức tạp.

### Group D: Dialog (Hộp thoại Xác nhận - Confirmation)
1. **Delete/Cancel Confirmation:** Yêu cầu gõ "XOA" để xóa dữ liệu.
2. **Cancel Order Reason:** Nhập lý do trước khi Hủy đơn.

### Group E: Global States
1. **403 Permission Denied:** Người dùng không có quyền truy cập URL.
2. **404 Not Found.**
3. **Session Expired.**

---

## G. Screen Relationship Map (Sơ đồ Kết nối Màn hình)

*   `Products` → (Click dòng) → `Product Detail`
*   `Products` → (Bấm Edit) → `Edit Product` → (Save) → `Product Detail`
*   `POS` → (Thanh toán) → `Payment Modal` → (Success) → `Payment Success & Receipt Modal` → (Đóng) → `POS` (Reset)
*   `Orders` → (Click dòng) → `Order Detail` → (Bấm Return) → `Return Drawer` → (Xác nhận) → `Order Detail` (Đã cập nhật)
*   `Inventory` → (Click dòng) → `Stock Detail` → (Bấm Adjustment) → `Adjustment Drawer` → (Xác nhận) → `Stock Detail` (Đã cập nhật)

---

## H. Global UX Patterns (Quy tắc Tương tác Toàn cục)

Nhằm đảm bảo trải nghiệm đồng nhất, không "sáng tạo" lại các cấu trúc đã chuẩn hóa:
1.  **List-page Pattern (Mọi trang danh sách):** Đây là một reusable pattern linh hoạt, thường tuân theo cấu trúc: 
    *   (Header) Title bên trái, Primary Action Button (Thêm mới) bên phải.
    *   (Filter Bar) Global Search (Tìm tên/mã), Advanced Filter Button, Tabs trạng thái (Status).
    *   (Data Table) Phân trang (Pagination) nằm cuối. Các thao tác dòng (Edit/Delete) nằm ở cột phải cùng hoặc dấu "3 chấm" (Kebab menu).
2.  **Create/Edit Flow:** Form dài phải chia theo Block (Card), Card thông tin chung ở trên/trái, Card trạng thái ở bên phải. Luôn có nút "Hủy" và "Lưu".
3.  **Destructive Actions (Xóa/Hủy):** Cảnh báo màu đỏ. Phải gõ chữ để xác nhận. Nút xóa ở form Detail luôn nằm tách biệt (thường ở đáy form).
4.  **Feedback (Toast):** 
    *   Xanh lá = Thành công (Tự ẩn sau 3s).
    *   Đỏ = Thất bại/Lỗi mạng (Tự ẩn hoặc chờ click đóng).
5.  **Empty State:** Bảng không dữ liệu hiển thị hình minh họa nhạt màu + Nút CTA tạo mới.
6.  **Loading State:** Dùng Skeleton cho trang Detail/Dashboard. Dùng ProgressBar trên đầu bảng (Table header) cho thao tác lọc dữ liệu.

---

## I. POS UX Architecture (Kiến trúc UX dành riêng cho POS)

**Mục tiêu:** Tốc độ (Speed) > Mọi thứ. Thiết kế hướng đến việc sử dụng Bàn phím & Máy quét mã vạch (Keyboard/Scanner workflow), giảm thiểu click chuột. Không hiển thị Admin sidebar để tiết kiệm 100% diện tích chiều ngang.

*   **Layout:**
    *   **Header:** Logo cửa hàng, Tên thu ngân hiện tại, Đồng hồ, Icon Trạng thái Mạng (Online), Nút Quay lại Admin, Nút Đóng ca. Không menu rườm rà.
    *   **Cột Trái (70%): Bàn làm việc**
        *   Ô Nhập liệu (Barcode/Search Area): Lớn, rõ ràng, **luôn giữ focus (autofocus)**. 
        *   Vùng kết quả: Hiển thị nhanh các sản phẩm đang được tìm kiếm.
    *   **Cột Phải (30%): Giỏ hàng (Cart) & Thanh toán**
        *   Customer Selection (Nút chọn/thêm khách).
        *   Danh sách món hàng (Cart items) có thể scroll.
        *   Vùng tính tiền (Totals): Tổng tiền, Khuyến mãi (màu nhấn), Thành tiền.
        *   Nút Thanh toán (To, rõ ràng, luôn neo ở đáy màn hình).
*   **UX Ưu tiên:** 
    *   Enter để thêm hàng, Phím tắt riêng (VD: F9 hoặc Space) để mở Modal thanh toán (Tuyệt đối không dùng Enter cho cả 2 action).
    *    피드백 (Feedback) nhanh gọn (Beep sound giả lập trên trình duyệt nếu lỗi).

---

## J. Dashboard UX Architecture (Kiến trúc UX Bảng điều khiển)

Nguyên tắc: "Cửa hàng đang diễn ra chuyện gì?" - Không trang trí rườm rà. Viewport đầu tiên (Above the fold) phải cung cấp đủ giá trị.
1.  **Row 1 (Kpis - Thẻ số):** Doanh thu hôm nay (chữ siêu to), Số đơn hàng, Khách hàng, Lợi nhuận (Nếu có quyền xem).
2.  **Row 2 (Alerts & Trends):** 
    *   Cột trái: Biểu đồ doanh thu 7 ngày (Dễ nắm bắt xu hướng).
    *   Cột phải: Cảnh báo Tồn kho (Sắp hết/Hết hàng - Bấm vào đi thẳng đến Stock Detail).
3.  **Row 3 (Tables):** Top 5 Sản phẩm bán chạy nhất hôm nay.

---

## K. Responsive / Layout Rules (Quy tắc Co giãn)

*   **Target chính:** Desktop / POS Screen (`1440px` và `1366px`). Thiết kế Fixed Sidebar (rộng ~240px) và Content area chiếm phần còn lại.
*   **Smaller Desktop (`1280px`):** Sidebar thu nhỏ thành dạng Icons (Collapsed) tự động để nhường không gian cho Table Data.
*   **Tablet (`768px` - `1024px`):** Table Data hiển thị thanh cuộn ngang (Horizontal scroll). Sidebar ẩn hoàn toàn (Chuyển thành Hamburger menu). Form chia 2 cột chuyển thành 1 cột.
*   *(Giai đoạn này không tối ưu Mobile Phone cho các chức năng POS/Admin phức tạp).*

---

## L. UX Risks / Potential Conflicts (Kiểm chứng rủi ro)

Căn cứ trên Functional Specification v1.0, cấu trúc UX đã được rà soát:
1.  ✔️ **Mọi tính năng có đích đến:** Cả 11 module chức năng đều có Flow tương ứng.
2.  ✔️ **Không bỏ sót:** Category, Profile, Settings đều được phân bổ. 
3.  ✔️ **Không thêm tính năng mới:** Không có WMS phức tạp, không có ERP Purchase, không tích điểm/VIP.
4.  ✔️ **Không có SaaS:** Không có khái niệm Workspaces hay Tenant Billing.
5.  ✔️ **UX hợp lý hóa:** Modal/Drawer được ưu tiên sử dụng thay vì điều hướng (Redirect) qua hàng chục trang cho tác vụ nhỏ (VD: Cập nhật tồn kho, Nhận hàng PO).
6.  ✔️ **POS Độc lập:** Đã tách rời POS khỏi Admin Layout.
7.  ✔️ **Biên giới phân quyền:** Ma trận Role-based Navigation được giữ vững bằng Permission Enforcement chặt chẽ kết hợp 403 State.

*(Blueprint này đã hoàn chỉnh để làm đầu vào (input) chuẩn xác cho giai đoạn Xây dựng Design System ở Phase 2).*
