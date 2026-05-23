// frontend/src/services/api/subscription.service.ts

import apiClient from './client';
import { Subscription, CreateSubscriptionDto, SubscriptionWithBusiness } from '../../types/subscription';

class SubscriptionService {
  // ==================== مسارات المالك ====================
  
  async getSubscriptions(): Promise<Subscription[]> {
    const response = await apiClient.get('/subscriptions');
    // ✅ التأكد من إرجاع مصفوفة
    return response?.data || response || [];
  }

  async getCurrentSubscription(): Promise<Subscription | null> {
    const response = await apiClient.get('/subscriptions/current');
    return response?.data || response || null;
  }

  async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
    return apiClient.post('/subscriptions', data);
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    return apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
  }

  // ==================== مسارات السوبر أدمن ====================
  
  async getExpiringSubscriptions(): Promise<SubscriptionWithBusiness[]> {
    const response = await apiClient.get('/subscriptions/admin/expiring');
    return response?.data || response || [];
  }

  async sendRenewalReminders(): Promise<{ sentCount: number; reminders: any[] }> {
    return apiClient.post('/subscriptions/admin/send-reminders');
  }

  async checkExpiredSubscriptions(): Promise<{ expiredCount: number }> {
    return apiClient.post('/subscriptions/admin/check-expired');
  }
}

export const subscriptionService = new SubscriptionService();