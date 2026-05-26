import { useState, useEffect } from 'react';
import api from '../services/api';
import { Category, MenuItem } from '../services/types';
import toast from 'react-hot-toast';

interface UseMenuOptions {
  restaurantIds?: string[];
}

export const useMenu = (options: UseMenuOptions = {}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const restaurantIdsKey = (options.restaurantIds || []).join(',');
  const activeRestaurantId = options.restaurantIds && options.restaurantIds.length > 0 ? options.restaurantIds[0] : undefined;

  useEffect(() => {
    fetchAll();
  }, [restaurantIdsKey]);

  const fetchAll = async () => {
    try {
      const restaurantIds = options.restaurantIds && options.restaurantIds.length > 0
        ? options.restaurantIds
        : [undefined];

      const results = await Promise.all(restaurantIds.map(async (restaurantId) => {
        const params = restaurantId ? { restaurantId } : undefined;
        const [cats, items] = await Promise.all([
          api.get<Category[]>('/menu/categories', params),
          api.get<MenuItem[]>('/menu/items', params),
        ]);

        return {
          categories: cats.map((category) => ({ ...category, branchId: restaurantId || category.restaurantId })),
          menuItems: items.map((item) => ({ ...item, branchId: restaurantId || item.restaurantId })),
        };
      }));

      setCategories(results.flatMap((result) => result.categories));
      setMenuItems(results.flatMap((result) => result.menuItems));
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
      const newCategory = await api.post<Category>('/menu/categories', {
        ...data,
        restaurantId: data.restaurantId || activeRestaurantId,
      });
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
      const updated = await api.put<Category>(`/menu/categories/${id}`, {
        ...data,
        restaurantId: data.restaurantId || activeRestaurantId,
      });
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

  const deleteCategory = async (id: string, restaurantId?: string) => {
    try {
      setLoading(true);
      await api.delete(`/menu/categories/${id}${restaurantId || activeRestaurantId ? `?restaurantId=${restaurantId || activeRestaurantId}` : ''}`);
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
      
      const newItem = await api.post<MenuItem>('/menu/items', {
        ...payload,
        restaurantId: data.restaurantId || activeRestaurantId,
      });
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
      
      const updated = await api.put<MenuItem>(`/menu/items/${id}`, {
        ...payload,
        restaurantId: data.restaurantId || activeRestaurantId,
      });
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

  const deleteMenuItem = async (id: string, restaurantId?: string) => {
    try {
      setLoading(true);
      await api.delete(`/menu/items/${id}${restaurantId || activeRestaurantId ? `?restaurantId=${restaurantId || activeRestaurantId}` : ''}`);
      setMenuItems(menuItems.filter(item => item.id !== id));
      toast.success('تم حذف العنصر بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل حذف العنصر');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (id: string, restaurantId?: string) => {
    try {
      setLoading(true);
      const result = await api.patch<{ isAvailable: boolean }>(`/menu/items/${id}/toggle`, {
        restaurantId: restaurantId || activeRestaurantId,
      });
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