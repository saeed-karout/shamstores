import { useState, useEffect } from 'react';
import api from '../services/api';
import { Category, MenuItem } from '../services/types';
import toast from 'react-hot-toast';

export const useMenu = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [cats, items] = await Promise.all([
        api.get<Category[]>('/menu/categories'),
        api.get<MenuItem[]>('/menu/items'),
      ]);
      setCategories(cats);
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  // الفئات
  const createCategory = async (data: Partial<Category>) => {
    try {
      setLoading(true);
      const newCategory = await api.post<Category>('/menu/categories', data);
      setCategories([...categories, newCategory]);
      toast.success('تم إنشاء الفئة بنجاح');
      return newCategory;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إنشاء الفئة');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    try {
      setLoading(true);
      const updated = await api.put<Category>(`/menu/categories/${id}`, data);
      setCategories(categories.map(c => c.id === id ? updated : c));
      toast.success('تم تحديث الفئة بنجاح');
      return updated;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل تحديث الفئة');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/menu/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      setMenuItems(menuItems.filter(item => item.categoryId !== id));
      toast.success('تم حذف الفئة بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل حذف الفئة');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // عناصر القائمة
  const createMenuItem = async (data: Partial<MenuItem>) => {
    try {
      setLoading(true);
      
      // تحويل البيانات إلى الصيغة المطلوبة
      const payload = {
        ...data,
        price: Number(data.price) || 0,
        discountedPrice: data.discountedPrice ? Number(data.discountedPrice) : null,
        preparationTime: data.preparationTime ? Number(data.preparationTime) : null,
        calories: data.calories ? Number(data.calories) : null,
      };
      
      const newItem = await api.post<MenuItem>('/menu/items', payload);
      setMenuItems([...menuItems, newItem]);
      toast.success('تم إنشاء العنصر بنجاح');
      return newItem;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إنشاء العنصر');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateMenuItem = async (id: string, data: Partial<MenuItem>) => {
    try {
      setLoading(true);
      
      // تحويل البيانات إلى الصيغة المطلوبة
      const payload = {
        ...data,
        price: Number(data.price) || 0,
        discountedPrice: data.discountedPrice ? Number(data.discountedPrice) : null,
        preparationTime: data.preparationTime ? Number(data.preparationTime) : null,
        calories: data.calories ? Number(data.calories) : null,
      };
      
      const updated = await api.put<MenuItem>(`/menu/items/${id}`, payload);
      setMenuItems(menuItems.map(item => item.id === id ? updated : item));
      toast.success('تم تحديث العنصر بنجاح');
      return updated;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل تحديث العنصر');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      setLoading(true);
      await api.delete(`/menu/items/${id}`);
      setMenuItems(menuItems.filter(item => item.id !== id));
      toast.success('تم حذف العنصر بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل حذف العنصر');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (id: string) => {
    try {
      setLoading(true);
      const result = await api.patch<{ isAvailable: boolean }>(`/menu/items/${id}/toggle`);
      setMenuItems(menuItems.map(item => 
        item.id === id ? { ...item, isAvailable: result.isAvailable } : item
      ));
      toast.success(result.isAvailable ? 'العنصر متاح الآن' : 'العنصر غير متاح الآن');
      return result;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل تغيير حالة العنصر');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    menuItems,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    refresh: fetchAll,
  };
};