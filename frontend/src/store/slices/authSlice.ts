import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../../config/rbacConfig';

interface AuthState {
    token: string | null;
    user: AuthUser | null;
}

const initialState: AuthState = {
    token: localStorage.getItem('token'),
    user: localStorage.getItem('authUser')
        ? (JSON.parse(localStorage.getItem('authUser') as string) as AuthUser)
        : null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action: PayloadAction<{ token: string; user: AuthUser }>) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            localStorage.setItem('token', action.payload.token);
            localStorage.setItem('authUser', JSON.stringify(action.payload.user));
        },
        logout: (state) => {
            state.token = null;
            state.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('authUser');
        },
    },
});

export const { loginSuccess, logout } = authSlice.actions;

export default authSlice.reducer;
