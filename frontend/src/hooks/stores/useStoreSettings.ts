// src/hooks/useStoreSettings.ts

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { 
  StoreSettings, 
  DeliverySettings, 
  DesignSettings, 
  SocialMediaLinks, 
  PaymentSettings, 
  NotificationSettings, 
  DomainSettings 
} from '@/types/stores/settings.types';

export const useStoreSettings = (storeId?: string) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  
const fetchSettings = useCallback(async () => {
  setLoading(true);
  try {
   
    const timestamp = Date.now();
    const response = await api.get(`/store/settings/${storeId || 'me'}?_t=${timestamp}`);
    setSettings(response);
  } catch (error) {
    console.error('Error fetching settings:', error);
    toast.error('فشل تحميل الإعدادات');
  } finally {
    setLoading(false);
  }
}, [storeId]);


const saveGeneralSettings = async (generalData: any) => {
  setSaving(true);
  try {
    await api.put(`/store/settings/${storeId || 'me'}/general`, generalData);
    toast.success('تم حفظ الإعدادات العامة');
    
    // ✅ إعادة جلب البيانات مع منع التخزين المؤقت
    await fetchSettings();
    return true;
  } catch (error) {
    console.error('Error saving general settings:', error);
    toast.error('فشل حفظ الإعدادات');
    return false;
  } finally {
    setSaving(false);
  }
};
  const saveDesignSettings = async (designData: DesignSettings) => {
    setSaving(true);
    try {
      await api.put(`/store/settings/${storeId || 'me'}/design`, designData);
      toast.success('تم حفظ إعدادات التصميم');
      await fetchSettings();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const saveDeliverySettings = async (deliveryData: DeliverySettings) => {
    setSaving(true);
    try {
      await api.put(`/store/settings/${storeId || 'me'}/delivery`, deliveryData);
      toast.success('تم حفظ إعدادات التوصيل');
      await fetchSettings();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const saveSocialSettings = async (socialData: SocialMediaLinks) => {
    setSaving(true);
    try {
      await api.put(`/store/settings/${storeId || 'me'}/social`, socialData);
      toast.success('تم حفظ إعدادات التواصل الاجتماعي');
      await fetchSettings();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const savePaymentSettings = async (paymentData: PaymentSettings) => {
    setSaving(true);
    try {
      await api.put(`/store/settings/${storeId || 'me'}/payment`, paymentData);
      toast.success('تم حفظ إعدادات الدفع');
      await fetchSettings();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async (notificationData: NotificationSettings) => {
    setSaving(true);
    try {
      await api.put(`/store/settings/${storeId || 'me'}/notifications`, notificationData);
      toast.success('تم حفظ إعدادات الإشعارات');
      await fetchSettings();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const saveDomainSettings = async (domainData: Partial<DomainSettings>) => {
    setSaving(true);
    try {
      await api.put(`/store/settings/${storeId || 'me'}/domain`, domainData);
      toast.success('تم حفظ إعدادات الدومين');
      await fetchSettings();
      return true;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    saveGeneralSettings,
    saveDesignSettings,
    saveDeliverySettings,
    saveSocialSettings,
    savePaymentSettings,
    saveNotificationSettings,
    saveDomainSettings,
    refetch: fetchSettings
  };
};