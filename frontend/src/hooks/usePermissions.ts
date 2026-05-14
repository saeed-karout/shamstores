import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plan } from '../services/types';
import toast from 'react-hot-toast';

export const usePermissions = () => {
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const plan = await api.get<Plan>('/plans/current/me');
      setCurrentPlan(plan);
      
      // تجميع المميزات المتاحة
      const availableFeatures: string[] = [];
      if (plan.hasWhatsapp) availableFeatures.push('whatsapp');
      if (plan.hasOnlineOrders) availableFeatures.push('onlineOrders');
      if (plan.hasCustomDomain) availableFeatures.push('customDomain');
      if (plan.hasAnalytics) availableFeatures.push('analytics');
      if (plan.hasTableQr) availableFeatures.push('tableQr');
      if (plan.hasMultiLanguage) availableFeatures.push('multiLanguage');
      if (plan.hasPromotions) availableFeatures.push('promotions');
      if (plan.hasCoupons) availableFeatures.push('coupons');
      if (plan.hasMarketing) availableFeatures.push('marketing');
      
      setFeatures(availableFeatures);
    } catch (error) {
      console.error('Error fetching current plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (feature: string): boolean => {
    if (!currentPlan) return false;
    
    switch (feature) {
      case 'whatsapp':
        return currentPlan.hasWhatsapp;
      case 'onlineOrders':
        return currentPlan.hasOnlineOrders;
      case 'customDomain': 
        return currentPlan.hasCustomDomain;
      case 'analytics':
        return currentPlan.hasAnalytics;
      case 'tableQr':
        return currentPlan.hasTableQr;
      case 'multiLanguage':
        return currentPlan.hasMultiLanguage;
      case 'promotions':
        return currentPlan.hasPromotions;
      case 'coupons':
        return currentPlan.hasCoupons;
      case 'marketing': // ✅ أضف هذا السطر
        return currentPlan.hasMarketing || currentPlan.hasPromotions; 
      default:
        return false;
    }
  };

  const getMaxItems = (): number => {
    return currentPlan?.maxItems || 20;
  };

  const getMaxTables = (): number => {
    return currentPlan?.maxTables || 1;
  };

  const getMaxStaff = (): number => {
    return currentPlan?.maxStaff || 0;
  };

  const isFeatureAvailable = (feature: string): boolean => {
    return features.includes(feature);
  };

  const showUpgradePrompt = (feature: string): boolean => {
    if (!checkPermission(feature)) {
      toast.error(`هذه الميزة غير متاحة في خطتك الحالية. قم بترقية الخطط للاستفادة منها.`, {
        duration: 4000,
        icon: '⚠️'
      });
      return false;
    }
    return true;
  };

  return {
    currentPlan,
    loading,
    features,
    checkPermission,
    getMaxItems,
    getMaxTables,
    getMaxStaff,
    isFeatureAvailable,
    showUpgradePrompt,
    refresh: fetchCurrentPlan
  };
};