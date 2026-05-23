// frontend/src/services/api/delivery.service.ts

import apiClient from './client';

class DeliveryService {
  // Driver routes
  async getDriverOrders(): Promise<any[]> {
    return apiClient.get('/delivery/driver/orders');
  }

  async getDriverStats(): Promise<any> {
    return apiClient.get('/delivery/driver/stats');
  }

  async acceptDeliveryOrder(orderId: string): Promise<any> {
    return apiClient.post(`/delivery/orders/${orderId}/accept`);
  }

  async rejectDeliveryOrder(orderId: string): Promise<any> {
    return apiClient.post(`/delivery/orders/${orderId}/reject`);
  }

  async updateDeliveryOrderStatus(orderId: string, status: string): Promise<any> {
    return apiClient.patch(`/delivery/orders/${orderId}/status`, { status });
  }

  async updateDriverLocation(location: { lat: number; lng: number }): Promise<any> {
    return apiClient.post('/delivery/driver/location', location);
  }

  async getDriverLocation(driverId: string): Promise<any> {
    return apiClient.get(`/delivery/driver/${driverId}/location`);
  }

  async getOrderWithLocation(orderId: string): Promise<any> {
    return apiClient.get(`/delivery/orders/${orderId}/location`);
  }

  // Admin/Owner routes
  async getDeliveryOrders(params?: { status?: string }): Promise<any[]> {
    return apiClient.get('/delivery/orders', params);
  }

  async getDeliveryStats(): Promise<any> {
    return apiClient.get('/delivery/stats');
  }

  async getDrivers(): Promise<any[]> {
    return apiClient.get('/delivery/drivers');
  }

  async createDriver(driverData: any): Promise<any> {
    return apiClient.post('/delivery/drivers', driverData);
  }

  async updateDriverStatus(driverId: string, isActive: boolean): Promise<any> {
    return apiClient.patch(`/delivery/drivers/${driverId}/status`, { isActive });
  }

  async deleteDriver(driverId: string): Promise<void> {
    return apiClient.delete(`/delivery/drivers/${driverId}`);
  }

  async assignDriverToOrder(orderId: string, driverId: string): Promise<any> {
    return apiClient.post(`/delivery/orders/${orderId}/assign`, { driverId });
  }
}

export const deliveryService = new DeliveryService();