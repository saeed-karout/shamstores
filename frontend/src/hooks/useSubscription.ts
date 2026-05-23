// frontend/src/hooks/useSubscription.ts

import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/api/subscription.service';
import { Subscription, SubscriptionWithBusiness } from '../types/subscription';
import toast from 'react-hot-toast';

interface UseSubscriptionReturn {
  subscriptions: Subscription[];
  currentSubscription: Subscription | null;
  expiringSubscriptions: SubscriptionWithBusiness[];
  loading: boolean;
  refreshing: boolean;
  fetchSubscriptions: () => Promise<void>;
  fetchCurrentSubscription: () => Promise<void>;
  fetchExpiringSubscriptions: () => Promise<void>;
  cancelSubscription: (id: string) => Promise<boolean>;
  sendReminders: () => Promise<void>;
  checkExpired: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<SubscriptionWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const data = await subscriptionService.getSubscriptions();
      setSubscriptions(data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  }, []);

  const fetchCurrentSubscription = useCallback(async () => {
    try {
      const data = await subscriptionService.getCurrentSubscription();
      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching current subscription:', error);
      setCurrentSubscription(null);
    }
  }, []);

  const fetchExpiringSubscriptions = useCallback(async () => {
    try {
      const data = await subscriptionService.getExpiringSubscriptions();
      setExpiringSubscriptions(data);
    } catch (error) {
      console.error('Error fetching expiring subscriptions:', error);
      setExpiringSubscriptions([]);
    }
  }, []);

  const cancelSubscription = useCallback(async (id: string): Promise<boolean> => {
    try {
      await subscriptionService.cancelSubscription(id);
      toast.success('تم إلغاء الاشتراك بنجاح');
      await fetchCurrentSubscription();
      await fetchSubscriptions();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إلغاء الاشتراك');
      return false;
    }
  }, [fetchCurrentSubscription, fetchSubscriptions]);

  const sendReminders = useCallback(async () => {
    try {
      const result = await subscriptionService.sendRenewalReminders();
      toast.success(`تم إرسال ${result.sentCount} تذكير بنجاح`);
      await fetchExpiringSubscriptions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إرسال التذكيرات');
    }
  }, [fetchExpiringSubscriptions]);

  const checkExpired = useCallback(async () => {
    try {
      const result = await subscriptionService.checkExpiredSubscriptions();
      toast.success(`تم إنهاء ${result.expiredCount} اشتراك منتهي`);
      await fetchExpiringSubscriptions();
      await fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل التحقق من الاشتراكات المنتهية');
    }
  }, [fetchExpiringSubscriptions, fetchSubscriptions]);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSubscriptions(),
        fetchCurrentSubscription(),
        fetchExpiringSubscriptions()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSubscriptions, fetchCurrentSubscription, fetchExpiringSubscriptions]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    };
    load();
  }, [fetchAll]);

  return {
    subscriptions,
    currentSubscription,
    expiringSubscriptions,
    loading,
    refreshing,
    fetchSubscriptions,
    fetchCurrentSubscription,
    fetchExpiringSubscriptions,
    cancelSubscription,
    sendReminders,
    checkExpired,
  };
};