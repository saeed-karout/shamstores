// frontend/src/services/api/admin.service.ts

import apiClient from './client';

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: 'active' | 'inactive' | 'suspended';
  planId: string;
  plan?: {
    name: string;
    displayName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  restaurantId?: string;
  storeId?: string;
  createdAt: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  restaurantId?: string;
  storeId?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  isActive: boolean;
  isAvailable: boolean;
  totalDeliveries: number;
  rating: number;
  createdAt: string;
}

export interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  canceledOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

class AdminService {
  // Restaurants
 async getRestaurants(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<any> {
  const response = await apiClient.get('/admin/restaurants', params);
  return response;
}

  async getRestaurant(id: string): Promise<Business> {
    return apiClient.get(`/admin/restaurants/${id}`);
  }

  async updateRestaurant(id: string, data: Partial<Business>): Promise<Business> {
    return apiClient.put(`/admin/restaurants/${id}`, data);
  }

  async deleteRestaurant(id: string): Promise<void> {
    return apiClient.delete(`/admin/restaurants/${id}`);
  }

  async suspendRestaurant(id: string): Promise<Business> {
    return apiClient.post(`/admin/restaurants/${id}/suspend`);
  }

  async activateRestaurant(id: string): Promise<Business> {
    return apiClient.post(`/admin/restaurants/${id}/activate`);
  }

  // Stores
 async getStores(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<any> {
  const response = await apiClient.get('/admin/stores', params);
  // إرجاع الاستجابة كاملة للسماح بمعالجة الهيكل في المكون
  return response;
}

  async getStore(id: string): Promise<Business> {
    return apiClient.get(`/admin/stores/${id}`);
  }

  async updateStore(id: string, data: Partial<Business>): Promise<Business> {
    return apiClient.put(`/admin/stores/${id}`, data);
  }

  async deleteStore(id: string): Promise<void> {
    return apiClient.delete(`/admin/stores/${id}`);
  }

  async suspendStore(id: string): Promise<Business> {
    return apiClient.post(`/admin/stores/${id}/suspend`);
  }

  async activateStore(id: string): Promise<Business> {
    return apiClient.post(`/admin/stores/${id}/activate`);
  }

  // Users
  async getUsers(params?: { page?: number; limit?: number; role?: string }): Promise<User[]> {
    return apiClient.get('/admin/users', params);
  }

  async getUser(id: string): Promise<User> {
    return apiClient.get(`/admin/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return apiClient.put(`/admin/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<void> {
    return apiClient.delete(`/admin/users/${id}`);
  }

  async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
    return apiClient.patch(`/admin/users/${id}/status`, { isActive });
  }

  // Staff
  async getStaff(params?: { businessType?: string; businessId?: string }): Promise<Staff[]> {
    return apiClient.get('/admin/staff', params);
  }

  async getStaffMember(id: string): Promise<Staff> {
    return apiClient.get(`/admin/staff/${id}`);
  }

  async createStaff(data: Partial<Staff>): Promise<Staff> {
    return apiClient.post('/admin/staff', data);
  }

  async updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
    return apiClient.put(`/admin/staff/${id}`, data);
  }

  async deleteStaff(id: string): Promise<void> {
    return apiClient.delete(`/admin/staff/${id}`);
  }

  // Drivers
  async getDrivers(params?: { page?: number; limit?: number; isActive?: boolean }): Promise<Driver[]> {
    return apiClient.get('/admin/drivers', params);
  }

  async getDriver(id: string): Promise<Driver> {
    return apiClient.get(`/admin/drivers/${id}`);
  }

  async createDriver(data: Partial<Driver>): Promise<Driver> {
    return apiClient.post('/admin/drivers', data);
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
    return apiClient.put(`/admin/drivers/${id}`, data);
  }

  async deleteDriver(id: string): Promise<void> {
    return apiClient.delete(`/admin/drivers/${id}`);
  }

  // Orders
  async getAllOrders(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    businessType?: string;
    businessId?: string;
  }): Promise<any[]> {
    return apiClient.get('/admin/orders', params);
  }

  async getOrderDetails(orderId: string): Promise<any> {
    return apiClient.get(`/admin/orders/${orderId}`);
  }

  async getOrderStats(params?: { businessType?: string; businessId?: string }): Promise<OrderStats> {
    return apiClient.get('/admin/orders/stats', params);
  }

  // Dashboard
  async getDashboardStats(): Promise<{
    totalRestaurants: number;
    totalStores: number;
    totalUsers: number;
    totalDrivers: number;
    totalOrders: number;
    totalRevenue: number;
    recentOrders: any[];
  }> {
    return apiClient.get('/admin/dashboard/stats');
  }

  // QR Codes
  async getQRCodes(params?: { businessType?: string; businessId?: string }): Promise<any[]> {
    return apiClient.get('/admin/qr-codes', params);
  }

  async generateQrCode(data: { businessType: string; businessId: string; type: string; targetId: string }): Promise<{ qrCode: string }> {
    return apiClient.post('/admin/qr-codes/generate', data);
  }

  // Platform Settings
  async getPlatformSettings(): Promise<any> {
    return apiClient.get('/admin/platform-settings');
  }

  async updatePlatformSettings(data: any): Promise<any> {
    return apiClient.put('/admin/platform-settings', data);
  }

  // Features
  async getFeatures(): Promise<any[]> {
    return apiClient.get('/admin/features');
  }

  async createFeature(data: any): Promise<any> {
    return apiClient.post('/admin/features', data);
  }

  async updateFeature(code: string, data: any): Promise<any> {
    return apiClient.put(`/admin/features/${code}`, data);
  }

  async deleteFeature(code: string): Promise<void> {
    return apiClient.delete(`/admin/features/${code}`);
  }

  // Business Features
  async getBusinessFeatures(businessType: string, businessId: string): Promise<any[]> {
    return apiClient.get(`/admin/business/${businessType}/${businessId}/features`);
  }

  async assignFeatureToBusiness(businessType: string, businessId: string, featureCode: string, expiresAt?: string): Promise<any> {
    return apiClient.post(`/admin/business/${businessType}/${businessId}/features`, { featureCode, expiresAt });
  }

  async removeFeatureFromBusiness(businessType: string, businessId: string, featureCode: string): Promise<void> {
    return apiClient.delete(`/admin/business/${businessType}/${businessId}/features/${featureCode}`);
  }
}

export const adminService = new AdminService();