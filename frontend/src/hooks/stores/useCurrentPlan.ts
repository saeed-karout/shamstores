// src/hooks/useCurrentPlan.ts

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';

export interface Plan {
  id: string;
  name: 'free' | 'basic' | 'pro' | 'enterprise';
  price: number;
  // Restaurant fields
  maxItems: number;
  maxTables: number;
  maxStaff: number;
  // Store fields
  maxProducts: number;
  maxOrdersPerMonth: number;
  maxStorage: number;
  // Shared features
  hasWhatsapp: boolean;
  hasOnlineOrders: boolean;
  hasCustomDomain: boolean;
  hasAnalytics: boolean;
  hasTableQr: boolean;
  hasMultiLanguage: boolean;
  hasPromotions: boolean;
  hasCoupons: boolean;
  // Store specific features
  hasInventory: boolean;
  hasReturns: boolean;
  hasReviews: boolean;
  hasWishlist: boolean;
  hasCompare: boolean;
  hasSeo: boolean;
  hasEmailMarketing: boolean;
  hasAbandonedCart: boolean;
  hasBulkImport: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeRequest {
  id: string;
  planId: string;
  planName: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt: string;
  approvedAt?: string;
}

interface UseCurrentPlanReturn {
  plan: Plan | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isPro: boolean;
  isBasic: boolean;
  isFree: boolean;
  isEnterprise: boolean;
  hasFeature: (featureName: keyof Plan) => boolean;
  upgradeRequests: UpgradeRequest[];
  loadingRequests: boolean;
  createUpgradeRequest: (planId: string, notes?: string) => Promise<boolean>;
  refetchUpgradeRequests: () => Promise<void>;
}

export const useCurrentPlan = (): UseCurrentPlanReturn => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // جلب الخطة الحالية
  const fetchCurrentPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // ✅ المسار من planRoutes
      const response = await api.get('/plans/current/me');
      
      if (response && response.success !== false) {
        const planData = response.data || response;
        setPlan(planData);
      } else {
        throw new Error('فشل تحميل بيانات الخطة');
      }
    } catch (err: any) {
      console.error('Error fetching current plan:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('الرجاء تسجيل الدخول لعرض الخطة');
      } else {
        setError(err.response?.data?.error || 'حدث خطأ في تحميل الخطة');
      }
      
      setPlan(getDefaultFreePlan());
    } finally {
      setLoading(false);
    }
  }, []);

  // جلب طلبات الترقية للمستخدم الحالي
  const fetchUpgradeRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      // ✅ المسار من adminRoutes (للمستخدم العادي)
      const response = await api.get('/admin/user/upgrade-requests');
      
      if (response && response.success !== false) {
        const requests = response.data || response;
        setUpgradeRequests(Array.isArray(requests) ? requests : []);
      }
    } catch (err) {
      console.error('Error fetching upgrade requests:', err);
      setUpgradeRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // إنشاء طلب ترقية جديد
  const createUpgradeRequest = useCallback(async (planId: string, notes?: string): Promise<boolean> => {
    try {
      // الحصول على نوع الكيان (مطعم أو متجر)
      const userStr = localStorage.getItem('user');
      let entityType = 'restaurant';
      let entityId = null;
      
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.storeId) {
            entityType = 'store';
            entityId = user.storeId;
          } else if (user.restaurantId) {
            entityType = 'restaurant';
            entityId = user.restaurantId;
          }
        } catch (e) {
          console.error('Error parsing user:', e);
        }
      }
      
      // ✅ المسار من adminRoutes
      const response = await api.post('/admin/upgrade-request', {
        planId,
        entityType,
        entityId,
        notes
      });
      
      if (response && response.success !== false) {
        toast.success('تم إرسال طلب الترقية بنجاح');
        await fetchUpgradeRequests();
        return true;
      } else {
        throw new Error(response?.error || 'فشل إرسال الطلب');
      }
    } catch (err: any) {
      console.error('Error creating upgrade request:', err);
      toast.error(err.response?.data?.error || 'فشل إرسال طلب الترقية');
      return false;
    }
  }, [fetchUpgradeRequests]);

  // خطة افتراضية للمستخدمين الجدد
  const getDefaultFreePlan = (): Plan => ({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'free',
    price: 0,
    maxItems: 20,
    maxTables: 1,
    maxStaff: 0,
    maxProducts: 50,
    maxOrdersPerMonth: 100,
    maxStorage: 100,
    hasWhatsapp: false,
    hasOnlineOrders: false,
    hasCustomDomain: false,
    hasAnalytics: false,
    hasTableQr: false,
    hasMultiLanguage: false,
    hasPromotions: false,
    hasCoupons: false,
    hasInventory: false,
    hasReturns: false,
    hasReviews: false,
    hasWishlist: false,
    hasCompare: false,
    hasSeo: false,
    hasEmailMarketing: false,
    hasAbandonedCart: false,
    hasBulkImport: false,
    hasApiAccess: false,
    hasPrioritySupport: false,
    description: 'خطة مجانية للمبتدئين',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // التحقق من نوع الخطة
  const isPro = plan?.name === 'pro';
  const isBasic = plan?.name === 'basic';
  const isFree = plan?.name === 'free';
  const isEnterprise = plan?.name === 'enterprise';

  // دالة مساعدة للتحقق من وجود ميزة معينة
  const hasFeature = (featureName: keyof Plan): boolean => {
    if (!plan) return false;
    return Boolean(plan[featureName]);
  };

  useEffect(() => {
    fetchCurrentPlan();
    fetchUpgradeRequests();
  }, [fetchCurrentPlan, fetchUpgradeRequests]);

  return {
    plan,
    loading,
    error,
    refetch: fetchCurrentPlan,
    isPro,
    isBasic,
    isFree,
    isEnterprise,
    hasFeature,
    upgradeRequests,
    loadingRequests,
    createUpgradeRequest,
    refetchUpgradeRequests: fetchUpgradeRequests
  };
};