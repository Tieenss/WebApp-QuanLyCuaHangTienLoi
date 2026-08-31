import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
import { authApi } from '@/api/auth';
import { initialsOf } from '@/utils/formatters';

export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async (values: LoginFormValues, { rejectWithValue }) => {
    try {
      const result = await authApi.login(values);
      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

interface PersistedSession {
  user: AuthUser;
  activeBranchId: string | null;
  token: string;
}
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  activeBranchId: string | null;
  isSubmitting: boolean;
  error: string | null;
  token: string | null;
}

const readPersistedSession = (): PersistedSession | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'user' in parsed && 'activeBranchId' in parsed) {
      return parsed as PersistedSession;
    }
    return null;
  } catch {
    return null;
  }
};

const writePersistedSession = (session: PersistedSession | null): void => {
  try {
    if (session === null) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
  }
};

const defaultBranchFor = (user: AuthUser): string | null =>
  SYSTEM_WIDE_ROLES.includes(user.role) ? null : user.branchId;

const restored = readPersistedSession();

const initialState: AuthState = {
  user: restored?.user ?? null,
  isAuthenticated: restored !== null,
  activeBranchId: restored?.activeBranchId ?? null,
  isSubmitting: false,
  error: null,
  token: restored?.token ?? null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStarted: (state) => {
      state.isSubmitting = true;
      state.error = null;
    },
    loginSucceeded: (state) => {
      state.isSubmitting = false;
      state.error = null;
    },
    switchRole: (_state, _action: PayloadAction<UserRole>) => {
    },
    setActiveBranch: (state, action: PayloadAction<string | null>) => {
      state.activeBranchId = action.payload;
      if (state.user) {
        writePersistedSession({ user: state.user, activeBranchId: action.payload, token: state.token || '' });
      }
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action: PayloadAction<ProfileFormValues>) => {
      if (state.user === null) return;
      state.user = {
        ...state.user,
        fullName: action.payload.fullName.trim(),
        email: action.payload.email.trim(),
        phone: action.payload.phone.trim(),
        avatarText: initialsOf(action.payload.fullName),
      };
      state.error = null;
      if (readPersistedSession() !== null) {
        writePersistedSession({ user: state.user, activeBranchId: state.activeBranchId, token: state.token || '' });
      }
    },
    changePassword: (_state, _action: PayloadAction<ChangePasswordFormValues>) => {
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.activeBranchId = null;
      state.isSubmitting = false;
      state.error = null;
      state.token = null;
      writePersistedSession(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.activeBranchId = defaultBranchFor(action.payload.user);
        state.token = action.payload.token;
        state.error = null;
        localStorage.setItem('auth_token', action.payload.token);
        writePersistedSession({
          user: action.payload.user,
          activeBranchId: defaultBranchFor(action.payload.user),
          token: action.payload.token,
        });
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isSubmitting = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = action.payload as string;
      });
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
