// hooks/useFeatures.ts
//
// ميزات النشاط الحاليّ — **ما يملكه هو**، لا كتالوج المنصّة كلّه.
//
// كان الخطّاف يجلب `/features` أيضاً في كل تصيير: مسارٌ محروسٌ بدور
// `super_admin`. فكان كل تاجرٍ يفتح أي صفحة يُطلق نداءً يرتدّ ٤٠٣ ويُطبع
// خطؤه في الطرفية — والنتيجة تُحفظ في حالةٍ **لا يقرؤها أحد**: بحثٌ في
// المشروع كلّه لم يجد مستهلكاً واحداً لـ`allFeatures`.
//
// وشاشة الإدارة تجلب الكتالوج بنفسها (`AdminFeatures`)، فلا شيء فُقد
// بحذفه — إلا ٤٠٣ في كل صفحة.

import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './useAuth';

interface Feature {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  category: string;
  isEnabled: boolean;
  expiresAt?: string;
}

export const useFeatures = () => {
  const { user, isAuthenticated } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get('/features/my-features');
      setFeatures(response || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const hasFeature = useCallback((featureCode: string): boolean => {
    return features.includes(featureCode);
  }, [features]);

  const hasAnyFeature = useCallback((featureCodes: string[]): boolean => {
    return featureCodes.some(code => features.includes(code));
  }, [features]);

  const hasAllFeatures = useCallback((featureCodes: string[]): boolean => {
    return featureCodes.every(code => features.includes(code));
  }, [features]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return {
    features,
    loading,
    hasFeature,
    hasAnyFeature,
    hasAllFeatures,
    refresh: fetchFeatures
  };
};

export default useFeatures;