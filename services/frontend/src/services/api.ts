import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: đính kèm Bearer token nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pbl6_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: chỉ xử lý lỗi, KHÔNG tự động reload trang bừa bãi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu token hết hạn (401) khi đang gọi API khác (không phải /auth/login), xóa phiên
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('pbl6_token');
      localStorage.removeItem('pbl6_user');
      if (window.location.pathname !== '/login') {
        window.location.pathname = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
