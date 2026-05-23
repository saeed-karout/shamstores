// frontend/src/services/api/public.service.ts

import apiClient from './client';

class PublicService {
  async getBusiness(): Promise<any> {
    return apiClient.get('/public');
  }

  async getCategories(): Promise<any[]> {
    return apiClient.get('/public/categories');
  }

  async getMenuItems(): Promise<any[]> {
    return apiClient.get('/public/menu-items');
  }

  async getProducts(): Promise<any[]> {
    return apiClient.get('/public/products');
  }

  async getTable(tableId: string): Promise<any> {
    return apiClient.get(`/public/table/${tableId}`);
  }

  async getMenuItem(itemId: string): Promise<any> {
    return apiClient.get(`/public/menu-item/${itemId}`);
  }

  async getProduct(productId: string): Promise<any> {
    return apiClient.get(`/public/product/${productId}`);
  }
}

export const publicService = new PublicService();