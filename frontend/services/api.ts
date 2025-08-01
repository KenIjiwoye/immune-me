import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tricky-cooks-mate.loca.lt/api';

console.log('API URL configured as:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      data: config.data,
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    });
    return Promise.reject(error);
  }
);

// Set auth token for API requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default {
  // Auth endpoints
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  
  // Helper method to set auth token
  setAuthToken,
  
  // Dashboard endpoints
  getDashboardStats: () => api.get('/dashboard/stats'),
  getDueNotifications: () => api.get('/notifications/due'),
  
  // Notifications endpoints
  getNotifications: (params?: { page?: number; limit?: number; status?: string }) => 
    api.get('/notifications', { params }),
  getNotification: (id: number) => api.get(`/notifications/${id}`),
  updateNotificationStatus: (id: number, status: string) => 
    api.put(`/notifications/${id}`, { status }),
  
  // Expose axios methods
  get: api.get,
  post: api.post,
  put: api.put,
  delete: api.delete,
};
