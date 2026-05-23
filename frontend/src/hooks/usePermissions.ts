// frontend/src/hooks/usePermissions.ts
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plan } from '../services/types';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

export interface StaffPermissions {
  // صلاحيات المنصة
  canManageRestaurants: boolean;
  canManageStores: boolean;
  canManageUsers: boolean;
  canManageDrivers: boolean;
  canManagePlans: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  
  // صلاحيات المطعم/المتجر
  viewOrders: boolean;
  updateOrderStatus: boolean;
  viewProducts: boolean;
  updateProducts: boolean;
  viewInventory: boolean;
  updateInventory: boolean;
  viewMenu: boolean;
  viewTables: boolean;
  viewDelivery: boolean;
  viewDrivers: boolean;
  viewStaff: boolean;
  updateStaff: boolean;
  viewAnalytics: boolean;
  updateSettings: boolean;
  viewCoupons: boolean;
  viewMarketing: boolean;
  viewQrCodes: boolean;
  customDomain: boolean;
  onlineOrders: boolean;
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const plan = await api.get<Plan>('/plans/current/me');
      console.log('Current plan fetched:', plan);
      setCurrentPlan(plan);
      
      // تجميع المميزات المتاحة حسب الخطة
      const availableFeatures: string[] = [];
      if (plan?.hasWhatsapp) availableFeatures.push('whatsapp');
      if (plan?.hasOnlineOrders) availableFeatures.push('onlineOrders');
      if (plan?.hasCustomDomain) availableFeatures.push('customDomain');
      if (plan?.hasAnalytics) availableFeatures.push('analytics');
      if (plan?.hasTableQr) availableFeatures.push('tableQr');
      if (plan?.hasMultiLanguage) availableFeatures.push('multiLanguage');
      if (plan?.hasPromotions) availableFeatures.push('promotions');
      if (plan?.hasCoupons) availableFeatures.push('coupons');
      if (plan?.hasMarketing) availableFeatures.push('marketing');
      if (plan?.hasInventory) availableFeatures.push('inventory');
      
      setFeatures(availableFeatures);
    } catch (error) {
      console.error('Error fetching current plan:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== صلاحيات الميزات (من الخطة) ====================
  
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
      case 'marketing':
        return currentPlan.hasMarketing || currentPlan.hasPromotions;
      case 'inventory':
        return currentPlan.hasInventory;
      default:
        return false;
    }
  };

  // ==================== صلاحيات الموظف (من user.permissions) ====================
  
  const checkStaffPermission = (permission: keyof StaffPermissions): boolean => {
    // السوبر أدمن يملك كل الصلاحيات
    if (user?.role === 'super_admin') return true;
    
    // المالك يملك كل الصلاحيات في متجره/مطعمه
    if (user?.role === 'owner') return true;
    
    // الموظف يملك فقط الصلاحيات المحددة
    if (user?.role === 'staff') {
      const permissions = (user?.permissions || {}) as Partial<StaffPermissions>;
      return permissions[permission] === true;
    }
    
    return false;
  };

  // ==================== صلاحيات المالك بناءً على الخطة ====================
  
  // تحديد ما إذا كانت الخطة احترافية
  const isPro = (): boolean => {
    return currentPlan?.name === 'pro' || currentPlan?.name === 'enterprise';
  };

  // تحديد ما إذا كانت الخطة مجانية
  const isFree = (): boolean => {
    return currentPlan?.name === 'free';
  };

  // تحديد ما إذا كانت الخطة أساسية
  const isBasic = (): boolean => {
    return currentPlan?.name === 'basic';
  };

  // تحديد ما إذا كانت الخطة مؤسسية
  const isEnterprise = (): boolean => {
    return currentPlan?.name === 'enterprise';
  };

  // التحقق من توفر ميزة معينة (للمالك)
  const hasFeature = (feature: string): boolean => {
    return checkPermission(feature);
  };

  // ==================== صلاحيات المالك للواجهة ====================
  
  // صلاحيات الطلبات
  const canViewOrders = (): boolean => {
    return hasFeature('onlineOrders') || isPro();
  };

  const canUpdateOrderStatus = (): boolean => {
    return hasFeature('onlineOrders') || isPro();
  };

  // صلاحيات القائمة
  const canViewMenu = (): boolean => {
    return true; // الجميع يمكنه رؤية القائمة
  };

  const canUpdateMenu = (): boolean => {
    return true; // المالك يمكنه تحديث القائمة
  };

  // صلاحيات الطاولات و QR
  const canViewTables = (): boolean => {
    return hasFeature('tableQr') || isPro();
  };

  const canManageTables = (): boolean => {
    return hasFeature('tableQr') || isPro();
  };

  const canViewQrCodes = (): boolean => {
    return hasFeature('tableQr') || isPro();
  };

  // صلاحيات الكوبونات
  const canViewCoupons = (): boolean => {
    return hasFeature('coupons') || isPro();
  };

  const canManageCoupons = (): boolean => {
    return hasFeature('coupons') || isPro();
  };

  // صلاحيات الموظفين
  const canViewStaff = (): boolean => {
    return (currentPlan?.maxStaff || 0) > 0 || isPro();
  };

  const canManageStaff = (): boolean => {
    return (currentPlan?.maxStaff || 0) > 0 || isPro();
  };

  // صلاحيات التحليلات
  const canViewAnalytics = (): boolean => {
    return hasFeature('analytics') || isPro();
  };

  // صلاحيات التوصيل
  const canViewDelivery = (): boolean => {
    return hasFeature('onlineOrders') || isPro();
  };

  const canManageDelivery = (): boolean => {
    return hasFeature('onlineOrders') || isPro();
  };

  // صلاحيات السائقين
  const canViewDrivers = (): boolean => {
    return hasFeature('onlineOrders') || isPro();
  };

  const canManageDrivers = (): boolean => {
    return hasFeature('onlineOrders') || isPro();
  };

  // صلاحيات التسويق
  const canViewMarketing = (): boolean => {
    return hasFeature('marketing') || isPro();
  };

  const canManageMarketing = (): boolean => {
    return hasFeature('marketing') || isPro();
  };

  // صلاحيات الإعدادات
  const canViewSettings = (): boolean => {
    return true; // الجميع يمكنه رؤية الإعدادات
  };

  const canUpdateSettings = (): boolean => {
    return true; // المالك يمكنه تحديث الإعدادات
  };

  // صلاحيات الدومين المخصص
  const canUseCustomDomain = (): boolean => {
    return hasFeature('customDomain') || isPro();
  };

  // ==================== حدود الخطة ====================
  
  const getMaxItems = (): number => {
    return currentPlan?.maxMenuItems || 20;
  };

  const getMaxTables = (): number => {
    return currentPlan?.maxTables || 1;
  };

  const getMaxStaff = (): number => {
    return currentPlan?.maxStaff || 0;
  };

  const getMaxProducts = (): number => {
    return currentPlan?.maxProducts || 50;
  };

  const getMaxOrders = (): number => {
    return currentPlan?.maxOrders || 100;
  };

  const getMaxUsers = (): number => {
    return currentPlan?.maxUsers || 5;
  };

  const getMaxRestaurants = (): number => {
    return currentPlan?.maxRestaurants || 1;
  };

  const getMaxStores = (): number => {
    return currentPlan?.maxStores || 1;
  };

  // ==================== دوال مساعدة ====================
  
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

  // ==================== قيم محسوبة للاستخدام المباشر ====================
  
  // للاستخدام في Sidebar والمكونات الأخرى
  const hasOnlineOrders = canViewOrders();
  const hasTableQr = canViewTables();
  const hasCoupons = canViewCoupons();
  const hasAnalytics = canViewAnalytics();
  const hasDelivery = canViewDelivery();
  const hasMarketing = canViewMarketing();
  const hasStaffManagement = canViewStaff();
  const hasCustomDomain = canUseCustomDomain();

  return {
    // بيانات الخطة
    currentPlan,
    loading,
    features,
    isPro: isPro(),
    isFree: isFree(),
    isBasic: isBasic(),
    isEnterprise: isEnterprise(),
    
    // صلاحيات الميزات
    checkPermission,
    hasFeature,
    isFeatureAvailable,
    showUpgradePrompt,
    
    // صلاحيات الموظف
    checkStaffPermission,
    
    // صلاحيات المالك للواجهة
    canViewOrders: canViewOrders(),
    canUpdateOrderStatus: canUpdateOrderStatus(),
    canViewMenu: canViewMenu(),
    canUpdateMenu: canUpdateMenu(),
    canViewTables: canViewTables(),
    canManageTables: canManageTables(),
    canViewQrCodes: canViewQrCodes(),
    canViewCoupons: canViewCoupons(),
    canManageCoupons: canManageCoupons(),
    canViewStaff: canViewStaff(),
    canManageStaff: canManageStaff(),
    canViewAnalytics: canViewAnalytics(),
    canViewDelivery: canViewDelivery(),
    canManageDelivery: canManageDelivery(),
    canViewDrivers: canViewDrivers(),
    canManageDrivers: canManageDrivers(),
    canViewMarketing: canViewMarketing(),
    canManageMarketing: canManageMarketing(),
    canViewSettings: canViewSettings(),
    canUpdateSettings: canUpdateSettings(),
    canUseCustomDomain: canUseCustomDomain(),
    
    // قيم محسوبة للـ Sidebar
    hasOnlineOrders,
    hasTableQr,
    hasCoupons,
    hasAnalytics,
    hasDelivery,
    hasMarketing,
    hasStaffManagement,
    hasCustomDomain,
    
    // حدود الخطة
    getMaxItems,
    getMaxTables,
    getMaxStaff,
    getMaxProducts,
    getMaxOrders,
    getMaxUsers,
    getMaxRestaurants,
    getMaxStores,
    
    // تحديث البيانات
    refresh: fetchCurrentPlan
  };
};