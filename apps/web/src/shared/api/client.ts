import axios, { AxiosError } from 'axios';
import { nanoid } from 'nanoid';
import { useAuthStore } from '../stores/auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-ID'] = nanoid();
  if (['post', 'put', 'patch', 'delete'].includes((config.method ?? '').toLowerCase())) {
    config.headers['Idempotency-Key'] = config.headers['Idempotency-Key'] ?? nanoid();
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest!.headers!.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest!);
        });
      }

      originalRequest!._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        const newAccess: string = res.data.access;
        const newRefresh: string = res.data.refresh ?? refreshToken;

        useAuthStore.getState().setTokens(newAccess, newRefresh);
        processQueue(null, newAccess);

        originalRequest!.headers!.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest!);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      const msg = (error.response.data as any)?.detail ?? 'Недостаточно прав';
      import('sonner').then(({ toast }) => toast.error(msg));
    }

    if ((error.response?.status ?? 0) >= 500) {
      import('sonner').then(({ toast }) =>
        toast.error('Ошибка сервера. Попробуйте позже.')
      );
    }

    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, params?: object) =>
    apiClient.get<T>(url, { params }).then((r) => r.data),
  post: <T>(url: string, data?: object) =>
    apiClient.post<T>(url, data).then((r) => r.data),
  patch: <T>(url: string, data?: object) =>
    apiClient.patch<T>(url, data).then((r) => r.data),
  put: <T>(url: string, data?: object) =>
    apiClient.put<T>(url, data).then((r) => r.data),
  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then((r) => r.data),
};
