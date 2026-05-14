// services/api.ts

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse } from './types';
import toast from 'react-hot-toast';
import { getCurrentSubdomain, isMainDomain } from '../utils/subdomain';

// ✅ ثابت واحد للـ base URL مع /api دائماً
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ==================== Re-export subdomain utilities ====================
export { getCurrentSubdomain, isMainDomain };

// ==================== دالة مساعدة بسيطة (تعيد الرابط نفسه دائماً) ====================
export const getApiBaseUrl = (): string => {
  return API_URL;
};

class ApiService {
  private api: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: any[] = [];
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/register-store',
    '/menu/public',
    '/menu/share',
    '/tables/',
    '/orders/track',
    '/delivery/login',
    '/public',      // للمسار العام
  ];

  private protectedPaths = [
    '/orders/my-orders',
    '/orders/stats',
    '/orders/today',
    '/store/orders',
    '/store/inventory',
    '/store/products',
    '/public/categories',
    '/public/menu-items',
  ];

  private silentErrorPaths = [
    '/plans/current/me',
    '/restaurants/profile',
    '/store/profile',
    '/orders/stats',
    '/menu/items',
    '/store/inventory/stats',
  ];

  constructor() {
    console.log('🌐 API Base URL:', API_URL);
    
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // ✅ Interceptor للطلبات – إضافة X-Subdomain header والتوكن
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // ==================== إضافة X-Subdomain header ====================
        const currentSubdomain = getCurrentSubdomain();
        const isMain = isMainDomain();
        
        if (currentSubdomain && !isMain) {
          config.headers['X-Subdomain'] = currentSubdomain;
          console.log('🌐 Added X-Subdomain header:', currentSubdomain);
        }

        // ==================== إضافة التوكن للمسارات المحمية ====================
        const isAuthEndpoint = config.url?.includes('/auth/login') || 
                               config.url?.includes('/auth/register') ||
                               config.url?.includes('/auth/register-store');
        
        const isPublicEndpoint = config.url?.startsWith('/public');
        
        if (isAuthEndpoint || isPublicEndpoint) {
          console.log('🔑 Auth/Public endpoint, skipping token addition');
          return config;
        }
        
        const token = localStorage.getItem('token');
        
        const isPublicPath = this.publicPaths.some(path => 
          config.url?.startsWith(path) && !this.protectedPaths.some(p => config.url?.startsWith(p))
        );

        if (token && !isPublicPath && !isAuthEndpoint && !isPublicEndpoint) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Token added to request headers');
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor للردود (نفس الكود القديم بدون تغيير جوهري)
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ Response received:', response.config.url);
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as any;
        
        console.log('❌ Response error:', {
          url: originalRequest?.url,
          status: error.response?.status,
          data: error.response?.data
        });
        
        const isPublicPath = this.publicPaths.some(path => 
          originalRequest?.url?.startsWith(path) && !this.protectedPaths.some(p => originalRequest?.url?.startsWith(p))
        );

        const isSilentPath = this.silentErrorPaths.some(path => 
          originalRequest?.url?.includes(path)
        );

        if (isSilentPath) {
          return Promise.reject(error);
        }

        if (isPublicPath) {
          return Promise.reject(error);
        }

        if (error.response?.status === 403) {
          const errorMessage = error.response?.data?.error || 'لا تملك صلاحية الوصول';
          toast.error(errorMessage);
          
          if (originalRequest?.url?.includes('/store/') && !localStorage.getItem('user')?.includes('storeId')) {
            window.location.href = '/dashboard';
          }
          if (originalRequest?.url?.includes('/menu') && !localStorage.getItem('user')?.includes('restaurantId')) {
            window.location.href = '/dashboard';
          }
          return Promise.reject(error);
        }

        const isLoginPage = window.location.pathname === '/login' || 
                           window.location.pathname === '/user/login' ||
                           window.location.pathname === '/delivery/login';
        const isPublicPage = window.location.pathname === '/' ||
                            (window.location.pathname.length > 1 && !window.location.pathname.startsWith('/user/') &&
                            !window.location.pathname.startsWith('/dashboard') &&
                            !window.location.pathname.startsWith('/admin') &&
                            !window.location.pathname.startsWith('/login') &&
                            !window.location.pathname.startsWith('/register') &&
                            !window.location.pathname.startsWith('/delivery/'));
        
        if (error.response?.status === 401 && !originalRequest._retry && !isLoginPage && !isPublicPage) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.failedQueue.push({ resolve, reject: () => resolve(originalRequest) });
            }).then(() => {
              return this.api(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          return new Promise((resolve, reject) => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            const userStr = localStorage.getItem('user');
            if (userStr) {
              try {
                const user = JSON.parse(userStr);
                if (user.role === 'delivery_driver') {
                  window.location.href = '/delivery/login';
                } else if (user.role === 'super_admin') {
                  window.location.href = '/login';
                } else if (user.role === 'owner') {
                  window.location.href = '/login';
                } else {
                  window.location.href = '/user/login';
                }
              } catch {
                window.location.href = '/user/login';
              }
            } else {
              if (window.location.pathname.includes('/driver/')) {
                window.location.href = '/delivery/login';
              } else if (window.location.pathname.includes('/admin/')) {
                window.location.href = '/login';
              } else {
                window.location.href = '/user/login';
              }
            }
            
            toast.error('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
            
            this.isRefreshing = false;
            reject(error);
          });
        }
        
        if (error.response?.data?.error && !isSilentPath && error.response.status !== 401 && error.response.status !== 404) {
          toast.error(error.response.data.error);
        } else if (error.response?.status !== 401 && !isSilentPath && !isPublicPath && error.response?.status !== 403 && error.response?.status !== 404) {
          toast.error('حدث خطأ في الاتصال بالخادم');
        }
        
        return Promise.reject(error);
      }
    );
  }

  // ==================== دوال عامة ====================
  async get<T>(url: string, params?: any): Promise<T> {
    const requestKey = `${url}-${JSON.stringify(params)}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log('🔍 Using pending request for:', url);
      return this.pendingRequests.get(requestKey) as Promise<T>;
    }

    const requestPromise = (async () => {
      try {
        console.log('📤 GET request:', url, params);
        const response = await this.api.get<ApiResponse<T>>(url, { params });
        console.log('📥 GET response:', response.data);
        return response.data.data as T;
      } finally {
        setTimeout(() => this.pendingRequests.delete(requestKey), 100);
      }
    })();

    this.pendingRequests.set(requestKey, requestPromise);
    return requestPromise;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    try {
      console.log('📤 POST request:', url, data);
      const response = await this.api.post<ApiResponse<T>>(url, data);
      console.log('📥 POST response:', response.data);
      return response.data.data as T;
    } catch (error) {
      console.error('❌ POST error:', error);
      throw error;
    }
  }

  async put<T>(url: string, data?: any): Promise<T> {
    try {
      console.log('📤 PUT request:', url, data);
      const response = await this.api.put<ApiResponse<T>>(url, data);
      console.log('📥 PUT response:', response.data);
      return response.data.data as T;
    } catch (error) {
      console.error('❌ PUT error:', error);
      throw error;
    }
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    try {
      console.log('📤 PATCH request:', url, data);
      const response = await this.api.patch<ApiResponse<T>>(url, data);
      console.log('📥 PATCH response:', response.data);
      return response.data.data as T;
    } catch (error) {
      console.error('❌ PATCH error:', error);
      throw error;
    }
  }

  async delete<T>(url: string): Promise<T> {
    try {
      console.log('📤 DELETE request:', url);
      const response = await this.api.delete<ApiResponse<T>>(url);
      console.log('📥 DELETE response:', response.data);
      return response.data.data as T;
    } catch (error) {
      console.error('❌ DELETE error:', error);
      throw error;
    }
  }

  async getWithParams<T>(url: string, params?: any): Promise<T> {
    try {
      console.log('📤 GET with params:', url, params);
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      const response = await this.api.get<ApiResponse<T>>(url + queryString);
      console.log('📥 GET with params response:', response.data);
      return response.data.data as T;
    } catch (error) {
      console.error('❌ GET with params error:', error);
      throw error;
    }
  }


async upload<T>(url: string, file: File, type: string = 'general'): Promise<T> {
  try {
    console.log('📤 Upload request:', url, type);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    const response = await this.api.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('📥 Upload response:', response.data);
    return response.data.data as T;
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}

  // ==================== دوال المصادقة ====================
  async login(email: string, password: string): Promise<any> {
    return this.post('/auth/login', { email, password });
  }
  async userLogin(email: string, password: string): Promise<any> {
    return this.post('/auth/user/login', { email, password });
  }
  async deliveryLogin(email: string, password: string): Promise<any> {
    return this.post('/auth/delivery/login', { email, password });
  }
  async registerRestaurant(data: any): Promise<any> {
    return this.post('/auth/register', data);
  }
  async registerStore(data: any): Promise<any> {
    return this.post('/auth/register-store', data);
  }
  async registerUser(data: any): Promise<any> {
    return this.post('/auth/user/register', data);
  }
  async getMe(): Promise<any> {
    return this.get('/auth/me');
  }

  // ==================== دوال المطعم ====================
  async getRestaurantProfile(): Promise<any> {
    return this.get('/restaurants/profile');
  }
  async updateRestaurantProfile(data: any): Promise<any> {
    return this.put('/restaurants/profile', data);
  }
  async getMenuItems(): Promise<any[]> {
    return this.get('/menu/items');
  }
  async addMenuItem(data: any): Promise<any> {
    return this.post('/menu/items', data);
  }
  async updateMenuItem(id: string, data: any): Promise<any> {
    return this.put(`/menu/items/${id}`, data);
  }
  async deleteMenuItem(id: string): Promise<any> {
    return this.delete(`/menu/items/${id}`);
  }
  async getTables(): Promise<any[]> {
    return this.get('/tables');
  }
  async addTable(data: any): Promise<any> {
    return this.post('/tables', data);
  }
  async updateTable(id: string, data: any): Promise<any> {
    return this.put(`/tables/${id}`, data);
  }
  async deleteTable(id: string): Promise<any> {
    return this.delete(`/tables/${id}`);
  }

  // ==================== دوال المتجر ====================
  async getStoreProfile(): Promise<any> {
    return this.get('/store/profile');
  }
  async updateStoreProfile(data: any): Promise<any> {
    return this.put('/store/profile', data);
  }
  async getStoreProducts(): Promise<any[]> {
    return this.get('/store/products');
  }
  async addStoreProduct(data: any): Promise<any> {
    return this.post('/store/products', data);
  }
  async updateStoreProduct(id: string, data: any): Promise<any> {
    return this.put(`/store/products/${id}`, data);
  }
  async deleteStoreProduct(id: string): Promise<any> {
    return this.delete(`/store/products/${id}`);
  }
  async getInventoryStats(): Promise<any> {
    return this.get('/store/inventory/stats');
  }
  async updateInventory(productId: string, quantity: number): Promise<any> {
    return this.patch(`/store/inventory/${productId}`, { quantity });
  }

  // ==================== دوال الصفحات العامة (Subdomain) ====================
  async getPublicBusiness(): Promise<any> {
    return this.get('/public');
  }
  async getPublicCategories(): Promise<any[]> {
    return this.get('/public/categories');
  }
  async getPublicMenuItems(): Promise<any[]> {
    return this.get('/public/menu-items');
  }
  async getPublicProducts(): Promise<any[]> {
    return this.get('/public/products');
  }
  async getPublicTable(tableId: string): Promise<any> {
    return this.get(`/public/table/${tableId}`);
  }
  async getPublicMenuItem(itemId: string): Promise<any> {
    return this.get(`/public/menu-item/${itemId}`);
  }
  async getPublicProduct(productId: string): Promise<any> {
    return this.get(`/public/product/${productId}`);
  }

  // ==================== دوال الطلبات المشتركة ====================
  async getMyOrders(): Promise<any[]> {
    return this.get('/orders/my-orders');
  }
  async createOrder(orderData: any): Promise<any> {
    return this.post('/orders', orderData);
  }
  async getBusinessOrders(params?: any): Promise<any[]> {
    return this.get('/orders', params);
  }
  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    return this.patch(`/orders/${orderId}/status`, { status });
  }
  async getTodayOrders(): Promise<any> {
    return this.get('/orders/today');
  }
  async getOrderStats(period?: string): Promise<any> {
    return this.get('/orders/stats', { period });
  }
  async getOrderDetails(orderId: string): Promise<any> {
    return this.get(`/orders/${orderId}`);
  }

  // ==================== دوال التوصيل ====================
  async getDeliveryOrders(): Promise<any[]> {
    return this.get('/delivery/orders');
  }
  async getDeliveryStats(): Promise<any> {
    return this.get('/delivery/stats');
  }
  async getDrivers(): Promise<any[]> {
    return this.get('/delivery/drivers');
  }
  async createDriver(driverData: any): Promise<any> {
    return this.post('/delivery/drivers', driverData);
  }
  async updateDriverStatus(driverId: string, isActive: boolean): Promise<any> {
    return this.patch(`/delivery/drivers/${driverId}/status`, { isActive });
  }
  async deleteDriver(driverId: string): Promise<any> {
    return this.delete(`/delivery/drivers/${driverId}`);
  }
  async assignDriverToOrder(orderId: string, driverId: string): Promise<any> {
    return this.post(`/delivery/orders/${orderId}/assign`, { driverId });
  }
  async updateDeliveryOrderStatus(orderId: string, status: string): Promise<any> {
    return this.patch(`/delivery/orders/${orderId}/status`, { status });
  }
  async getDriverOrders(): Promise<any[]> {
    return this.get('/delivery/driver/orders');
  }
  async updateDriverLocation(location: { lat: number; lng: number }): Promise<any> {
    return this.post('/delivery/driver/location', location);
  }
  async getDriverLocation(driverId: string): Promise<any> {
    return this.get(`/delivery/driver/${driverId}/location`);
  }
  async getOrderWithLocation(orderId: string): Promise<any> {
    return this.get(`/delivery/orders/${orderId}/location`);
  }
  async acceptDeliveryOrder(orderId: string): Promise<any> {
    return this.post(`/delivery/orders/${orderId}/accept`, {});
  }
  async rejectDeliveryOrder(orderId: string): Promise<any> {
    return this.post(`/delivery/orders/${orderId}/reject`, {});
  }

  // ==================== دوال الخطط والكوبونات ====================
  async getPlans(): Promise<any[]> {
    return this.get('/plans');
  }
  async getCurrentPlan(): Promise<any> {
    return this.get('/plans/current');
  }
  async requestUpgrade(planId: string): Promise<any> {
    return this.post('/plans/upgrade/request', { planId });
  }
  async getCoupons(): Promise<any[]> {
    return this.get('/coupons');
  }
  async createCoupon(data: any): Promise<any> {
    return this.post('/coupons', data);
  }
  async updateCoupon(id: string, data: any): Promise<any> {
    return this.put(`/coupons/${id}`, data);
  }
  async deleteCoupon(id: string): Promise<any> {
    return this.delete(`/coupons/${id}`);
  }
  async applyCoupon(code: string): Promise<any> {
    return this.post('/coupons/apply', { code });
  }

  // ==================== دوال إضافية ====================
  async uploadImage(file: File, type: string = 'general'): Promise<{ imageUrl: string }> {
    return this.upload('/upload', file, type);
  }
  async getDashboardStats(): Promise<any> {
    return this.get('/dashboard/stats');
  }
  async getNotifications(): Promise<any[]> {
    return this.get('/notifications');
  }
  async markNotificationRead(notificationId: string): Promise<any> {
    return this.patch(`/notifications/${notificationId}/read`);
  }
}

export default new ApiService();
