// src/components/settings/DomainSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoGlobe, IoCheckmarkCircle, IoCopy, IoInformation, IoWarning, IoRefresh } from 'react-icons/io5';
import { DomainSettings } from '@/types/stores/settings.types';
import { useDomainSettings } from '@/hooks/stores/useDomainSettings';
import Button from '@/components/common/Button';
import toast from 'react-hot-toast';

interface DomainSettingsTabProps {
  initialData: DomainSettings;
  onSave: (data: Partial<DomainSettings>) => Promise<void>;
  isPro?: boolean;
  currentPlan?: any; // ✅ إضافة خطة المستخدم الحالية
}

const DomainSettingsTab: React.FC<DomainSettingsTabProps> = ({ 
  initialData, 
  onSave, 
  isPro = false,
  currentPlan 
}) => {
  const [customDomain, setCustomDomain] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dnsSettings, setDnsSettings] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingDns, setLoadingDns] = useState(false);

  // التحقق مما إذا كانت الخطة تدعم الدومين المخصص
  const hasCustomDomainFeature = currentPlan?.hasCustomDomain === true || isPro === true;

  // جلب إعدادات DNS
  const fetchDnsSettings = async () => {
    setLoadingDns(true);
    try {
      const response = await fetch('/api/store/settings/domain/dns', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setDnsSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching DNS settings:', error);
      toast.error('فشل تحميل إعدادات DNS');
    } finally {
      setLoadingDns(false);
    }
  };

  // التحقق من الدومين
  const verifyDomain = async () => {
    if (!customDomain) {
      toast.error('الرجاء إدخال الدومين');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch('/api/store/settings/domain/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ customDomain })
      });
      
      const data = await response.json();
      
      if (data.success && data.verified) {
        toast.success('تم التحقق من الدومين وتفعيله بنجاح!');
        setIsVerified(true);
        await onSave({ 
          customDomain, 
          customDomainVerified: true, 
          customDomainVerifiedAt: new Date() 
        });
      } else {
        toast.error(data.error || 'فشل التحقق من الدومين');
        // عرض تعليمات DNS إذا فشل التحقق
        setShowInstructions(true);
        await fetchDnsSettings();
      }
    } catch (error: any) {
      console.error('Error verifying domain:', error);
      toast.error(error.message || 'فشل التحقق من الدومين');
    } finally {
      setVerifying(false);
    }
  };

  // إزالة الدومين
  const removeDomain = async () => {
    if (!confirm('هل أنت متأكد من إزالة الدومين المخصص؟')) return;

    try {
      const response = await fetch('/api/store/settings/domain', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('تم إزالة الدومين المخصص بنجاح');
        setCustomDomain('');
        setIsVerified(false);
        await onSave({ 
          customDomain: '', 
          customDomainVerified: false, 
          customDomainVerifiedAt: undefined 
        });
      } else {
        toast.error(data.error || 'فشل إزالة الدومين');
      }
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('فشل إزالة الدومين');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success('تم نسخ النص');
  };

  useEffect(() => {
    if (initialData) {
      setCustomDomain(initialData.customDomain || '');
      setIsVerified(initialData.customDomainVerified || false);
    }
    if (hasCustomDomainFeature) {
      fetchDnsSettings();
    }
  }, [initialData, hasCustomDomainFeature]);

  // إذا كانت الخطة لا تدعم الدومين المخصص
  if (!hasCustomDomainFeature) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IoGlobe className="text-yellow-500 text-4xl" />
        </div>
        <h3 className="text-xl font-bold mb-2">🌐 الدومين المخصص</h3>
        <p className="text-gray-600 mb-4">
          هذه الميزة متاحة فقط في الخطة الاحترافية
        </p>
        <Button variant="primary" onClick={() => window.location.href = '/plans'}>
          ترقية الخطة
        </Button>
      </div>
    );
  }

  // إذا كان الدومين مفعلاً
  if (isVerified && customDomain) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IoCheckmarkCircle className="text-green-600 text-5xl" />
        </div>
        <h3 className="text-xl font-bold mb-2">✅ الدومين مفعل</h3>
        <p className="text-gray-600 mb-4">
          متجرك متاح الآن على: <br />
          <a 
            href={`https://${customDomain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-600 font-medium underline"
          >
            {customDomain}
          </a>
        </p>
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-3">
            ⚠️ ملاحظة: قد يستغرق تفعيل الدومين بالكامل حتى 48 ساعة
          </p>
          <Button variant="danger" onClick={removeDomain}>
            إزالة الدومين
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <IoInformation className="text-blue-500 text-xl mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 mb-1">ما هو الدومين المخصص؟</h3>
            <p className="text-sm text-blue-700">
              الدومين المخصص يسمح لك باستخدام عنوان URL الخاص بك بدلاً من subdomain.example.com. 
              مثال: يمكنك استخدام shop.com بدلاً من shop.example.com
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">الدومين المخصص</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="مثال: myshop.com"
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
            dir="ltr"
          />
          <Button 
            onClick={verifyDomain} 
            variant="primary" 
            disabled={verifying || !customDomain}
          >
            {verifying ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                جاري التحقق...
              </div>
            ) : (
              'تحقق'
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          أدخل الدومين بدون http:// أو https://
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowInstructions(!showInstructions)}
        className="text-green-600 text-sm underline hover:text-green-700"
      >
        {showInstructions ? 'إخفاء التعليمات' : 'عرض تعليمات إعداد DNS'}
      </button>

      {showInstructions && dnsSettings && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <IoWarning className="text-yellow-500" />
            إعدادات DNS المطلوبة
          </h4>
          <div className="space-y-3">
            <div className="border-b pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono bg-white px-2 py-1 rounded text-sm font-bold">CNAME Record</span>
                <button
                  onClick={() => copyToClipboard(dnsSettings.instructions.cname.value, 'cname')}
                  className="text-gray-500 hover:text-green-600 transition"
                >
                  <IoCopy size={18} />
                </button>
              </div>
              <div className="text-sm space-y-1 bg-white p-2 rounded">
                <p><span className="text-gray-600">الاسم (Name/Host):</span> <code className="bg-gray-100 px-1">{dnsSettings.instructions.cname.name}</code></p>
                <p><span className="text-gray-600">القيمة (Value/Points to):</span> <code className="bg-gray-100 px-1">{dnsSettings.instructions.cname.value}</code></p>
                <p><span className="text-gray-600">TTL:</span> {dnsSettings.instructions.cname.ttl}</p>
              </div>
              {copied === 'cname' && (
                <p className="text-green-600 text-xs mt-1">✓ تم نسخ القيمة</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono bg-white px-2 py-1 rounded text-sm font-bold">TXT Record</span>
                <button
                  onClick={() => copyToClipboard(dnsSettings.instructions.txt.value, 'txt')}
                  className="text-gray-500 hover:text-green-600 transition"
                >
                  <IoCopy size={18} />
                </button>
              </div>
              <div className="text-sm space-y-1 bg-white p-2 rounded">
                <p><span className="text-gray-600">الاسم (Name/Host):</span> <code className="bg-gray-100 px-1">{dnsSettings.instructions.txt.name}</code></p>
                <p><span className="text-gray-600">القيمة (Value/Text):</span> <code className="bg-gray-100 px-1 break-all">{dnsSettings.instructions.txt.value}</code></p>
                <p><span className="text-gray-600">TTL:</span> {dnsSettings.instructions.txt.ttl}</p>
              </div>
              {copied === 'txt' && (
                <p className="text-green-600 text-xs mt-1">✓ تم نسخ القيمة</p>
              )}
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <IoWarning className="mt-0.5 flex-shrink-0" />
              ⏱️ قد يستغرق تفعيل إعدادات DNS من 30 دقيقة إلى 48 ساعة حسب مزود الخدمة
            </p>
          </div>
        </div>
      )}

      {loadingDns && (
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent" />
          <span>جاري تحميل إعدادات DNS...</span>
        </div>
      )}
    </div>
  );
};

export default DomainSettingsTab;