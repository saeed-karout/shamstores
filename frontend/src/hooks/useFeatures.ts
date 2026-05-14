// hooks/useFeatures.ts

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
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);

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

  const fetchAllFeatures = useCallback(async () => {
    try {
      const response = await api.get('/features');
      setAllFeatures(response || []);
    } catch (error) {
      console.error('Error fetching all features:', error);
    }
  }, []);

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
    fetchAllFeatures();
  }, [fetchFeatures, fetchAllFeatures]);

  return {
    features,
    allFeatures,
    loading,
    hasFeature,
    hasAnyFeature,
    hasAllFeatures,
    refresh: fetchFeatures
  };
};

export default useFeatures;