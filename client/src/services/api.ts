import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const authData = JSON.parse(token);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const token = localStorage.getItem('auth-storage');
        if (token) {
          const authData = JSON.parse(token);
          if (authData.state?.refreshToken) {
            const response = await api.post('/auth/refresh', {
              refreshToken: authData.state.refreshToken,
            });

            const { token: newToken, refreshToken: newRefreshToken } = response.data.data;

            // Update stored tokens
            const updatedAuthData = {
              ...authData,
              state: {
                ...authData.state,
                token: newToken,
                refreshToken: newRefreshToken,
              },
            };
            localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData));

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('auth-storage');
        // Don't use hard redirect as it interferes with React Router
        // Let the ProtectedRoute component handle this naturally
        console.warn('[API] Token refresh failed, auth state cleared. ProtectedRoute will handle redirect.');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
  },

  // Tasks
  tasks: {
    list: '/tasks',
    create: '/tasks',
    get: (id: string) => `/tasks/${id}`,
    update: (id: string) => `/tasks/${id}`,
    delete: (id: string) => `/tasks/${id}`,
    complete: (id: string) => `/tasks/${id}/complete`,
    duplicate: (id: string) => `/tasks/${id}/duplicate`,
  },

  // AI
  ai: {
    suggestions: (taskId: string) => `/ai/suggestions/${taskId}`,
    feedback: (usageId: string) => `/ai/feedback/${usageId}`,
    analytics: '/ai/analytics',
  },

  // Analytics
  analytics: {
    dashboard: '/analytics/dashboard',
    tasks: '/analytics/tasks',
    productivity: '/analytics/productivity',
    insights: '/analytics/insights',
  },

  // Achievements
  achievements: {
    list: '/achievements',
    share: (id: string) => `/achievements/${id}/share`,
  },

  // Challenges
  challenges: {
    list: '/challenges',
    join: (id: string) => `/challenges/${id}/join`,
    leave: (id: string) => `/challenges/${id}/leave`,
    progress: (id: string) => `/challenges/${id}/progress`,
  },

  // User
  user: {
    profile: '/users/profile',
    update: '/users/profile',
    avatar: '/users/avatar',
    preferences: '/users/preferences',
    stats: '/users/stats',
  },

  // Notifications
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    settings: '/notifications/settings',
  },

  // Payments
  payments: {
    createSubscription: '/payments/subscription',
    cancelSubscription: '/payments/subscription/cancel',
    updatePaymentMethod: '/payments/payment-method',
    invoices: '/payments/invoices',
  },
};

export default api; 