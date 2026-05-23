// frontend/src/services/api/store.service.ts

import apiClient from './client';

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  stock: number;
  isAvailable: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  nameEn?: string;
  sortOrder: number;
}

class StoreService {
  // Profile
  async getProfile(): Promise<any> {
    return apiClient.get('/store/profile');
  }

  async updateProfile(data: any): Promise<any> {
    return apiClient.put('/store/profile', data);
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return apiClient.get('/store/products');
  }

  async addProduct(data: Partial<Product>): Promise<Product> {
    return apiClient.post('/store/products', data);
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.put(`/store/products/${id}`, data);
  }

  async deleteProduct(id: string): Promise<void> {
    return apiClient.delete(`/store/products/${id}`);
  }

  // Categories
  async getProductCategories(): Promise<ProductCategory[]> {
    return apiClient.get('/store/categories');
  }

  async addProductCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
    return apiClient.post('/store/categories', data);
  }

  async updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
    return apiClient.put(`/store/categories/${id}`, data);
  }

  async deleteProductCategory(id: string): Promise<void> {
    return apiClient.delete(`/store/categories/${id}`);
  }

  // Inventory
  async getInventoryStats(): Promise<any> {
    return apiClient.get('/store/inventory/stats');
  }

  async updateInventory(productId: string, quantity: number): Promise<any> {
    return apiClient.patch(`/store/inventory/${productId}`, { quantity });
  }

  async getInventoryTransactions(productId?: string): Promise<any[]> {
    const url = productId ? `/store/inventory/transactions/${productId}` : '/store/inventory/transactions';
    return apiClient.get(url);
  }

  // Staff
  async getStaff(): Promise<any[]> {
    return apiClient.get('/store/staff');
  }

  async addStaff(data: any): Promise<any> {
    return apiClient.post('/store/staff', data);
  }

  async updateStaff(id: string, data: any): Promise<any> {
    return apiClient.put(`/store/staff/${id}`, data);
  }

  async deleteStaff(id: string): Promise<void> {
    return apiClient.delete(`/store/staff/${id}`);
  }

  // QR Codes
  async generateQrCode(productId: string): Promise<{ qrCode: string }> {
    return apiClient.post(`/store/products/${productId}/generate-qr`);
  }
}

export const storeService = new StoreService();