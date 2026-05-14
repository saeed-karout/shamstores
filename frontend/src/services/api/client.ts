// frontend/src/services/api/client.ts

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { getCurrentSubdomain, isMainDomain } from '../../utils/subdomain';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getApiBaseUrl = (): string => API_URL;
export { getCurrentSubdomain, isMainDomain };

// تكوين المسارات العامة والخاصة
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/register-store', '/auth/user/register'];
const PUBLIC_PREFIXES = ['/menu/public', '/menu/share', '/tables/', '/orders/track', '/delivery/login', '/public'];
const PROTECTED_PATHS = ['/orders/my-orders', '/orders/stats', '/orders/today', '/store/orders', '/store/inventory', '/store/products'];
const SILENT_ERROR_PATHS = ['/plans/current/me', '/restaurants/profile', '/store/profile', '/orders/stats', '/menu/items', '/store/inventory/stats'];

const isPublicPath = (url: string = ''): boolean => {
  if (PUBLIC_PATHS.some(path => url.startsWith(path))) return true;
  if (PUBLIC_PREFIXES.some(prefix => url.startsWith(prefix) && !PROTECTED_PATHS.some(p => url.startsWith(p)))) return true;
  return false;
};

const isSilentPath = (url: string = ''): boolean => SILENT_ERROR_PATHS.some(path => url.includes(path));

class ApiClient {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

  constructor() {
    console.log('🌐 API Base URL:', API_URL);
    
    this.api = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor(): void {
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const currentSubdomain = getCurrentSubdomain();
      const isMain = isMainDomain();
      
      if (currentSubdomain && !isMain) {
        config.headers['X-Subdomain'] = currentSubdomain;
      }

      const isAuthEndpoint = config.url?.includes('/auth/');
      const isPublicEndpoint = config.url?.startsWith('/public');
      const isPublic = isPublicPath(config.url);
      
      if (!isAuthEndpoint && !isPublicEndpoint && !isPublic) {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      return config;
    }, (error) => Promise.reject(error));
  }

  private setupResponseInterceptor(): void {
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        if (isSilentPath(originalRequest?.url)) {
          return Promise.reject(error);
        }

        if (error.response?.status === 403) {
          this.handleForbiddenError(error);
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest?._retry && !this.isOnAuthPage()) {
          return this.handleUnauthorizedError(originalRequest, error);
        }

        if (error.response?.data?.error && error.response.status !== 401 && error.response.status !== 404) {
          toast.error(error.response.data.error);
        } else if (!this.isSilentError(error)) {
          toast.error('حدث خطأ في الاتصال بالخادم');
        }
        
        return Promise.reject(error);
      }
    );
  }

  private handleForbiddenError(error: AxiosError): void {
    const errorMessage = error.response?.data?.error || 'لا تملك صلاحية الوصول';
    toast.error(errorMessage);
    
    if (error.config?.url?.includes('/store/') && !localStorage.getItem('user')?.includes('storeId')) {
      window.location.href = '/dashboard';
    }
    if (error.config?.url?.includes('/menu') && !localStorage.getItem('user')?.includes('restaurantId')) {
      window.location.href = '/dashboard';
    }
  }

  private handleUnauthorizedError(originalRequest: any, error: AxiosError): Promise<never> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject: () => resolve(originalRequest) });
      }).then(() => this.api(originalRequest));
    }

    originalRequest._retry = true;
    this.isRefreshing = true;

    this.clearAuthAndRedirect();
    this.isRefreshing = false;
    
    return Promise.reject(error);
  }

  private clearAuthAndRedirect(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const redirectMap: Record<string, string> = {
          delivery_driver: '/delivery/login',
          super_admin: '/login',
          owner: '/login',
        };
        window.location.href = redirectMap[user.role] || '/user/login';
      } catch {
        window.location.href = '/user/login';
      }
    } else {
      if (window.location.pathname.includes('/driver/')) window.location.href = '/delivery/login';
      else if (window.location.pathname.includes('/admin/')) window.location.href = '/login';
      else window.location.href = '/user/login';
    }
    
    toast.error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
  }

  private isOnAuthPage(): boolean {
    const path = window.location.pathname;
    return path === '/login' || path === '/user/login' || path === '/delivery/login' || path === '/';
  }

  private isSilentError(error: AxiosError): boolean {
    const path = window.location.pathname;
    const isPublicPage = path === '/' || (!path.startsWith('/user/') && !path.startsWith('/dashboard') && 
                          !path.startsWith('/admin') && !path.startsWith('/login') && !path.startsWith('/register'));
    return error.response?.status === 401 || error.response?.status === 404 || isPublicPage;
  }

  // دوال HTTP الأساسية
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url);
    return response.data;
  }

  async upload<T>(url: string, file: File, type: string = 'general'): Promise<T> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    
    const response = await this.api.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  getInstance(): AxiosInstance {
    return this.api;
  }
}

export const apiClient = new ApiClient();
export default apiClient;