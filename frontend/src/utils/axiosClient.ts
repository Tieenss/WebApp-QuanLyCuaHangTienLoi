import axios from 'axios';
import { message } from 'antd';

// Base URL configured for external Backend API (Spring Boot / Node / Dotnet)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Auto-attach Auth Bearer Token if logged in
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Standardized error handling
axiosClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;
        const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi kết nối đến máy chủ!';

        if (status === 401) {
            message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
            localStorage.removeItem('token');
        } else if (status === 403) {
            message.error('Bạn không có quyền thực hiện thao tác này!');
        } else if (status >= 500) {
            message.error(`Lỗi hệ thống máy chủ (${status}): ${errorMessage}`);
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
