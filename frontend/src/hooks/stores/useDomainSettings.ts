// src/hooks/useDomainSettings.ts

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/services/api';

interface DnsSettings {
  targetDomain: string;
  verificationCode: string;
  instructions: {
    cname: { name: string; value: string; ttl: number };
    txt: { name: string; value: string; ttl: number };
  };
}

export const useDomainSettings = () => {
  const [verifying, setVerifying] = useState(false);
  const [dnsSettings, setDnsSettings] = useState<DnsSettings | null>(null);

  const fetchDnsSettings = useCallback(async () => {
    try {
      const response = await api.get('/store/settings/domain/dns');
      setDnsSettings(response);
      return response;
    } catch (error) {
      console.error('Error fetching DNS settings:', error);
      toast.error('فشل تحميل إعدادات DNS');
      return null;
    }
  }, []);

  const verifyDomain = useCallback(async (customDomain: string) => {
    if (!customDomain) {
      toast.error('الرجاء إدخال الدومين');
      return false;
    }

    setVerifying(true);
    try {
      const response = await api.post('/store/settings/domain/verify', { customDomain });
      
      if (response.verified) {
        toast.success('تم التحقق من الدومين وتفعيله بنجاح!');
        return true;
      } else {
        toast.error('لم يتم التحقق من إعدادات DNS بعد');
        setDnsSettings(response);
        return false;
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل التحقق من الدومين');
      return false;
    } finally {
      setVerifying(false);
    }
  }, []);

  const removeDomain = useCallback(async () => {
    try {
      await api.delete('/store/settings/domain');
      toast.success('تم إزالة الدومين المخصص');
      return true;
    } catch (error) {
      toast.error('فشل إزالة الدومين');
      return false;
    }
  }, []);

  return {
    verifying,
    dnsSettings,
    fetchDnsSettings,
    verifyDomain,
    removeDomain
  };
};