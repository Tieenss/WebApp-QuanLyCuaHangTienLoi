# 03A — Figma App Shell Implementation Brief — TÀI LIỆU THAM KHẢO

> ⚠️ **CẢNH BÁO:** Sidebar navigation trong file này dùng mô hình **đơn cửa hàng** (4 role: Admin, Manager, Cashier, Inventory Staff) với các mục: Đơn hàng, Khách hàng, Khuyến mãi, Cài đặt. MVP hiện tại dùng **5 role** (Admin, Kế toán, Thủ kho, Quản lý, Thu ngân) với navigation khác.
>
> **Khi code FE, cần điều chỉnh sidebar theo:** [`functional_specification v1.0.md`](file:///d:/Documents/ERPCuaHangTienLoi/functional_specification%20v1.0.md) mục D (Ma trận phân quyền).
> **Auto Layout rules và Design System tokens vẫn hợp lệ** — chỉ cần thay đổi các mục nav.

**Tài liệu dành cho Visual Design Agent / Figma Agent.**

---

## 1. Canvas / Page Structure
*   Sử dụng Page hiện tại: `02 — Components` (để lấy components nền tảng).
*   Tạo Page mới: `03 — App Shell` (để chứa các Layout Frame chính).

## 2. Frame Sizes
*   **Desktop L (Primary):** 1440 × 900
*   **Desktop M:** 1366 × 768
*   **Desktop S:** 1280 × 800

## 3. Main Layout Dimensions
*   **Layout Cốt lõi:** Row (Horizontal) chia làm 2 phần: `Sidebar` bên trái và `Main Area` bên phải.
*   **Sidebar Expanded Width:** Cố định `240px`.
*   **Sidebar Collapsed Width:** Cố định `64px`.
*   **Main Area:** Cấu trúc Column (Vertical), chia làm `Header` (trên) và `Content Area` (dưới).
*   **Main Content Width:** Tự động điền phần còn lại (`Fill container`).

## 4. Sidebar Structure
**Kiến trúc Navigation (KHÔNG THAY ĐỔI):**
*   Tổng quan
*   Bán hàng
*   Sản phẩm (Menu cha)
    *   Sản phẩm
    *   Danh mục
*   Kho hàng
*   Nhập hàng (Menu cha)
    *   Phiếu nhập
    *   Nhà cung cấp
*   Đơn hàng
*   Khách hàng
*   Khuyến mãi
*   Báo cáo
*   Nhân viên (Menu cha)
    *   Nhân viên
    *   Vai trò & Phân quyền
*   Cài đặt

**Đặc tả UI Sidebar:**
*   **Background:** `Gray-50` hoặc `White`, border-right `1px solid Gray-200`.
*   **Item Height:** `40px` (đảm bảo vùng click đủ lớn).
*   **Padding:** Trái `16px`, Phải `16px`.
*   **Icon Size:** `20x20px` (Stroke 1.5px).
*   **Gap (Icon to Text):** `12px`.
*   **Nested Indentation (Menu con):** Thụt lùi vào `32px` tính từ lề trái (hoặc thẳng hàng với text của menu cha).
*   **Active Indicator:** Nền `Blue-50` và viền dọc trái (Left-border) `3px solid Blue-600`. Text/Icon đổi sang `Blue-600`.
*   **Typography:** Text thường dùng `Body 14px Regular Gray-500`. Text Active dùng `Body 14px Medium Blue-600`.

## 5. Header Structure
*   **Height:** Cố định `56px` hoặc `64px` (Gọn gàng).
*   **Horizontal Padding:** `24px` (Trái và Phải).
*   **Background:** `White`, border-bottom `1px solid Gray-200`.
*   **Left Section:** Breadcrumb (`Body 14px Muted`) & Page Context (Tiêu đề module hiện tại nếu không dùng Breadcrumb).
*   **Right Section:** Global Search (Input box width `240px`, Icon Kính lúp) + Notification Icon (Badge tròn đỏ góc phải) + User Account Area.
*   **Account Dropdown:**
    *   Avatar tròn `32x32px` + Tên `Body 14px Medium` + Role `Caption 12px Muted`.
    *   Menu: Tài khoản của tôi, Đổi mật khẩu, Đăng xuất.

## 6. Content Container
*   **Background:** `Gray-50` (Tương phản nhẹ với Header và Card Trắng).
*   **Maximum Width Behavior:** Không giới hạn Max-width (Data-dense). Trải dài theo kích thước màn hình `Fill container`.
*   **Page Padding:** Cố định `24px` (Top, Left, Right, Bottom).
*   **Page Header Area:** Nằm trên cùng nội dung, gồm: Title (`H1 24px Semi-bold`), Primary Action Button canh phải. Spacing bottom `16px` hoặc `24px`.
*   **Tab Placement:** Nếu có Tabs, đặt ngay dưới Page Header, line-style, border-bottom.
*   **Main Content Box:** Dùng khối Card nền `White`, border `1px solid Gray-200`, radius `8px`, chứa Table hoặc Form bên trong.

## 7. Auto Layout Rules (RẤT QUAN TRỌNG)
Tất cả Frame BẮT BUỘC dùng Auto Layout:

*   **Main Shell (Frame Tổng):** 
    *   Direction: Horizontal 
    *   Padding: 0
    *   Gap: 0
    *   Sizing: Width `Fixed` (1440), Height `Fixed` (900).
*   **Sidebar:** 
    *   Direction: Vertical 
    *   Padding: Top/Bottom 16px, Left/Right 12px
    *   Gap: 4px (giữa các Item)
    *   Sizing: Width `Fixed` (240px), Height `Fill container`.
*   **Sidebar Item:** 
    *   Direction: Horizontal 
    *   Padding: L/R 12px, T/B 10px
    *   Gap: 12px 
    *   Alignment: Center Left 
    *   Sizing: Width `Fill container`, Height `Fixed` (40px).
*   **Main Area:**
    *   Direction: Vertical
    *   Sizing: Width `Fill container`, Height `Fill container`.
*   **Header:**
    *   Direction: Horizontal 
    *   Padding: L/R 24px, T/B 0 
    *   Gap: Auto (Space between)
    *   Alignment: Center
    *   Sizing: Width `Fill container`, Height `Fixed` (56px).
*   **Content Container:**
    *   Direction: Vertical
    *   Padding: 24px
    *   Gap: 24px
    *   Sizing: Width `Fill container`, Height `Fill container`. Khởi động scroll nếu nội dung tràn.

## 8. Spacing Rules
*   Tuân thủ hệ 4pt. 
*   Gap giữa các icon trong Header: `16px`.
*   Gap giữa Title và Sub-description: `4px`.
*   Gap giữa Page Header và Main Content Card: `24px`.

## 9. Typography Usage
*   Lấy toàn bộ từ Design System (Phase 2). Font `Inter`. Tabular Nums.
*   Sidebar item: `Body 14px Regular`.
*   Page Title: `H1 24px Semi-bold`.
*   Breadcrumb: `Caption 12px Regular`.

## 10. Component Instances to Reuse (Kế thừa Phase 2)
*   Sử dụng nút bấm (Primary / Secondary) từ Page 02.
*   Sử dụng Input cho Global Search.
*   Sử dụng Badge (Status) nếu cần thiết ở Navigation.
*   Sử dụng Menu Dropdown chuẩn.

## 11. Component Variants Required
*   **Sidebar Item Variants:**
    *   Property 1 (State): `Default`, `Hover`, `Active`, `Disabled`.
    *   Property 2 (Type): `Single`, `Parent`, `Child`.
    *   Property 3 (Icon): `Boolean` (True/False).
*   **Sidebar Variants:**
    *   Property (State): `Expanded` (240px), `Collapsed` (64px).

## 12. Sidebar States
*   **Hover:** Nền đổi sang `Gray-100`.
*   **Active:** Nền `Blue-50`, chữ/icon `Blue-600`, vạch xanh bên trái.
*   **Nested Expanded:** Hiện Chevron mũi tên quay xuống. Danh sách con thò ra dưới menu cha.
*   **Collapsed:** Biến mất hoàn toàn Text. Chỉ hiện Icon căn giữa (Cần tooltip khi hover). Mũi tên Chevron ẩn đi.

## 13. Header States
*   **Default:** Thông tin tĩnh bình thường.
*   **Account Hover/Active:** Dropdown menu xổ xuống từ dưới Avatar.
*   **Notification:** Badge đỏ ở Icon chuông. Dropdown lịch sử thông báo (trượt từ chuông xuống).

## 14. Responsive Behavior
*   **1440px / 1366px:** Đặt Sidebar variant = `Expanded` (240px). Header và Content `Fill container`.
*   **1280px:** Chuyển Sidebar variant = `Collapsed` (64px). Cực kỳ gọn.
*   **1024px (Tablet):** Sidebar bị giấu hoàn toàn (`Hidden`). Trái cùng của Header xuất hiện nút Hamburger (Icon 3 sọc) để trượt Sidebar ra (Drawer behavior). Không vẽ Mobile.

## 15. Permission Examples (Demo Phân quyền)
Làm các phiên bản (Frame) minh họa sự thay đổi Sidebar:
*   **Admin:** Nhìn thấy TẤT CẢ các mục.
*   **Manager:** Không thấy "Cài đặt".
*   **Cashier:** Chỉ thấy "Tổng quan", "Bán hàng", "Đơn hàng" (View-only), "Khách hàng".
*   **Inventory Staff:** Chỉ thấy "Tổng quan", "Sản phẩm", "Kho hàng", "Nhập hàng".
*(Tuyệt đối giữ chung 1 thiết kế Shell, chỉ Ẩn (Hide) các Sidebar Item đi bằng Auto Layout).*

## 16. Naming Conventions
Để đồng bộ hệ thống Design System:
*   `Shell / Sidebar`
*   `Shell / Sidebar Item`
*   `Shell / Sidebar Section` (Nếu chia nhóm)
*   `Shell / Header`
*   `Shell / Breadcrumb`
*   `Shell / Account Menu`
*   `Shell / Page Header`
*   `Shell / Layout` (Khung bao ngoài cùng)

## 17. Figma Component Hierarchy
`Shell / Layout` (Parent)
├── `Shell / Sidebar`
│   ├── `Shell / Sidebar Item`
│   └── `Shell / Sidebar Item (Nested)`
└── Main Area (Frame bình thường)
    ├── `Shell / Header`
    │   ├── `Shell / Breadcrumb`
    │   ├── Search Input (Từ Phase 2)
    │   └── `Shell / Account Menu`
    └── Content Container (Frame bình thường)
        ├── `Shell / Page Header`
        └── Main Content Card (Nơi thả UI các trang sau này)

## 18. Acceptance Criteria (Tiêu chí Nghiệm thu)
Figma Agent thực thi văn bản này phải đạt các yêu cầu sau:
1.  **Không Sáng Tạo Ngoài Luồng:** KHÔNG tự vẽ thêm biểu đồ, KHÔNG thêm màu sắc lạ, KHÔNG chế thêm chức năng (Subscription, Dashboard Analytics).
2.  **Đúng Khung Thiết Kế:** Kế thừa chính xác Typography (Inter), Color (Blue-600, Gray-50...) từ Phase 2.
3.  **Tự Động Hóa Kích Thước:** Mọi Frame đều phải dùng Auto Layout. Resize thử Frame ngoài cùng (1440px xuống 1280px) thì UI tự bóp lại chính xác (Không vỡ).
4.  **Component Tái Sử Dụng:** Không được duplicate thủ công. Sidebar phải là một Component chính (Main Component), có thể thả vào vô số Frame khác và đổi Variant dễ dàng.
5.  **Cảm Giác Chuyên Nghiệp:** Tổng thể App Shell nhìn đặc kịt thông tin, nghiêm túc, gãy gọn, giống phần mềm điều hành chuỗi siêu thị/bán lẻ thực thụ, KHÔNG giống template SaaS khởi nghiệp (Start-up).

*(Kết thúc Implementation Brief Phase 3A).*
