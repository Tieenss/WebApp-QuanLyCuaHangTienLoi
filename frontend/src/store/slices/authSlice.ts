import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  AUTH_STORAGE_KEY,
} from '@/config/brand';
import {
  SYSTEM_WIDE_ROLES,
  type AuthUser,
  type ChangePasswordFormValues,
  type LoginFormValues,
  type ProfileFormValues,
  type UserRole,
} from '@/types';
import { accountByRole, findAccount } from '@/mockData/accounts';
import { initialsOf } from '@/utils/formatters';

/**
 * Module 0 – State đăng nhập & phân quyền.
 *
 * Không có backend nên phiên đăng nhập được giữ trong localStorage. Khi nối API
 * thật, `login` sẽ chuyển thành `createAsyncThunk` gọi endpoint xác thực.
 */

/** Phần dữ liệu phiên được lưu xuống localStorage. */
interface PersistedSession {
  user: AuthUser;
  activeBranchId: string | null;
}
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Chi nhánh đang xem; `null` nghĩa là toàn chuỗi (chỉ Admin chuỗi được phép). */
  activeBranchId: string | null;
  isSubmitting: boolean;
  /** Thông báo lỗi đăng nhập để hiển thị Alert trên form. */
  error: string | null;
  /**
   * Mật khẩu hiện tại của phiên, giữ trong bộ nhớ để trang Đổi mật khẩu có thứ
   * đối chiếu. Bản MVP không có backend nên đây là cách duy nhất để chức năng
   * đổi mật khẩu phản hồi đúng/sai; khi nối API thật, trường này bị xoá và
   * việc xác thực chuyển hẳn về server.
   *
   * Cố tình KHÔNG ghi xuống localStorage (xem `PersistedSession`).
   */
  sessionPassword: string | null;
}

/** Đọc lại phiên đã lưu; trả về `null` nếu không có hoặc dữ liệu hỏng. */
const readPersistedSession = (): PersistedSession | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'user' in parsed &&
      'activeBranchId' in parsed
    ) {
      return parsed as PersistedSession;
    }
    return null;
  } catch {
    // localStorage có thể bị chặn (private mode) hoặc dữ liệu cũ không tương thích.
    return null;
  }
};

/** Ghi phiên xuống localStorage, bỏ qua lỗi nếu storage không khả dụng. */
const writePersistedSession = (session: PersistedSession | null): void => {
  try {
    if (session === null) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Không chặn luồng đăng nhập nếu không ghi được storage.
  }
};

/**
 * Chi nhánh mặc định khi một vai trò đăng nhập.
 *
 * ADMIN và KE_TOAN làm việc trên số liệu tổng hợp nên bắt đầu ở chế độ
 * "Toàn chuỗi" (`null`). THU_KHO, QUAN_LY, THU_NGAN gắn với một điểm cụ thể
 * (Kho Tổng hoặc cửa hàng) nên mở đúng chi nhánh của họ.
 */
const defaultBranchFor = (user: AuthUser): string | null =>
  SYSTEM_WIDE_ROLES.includes(user.role) ? null : user.branchId;

const restored = readPersistedSession();

const initialState: AuthState = {
  user: restored?.user ?? null,
  isAuthenticated: restored !== null,
  activeBranchId: restored?.activeBranchId ?? null,
  isSubmitting: false,
  error: null,
  // Phiên khôi phục từ localStorage không mang theo mật khẩu, nên trang Đổi
  // mật khẩu sẽ yêu cầu đăng nhập lại thay vì cho đổi mù.
  sessionPassword: null,
};

/** Bỏ mật khẩu khỏi tài khoản demo trước khi đưa vào state. */
const toAuthUser = (account: ReturnType<typeof accountByRole>): AuthUser => {
  const { username: _username, password: _password, ...user } = account;
  return user;
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Bật cờ loading khi form đăng nhập submit. */
    loginStarted: (state) => {
      state.isSubmitting = true;
      state.error = null;
    },

    /** Xác thực tài khoản demo và mở phiên nếu hợp lệ. */
    loginSucceeded: (state, action: PayloadAction<LoginFormValues>) => {
      const account = findAccount(action.payload.username);

      if (!account || account.password !== action.payload.password) {
        state.isSubmitting = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = 'Tên đăng nhập hoặc mật khẩu không đúng.';
        return;
      }

      const user = toAuthUser(account);
      state.user = user;
      state.isAuthenticated = true;
      state.activeBranchId = defaultBranchFor(user);
      state.isSubmitting = false;
      state.error = null;
      state.sessionPassword = account.password;

      if (action.payload.remember) {
        writePersistedSession({ user, activeBranchId: state.activeBranchId });
      } else {
        writePersistedSession(null);
      }
    },

    /**
     * Chuyển đổi vai trò nhanh (tính năng demo).
     * Dùng để trình diễn phân quyền mà không cần đăng xuất/đăng nhập lại.
     */
    switchRole: (state, action: PayloadAction<UserRole>) => {
      const account = accountByRole(action.payload);
      const user = toAuthUser(account);
      state.user = user;
      state.isAuthenticated = true;
      state.activeBranchId = defaultBranchFor(user);
      state.error = null;
      state.sessionPassword = account.password;
      writePersistedSession({ user, activeBranchId: state.activeBranchId });
    },

    /** Đổi chi nhánh đang xem. */
    setActiveBranch: (state, action: PayloadAction<string | null>) => {
      state.activeBranchId = action.payload;
      if (state.user) {
        writePersistedSession({ user: state.user, activeBranchId: action.payload });
      }
    },

    /** Xoá thông báo lỗi trên form. */
    clearAuthError: (state) => {
      state.error = null;
    },

    /**
     * Cập nhật hồ sơ cá nhân của người đang đăng nhập.
     *
     * Chỉ sửa được tên, email, điện thoại. Vai trò và chi nhánh do quản trị
     * cấp nên không nhận từ payload — tránh việc người dùng tự nâng quyền.
     */
    updateProfile: (state, action: PayloadAction<ProfileFormValues>) => {
      if (state.user === null) return;

      state.user = {
        ...state.user,
        fullName: action.payload.fullName.trim(),
        email: action.payload.email.trim(),
        phone: action.payload.phone.trim(),
        // Chữ viết tắt trên avatar suy ra từ tên nên phải tính lại.
        avatarText: initialsOf(action.payload.fullName),
      };
      state.error = null;

      // Chỉ ghi lại nếu phiên trước đó đã được lưu, để không âm thầm bật
      // "ghi nhớ đăng nhập" mà người dùng không chọn.
      if (readPersistedSession() !== null) {
        writePersistedSession({
          user: state.user,
          activeBranchId: state.activeBranchId,
        });
      }
    },

    /**
     * Đổi mật khẩu của phiên hiện tại.
     *
     * Việc xác thực (mật khẩu cũ đúng, mật khẩu mới khác cũ, hai lần nhập
     * khớp nhau) do form đảm nhiệm — antd hiển thị lỗi ngay tại field liên
     * quan, sát chỗ người dùng cần sửa. Reducer chỉ giữ vai trò cổng chặn cuối
     * để state không bị ghi sai khi được gọi từ nơi khác.
     */
    changePassword: (state, action: PayloadAction<ChangePasswordFormValues>) => {
      if (state.user === null || state.sessionPassword === null) return;
      if (action.payload.currentPassword !== state.sessionPassword) return;

      state.sessionPassword = action.payload.newPassword;
      state.error = null;
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.activeBranchId = null;
      state.isSubmitting = false;
      state.error = null;
      state.sessionPassword = null;
      writePersistedSession(null);
    },
  },
});

export const {
  loginStarted,
  loginSucceeded,
  switchRole,
  setActiveBranch,
  clearAuthError,
  updateProfile,
  changePassword,
  logout,
} = authSlice.actions;

export default authSlice.reducer;