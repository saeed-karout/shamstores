import { useState, useEffect } from 'react';
import api from '../services/api';
import { Restaurant } from '../services/types';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

export const useRestaurant = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isSuperAdmin } = useAuth();

  const fetchRestaurant = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching restaurant profile...');
      
      const data = await api.get<Restaurant>('/restaurants/profile');
      console.log('✅ Restaurant fetched:', data);
      setRestaurant(data);
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching restaurant:', error);
      // لا نعرض خطأ للمستخدم إذا كان سوبر ادمن
      if (!isSuperAdmin) {
        toast.error('فشل تحميل بيانات المطعم');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurant = async (data: Partial<Restaurant>) => {
    try {
      setLoading(true);
      console.log('📤 Updating restaurant with data:', data);
      
      const updated = await api.put<Restaurant>('/restaurants/profile', data);
      setRestaurant(updated);
      toast.success('تم تحديث البيانات بنجاح');
      return updated;
    } catch (error: any) {
      console.error('❌ Error updating restaurant:', error);
      toast.error(error.response?.data?.error || 'فشل تحديث البيانات');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // hooks/useRestaurant.ts - تحديث دوال رفع الصور
const uploadLogo = async (file: File) => {
  try {
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    
    // استخدام fetch مباشرة لتجنب مشاكل axios
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/restaurants/logo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'فشل رفع الشعار');
    }
    
    await fetchRestaurant();
    toast.success('تم رفع الشعار بنجاح');
    return result.data;
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    toast.error(error.message || 'فشل رفع الشعار');
    throw error;
  } finally {
    setLoading(false);
  }
};

const uploadCover = async (file: File) => {
  try {
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/restaurants/cover', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'فشل رفع صورة الغلاف');
    }
    
    await fetchRestaurant();
    toast.success('تم رفع صورة الغلاف بنجاح');
    return result.data;
  } catch (error: any) {
    console.error('Error uploading cover:', error);
    toast.error(error.message || 'فشل رفع صورة الغلاف');
    throw error;
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRestaurant();
  }, []);

  return {
    restaurant,
    loading,
    updateRestaurant,
    uploadLogo,
    uploadCover,
    refresh: fetchRestaurant,
  };
};