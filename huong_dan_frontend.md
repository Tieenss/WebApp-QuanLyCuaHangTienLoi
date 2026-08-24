# Hướng Dẫn Chuẩn Code Frontend (React + Ant Design)

> **Dự án:** ERP Chuỗi Cửa Hàng Tiện Lợi
> **Tech Stack:** React (Vite) + TypeScript + Ant Design + Redux Toolkit
> **Mục tiêu:** Đảm bảo toàn bộ team Frontend code đồng bộ, dễ bảo trì, dễ nâng cấp và thống nhất UI/UX.

---

## 1. Cấu Trúc Thư Mục (Trong Monorepo `frontend/`)

Để dễ quản lý, toàn bộ mã nguồn Frontend đặt trong thư mục `frontend/src/` với cấu trúc sau:

```text
frontend/src/
├── assets/          # Hình ảnh, icon, font chữ
├── components/      # Các component dùng chung (Nút bấm custom, Modal confirm...)
├── config/          # Cấu hình môi trường, hằng số (constants)
├── features/        # Các module tính năng (Khuyên dùng theo Feature-Sliced Design)
│   ├── pos/         # Tính năng bán hàng
│   ├── inventory/   # Tính năng kho
│   └── auth/        # Tính năng đăng nhập
├── hooks/           # Custom React hooks (useAuth, useDebounce...)
├── layouts/         # Layout components (MainLayout, AuthLayout, PosLayout)
├── pages/           # Các trang chính (kết nối layouts và features)
├── router/          # Định nghĩa React Router
├── store/           # Redux store, root reducer
├── styles/          # SCSS biến cục bộ, mixins, global styles
├── types/           # TypeScript interfaces & types toàn cục
└── utils/           # Helper functions (formatCurrency, formatDate, axios instance)
```

## 2. Quản Lý UI/UX với Ant Design (antd)

### 2.1. Không ghi đè CSS trực tiếp nếu không cần thiết
Ant Design cung cấp sẵn `ConfigProvider` để tùy chỉnh Theme (màu sắc, border radius, font) ở mức toàn cục. **Bắt buộc** sử dụng `ConfigProvider` ở file root (`App.tsx`) thay vì viết CSS đè lên các class `.ant-*` một cách thủ công.

```tsx
// App.tsx
import { ConfigProvider } from 'antd';

const themeConfig = {
  token: {
    colorPrimary: '#1677ff', // Màu chủ đạo của ERP
    borderRadius: 6,         // Độ bo góc chuẩn
    fontFamily: '"Inter", sans-serif',
  },
  components: {
    Button: {
      controlHeight: 36, // Chiều cao nút chuẩn
    },
    Table: {
      headerBg: '#f0f2f5', // Màu nền header bảng
    }
  }
};

const App = () => (
  <ConfigProvider theme={themeConfig}>
    <RouterProvider router={router} />
  </ConfigProvider>
);
```

### 2.2. Quy tắc sử dụng Component
- **Form:** BẮT BUỘC dùng `<Form>` của antd. Không dùng thẻ `<form>` HTML thuần để tận dụng tính năng validate tự động của antd.
- **Table:** Dùng `<Table>` của antd cho các danh sách dữ liệu. Kết hợp với tính năng `pagination` và `loading` có sẵn.
- **Notification/Message:** Thống nhất dùng `App.useApp()` của antd (ở bản v5) để gọi thông báo (toast) toàn cục nhằm đảm bảo styling chuẩn xác.

## 3. Quy Tắc Viết CSS / SCSS

Dù có Ant Design, bạn vẫn sẽ cần SCSS cho các layout phức tạp hoặc custom component:
1. **SCSS Module:** Mỗi component nên đi kèm một file `.module.scss` (VD: `PosCart.tsx` đi kèm `PosCart.module.scss`).
2. **Không dùng thẻ HTML làm selector:** Hạn chế viết `div { ... }` trong SCSS. Hãy dùng class name (vd: `.cartContainer`).
3. **Sử dụng Variables chung:** Khai báo các màu sắc không thuộc Ant Design hoặc mixins vào `src/styles/_variables.scss` và import vào các module cần dùng.

## 4. Quản Lý State (Redux Toolkit)

- **Redux chỉ dùng cho Global State:** (Phiên đăng nhập, Giỏ hàng POS, Thông tin cấu hình chi nhánh hiện tại).
- **KHÔNG lưu Local State vào Redux:** (Trạng thái mở/đóng Modal, value của 1 thẻ input nhỏ) -> Dùng `useState`.
- **Cấu trúc Slice:** Tạo các Slice riêng biệt trong `src/store/slices/`. Ví dụ `authSlice.ts`, `posSlice.ts`.
- **Cập nhật State bất đồng bộ:** Bắt buộc dùng `createAsyncThunk` của Redux Toolkit để call API và handle các trạng thái `pending`, `fulfilled`, `rejected`.

```typescript
// Ví dụ chuẩn file Slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PosState {
  cart: CartItem[];
  branchId: string | null;
}

const initialState: PosState = { cart: [], branchId: null };

export const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      // RTK dùng ImmerJS, được phép mutate state trực tiếp
      state.cart.push(action.payload); 
    },
  },
});

export const { addToCart } = posSlice.actions;
export default posSlice.reducer;
```

## 5. Quy Chuẩn Viết Code React (TypeScript)

1. **Functional Component:** 100% sử dụng Functional Component và Hooks. (Không dùng Class Component).
2. **Khai báo Type rõ ràng:** Bất kỳ Props nào truyền vào Component đều phải có `interface`.
    ```tsx
    interface ProductCardProps {
      product: ProductType;
      onAdd: (id: string) => void;
    }
    const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => { ... }
    ```
3. **Tách nhỏ Component:** Nếu một file vượt quá 200-300 dòng code, hãy suy nghĩ đến việc tách các phần UI thành các component con nhỏ hơn.

## 6. Gọi API và Xử lý Lỗi

- **Axios Instance:** Sử dụng một Axios Instance duy nhất tại `src/utils/axiosClient.ts`.
- **Interceptor:** Cấu hình interceptor để tự động gắn `Authorization: Bearer <token>` vào request và xử lý tự động `401 Unauthorized` (để refresh token hoặc đá văng ra màn hình đăng nhập).
- Thống nhất trả về thông báo lỗi cho người dùng thông qua Ant Design `message.error("Lỗi: ...")` ngay trong Interceptor để tránh lặp code.
