// frontend/src/hooks/useSettings.ts

import { useEffect, useState, useCallback } from 'react';
import settingsService from '../services/settingsService';


interface GroupedSettings {
  general: any[];
  auth: any[];
  business: any[];
  subscription: any[];
  payment: any[];
  domain: any[];
  storage: any[];
  delivery: any[];
  notification: any[];
  security: any[];
  analytics: any[];
}

interface UseSettingsReturn {
  settings: GroupedSettings | null;
  loading: boolean;
  error: string | null;
  getSetting: (key: string, defaultValue?: any) => Promise<any>;
  getBoolean: (key: string, defaultValue?: boolean) => Promise<boolean>;
  getNumber: (key: string, defaultValue?: number) => Promise<number>;
  getString: (key: string, defaultValue?: string) => Promise<string>;
  getArray: (key: string, defaultValue?: any[]) => Promise<any[]>;
  refresh: () => Promise<void>;
  // إعدادات محددة
  platformName: string;
  platformLogo: string;
  isMaintenanceMode: boolean;
  isRegistrationAllowed: boolean;
  requireEmailVerification: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  paymentMethods: string[];
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<GroupedSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // إعدادات محددة
  const [platformName, setPlatformName] = useState('ديجيتال مينو');
  const [platformLogo, setPlatformLogo] = useState('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isRegistrationAllowed, setIsRegistrationAllowed] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [sessionTimeout, setSessionTimeout] = useState(720);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash', 'card']);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsService.fetchSettings();
      setSettings(data);
      
      // تحديث الإعدادات المحددة
      const [name, logo, maintenance, registration, emailVerification, maxAttempts, timeout, methods] = await Promise.all([
        settingsService.getPlatformName(),
        settingsService.getPlatformLogo(),
        settingsService.isMaintenanceMode(),
        settingsService.isRegistrationAllowed(),
        settingsService.requireEmailVerification(),
        settingsService.getMaxLoginAttempts(),
        settingsService.getSessionTimeout(),
        settingsService.getPaymentMethods()
      ]);
      
      setPlatformName(name);
      setPlatformLogo(logo);
      setIsMaintenanceMode(maintenance);
      setIsRegistrationAllowed(registration);
      setRequireEmailVerification(emailVerification);
      setMaxLoginAttempts(maxAttempts);
      setSessionTimeout(timeout);
      setPaymentMethods(methods);
    } catch (err) {
      setError('حدث خطأ في تحميل الإعدادات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ربط الدوال بشكل صحيح
  const getSetting = useCallback((key: string, defaultValue?: any) => {
    return settingsService.getSetting(key, defaultValue);
  }, []);

  const getBoolean = useCallback((key: string, defaultValue?: boolean) => {
    return settingsService.getBoolean(key, defaultValue);
  }, []);

  const getNumber = useCallback((key: string, defaultValue?: number) => {
    return settingsService.getNumber(key, defaultValue);
  }, []);

  const getString = useCallback((key: string, defaultValue?: string) => {
    return settingsService.getString(key, defaultValue);
  }, []);

  const getArray = useCallback((key: string, defaultValue?: any[]) => {
    return settingsService.getArray(key, defaultValue);
  }, []);

  const refresh = useCallback(async () => {
    await settingsService.refresh();
    await fetchData();
  }, [fetchData]);

  return {
    settings,
    loading,
    error,
    getSetting,
    getBoolean,
    getNumber,
    getString,
    getArray,
    refresh,
    platformName,
    platformLogo,
    isMaintenanceMode,
    isRegistrationAllowed,
    requireEmailVerification,
    maxLoginAttempts,
    sessionTimeout,
    paymentMethods,
  };
};

export default useSettings;