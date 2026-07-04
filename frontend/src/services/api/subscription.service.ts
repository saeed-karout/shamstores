// frontend/src/services/api/subscription.service.ts

import apiClient from './client';
import { Subscription, CreateSubscriptionDto, SubscriptionWithBusiness } from '../../types/subscription';

class SubscriptionService {
  // ==================== مسارات المالك ====================
  
  /**
   * جلب اشتراكات المستخدم الحالي
   */
  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await apiClient.get('/subscriptions');
      // ✅ التأكد من إرجاع مصفوفة
      const data = response?.data?.data || response?.data || response || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error in getSubscriptions:', error);
      return [];
    }
  }

  /**
   * جلب الاشتراك الحالي النشط
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await apiClient.get('/subscriptions/current');
      const data = response?.data?.data || response?.data || response || null;
      return data;
    } catch (error) {
      console.error('Error in getCurrentSubscription:', error);
      return null;
    }
  }

  /**
   * إنشاء اشتراك جديد
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
    try {
      const response = await apiClient.post('/subscriptions', data);
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error in createSubscription:', error);
      throw error;
    }
  }

  /**
   * إلغاء اشتراك
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
      return response?.data?.data || response?.data || response;
    } catch (error) {
      console.error('Error in cancelSubscription:', error);
      throw error;
    }
  }

  // ==================== مسارات السوبر أدمن ====================
  
  /**
   * جلب جميع الاشتراكات (للسوبر أدمن)
   */
  async getAllSubscriptions(): Promise<SubscriptionWithBusiness[]> {
    try {
      const response = await apiClient.get('/subscriptions/admin/all');
      const data = response?.data?.data || response?.data || response || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error in getAllSubscriptions:', error);
      return [];
    }
  }

  /**
   * جلب الاشتراكات المنتهية قريباً (للسوبر أدمن)
   */
  async getExpiringSubscriptions(): Promise<SubscriptionWithBusiness[]> {
    try {
      const response = await apiClient.get('/subscriptions/admin/expiring');
      const data = response?.data?.data || response?.data || response || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error in getExpiringSubscriptions:', error);
      return [];
    }
  }

  /**
   * إرسال تذكيرات التجديد (للسوبر أدمن)
   */
  async sendRenewalReminders(): Promise<{ sentCount: number; reminders: any[] }> {
    try {
      const response = await apiClient.post('/subscriptions/admin/send-reminders');
      return response?.data?.data || response?.data || { sentCount: 0, reminders: [] };
    } catch (error) {
      console.error('Error in sendRenewalReminders:', error);
      return { sentCount: 0, reminders: [] };
    }
  }

  /**
   * التحقق من الاشتراكات المنتهية (للسوبر أدمن)
   */
  async checkExpiredSubscriptions(): Promise<{ expiredCount: number }> {
    try {
      const response = await apiClient.post('/subscriptions/admin/check-expired');
      return response?.data?.data || response?.data || { expiredCount: 0 };
    } catch (error) {
      console.error('Error in checkExpiredSubscriptions:', error);
      return { expiredCount: 0 };
    }
  }
}

export const subscriptionService = new SubscriptionService();