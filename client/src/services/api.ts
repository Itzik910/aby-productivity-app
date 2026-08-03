import axios from 'axios';

// Only these HTTP methods are safe to auto-replay on a lost response — they
// can't have caused a server-side write, unlike POST/PUT/PATCH/DELETE.
const SAFE_RETRY_METHODS = new Set(['get', 'head', 'options']);

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

export function forceLogout() {
  localStorage.removeItem('auth-storage');
  // Clear the Authorization header so no further requests carry the bad token
  delete api.defaults.headers.common['Authorization'];
  // Notify the rest of the app via a custom event so the Zustand auth store
  // can clear its in-memory state without creating a circular import.
  window.dispatchEvent(new CustomEvent('aby:force-logout'));
}

/**
 * Refreshes the access token using the stored refresh token, persists the
 * new tokens, and returns the new access token. Shares the same dedup
 * promise as the axios response interceptor below, so a raw `fetch()` call
 * (which can't go through that interceptor — see useTaskStream.ts) and a
 * concurrent axios 401 both trigger at most one refresh request.
 */
export function refreshAuthToken(): Promise<string> {
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

  return refreshPromise.then(() => {
    const raw = localStorage.getItem('auth-storage');
    const token = raw ? JSON.parse(raw).state?.token : null;
    if (!token) throw new Error('Refresh did not yield a token');
    return token;
  });
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

    // A pure timeout/network error (no response at all) on the *first* call
    // after the app loads is almost always our free-tier host spinning back
    // up from sleep, which can take up to a minute — the 10s default timeout
    // isn't a real failure there. Retry once with a much longer timeout
    // instead of surfacing a scary "failed" message for what's just a cold
    // start.
    const isTimeoutOrNetworkError =
      !error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error');
    if (isTimeoutOrNetworkError && originalRequest && !originalRequest._coldStartRetry) {
      const method = (originalRequest.method || 'get').toLowerCase();
      if (SAFE_RETRY_METHODS.has(method)) {
        originalRequest._coldStartRetry = true;
        originalRequest.timeout = 60000;
        window.dispatchEvent(new CustomEvent('aby:server-waking'));
        return api(originalRequest);
      }

      // A lost response on a mutating request (POST/PUT/PATCH/DELETE) means
      // we cannot know whether the server-side write already happened —
      // blindly replaying it here is exactly what caused registration to
      // create a user, lose the response, then have the retry correctly
      // (but confusingly) get rejected as "already exists". Surface a
      // distinct, honest error instead of silently retrying a write.
      originalRequest._coldStartRetry = true;
      error.isColdStartMutationTimeout = true;
      window.dispatchEvent(new CustomEvent('aby:server-waking-mutation'));
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAuthToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
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