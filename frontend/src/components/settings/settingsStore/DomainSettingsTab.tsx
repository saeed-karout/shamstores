// src/components/settings/settingsStore/DomainSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoGlobe, IoCheckmarkCircle, IoCopy, IoInformation, IoWarning, IoLink } from 'react-icons/io5';
import { DomainSettings } from '@/types/stores/settings.types';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', yellow: '#FBBF24', green: '#4ADE80',
};

interface DomainSettingsTabProps {
  initialData: DomainSettings;
  onSave: (data: Partial<DomainSettings>) => Promise<void>;
  isPro?: boolean;
  currentPlan?: any;
}

const DomainSettingsTab: React.FC<DomainSettingsTabProps> = ({
  initialData,
  onSave,
  isPro = false,
  currentPlan
}) => {
  const [subdomain, setSubdomain] = useState('');
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [subdomainSaved, setSubdomainSaved] = useState(false);

  const [customDomain, setCustomDomain] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dnsSettings, setDnsSettings] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [loadingDns, setLoadingDns] = useState(false);

  const hasCustomDomainFeature = currentPlan?.hasCustomDomain === true || isPro === true;

  const fetchDnsSettings = async () => {
    setLoadingDns(true);
    try {
      const response = await fetch('/api/store/settings/domain/dns', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) setDnsSettings(data.data);
    } catch (error) {
      toast.error('فشل تحميل إعدادات DNS');
    } finally {
      setLoadingDns(false);
    }
  };

  const saveSubdomain = async () => {
    if (!subdomain.trim()) {
      toast.error('الرجاء إدخال الـ subdomain');
      return;
    }
    setSavingSubdomain(true);
    try {
      const response = await fetch('/api/store/settings/subdomain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subdomain: subdomain.trim().toLowerCase() })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم حفظ الـ subdomain بنجاح');
        setSubdomainSaved(true);
        setSubdomain(data.data.subdomain);
      } else {
        toast.error(data.error || 'فشل حفظ الـ subdomain');
      }
    } catch {
      toast.error('فشل حفظ الـ subdomain');
    } finally {
      setSavingSubdomain(false);
    }
  };

  const verifyDomain = async () => {
    if (!customDomain) { toast.error('الرجاء إدخال الدومين'); return; }
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
        await onSave({ customDomain, customDomainVerified: true, customDomainVerifiedAt: new Date() });
      } else {
        toast.error(data.error || 'فشل التحقق من الدومين');
        setShowInstructions(true);
        await fetchDnsSettings();
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل التحقق من الدومين');
    } finally {
      setVerifying(false);
    }
  };

  const removeDomain = async () => {
    if (!confirm('هل أنت متأكد من إزالة الدومين المخصص؟')) return;
    try {
      const response = await fetch('/api/store/settings/domain', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('تم إزالة الدومين المخصص بنجاح');
        setCustomDomain('');
        setIsVerified(false);
        await onSave({ customDomain: '', customDomainVerified: false, customDomainVerifiedAt: undefined });
      } else {
        toast.error(data.error || 'فشل إزالة الدومين');
      }
    } catch {
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
      setSubdomain((initialData as any).subdomain || '');
      setSubdomainSaved(!!(initialData as any).subdomain);
      setCustomDomain(initialData.customDomain || '');
      setIsVerified(initialData.customDomainVerified || false);
    }
    if (hasCustomDomainFeature) fetchDnsSettings();
  }, [initialData, hasCustomDomainFeature]);

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`,
    background: C.surf, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14,
    outline: 'none', direction: 'ltr',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 10, border: 'none', background: C.accent,
    color: '#082E24', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', whiteSpace: 'nowrap',
  };

  const btnDanger: React.CSSProperties = {
    ...btnPrimary, background: C.red, color: '#fff',
  };

  const sectionCard: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20,
  };

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif' }}>

      {/* Subdomain Section - Available to all */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.blue}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoLink size={18} style={{ color: C.blue }} />
          </div>
          <div>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>رابط المتجر (Subdomain)</h3>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>سيكون رابط متجرك على المنصة</p>
          </div>
        </div>

        <div style={{ background: `${C.blue}10`, border: `1px solid ${C.blue}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8 }}>
          <IoInformation size={16} style={{ color: C.blue, marginTop: 2, flexShrink: 0 }} />
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
            بعد الحفظ سيكون متجرك متاحاً على: <span style={{ color: C.accent, fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>{subdomain || 'my-store'}.shamstores.com</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={subdomain}
            onChange={(e) => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainSaved(false); }}
            placeholder="my-store"
            style={inputStyle}
          />
          <button
            onClick={saveSubdomain}
            disabled={savingSubdomain || !subdomain.trim()}
            style={{ ...btnPrimary, opacity: savingSubdomain || !subdomain.trim() ? 0.6 : 1 }}
          >
            {savingSubdomain ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
        <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>أحرف إنجليزية صغيرة وأرقام وشرطات فقط، 3-63 حرفاً</p>

        {subdomainSaved && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoCheckmarkCircle size={16} style={{ color: C.green }} />
            <span style={{ color: C.green, fontSize: 12 }}>
              متجرك متاح على: <a href={`https://${subdomain}.shamstores.com`} target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>{subdomain}.shamstores.com</a>
            </span>
            <button onClick={() => copyToClipboard(`https://${subdomain}.shamstores.com`, 'sub')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2 }}>
              <IoCopy size={14} />
            </button>
            {copied === 'sub' && <span style={{ color: C.green, fontSize: 11 }}>✓ تم النسخ</span>}
          </div>
        )}
      </div>

      {/* Custom Domain Section */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoGlobe size={18} style={{ color: C.accent }} />
          </div>
          <div>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>دومين مخصص</h3>
            <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
              {hasCustomDomainFeature ? 'استخدم نطاقك الخاص بدلاً من subdomain.shamstores.com' : 'متاح في الخطة الاحترافية فقط'}
            </p>
          </div>
          {!hasCustomDomainFeature && (
            <span style={{ marginRight: 'auto', background: `${C.yellow}22`, color: C.yellow, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Pro</span>
          )}
        </div>

        {!hasCustomDomainFeature ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>ترقية خطتك للوصول إلى هذه الميزة</p>
            <button onClick={() => window.location.href = '/plans'} style={btnPrimary}>ترقية الخطة</button>
          </div>
        ) : isVerified && customDomain ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.green}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <IoCheckmarkCircle size={28} style={{ color: C.green }} />
            </div>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>الدومين مفعل</p>
            <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 13 }}>{customDomain}</a>
            <p style={{ color: C.muted, fontSize: 11, margin: '8px 0' }}>قد يستغرق تفعيل الدومين بالكامل حتى 48 ساعة</p>
            <button onClick={removeDomain} style={{ ...btnDanger, marginTop: 8 }}>إزالة الدومين</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="myshop.com"
                style={inputStyle}
              />
              <button onClick={verifyDomain} disabled={verifying || !customDomain} style={{ ...btnPrimary, opacity: verifying || !customDomain ? 0.6 : 1 }}>
                {verifying ? 'جاري التحقق...' : 'تحقق'}
              </button>
            </div>
            <p style={{ color: C.muted, fontSize: 11 }}>أدخل الدومين بدون http:// أو https://</p>

            <button type="button" onClick={() => setShowInstructions(!showInstructions)} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 8, textDecoration: 'underline' }}>
              {showInstructions ? 'إخفاء تعليمات DNS' : 'عرض تعليمات إعداد DNS'}
            </button>

            {showInstructions && dnsSettings && (
              <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginTop: 12 }}>
                <h4 style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoWarning size={14} style={{ color: C.yellow }} /> إعدادات DNS المطلوبة
                </h4>
                {['cname', 'txt'].map((type) => (
                  <div key={type} style={{ marginBottom: 12, padding: 12, background: C.card, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <code style={{ background: `${C.accent}22`, color: C.accent, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{type.toUpperCase()} Record</code>
                      <button onClick={() => copyToClipboard(dnsSettings.instructions[type].value, type)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
                        <IoCopy size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>الاسم: <code style={{ color: C.text }}>{dnsSettings.instructions[type].name}</code></span>
                      <span>القيمة: <code style={{ color: C.text, wordBreak: 'break-all' }}>{dnsSettings.instructions[type].value}</code></span>
                      <span>TTL: <code style={{ color: C.text }}>{dnsSettings.instructions[type].ttl}</code></span>
                    </div>
                    {copied === type && <p style={{ color: C.green, fontSize: 11, marginTop: 4 }}>✓ تم نسخ القيمة</p>}
                  </div>
                ))}
                <p style={{ color: C.yellow, fontSize: 11, marginTop: 8 }}>
                  قد يستغرق تفعيل DNS من 30 دقيقة إلى 48 ساعة
                </p>
              </div>
            )}

            {loadingDns && (
              <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>جاري تحميل إعدادات DNS...</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DomainSettingsTab;
