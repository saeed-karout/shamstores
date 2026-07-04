// frontend/src/hooks/useSubscription.ts

import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/api/subscription.service';
import { Subscription, SubscriptionWithBusiness } from '../types/subscription';
import toast from 'react-hot-toast';

interface UseSubscriptionReturn {
  subscriptions: Subscription[];
  currentSubscription: Subscription | null;
  expiringSubscriptions: SubscriptionWithBusiness[];
  allSubscriptions: SubscriptionWithBusiness[];
  loading: boolean;
  refreshing: boolean;
  fetchSubscriptions: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
  fetchExpiringSubscriptions: () => Promise<void>;
  fetchAllSubscriptions: () => Promise<void>;
  cancelSubscription: (id: string) => Promise<boolean>;
  sendReminders: () => Promise<void>;
  checkExpired: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<SubscriptionWithBusiness[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==================== جلب اشتراكات المستخدم الحالي ====================
  const fetchSubscriptions = useCallback(async () => {
    try {
      const data = await subscriptionService.getSubscriptions();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
    }
  }, []);

  // ==================== جلب الاشتراك الحالي ====================
  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const data = await subscriptionService.getCurrentSubscription();
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      setCurrentSubscription(null);
    }
  }, []);

  // ==================== جلب الاشتراكات المنتهية قريباً ====================
  const fetchExpiringSubscriptions = useCallback(async () => {
    try {
      const data = await subscriptionService.getExpiringSubscriptions();
      setExpiringSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching expiring subscriptions:', error);
      setExpiringSubscriptions([]);
    }
  }, []);

  // ==================== جلب جميع الاشتراكات (للسوبر أدمن) ====================
  const fetchAllSubscriptions = useCallback(async () => {
    try {
      const data = await subscriptionService.getAllSubscriptions();
      setAllSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching all subscriptions:', error);
      setAllSubscriptions([]);
    }
  }, []);

  // ==================== إلغاء اشتراك ====================
  const cancelSubscription = useCallback(async (id: string): Promise<boolean> => {
    try {
      await subscriptionService.cancelSubscription(id);
      toast.success('تم إلغاء الاشتراك بنجاح');
      await Promise.all([
        fetchCurrentSubscription(),
        fetchSubscriptions(),
        fetchAllSubscriptions()
      ]);
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إلغاء الاشتراك');
      return false;
    }
  }, [fetchCurrentSubscription, fetchSubscriptions, fetchAllSubscriptions]);

  // ==================== إرسال تذكيرات التجديد ====================
  const sendReminders = useCallback(async () => {
    try {
      const result = await subscriptionService.sendRenewalReminders();
      toast.success(`تم إرسال ${result.sentCount} تذكير بنجاح`);
      await Promise.all([
        fetchExpiringSubscriptions(),
        fetchAllSubscriptions()
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إرسال التذكيرات');
    }
  }, [fetchExpiringSubscriptions, fetchAllSubscriptions]);

  // ==================== التحقق من الاشتراكات المنتهية ====================
  const checkExpired = useCallback(async () => {
    try {
      const result = await subscriptionService.checkExpiredSubscriptions();
      toast.success(`تم إنهاء ${result.expiredCount} اشتراك منتهي`);
      await Promise.all([
        fetchExpiringSubscriptions(),
        fetchSubscriptions(),
        fetchAllSubscriptions()
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل التحقق من الاشتراكات المنتهية');
    }
  }, [fetchExpiringSubscriptions, fetchSubscriptions, fetchAllSubscriptions]);

  // ==================== تحديث كل البيانات ====================
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSubscriptions(),
        fetchCurrentSubscription(),
        fetchExpiringSubscriptions(),
        fetchAllSubscriptions()
      ]);
    } catch (error) {
      console.error('Error refreshing all data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSubscriptions, fetchCurrentSubscription, fetchExpiringSubscriptions, fetchAllSubscriptions]);

  // ==================== تحميل البيانات الأولي ====================
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await refreshAll();
      setLoading(false);
    };
    load();
  }, [refreshAll]);

  return {
    // البيانات
    subscriptions,
    currentSubscription,
    expiringSubscriptions,
    allSubscriptions,
    
    // حالات التحميل
    loading,
    refreshing,
    
    // دوال الجلب
    fetchSubscriptions,
    fetchCurrentSubscription,
    fetchExpiringSubscriptions,
    fetchAllSubscriptions,
    
    // دوال الإجراءات
    cancelSubscription,
    sendReminders,
    checkExpired,
    refreshAll,
  };
};