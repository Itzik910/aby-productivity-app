import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prevent concurrent refresh calls — one promise shared across all waiters
let refreshPromise: Promise<void> | null = null;

function forceLogout() {
  localStorage.removeItem('auth-storage');
  // Clear the Authorization header so no further requests carry the bad token
  delete api.defaults.headers.common['Authorization'];
  // Notify the rest of the app via a custom event so the Zustand auth store
  // can clear its in-memory state without creating a circular import.
  window.dispatchEvent(new CustomEvent('aby:force-logout'));
}

// Request interceptor — attach current token from localStorage
api.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem('auth-storage');
    if (raw) {
      try {
        const authData = JSON.parse(raw);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch {
        // malformed storage — ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — refresh once on 401, then force-logout if refresh also fails
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't intercept the refresh endpoint itself — would cause infinite loop
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
    if (isRefreshEndpoint) {
      forceLogout();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Deduplicate concurrent refresh calls
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const raw = localStorage.getItem('auth-storage');
          if (!raw) throw new Error('No stored credentials');

          const authData = JSON.parse(raw);
          const storedRefreshToken = authData.state?.refreshToken;
          if (!storedRefreshToken) throw new Error('No refresh token');

          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken: storedRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { token: newToken, refreshToken: newRefreshToken } = response.data.data;

          // Persist updated tokens
          const updatedAuthData = {
            ...authData,
            state: {
              ...authData.state,
              token: newToken,
              refreshToken: newRefreshToken,
            },
          };
          localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData));
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        await refreshPromise;
        // Re-attach the new token and retry
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const { state } = JSON.parse(raw);
          if (state?.token) {
            originalRequest.headers.Authorization = `Bearer ${state.token}`;
          }
        }
        return api(originalRequest);
      } catch {
        forceLogout();
        return Promise.reject(error);
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