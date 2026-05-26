// hooks/useStore.ts

import { useState, useEffect, useCallback } from 'react';
import api, { getApiBaseUrl } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { BusinessBranchSummary } from '@/services/types';

export interface StoreSettings {
  enableDelivery?: boolean;
  deliveryFee?: number;
  freeDeliveryAbove?: number;
  estimatedTime?: number;
  returnPolicy?: string;
  exchangePolicy?: string;
  [key: string]: any;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  subdomain?: string;
  customDomain?: string;
  deliverySettings?: StoreSettings;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor?: string;
  cardColor?: string;
  surfaceColor?: string;
  textColor?: string;
  mutedColor?: string;
  accentColor?: string;
  fontFamily?: string;
  isActive: boolean;
  planId: string;
  settings?: StoreSettings;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  createdAt: string;
  updatedAt: string;
  branchLabel?: string;
  branchLinkType?: 'custom_domain' | 'subdomain' | 'slug';
  linkedBranches?: Array<{
    id: string;
    name: string;
    linkLabel: string;
    isActive: boolean;
  }>;
  plan?: {
    id: string;
    name: string;
    price: number;
    maxProducts: number;
    maxOrdersPerMonth: number;
  };
  branchLabel?: string;
  branchLinkType?: 'custom_domain' | 'subdomain' | 'slug';
  linkedBranches?: BusinessBranchSummary[];
}

interface UseStoreReturn {
  store: Store | null;
  loading: boolean;
  error: string | null;
  fetchStore: () => Promise<void>;
  updateStore: (data: Record<string, any>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string | null>;
  uploadCover: (file: File) => Promise<string | null>;
  removeLogo: () => Promise<void>;
  removeCover: () => Promise<void>;
  getStoreUrl: () => string;
  getStorePublicUrl: (slug?: string) => string;
}

export const useStore = (): UseStoreReturn => {
  const { user, isAuthenticated } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/store/profile');
      
      // ✅ استخراج البيانات بشكل صحيح
      const storeData = response?.data || response;
      
      if (storeData && storeData.id) {
        console.log('✅ Store fetched:', storeData);
        setStore(storeData);
      } else {
        setStore(null);
      }
    } catch (err: any) {
      console.error('Error fetching store:', err);
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || 'حدث خطأ في جلب بيانات المتجر');
      }
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ✅ إصلاح دالة updateStore - ترسل جميع البيانات وتحدث الحالة
  const updateStore = useCallback(async (data: Record<string, any>) => {
    try {
      setLoading(true);
      
      console.log('📤 Updating store with data:', data);
      
      const response = await api.put('/store/profile', data);
      
      // ✅ استخراج البيانات من response
      const updatedStore = response?.data || response;
      
      if (updatedStore && updatedStore.id) {
        console.log('✅ Store updated successfully:', updatedStore);
        setStore(updatedStore);
        toast.success('تم تحديث بيانات المتجر بنجاح');
      } else {
        throw new Error('No data returned from server');
      }
    } catch (err: any) {
      console.error('Error updating store:', err);
      const errorMsg = err.response?.data?.error || 'حدث خطأ في تحديث بيانات المتجر';
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ إصلاح رفع الشعار - استخدام api service بدلاً من fetch
  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      console.log('📸 Uploading logo, file size:', file.size, 'type:', file.type);
      
      // ✅ استخدام api service (الذي يتعامل مع multipart/form-data)
      const response = await api.upload('/store/upload/logo', file, 'logo');
      
      if (response && response.logoUrl) {
        setStore(prev => prev ? { ...prev, logo: response.logoUrl } : null);
        toast.success('تم رفع الشعار بنجاح');
        return response.logoUrl;
      }
      return null;
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      toast.error(err.message || 'حدث خطأ في رفع الشعار');
      return null;
    }
  }, []);

  // ✅ إصلاح رفع صورة الغلاف
  const uploadCover = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('cover', file);
      
      console.log('📸 Uploading cover, file size:', file.size, 'type:', file.type);
      
      const response = await api.upload('/store/upload/cover', file, 'cover');
      
      if (response && response.coverUrl) {
        setStore(prev => prev ? { ...prev, coverImage: response.coverUrl } : null);
        toast.success('تم رفع صورة الغلاف بنجاح');
        return response.coverUrl;
      }
      return null;
    } catch (err: any) {
      console.error('Error uploading cover:', err);
      toast.error(err.message || 'حدث خطأ في رفع صورة الغلاف');
      return null;
    }
  }, []);

  // ✅ إضافة دالة إزالة الشعار
  const removeLogo = useCallback(async () => {
    try {
      await api.delete('/store/logo');
      setStore(prev => prev ? { ...prev, logo: undefined } : null);
      toast.success('تم إزالة الشعار بنجاح');
    } catch (err: any) {
      console.error('Error removing logo:', err);
      toast.error(err.message || 'حدث خطأ في إزالة الشعار');
    }
  }, []);

  // ✅ إضافة دالة إزالة صورة الغلاف
  const removeCover = useCallback(async () => {
    try {
      await api.delete('/store/cover');
      setStore(prev => prev ? { ...prev, coverImage: undefined } : null);
      toast.success('تم إزالة صورة الغلاف بنجاح');
    } catch (err: any) {
      console.error('Error removing cover:', err);
      toast.error(err.message || 'حدث خطأ في إزالة صورة الغلاف');
    }
  }, []);

  const getStoreUrl = useCallback((): string => {
    if (store?.slug) {
      return `${window.location.origin}/${store.slug}`;
    }
    return '';
  }, [store?.slug]);

  const getStorePublicUrl = useCallback((slug?: string): string => {
    const storeSlug = slug || store?.slug;
    if (storeSlug) {
      return `${window.location.origin}/${storeSlug}`;
    }
    return '';
  }, [store?.slug]);

  // جلب بيانات المتجر عند تحميل المكون
  useEffect(() => {
    if (isAuthenticated && user?.storeId) {
      fetchStore();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.storeId, fetchStore]);

  return {
    store,
    loading,
    error,
    fetchStore,
    updateStore,
    uploadLogo,
    uploadCover,
    removeLogo,
    removeCover,
    getStoreUrl,
    getStorePublicUrl,
  };
};

export default useStore;