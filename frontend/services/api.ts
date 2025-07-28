import axios from 'axios';

const API_URL = 'https://tricky-cooks-mate.loca.lt/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
