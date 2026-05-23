// frontend/src/services/api/order.service.ts

import apiClient from './client';

export interface OrderItem {
  itemId: string;
  quantity: number;
  notes?: string;
  price: number;
}

export interface CreateOrderData {
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  paymentMethod: 'cash' | 'card' | 'online';
  tableId?: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  couponCode?: string;
}

class OrderService {
  // Customer orders
  async getMyOrders(): Promise<any[]> {
    return apiClient.get('/orders/my-orders');
  }

  async createOrder(orderData: CreateOrderData): Promise<any> {
    return apiClient.post('/orders', orderData);
  }

  async trackOrder(orderId: string): Promise<any> {
    return apiClient.get(`/orders/track/${orderId}`);
  }

  // Business orders
  async getBusinessOrders(params?: { status?: string; page?: number; limit?: number }): Promise<any[]> {
    return apiClient.get('/orders', params);
  }

  async getTodayOrders(): Promise<any> {
    return apiClient.get('/orders/today');
  }

  async getOrderStats(period?: 'day' | 'week' | 'month' | 'year'): Promise<any> {
    return apiClient.get('/orders/stats', { period });
  }

  async getOrderDetails(orderId: string): Promise<any> {
    return apiClient.get(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    return apiClient.patch(`/orders/${orderId}/status`, { status });
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<any> {
    return apiClient.post(`/orders/${orderId}/assign-driver`, { driverId });
  }
}

export const orderService = new OrderService();