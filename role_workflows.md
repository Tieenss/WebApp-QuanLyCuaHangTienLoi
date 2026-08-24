# Luồng Nghiệp Vụ Theo Vai Trò (Role-based Workflows) — CHÍNH THỨC

> **Dự án:** ERP Chuỗi Cửa Hàng Tiện Lợi  
> **Mô hình:** Hub & Spoke (Kho Tổng + Cửa hàng bán lẻ)  
> **Phương thức trả lương:** Chuyển khoản trực tiếp (Cách A)  
> **Tổng số vai trò:** 5 (Admin, Kế toán, Thủ kho, Quản lý, Thu ngân)  
> **Phiên bản:** FINAL  

---

## TỔNG QUAN BỘ MÁY VẬN HÀNH

```mermaid
flowchart TD
    subgraph HQ["🏢 Trụ sở chính (HQ)"]
        ADMIN["👑 Admin / Giám đốc"]
        KE_TOAN["💰 Kế toán"]
        THU_KHO["📦 Thủ kho"]
    end

    subgraph CN1["🏪 Chi nhánh bán lẻ 1"]
        QL1["👔 Quản lý CN1"]
        TN1A["🧑‍💼 Thu ngân A"]
        TN1B["🧑‍💼 Thu ngân B"]
    end

    subgraph CN2["🏪 Chi nhánh bán lẻ 2"]
        QL2["👔 Quản lý CN2"]
        TN2A["🧑‍💼 Thu ngân C"]
    end

    ADMIN -->|"Cấp vốn"| KE_TOAN
    ADMIN -->|"Duyệt lương cho"| KE_TOAN
    KE_TOAN -->|"Duyệt chi lương cho"| QL1
    KE_TOAN -->|"Duyệt chi lương cho"| QL2
    KE_TOAN -->|"Thanh toán cho"| NCC["🚚 Nhà cung cấp"]
    NCC -->|"Giao hàng đến"| THU_KHO
    THU_KHO -->|"Xuất hàng cho"| QL1
    THU_KHO -->|"Xuất hàng cho"| QL2
    QL1 -->|"Xác nhận giờ làm của"| TN1A
    QL1 -->|"Xác nhận giờ làm của"| TN1B
    QL2 -->|"Xác nhận giờ làm của"| TN2A
```

**Nguyên tắc vàng:** Không ai tự duyệt lương cho chính mình.

---

## 1. THU NGÂN (Cashier)

> **Mục tiêu:** Tập trung 100% vào việc bán hàng. Không cần quan tâm đến kho, lương hay tài chính.  
> **Nơi làm việc:** Cửa hàng bán lẻ  
> **Màn hình chính:** POS (Bán hàng)

### Luồng 1.1: Bắt đầu / Kết thúc ca làm việc

```mermaid
flowchart LR
    A["🔑 Đăng nhập"] --> B["⏰ Bấm Check-in"]
    B --> C["💼 Làm việc cả ca"]
    C --> D["💵 Bàn giao tiền két cho Quản lý"]
    D --> E["⏰ Bấm Check-out"]
    E --> F["📝 Hệ thống ghi nhận<br/>tong_gio vào bảng cham_cong"]
```

### Luồng 1.2: Bán hàng (Nghiệp vụ cốt lõi)

```mermaid
flowchart LR
    A["📱 Quét mã vạch<br/>sản phẩm"] --> B["🛒 Hệ thống hiện tên,<br/>giá bán, cộng dồn"]
    B --> C["💰 Nhập Tiền khách đưa"]
    C --> D["🧮 Hệ thống tính<br/>Tiền thối lại"]
    D --> E["✅ Bấm Hoàn tất<br/>& In Bill"]
```

**Khi bấm Hoàn tất, hệ thống thực hiện đồng thời:**
1. Tạo 1 dòng `hoa_don` + nhiều dòng `chi_tiet_hoa_don`.
2. Trừ `so_luong_ton` trong bảng `ton_kho` của chi nhánh.
3. Ghi 1 dòng `the_kho` (loại `BAN_HANG`, số lượng âm) cho mỗi sản phẩm.
4. Tạo 1 dòng `so_quy` (loại `THU`, hạng mục `BAN_HANG`) để ghi doanh thu.

---

## 2. QUẢN LÝ CHI NHÁNH (Store Manager)

> **Mục tiêu:** "Thuyền trưởng" của cửa hàng. Chịu trách nhiệm về Hàng hóa và Nhân sự tại chi nhánh đó.  
> **Nơi làm việc:** Cửa hàng bán lẻ  
> **Màn hình chính:** Tồn kho, Kiểm kê, Bảng lương, POS (nếu cần bán hàng)

### Luồng 2.1: Nhận hàng từ Kho Tổng

```mermaid
flowchart LR
    A["📞 Gọi báo Thủ kho:<br/>CN sắp hết hàng XYZ"] --> B["📦 Thủ kho tạo<br/>Phiếu Xuất Kho"]
    B --> C["✅ Hệ thống tự động<br/>cộng hàng vào<br/>Tồn kho Chi nhánh"]
    C --> D["👔 Quản lý CN mở<br/>phần mềm kiểm tra<br/>hàng đã vào"]
```

**Lưu ý:** Cửa hàng bán lẻ KHÔNG nhận hàng trực tiếp từ Nhà cung cấp. Mọi hàng hóa đều đi qua Kho Tổng trước.

### Luồng 2.2: Kiểm kê kho (Chống thất thoát)

```mermaid
flowchart LR
    A["📋 Tạo Phiếu Kiểm kê<br/>Trạng thái: DANG_KIEM_KE"] --> B["🔍 Đi đếm từng<br/>sản phẩm trên kệ"]
    B --> C["📝 Nhập số thực tế<br/>VD: Máy báo 30,<br/>đếm thấy 28"]
    C --> D["📌 Ghi lý do lệch<br/>VD: Khách ăn cắp"]
    D --> E["✅ Bấm Cân bằng kho"]
```

**Khi bấm Cân bằng kho, hệ thống thực hiện:**
1. Cập nhật `so_luong_ton` trong bảng `ton_kho` (từ 30 → 28).
2. Ghi 1 dòng `the_kho` (loại `CAN_BANG_KIEM_KE`, số lượng = -2) để lưu vết vĩnh viễn.
3. Chuyển trạng thái phiếu kiểm kê → `DA_CAN_BANG`.

### Luồng 2.3: Xác nhận giờ làm nhân viên (Duyệt lương Tầng 1)

```mermaid
flowchart LR
    A["📊 Hệ thống tổng hợp<br/>giờ làm tháng trước<br/>từ bảng cham_cong"] --> B["👔 Quản lý CN rà soát<br/>từng Thu ngân"]
    B --> C{"Giờ chính xác?"}
    C -->|"Đúng"| D["✅ Bấm Xác nhận<br/>Trạng thái → DA_XAC_NHAN"]
    C -->|"Sai"| E["✏️ Sửa giờ +<br/>Ghi lý do điều chỉnh"]
    E --> D
    D --> F["📤 Gửi lên cho<br/>Kế toán duyệt chi"]
```

**Quản lý chỉ thấy bảng lương của nhân viên TẠI chi nhánh mình.** Không xem được chi nhánh khác.

---

## 3. THỦ KHO (Warehouse Manager)

> **Mục tiêu:** Kiểm soát dòng chảy hàng hóa ra/vào Kho Tổng. Đảm bảo nguồn cung cho toàn chuỗi.  
> **Nơi làm việc:** Kho Tổng (Trụ sở)  
> **Màn hình chính:** Tồn kho Kho Tổng, Phiếu nhập, Phiếu xuất, Kiểm kê

### Luồng 3.1: Nhận hàng từ Nhà Cung Cấp (NCC)

```mermaid
flowchart LR
    A["🚚 Xe NCC giao hàng<br/>đến Kho Tổng"] --> B["📦 Thủ kho kiểm đếm<br/>đối chiếu với đơn hàng"]
    B --> C["📋 Tạo Phiếu Nhập<br/>Chọn NCC, nhập<br/>từng sản phẩm + số lượng"]
    C --> D["✅ Lưu Phiếu Nhập"]
```

**Khi lưu Phiếu Nhập, hệ thống thực hiện:**
1. Tạo 1 dòng `phieu_nhap` + nhiều dòng `chi_tiet_phieu_nhap`.
2. Cộng `so_luong_ton` trong bảng `ton_kho` của **Kho Tổng**.
3. Ghi 1 dòng `the_kho` (loại `NHAP_NCC`, số lượng dương) cho mỗi sản phẩm.
4. Tạo 1 dòng `so_quy` (loại `CHI`, hạng mục `NHAP_HANG`) để ghi chi phí mua hàng.

### Luồng 3.2: Xuất hàng cho Cửa hàng (Chi nhánh)

```mermaid
flowchart LR
    A["📞 Nhận yêu cầu<br/>từ Quản lý CN"] --> B["📋 Tạo Phiếu Xuất Kho<br/>Chọn CN đích + sản phẩm"]
    B --> C["✅ Xác nhận Xuất kho"]
```

**Khi xác nhận Xuất kho, hệ thống thực hiện TRANSACTION nguyên tử:**
1. Trừ `so_luong_ton` tại **Kho Tổng** (VD: -50 lon Coca).
2. Cộng `so_luong_ton` tại **Cửa hàng nhận** (VD: +50 lon Coca).
3. Ghi 2 dòng `the_kho`:
   - 1 dòng loại `XUAT_CHI_NHANH` (âm) tại Kho Tổng.
   - 1 dòng loại `NHAN_TU_KHO` (dương) tại Cửa hàng.

### Luồng 3.3: Kiểm kê Kho Tổng

Tương tự Luồng 2.2 của Quản lý CN, nhưng Thủ kho kiểm kê tại Kho Tổng. Cùng sử dụng bảng `phieu_kiem_ke` và `chi_tiet_kiem_ke`, chỉ khác `id_chi_nhanh` trỏ về Kho Tổng.

---

## 4. KẾ TOÁN (Accountant)

> **Mục tiêu:** Giữ "chìa khóa két sắt". Quản lý chặt chẽ Dòng tiền (Thu/Chi) của toàn mạng lưới.  
> **Nơi làm việc:** Trụ sở (HQ)  
> **Màn hình chính:** Sổ quỹ, Bảng lương, Báo cáo tài chính

### Luồng 4.1: Kiểm soát Doanh thu hàng ngày (Sổ quỹ)

```mermaid
flowchart LR
    A["💰 Kế toán mở<br/>màn hình Sổ Quỹ"] --> B["📊 Xem tổng quan<br/>Thu/Chi từng chi nhánh"]
    B --> C["🔍 Drill-down vào<br/>từng chi nhánh<br/>xem chi tiết"]
```

**Kế toán nhìn thấy gì trên Sổ Quỹ?**

| Ngày | Chi nhánh | Loại | Hạng mục | Diễn giải | Số tiền |
|:---|:---|:---:|:---|:---|---:|
| 01/08 | CN Quận 1 | THU | BAN_HANG | Doanh thu ca sáng (12 HĐ) | +1.850.000 |
| 01/08 | CN Quận 3 | THU | BAN_HANG | Doanh thu ca tối (8 HĐ) | +1.200.000 |
| 02/08 | Kho Tổng | CHI | NHAP_HANG | Nhập hàng từ NCC ABC | -5.000.000 |
| 31/08 | CN Quận 1 | CHI | TRA_LUONG | Lương T8 - Thu ngân A | -7.600.000 |

### Luồng 4.2: Duyệt chi trả lương (Duyệt Tầng 2)

```mermaid
flowchart LR
    A["📥 Nhận Bảng lương<br/>đã xác nhận từ<br/>Quản lý các CN"] --> B["🔍 Rà soát tổng<br/>quỹ lương từng CN"]
    B --> C{"Ngân sách<br/>đủ chi?"}
    C -->|"Đủ"| D["✅ Bấm Duyệt Chi<br/>Trạng thái → DA_THANH_TOAN"]
    C -->|"Thiếu"| E["⚠️ Báo cáo<br/>Admin/Giám đốc"]
    D --> F["💸 Chuyển khoản<br/>qua App Ngân hàng<br/>cho từng NV"]
```

**Khi bấm Duyệt Chi, hệ thống thực hiện:**
1. Chuyển trạng thái `bang_luong` → `DA_THANH_TOAN`.
2. Ghi `id_nguoi_duyet_chi` = ID Kế toán, `ngay_thanh_toan` = NOW.
3. Tạo 1 dòng `so_quy` (loại `CHI`, hạng mục `TRA_LUONG`) cho mỗi nhân viên.

**Quy tắc "Ai duyệt cho ai":**

| Nhân viên cần trả lương | Ai xác nhận giờ (Tầng 1) | Ai duyệt chi (Tầng 2) |
|:---|:---|:---|
| Thu ngân | Quản lý CN | Kế toán |
| Quản lý CN | *(Bỏ qua Tầng 1)* | Kế toán |
| Kế toán | *(Bỏ qua Tầng 1)* | Admin |
| Thủ kho | *(Bỏ qua Tầng 1)* | Kế toán |

### Luồng 4.3: Thanh toán cho Nhà Cung Cấp

```mermaid
flowchart LR
    A["📋 Xem Phiếu nhập<br/>hàng từ Thủ kho"] --> B["💸 Tạo Phiếu Chi<br/>hạng mục NHAP_HANG<br/>trong Sổ quỹ"]
    B --> C["🏦 Chuyển khoản<br/>cho NCC qua<br/>App Ngân hàng"]
```

---

## 5. ADMIN / GIÁM ĐỐC (Director)

> **Mục tiêu:** Nắm quyền tối cao, xem bức tranh tổng quan toàn chuỗi. Dùng được toàn bộ hệ thống.  
> **Nơi làm việc:** Trụ sở (HQ)  
> **Màn hình chính:** Dashboard, Quản trị hệ thống, toàn bộ các màn hình khác

### Luồng 5.1: Cấp vốn cho Kế toán

```mermaid
flowchart LR
    A["🏦 Admin chuyển tiền<br/>vào tài khoản công ty<br/>VD: 1 Tỷ VNĐ"] --> B["📋 Tạo Phiếu Thu<br/>hạng mục CAP_VON<br/>trong Sổ quỹ"]
    B --> C["💰 Kế toán thấy<br/>Số dư quỹ tăng lên<br/>-> Có tiền để chi"]
```

**Ý nghĩa:** Nếu Admin không cấp vốn, Sổ quỹ sẽ không có tiền, Kế toán không thể duyệt chi trả lương hay thanh toán NCC. Đây là cơ chế "Khóa van" để Admin kiểm soát dòng tiền.

### Luồng 5.2: Quản trị Hệ thống

| Hành động | Chi tiết |
|:---|:---|
| Quản lý Chi nhánh | Tạo mới / Khóa chi nhánh khi mở rộng hoặc đóng cửa hàng |
| Quản lý Nhân viên | Tạo / Khóa tài khoản. Gán vai trò. Gán chi nhánh |
| Quản lý Sản phẩm | Thêm / Sửa sản phẩm, danh mục, giá bán, giá vốn |
| Quản lý NCC | Thêm / Sửa nhà cung cấp |
| Duyệt lương Kế toán | Admin là người duy nhất duyệt lương cho Kế toán |

### Luồng 5.3: Xem Dashboard & Báo cáo

```mermaid
flowchart LR
    A["📊 Dashboard<br/>Tổng quan chuỗi"] --> B["📈 Doanh thu<br/>theo chi nhánh"]
    A --> C["📉 Chi phí<br/>Lương + Nhập hàng"]
    A --> D["💎 Lợi nhuận gộp<br/>= Thu - Chi"]
    A --> E["📦 Tồn kho<br/>Kho Tổng + Các CN"]
```

**Ví dụ Dashboard:**

| Tháng | Tổng Doanh thu | Chi Nhập hàng | Chi Lương | Lợi nhuận gộp |
|:---|---:|---:|---:|---:|
| 08/2026 | +150.000.000 | -80.000.000 | -40.000.000 | **+30.000.000** |

---

## TỔNG HỢP: DÒNG CHẢY HÀNG HÓA & DÒNG TIỀN

### Dòng chảy Hàng hóa (Vật lý)

```mermaid
flowchart LR
    NCC["🚚 Nhà Cung Cấp"] -->|"Giao hàng"| KHO["📦 Kho Tổng<br/>(Thủ kho nhận)"]
    KHO -->|"Phiếu Xuất Kho"| CN1["🏪 Chi nhánh 1<br/>(QL nhận hàng)"]
    KHO -->|"Phiếu Xuất Kho"| CN2["🏪 Chi nhánh 2<br/>(QL nhận hàng)"]
    CN1 -->|"Bán hàng (POS)"| KH1["👤 Khách hàng"]
    CN2 -->|"Bán hàng (POS)"| KH2["👤 Khách hàng"]
```

### Dòng chảy Tiền (Tài chính)

```mermaid
flowchart LR
    ADMIN["👑 Admin<br/>Cấp vốn"] -->|"+1 Tỷ VNĐ"| QUY["💰 Sổ Quỹ<br/>(Kế toán quản lý)"]
    KH["👤 Khách hàng<br/>mua hàng"] -->|"+Doanh thu"| QUY
    QUY -->|"-Chi nhập hàng"| NCC["🚚 Nhà Cung Cấp"]
    QUY -->|"-Chi trả lương"| NV["🧑‍💼 Nhân viên<br/>(Chuyển khoản)"]
```
