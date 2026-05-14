// src/hooks/useFavorites.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

interface FavoriteItem {
  id: string;
  type: 'product' | 'menuItem';
  name: string;
  price: number;
  image?: string;
  addedAt: Date;
}

export const useFavorites = () => {
  const { isAuthenticated, user } = useAuth();
  const [favorites, setFavorites] = useState<Map<string, FavoriteItem>>(new Map());
  const [loading, setLoading] = useState(true);

  // تحميل المفضلة من localStorage (للمستخدمين غير المسجلين)
  const loadFavoritesFromLocal = useCallback(() => {
    try {
      const saved = localStorage.getItem('favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        const favoritesMap = new Map();
        parsed.forEach((item: any) => {
          favoritesMap.set(item.id, { ...item, addedAt: new Date(item.addedAt) });
        });
        setFavorites(favoritesMap);
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // حفظ المفضلة إلى localStorage
  const saveFavoritesToLocal = useCallback((favoritesMap: Map<string, FavoriteItem>) => {
    try {
      const toSave = Array.from(favoritesMap.values()).map(item => ({
        ...item,
        addedAt: item.addedAt.toISOString()
      }));
      localStorage.setItem('favorites', JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, []);

  // إضافة إلى المفضلة
  const addToFavorites = useCallback((item: Omit<FavoriteItem, 'addedAt'>) => {
    setFavorites(prev => {
      const newFavorites = new Map(prev);
      newFavorites.set(item.id, {
        ...item,
        addedAt: new Date()
      });
      saveFavoritesToLocal(newFavorites);
      toast.success('تمت الإضافة إلى المفضلة');
      return newFavorites;
    });
  }, [saveFavoritesToLocal]);

  // إزالة من المفضلة
  const removeFromFavorites = useCallback((id: string) => {
    setFavorites(prev => {
      const newFavorites = new Map(prev);
      newFavorites.delete(id);
      saveFavoritesToLocal(newFavorites);
      toast.success('تمت الإزالة من المفضلة');
      return newFavorites;
    });
  }, [saveFavoritesToLocal]);

  // تبديل حالة المفضلة
  const toggleFavorite = useCallback((item: Omit<FavoriteItem, 'addedAt'>) => {
    setFavorites(prev => {
      const newFavorites = new Map(prev);
      if (newFavorites.has(item.id)) {
        newFavorites.delete(item.id);
        toast.success('تمت الإزالة من المفضلة');
      } else {
        newFavorites.set(item.id, {
          ...item,
          addedAt: new Date()
        });
        toast.success('تمت الإضافة إلى المفضلة');
      }
      saveFavoritesToLocal(newFavorites);
      return newFavorites;
    });
  }, [saveFavoritesToLocal]);

  // التحقق مما إذا كان العنصر في المفضلة
  const isFavorite = useCallback((id: string) => {
    return favorites.has(id);
  }, [favorites]);

  // الحصول على عدد المفضلة
  const getFavoritesCount = useCallback(() => {
    return favorites.size;
  }, [favorites]);

  // الحصول على جميع المفضلة
  const getAllFavorites = useCallback(() => {
    return Array.from(favorites.values());
  }, [favorites]);

  // مسح جميع المفضلة
  const clearFavorites = useCallback(() => {
    setFavorites(new Map());
    saveFavoritesToLocal(new Map());
    toast.success('تم مسح المفضلة');
  }, [saveFavoritesToLocal]);

  // تحميل المفضلة عند التهيئة
  useEffect(() => {
    loadFavoritesFromLocal();
  }, [loadFavoritesFromLocal]);

  // مزامنة مع الخادم إذا كان المستخدم مسجل دخول (اختياري)
  useEffect(() => {
    if (isAuthenticated && user) {
      // هنا يمكن إضافة مزامنة مع الخادم
      // syncFavoritesWithServer();
    }
  }, [isAuthenticated, user]);

  return {
    favorites,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavoritesCount,
    getAllFavorites,
    clearFavorites
  };
};