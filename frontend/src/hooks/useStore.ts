// hooks/useStore.ts

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

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
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  planId: string;
  settings?: StoreSettings;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  createdAt: string;
  updatedAt: string;
  plan?: {
    id: string;
    name: string;
    price: number;
    maxProducts: number;
    maxOrdersPerMonth: number;
  };
}

interface UseStoreReturn {
  store: Store | null;
  loading: boolean;
  error: string | null;
  fetchStore: () => Promise<void>;
  updateStore: (data: Partial<Store>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string | null>;
  uploadCover: (file: File) => Promise<string | null>;
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
      
      if (response && response.id) {
        setStore(response);
      } else {
        setStore(null);
      }
    } catch (err: any) {
      console.error('Error fetching store:', err);
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || 'حدث خطأ في جلب بيانات المتجر');
        toast.error('حدث خطأ في جلب بيانات المتجر');
      }
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateStore = useCallback(async (data: Partial<Store>) => {
    try {
      setLoading(true);
      const response = await api.put('/store/profile', data);
      
      if (response && response.id) {
        setStore(response);
        toast.success('تم تحديث بيانات المتجر بنجاح');
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


// hooks/useStore.ts - تحديث دوال رفع الصور

// hooks/useStore.ts - تحديث دوال رفع الصور

const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('logo', file);
    
    console.log('📸 Uploading logo, file size:', file.size, 'type:', file.type);
    console.log('FormData entries:');
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    // ✅ استخدام axios مباشرة مع إعدادات صحيحة
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/store/upload/logo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    console.log('✅ Upload response:', result);
    
    if (result.success && result.data?.logoUrl) {
      setStore(prev => prev ? { ...prev, logo: result.data.logoUrl } : null);
      toast.success('تم رفع الشعار بنجاح');
      return result.data.logoUrl;
    } else {
      throw new Error(result.error || 'فشل رفع الشعار');
    }
  } catch (err: any) {
    console.error('Error uploading logo:', err);
    toast.error(err.message || 'حدث خطأ في رفع الشعار');
    return null;
  }
}, []);

const uploadCover = useCallback(async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('cover', file);
    
    console.log('📸 Uploading cover, file size:', file.size, 'type:', file.type);
    
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/store/upload/cover', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    console.log('✅ Upload response:', result);
    
    if (result.success && result.data?.coverUrl) {
      setStore(prev => prev ? { ...prev, coverImage: result.data.coverUrl } : null);
      toast.success('تم رفع صورة الغلاف بنجاح');
      return result.data.coverUrl;
    } else {
      throw new Error(result.error || 'فشل رفع صورة الغلاف');
    }
  } catch (err: any) {
    console.error('Error uploading cover:', err);
    toast.error(err.message || 'حدث خطأ في رفع صورة الغلاف');
    return null;
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
    getStoreUrl,
    getStorePublicUrl,
  };
};

export default useStore;