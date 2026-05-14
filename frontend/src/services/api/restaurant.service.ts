// frontend/src/services/api/restaurant.service.ts

import apiClient from './client';

export interface MenuItem {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  isAvailable: boolean;
  sortOrder: number;
}

export interface Table {
  id: string;
  tableNumber: string;
  qrCode: string;
  isActive: boolean;
}

class RestaurantService {
  // Profile
  async getProfile(): Promise<any> {
    return apiClient.get('/restaurants/profile');
  }

  async updateProfile(data: any): Promise<any> {
    return apiClient.put('/restaurants/profile', data);
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return apiClient.get('/menu/items');
  }

  async addMenuItem(data: Partial<MenuItem>): Promise<MenuItem> {
    return apiClient.post('/menu/items', data);
  }

  async updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    return apiClient.put(`/menu/items/${id}`, data);
  }

  async deleteMenuItem(id: string): Promise<void> {
    return apiClient.delete(`/menu/items/${id}`);
  }

  async updateMenuItemOrder(order: { id: string; sortOrder: number }[]): Promise<void> {
    return apiClient.post('/menu/items/reorder', { order });
  }

  // Tables
  async getTables(): Promise<Table[]> {
    return apiClient.get('/tables');
  }

  async addTable(data: Partial<Table>): Promise<Table> {
    return apiClient.post('/tables', data);
  }

  async updateTable(id: string, data: Partial<Table>): Promise<Table> {
    return apiClient.put(`/tables/${id}`, data);
  }

  async deleteTable(id: string): Promise<void> {
    return apiClient.delete(`/tables/${id}`);
  }

  async generateTableQrCode(tableId: string): Promise<{ qrCode: string }> {
    return apiClient.post(`/tables/${tableId}/generate-qr`);
  }

  // Categories
  async getCategories(): Promise<any[]> {
    return apiClient.get('/categories');
  }

  async addCategory(data: any): Promise<any> {
    return apiClient.post('/categories', data);
  }

  async updateCategory(id: string, data: any): Promise<any> {
    return apiClient.put(`/categories/${id}`, data);
  }

  async deleteCategory(id: string): Promise<void> {
    return apiClient.delete(`/categories/${id}`);
  }

  // Staff
  async getStaff(): Promise<any[]> {
    return apiClient.get('/staff');
  }

  async addStaff(data: any): Promise<any> {
    return apiClient.post('/staff', data);
  }

  async updateStaff(id: string, data: any): Promise<any> {
    return apiClient.put(`/staff/${id}`, data);
  }

  async deleteStaff(id: string): Promise<void> {
    return apiClient.delete(`/staff/${id}`);
  }
}

export const restaurantService = new RestaurantService();