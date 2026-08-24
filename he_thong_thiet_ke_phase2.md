# Design System Foundation (Phase 2) — CÒN HIỆU LỰC (có lưu ý)

> ℹ️ **LƯU Ý:** Visual foundations (Color, Typography, Spacing, Radius, Shadow, Components) trong file này **vẫn hợp lệ** cho MVP hiện tại. Tuy nhiên, một số Business Components (mục 7) tham chiếu module đã loại khỏi MVP (Khách hàng, Khuyến mãi). Khi code FE, cần bổ sung thêm component cho các module mới: **Bảng lương, Sổ quỹ, Kiểm kê, Xuất kho nội bộ**.

Tài liệu này xác định Hệ thống Thiết kế (Design System) chuẩn mực cho Ứng dụng Quản lý Cửa hàng Tiện lợi. Thiết kế tuân thủ nghiêm ngặt nguyên tắc: **Chuyên nghiệp, Đặc do vận hành (Operational), Mật độ thông tin cao (Information-dense) và Không lai tạp các yếu tố SaaS/Marketing.**

---

## 1. DESIGN PRINCIPLES (Nguyên tắc Thiết kế)

*   **Simple & Clear:** Giao diện đơn giản, không rườm rà.
*   **Fast & Operational:** Tối ưu hóa cho tốc độ thao tác (nhất là POS). Hỗ trợ phím tắt và Focus tự động.
*   **Information-dense:** Mật độ thông tin cao. Không có những khoảng trắng (white-space) khổng lồ không cần thiết. Phù hợp cho bảng biểu (Data Table).
*   **Easy to scan:** Mắt người dùng có thể lướt nhanh để tìm thông tin quan trọng (Giá tiền, Số lượng tồn, Trạng thái).
*   **Consistent:** Đồng nhất từ Admin đến POS. Cùng một pattern cho các hành động tương tự.
*   **KHÔNG SỬ DỤNG:** Gradients màu mè, Glassmorphism (Kính mờ), Màu Neon, Đổ bóng (Shadows) quá đậm, Bo góc quá lớn (Pill-shape), hay các hình minh họa trang trí (Decorative illustrations) không mang ý nghĩa nghiệp vụ.

## 2. VISUAL DIRECTION (Định hướng Thị giác)

*   **Theme:** Giao diện Sáng (Light Theme) làm chủ đạo. Nền trung tính (Trắng hoặc Xám siêu nhạt) để giảm mỏi mắt khi làm việc 8 tiếng/ngày.
*   **Ngôn ngữ (Language):** Toàn bộ nhãn (Labels) đều là Tiếng Việt.
*   **Tiền tệ (Currency):** Việt Nam Đồng (VND). Định dạng chuẩn: `29.000 ₫` (Dấu chấm phân cách hàng nghìn, cách một khoảng trắng trước ký hiệu ₫).
*   **Typography:** Sử dụng Font **Inter** (hoặc Geist) - bộ font siêu dễ đọc cho UI, đặc biệt tốt cho các con số.
*   **Borders & Shadows:** Viền mỏng, rõ ràng (1px solid). Đổ bóng chỉ dùng để phân tách các lớp (Overlay/Modal) chứ không dùng cho các Card thông thường.

## 3. FOUNDATIONS (Nền tảng Thiết kế)

### 3.1 Color (Màu sắc Semantic)
*   **Background:** Nền chính `Gray-50` (#F9FAFB).
*   **Surface:** Nền nội dung (Card/Table/Form) `White` (#FFFFFF).
*   **Surface Elevated:** Nền cho Modal/Dropdown `White`.
*   **Border:** Viền chung `Gray-200` (#E5E7EB), Viền Focus `Blue-500` (#3B82F6).
*   **Text Primary:** Chữ chính `Gray-900` (#111827) - Dành cho nội dung chính.
*   **Text Secondary:** Chữ phụ/Label `Gray-500` (#6B7280) - Dành cho label/body phụ.
*   **Text Muted:** Chữ mờ `Gray-400` (#9CA3AF) - CHỈ dành cho placeholder hoặc metadata không quan trọng.
*   **Text Disabled:** Chữ vô hiệu hóa `Gray-300`.
*   **Primary:** Màu thương hiệu / Nút chính `Blue-600` (#2563EB) - Lựa chọn hoàn hảo, trung tính và rất dễ phân biệt với các trạng thái màu (Xanh lá/Vàng/Đỏ).
*   **Success:** Thành công `Green-600` (#16A34A).
*   **Warning:** Cảnh báo `Yellow-500` (#EAB308).
*   **Danger:** Xóa/Lỗi `Red-600` (#DC2626).
*   **Info:** Thông tin `Blue-500`.

**Màu sắc Trạng thái Kho (Inventory Semantic States):**
*   **In stock (Còn hàng):** `Green-600`
*   **Low stock (Sắp hết):** `Yellow-500`
*   **Out of stock (Hết hàng):** `Red-600`
*   **Near expiry (Cận date):** `Orange-500`
*   **Expired (Hết date):** `Gray-500` (Gạch ngang chữ).

### 3.2 Typography (Kiểu chữ)
*Font gia đình: Inter. ĐẶC BIỆT QUAN TRỌNG: Kích hoạt tính năng `Tabular Nums` (tnum) cho mọi con số (Giá tiền, Số lượng, Tổng tiền, Data table). Điều này làm UI nhìn chuyên nghiệp và dễ scan hơn rất nhiều.*
*   **Display:** 30px / 36px (Line height) / Bold (Chỉ dùng cho TỔNG TIỀN POS).
*   **H1:** 24px / 32px / Semi-bold (Tiêu đề trang).
*   **H2:** 20px / 28px / Medium (Tiêu đề Module/Modal).
*   **H3:** 16px / 24px / Medium (Tiêu đề Card).
*   **Body Large:** 16px / 24px / Regular (Chữ trong Giỏ hàng POS).
*   **Body:** 14px / 20px / Regular (Chữ chuẩn cho Table, Form - Kích thước chủ đạo).
*   **Body Small:** 13px / 18px / Regular.
*   **Caption:** 12px / 16px / Regular (Ghi chú dưới input).
*   **Label:** 14px / 20px / Medium (Tiêu đề Form Input).
*   **Price / Numeric:** 14px (hoặc 16px ở POS) / Medium / Monospaced/Tabular (Luôn căn phải trong bảng).

### 3.3 Spacing (Khoảng cách)
Hệ thống lưới 4pt:
`2px`, `4px` (Gắn kết), `8px` (Giữa Icon và Text), `12px` (Padding Button), `16px` (Giữa các hàng), `24px` (Giữa các cụm), `32px` (Giữa các phần lớn).

### 3.4 Radius (Độ bo góc)
*   **Radius-Sm (2px):** Checkbox.
*   **Radius-Md (4px):** Button, Input, Select, Label, Badge (Cứng cáp, nghiêm túc).
*   **Radius-Lg (8px):** Card, Modal, Drawer, Image Thumbnail.
*(Tuyệt đối không dùng Radius 999px / Hình viên thuốc trừ Radio button).*

### 3.5 Shadow (Đổ bóng)
*   **Shadow-Sm:** Dropdown Menu, Tooltip.
*   **Shadow-Md:** Không dùng.
*   **Shadow-Lg:** Drawer, Modal (Kết hợp với Backdrop mờ đen 40%).

### 3.6 Iconography (Icon)
Sử dụng 1 bộ Icon duy nhất (VD: Lucide, Phosphor, hoặc Heroicons). Style: Outline, Line width 1.5px. Đồng nhất kích thước 16x16px (cho Body) hoặc 20x20px (cho Header/POS).

---

## 4. CORE COMPONENTS (Thành phần Cốt lõi)

Mỗi component có các states: `Default`, `Hover`, `Active`, `Focus` (Viền xanh), `Disabled` (Opacity 50%), `Loading` (Kèm spinner), `Error` (Viền đỏ).

*   **Button:** Primary (Nền xanh), Secondary (Viền xám, nền trắng), Danger (Nền đỏ), Ghost (Không viền không nền).
*   **Icon Button:** Dùng cho hành động trên Data Table (VD: Edit, Delete).
*   **Input & Search Input:** Viền `Gray-300`. Bo góc 4px. Size chuẩn: Cao 36px. Có icon Kính lúp cho Search.
*   **Select & Combobox:** Có mũi tên xuống. Combobox cho phép gõ để lọc.
*   **Checkbox / Radio / Switch:** Standard. Màu Accent là `Blue-600`.
*   **Tabs:** Line-style (Chỉ có đường gạch chân màu xanh ở tab đang chọn, không dùng tab dạng khối).
*   **Badge:** Dùng cho trạng thái.
*   **Tooltip:** Nền xám đen, chữ trắng. Hiện nhanh sau 200ms. Dành cho các Icon Button.
*   **Breadcrumb:** Dùng ở màn Detail: `Sản phẩm / Nước giải khát / Coca Cola 320ml`.

---

## 5. DATA COMPONENTS (Thành phần Dữ liệu - Dành cho Admin)

*   **Data Table:** Tối ưu Data-dense.
    *   **Table Header:** Nền `Gray-50`, Chữ `Label 13px Medium Gray-500`. Có icon Sort.
    *   **Table Row:** Nền trắng. Hover: `Gray-50`. Border bottom: 1px solid `Gray-200`.
    *   **Table Cell:** Padding dọc 8px (Tạo độ nén cao), Padding ngang 12px.
    *   **Selection:** Cột đầu tiên chứa Checkbox. Cột cuối cùng chứa Action.
*   **Filter Bar:** Nằm trên Table. Có Ô tìm kiếm (bên trái), Nút Lọc nâng cao, và Nút Action (Thêm mới) bên phải.
*   **Pagination:** Hiển thị "1-20 trên 100", nút Previous/Next.
*   **KPI Card / Stat Card:** Khối trắng viền xám, chứa 1 con số lớn (VD: Doanh thu), so sánh % (Xanh/Đỏ) với hôm qua.
*   **Empty State:** Minh họa đơn sắc nhẹ (Gray-300), Text mờ, CTA Button.
*   **Loading Skeleton:** Các thanh xám nhạt nhấp nháy mờ cho Table Row.

---

## 6. OVERLAY COMPONENTS (Thành phần Phủ)

*   **Modal:** Form thao tác quan trọng (VD: Thêm Khách hàng). Luôn căn giữa màn hình, có nút X đóng ở góc. Cố định chiều rộng (VD: 400px, 600px).
*   **Drawer:** Trượt từ bên phải. Dùng cho luồng làm việc dài nhưng cần giữ ngữ cảnh (VD: Nhận hàng PO, Filter nâng cao). Chiều rộng 400px hoặc 600px.
*   **Confirmation Dialog:** Hộp thoại cảnh báo. Chứa Title, Text giải thích, và Input bắt buộc nhập chữ "XOA" (đối với Destructive Action). Nút Delete màu đỏ.
*   **Toast (Alert):** Trượt từ góc trên bên phải. Màu Xanh/Đỏ tương ứng. Tự động đóng sau 3s (Trừ lỗi nghiêm trọng).

---

## 7. BUSINESS COMPONENTS (Thành phần Nghiệp vụ Đặc thù)

### Product
*   **Product Thumbnail:** Ảnh vuông 40x40px, bo góc 4px. Nếu không có ảnh hiển thị Icon Placeholder.
*   **Product Status:** Badge "Đang bán" (Xanh), "Ngừng bán" (Xám).
*   **Product Price:** Font Tabular. Căn phải ở mọi Table. Cột Giá vốn chỉ hiện khi có quyền.

### Inventory
*   **Stock Status Badge:** Dựa trên Semantic Color ở phần 3.1.
*   **Stock Movement Row:** Row table hiện Loại Giao Dịch (VD: Nhập hàng - Badge Xanh, Bán hàng - Badge Cam).

### Purchase & Orders
*   **Order Status:** "Hoàn thành" (Xanh), "Đã hủy" (Đỏ), "Hoàn tiền" (Vàng).
*   **Payment Status:** "Tiền mặt", "Chuyển khoản QR", "Thẻ". Hiển thị kèm Icon.

### POS
*   **POS Product Result:** Dạng danh sách hoặc Grid nhỏ. Khi gõ Barcode -> Highlight sản phẩm lập tức.
*   **POS Cart Item:** 1 Row gồm: Tên (Bold), Nút [-] Ô nhập số [+] Nút Xóa. Đơn giá, Thành tiền (Căn phải). Thiết kế rộng hơn Table bình thường để dễ thao tác (Padding dọc 12px).
*   **POS Total Summary:** Block phân tách rõ Tiền Hàng, Chiết Khấu, Khách Cần Trả.

---

## 8. POS-SPECIFIC DESIGN TOKENS (Design Token cho POS)

POS sử dụng chung Component, nhưng các Token (Giá trị) được tùy biến để tối ưu vận hành:

*   **POS Spacing:** Thoáng hơn 1 chút ở khu vực Giỏ hàng (dễ nhìn màn hình từ xa), nhưng nén cực chặt ở khu vực Tìm kiếm kết quả để hiển thị nhiều.
*   **POS Typography Emphasis:** 
    *   **TỔNG TIỀN (Total Amount):** Phải ở size `Display (30px/36px)` và màu `Blue-600` hoặc Đen đậm. Ngay lập tức thu hút ánh nhìn.
    *   **Cart Item Name:** `Body Large (16px)` thay vì 14px để thu ngân dễ đọc tên hàng.
*   **Autofocus Element:** Thanh tìm kiếm/quét mã (Barcode Input) phải có state đặc biệt (VD: Viền xanh luôn sáng hoặc nháy) để báo hiệu sẵn sàng nhận tín hiệu máy quét.
*   **Payment Button:** Size XL, Nền Xanh nổi bật nhất trang, gán phím tắt (F9).
*   **Error/Warning States ở POS:** Cực kỳ rõ ràng, kèm âm thanh Beep (nếu khả thi). Lỗi phải to và nằm chính giữa (Tránh để thu ngân miss thông tin).

---

## 9. RESPONSIVE BEHAVIOR (Hành vi Co giãn)

*   **1440px & 1366px:** Layout chuẩn. Sidebar mở rộng (240px). POS chia tỷ lệ 70% (Work area) - 30% (Cart).
*   **1280px:** Thu nhỏ lề. Sidebar thu gọn thành Icon-only (64px). Bảng (Table) giữ nguyên cấu trúc nhưng giảm Padding ngang còn 8px.
*   **768px – 1024px (Tablet/iPad Ngang):** Sidebar ẩn hoàn toàn (Hamburger menu). Bảng dữ liệu bật Scroll ngang (Horizontal Scroll) nếu quá nhiều cột. Ở màn hình POS, Cột Trái và Phải có thể chia tỷ lệ 60-40. Tránh bẻ dòng làm mất cấu trúc.

---

## 10. ACCESSIBILITY (Khả năng Truy cập)

*   **Readable Contrast:** Đảm bảo WCAG 2.1 AA cho các văn bản quan trọng. Không ép `Text Muted` (Gray-400) phải đạt WCAG AA trên nền trắng, vì nó chỉ dùng cho placeholder/metadata phụ. Tuyệt đối không dùng Gray-400 cho text cần đọc lâu.
*   **Focus States:** Mọi Input, Button khi dùng phím TAB đều phải có viền Focus màu Xanh `Blue-500` (Outline offset 2px).
*   **Keyboard Friendly:** 
    *   **POS:** Bắt buộc dùng được mà không cần chuột (Quét mã -> Xuống giỏ -> Thanh toán).
    *   **Admin:** Hỗ trợ ESC để đóng Modal/Drawer, Enter để Submit form.
*   **Semantic Communication:** Không chỉ dùng màu (Đỏ) để báo lỗi, mà phải kết hợp Icon (Dấu X) và Text ("Không đủ tồn kho") để hỗ trợ người mù màu.

---

## 11. FIGMA ORGANIZATION (Cấu trúc File Figma - Hướng dẫn)

Khi thiết kế UI, File Figma cần chia thành các trang (Pages):
1.  **01 — Foundations:** Color Palette, Typography Styles, Grids, Shadows.
2.  **02 — Components:** Nút bấm, Input, Dropdown, Table, Modal (Được thiết lập Component Properties, Auto-layout).
3.  **03 — Business Components:** Các khối đặc thù của Admin (KPI Card, Product Row, Filters).
4.  **04 — POS Components:** Cart Item, Tally/Total Block, Bàn phím số (Numpad nếu có).
5.  **05 — Patterns:** Các Layout mẫu (Empty Layout, Form Layout).
6.  **06 — Documentation:** Hướng dẫn sử dụng Component.

---

## 12. DESIGN CONTRACT (Cam kết Thiết kế)

Tất cả các giao diện tương lai của Ứng dụng phải tuân theo bản hợp đồng này:

1.  **Typography Rules:** Không được dùng các Font kỳ lạ. Mọi con số (Giá tiền, Số lượng, Tổng tiền, Dữ liệu bảng) BẮT BUỘC dùng tính năng `Tabular Nums` (Monospaced) để canh phải thẳng hàng. Đây là quy tắc khóa cứng (Locked rule) để đảm bảo độ chuyên nghiệp.
2.  **Color Rules:** Không tự ý chế màu. Bám sát hệ thống Semantic Color. Trạng thái Thành Công luôn là Xanh lá, Cảnh báo là Vàng/Cam, Xóa/Lỗi là Đỏ.
3.  **Table Rules:** Mọi màn hình danh sách phải dùng chung 1 cấu trúc Data Table. Hành động Xóa/Sửa phải nằm chung một cột cuối cùng (Kebab menu nếu > 2 hành động). Dữ liệu cực kỳ cô đặc (Dense).
4.  **Modal/Drawer Rules:** 
    *   Modal cho Form ngắn, Xác nhận.
    *   Drawer cho Form dài, Thông tin bổ sung, Lọc dữ liệu.
5.  **Status Rules:** Trạng thái sản phẩm/đơn hàng không được để Text không, mà phải bọc trong Badge có màu nền nhạt tương ứng.
6.  **POS Specifics:** Không đem Header Admin hay thanh Sidebar vào POS. POS là màn hình độc lập, tối ưu 100% diện tích cho giỏ hàng và thanh tìm kiếm.

**Verify Checklist (Xác minh hoàn thành):**
*   ✔️ Không giống SaaS Marketing (Mật độ data nén cao, vuông vức, chuyên nghiệp).
*   ✔️ Admin & POS chung ngôn ngữ thiết kế (Chung typography, icon, form input) nhưng POS có Tokens đặc thù.
*   ✔️ Các Components đều được định nghĩa rõ ràng về trạng thái.
*   ✔️ Các màn hình từ Phase 1 (Product, Orders, PO...) hoàn toàn có thể ráp lại từ các mảnh ghép của Design System này.
