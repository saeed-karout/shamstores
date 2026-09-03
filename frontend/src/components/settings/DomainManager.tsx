// frontend/src/components/settings/DomainManager.tsx
//
// إدارة الروابط: الرابط الافتراضي، النطاق الفرعي، والنطاق المخصص.
// يتحدث مع /api/custom-domain الذي يجري تحققاً حقيقياً من DNS.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IoGlobeOutline,
  IoCheckmarkCircle,
  IoCopyOutline,
  IoOpenOutline,
  IoLockClosed,
  IoRefresh,
  IoTrashOutline,
  IoAlertCircleOutline,
  IoLinkOutline,
  IoInformationCircleOutline,
  IoSparkles
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { APP_DOMAIN, isValidSubdomain, isValidCustomDomain, isReservedSubdomain } from '@/utils/subdomain';

// ==================== الثيم ====================
const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  surfHi: '#134838',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.16)',
  borderSoft: 'rgba(232,245,233,0.08)',
  red: '#FF6B6B',
  green: '#4ADE80',
  yellow: '#FBBF24',
  blue: '#60A5FA'
};

// ==================== الأنواع ====================
interface DomainStatus {
  businessType: 'restaurant' | 'store';
  subdomain: string | null;
  subdomainUrl: string | null;
  slugUrl: string | null;
  customDomain: string | null;
  customDomainUrl: string | null;
  customDomainVerified: boolean;
  customDomainVerifiedAt: string | null;
}

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

interface DnsSettings {
  targetDomain: string;
  verificationCode: string;
  instructions: { cname: DnsRecord; txt: DnsRecord };
}

interface DomainManagerProps {
  /** هل تدعم خطة التاجر النطاق المخصص */
  hasCustomDomainFeature?: boolean;
  /** هل يملك المستخدم صلاحية التعديل */
  canEdit?: boolean;
  /** يُستدعى بعد أي تغيير ناجح ليعيد الصفحة الأم تحميل بياناتها */
  onChanged?: () => void;
}

// ==================== أنماط مشتركة ====================
const sectionCard: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
  marginBottom: 16
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: C.muted,
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 8
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: C.surf,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 10,
  padding: '11px 14px',
  color: C.text,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  direction: 'ltr',
  textAlign: 'left'
};

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: 'none',
  borderRadius: 10,
  padding: '11px 18px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  minHeight: 44,
  transition: 'opacity .15s ease'
};

const btnPrimary: React.CSSProperties = { ...btnBase, background: C.accent, color: C.bg };
const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: C.muted,
  border: `1px solid ${C.borderSoft}`
};
const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(255,107,107,0.12)',
  color: C.red,
  border: `1px solid rgba(255,107,107,0.3)`
};

// ==================== مكونات صغيرة ====================

const CopyButton: React.FC<{ value: string; label?: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // متصفحات قديمة أو سياق غير آمن
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    toast.success('تم النسخ');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label || 'نسخ'}
      style={{
        ...btnGhost,
        padding: '8px 10px',
        minHeight: 36,
        color: copied ? C.green : C.muted,
        borderColor: copied ? 'rgba(74,222,128,0.35)' : C.borderSoft
      }}
    >
      {copied ? <IoCheckmarkCircle size={16} /> : <IoCopyOutline size={16} />}
    </button>
  );
};

const LinkRow: React.FC<{ label: string; url: string; badge?: string; badgeColor?: string }> = ({
  label,
  url,
  badge,
  badgeColor
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: C.surf,
      border: `1px solid ${C.borderSoft}`,
      borderRadius: 12,
      padding: '12px 14px',
      flexWrap: 'wrap'
    }}
  >
    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {badge && (
          <span
            style={{
              background: `${badgeColor || C.green}22`,
              color: badgeColor || C.green,
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 700
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div
        style={{
          color: C.text,
          fontSize: 13,
          direction: 'ltr',
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <CopyButton value={url} label={`نسخ ${label}`} />
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, padding: '8px 10px', minHeight: 36 }}>
        <IoOpenOutline size={16} />
      </a>
    </div>
  </div>
);

const DnsRecordCard: React.FC<{ record: DnsRecord; hint: string }> = ({ record, hint }) => (
  <div
    style={{
      background: C.surf,
      border: `1px solid ${C.borderSoft}`,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span
        style={{
          background: `${C.blue}22`,
          color: C.blue,
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.5
        }}
      >
        {record.type}
      </span>
      <span style={{ color: C.muted, fontSize: 11 }}>{hint}</span>
    </div>

    <div style={{ display: 'grid', gap: 8 }}>
      {[
        { k: 'Name / Host', v: record.name },
        { k: 'Value / Points to', v: record.value },
        { k: 'TTL', v: String(record.ttl) }
      ].map(({ k, v }) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: C.muted, fontSize: 11, width: 130, flexShrink: 0 }}>{k}</div>
          <code
            style={{
              flex: 1,
              minWidth: 0,
              background: C.bg,
              border: `1px solid ${C.borderSoft}`,
              borderRadius: 8,
              padding: '8px 10px',
              color: C.text,
              fontSize: 12,
              direction: 'ltr',
              textAlign: 'left',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {v}
          </code>
          <CopyButton value={v} label={k} />
        </div>
      ))}
    </div>
  </div>
);

// ==================== المكون الرئيسي ====================

const DomainManager: React.FC<DomainManagerProps> = ({
  hasCustomDomainFeature = false,
  canEdit = true,
  onChanged
}) => {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // subdomain
  const [subdomain, setSubdomain] = useState('');
  const [savingSubdomain, setSavingSubdomain] = useState(false);
  const [availability, setAvailability] = useState<{ checking: boolean; available?: boolean; reason?: string }>({
    checking: false
  });

  // custom domain
  const [customDomain, setCustomDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [dns, setDns] = useState<DnsSettings | null>(null);
  const [dnsCheck, setDnsCheck] = useState<{ txtVerified: boolean; cnameVerified: boolean; aVerified: boolean } | null>(
    null
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [removing, setRemoving] = useState(false);

  const availabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- تحميل الحالة ----------
  const loadStatus = useCallback(async () => {
    try {
      const data = await api.get<DomainStatus>('/custom-domain/status');
      setStatus(data);
      setSubdomain(data?.subdomain || '');
      setCustomDomain(data?.customDomain || '');
    } catch {
      // الرسالة تظهر عبر interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDns = useCallback(async () => {
    if (!hasCustomDomainFeature) return;
    try {
      const data = await api.get<DnsSettings>('/custom-domain/dns-settings');
      setDns(data);
    } catch {
      /* الخطة قد لا تدعم الميزة */
    }
  }, [hasCustomDomainFeature]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadDns();
  }, [loadDns]);

  // ---------- فحص توفر الـ subdomain ----------
  useEffect(() => {
    const value = subdomain.trim().toLowerCase();

    if (availabilityTimer.current) clearTimeout(availabilityTimer.current);

    if (!value || value === (status?.subdomain || '')) {
      setAvailability({ checking: false });
      return;
    }
    if (!isValidSubdomain(value)) {
      setAvailability({ checking: false, available: false, reason: 'الصيغة غير صالحة (3-63 حرفاً، إنجليزية وأرقام وشرطات)' });
      return;
    }
    if (isReservedSubdomain(value)) {
      setAvailability({ checking: false, available: false, reason: 'هذا الاسم محجوز للمنصة' });
      return;
    }

    setAvailability({ checking: true });
    availabilityTimer.current = setTimeout(async () => {
      try {
        const result = await api.get<{ available: boolean; reason?: string }>('/custom-domain/subdomain/check', {
          subdomain: value
        });
        setAvailability({ checking: false, available: result?.available, reason: result?.reason });
      } catch {
        setAvailability({ checking: false });
      }
    }, 450);

    return () => {
      if (availabilityTimer.current) clearTimeout(availabilityTimer.current);
    };
  }, [subdomain, status?.subdomain]);

  // ---------- حفظ الـ subdomain ----------
  const saveSubdomain = async () => {
    const value = subdomain.trim().toLowerCase();
    if (!isValidSubdomain(value)) {
      toast.error('الرابط الفرعي غير صالح');
      return;
    }

    setSavingSubdomain(true);
    try {
      await api.put('/custom-domain/subdomain', { subdomain: value });
      toast.success('تم حفظ الرابط الفرعي بنجاح');
      await loadStatus();
      await loadDns();
      onChanged?.();
    } catch {
      /* الرسالة تظهر عبر interceptor */
    } finally {
      setSavingSubdomain(false);
    }
  };

  // ---------- التحقق من الدومين المخصص ----------
  const verifyDomain = async () => {
    const value = customDomain.trim().toLowerCase();
    if (!isValidCustomDomain(value)) {
      toast.error('صيغة الدومين غير صالحة. مثال: mystore.com');
      return;
    }

    setVerifying(true);
    setDnsCheck(null);
    try {
      const response = await api.client.post('/custom-domain/verify-domain', { customDomain: value });
      const body: any = response.data;

      if (body?.success && body?.verified) {
        toast.success('تم التحقق من الدومين وتفعيله بنجاح 🎉');
        setShowInstructions(false);
        await loadStatus();
        onChanged?.();
      } else {
        toast.error(body?.error || 'لم يكتمل التحقق بعد');
        setShowInstructions(true);
        if (body?.data) {
          setDnsCheck({
            txtVerified: !!body.data.txtVerified,
            cnameVerified: !!body.data.cnameVerified,
            aVerified: !!body.data.aVerified
          });
          if (body.data.instructions) {
            setDns({
              targetDomain: body.data.targetDomain,
              verificationCode: body.data.verificationCode,
              instructions: body.data.instructions
            });
          }
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل التحقق من الدومين');
    } finally {
      setVerifying(false);
    }
  };

  // ---------- إزالة الدومين ----------
  const removeDomain = async () => {
    if (!window.confirm('هل أنت متأكد من إزالة الدومين المخصص؟ سيتوقف الوصول إلى متجرك عبره فوراً.')) return;

    setRemoving(true);
    try {
      await api.delete('/custom-domain/remove-domain');
      toast.success('تم إزالة الدومين المخصص');
      setCustomDomain('');
      setDnsCheck(null);
      setShowInstructions(false);
      await loadStatus();
      onChanged?.();
    } catch {
      /* الرسالة تظهر عبر interceptor */
    } finally {
      setRemoving(false);
    }
  };

  const isVerified = !!status?.customDomainVerified && !!status?.customDomain;

  const subdomainPreview = useMemo(
    () => `${subdomain.trim().toLowerCase() || 'my-store'}.${APP_DOMAIN}`,
    [subdomain]
  );

  if (loading) {
    return (
      <div style={{ ...sectionCard, textAlign: 'center', color: C.muted, padding: 40 }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${C.borderSoft}`,
            borderTopColor: C.accent,
            borderRadius: '50%',
            margin: '0 auto 12px',
            animation: 'sf-spin 0.8s linear infinite'
          }}
        />
        <style>{'@keyframes sf-spin{to{transform:rotate(360deg)}}'}</style>
        جاري تحميل إعدادات الروابط...
      </div>
    );
  }

  return (
    <div>
      {/* ==================== روابط متجرك الحالية ==================== */}
      <div style={sectionCard}>
        <h2
          style={{
            color: C.text,
            fontSize: 15,
            fontWeight: 800,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <IoLinkOutline style={{ color: C.accent }} /> روابط متجرك
        </h2>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
          كل الروابط أدناه تفتح نفس المتجر. استخدم أيها شئت في الإعلانات ورموز QR.
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          {status?.slugUrl && <LinkRow label="الرابط الافتراضي" url={status.slugUrl} />}
          {status?.subdomainUrl && <LinkRow label="الرابط الفرعي" url={status.subdomainUrl} />}
          {isVerified && status?.customDomainUrl && (
            <LinkRow label="الدومين المخصص" url={status.customDomainUrl} badge="موثّق" badgeColor={C.green} />
          )}
        </div>
      </div>

      {/* ==================== الرابط الفرعي ==================== */}
      <div style={sectionCard}>
        <h2
          style={{
            color: C.text,
            fontSize: 15,
            fontWeight: 800,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <IoGlobeOutline style={{ color: C.accent }} /> الرابط الفرعي
        </h2>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
          اسم قصير يميّز متجرك على المنصة. متاح في جميع الخطط.
        </p>

        <label style={labelStyle}>اسم الرابط</label>
        <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: '1 1 260px', minWidth: 0 }}>
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
              placeholder="my-store"
              disabled={!canEdit}
              style={{
                ...inputStyle,
                borderRadius: '0 10px 10px 0',
                borderColor:
                  availability.available === false
                    ? 'rgba(255,107,107,0.5)'
                    : availability.available === true
                    ? 'rgba(74,222,128,0.5)'
                    : C.borderSoft
              }}
            />
            <span
              style={{
                background: C.surfHi,
                border: `1px solid ${C.borderSoft}`,
                borderRight: 'none',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                color: C.muted,
                fontSize: 13,
                borderRadius: '10px 0 0 10px',
                whiteSpace: 'nowrap',
                direction: 'ltr'
              }}
            >
              .{APP_DOMAIN}
            </span>
          </div>

          <button
            type="button"
            onClick={saveSubdomain}
            disabled={!canEdit || savingSubdomain || availability.available === false || !subdomain.trim()}
            style={{
              ...btnPrimary,
              opacity:
                !canEdit || savingSubdomain || availability.available === false || !subdomain.trim() ? 0.5 : 1,
              cursor: !canEdit || savingSubdomain ? 'not-allowed' : 'pointer'
            }}
          >
            {savingSubdomain ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, minHeight: 18 }}>
          {availability.checking && <span style={{ color: C.muted }}>جاري التحقق من التوفر...</span>}
          {!availability.checking && availability.available === true && (
            <span style={{ color: C.green, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IoCheckmarkCircle size={13} /> متاح — سيصبح رابطك: {subdomainPreview}
            </span>
          )}
          {!availability.checking && availability.available === false && (
            <span style={{ color: C.red, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IoAlertCircleOutline size={13} /> {availability.reason || 'هذا الاسم غير متاح'}
            </span>
          )}
          {!availability.checking && availability.available === undefined && (
            <span style={{ color: C.muted }}>رابطك الحالي: {subdomainPreview}</span>
          )}
        </div>
      </div>

      {/* ==================== الدومين المخصص ==================== */}
      <div style={sectionCard}>
        <h2
          style={{
            color: C.text,
            fontSize: 15,
            fontWeight: 800,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <IoSparkles style={{ color: C.accent }} /> الدومين المخصص
        </h2>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
          اربط نطاقك الخاص (مثل mystore.com) ليصبح عنوان متجرك الرسمي.
        </p>

        {!hasCustomDomainFeature ? (
          <div
            style={{
              background: C.surf,
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              padding: 20,
              textAlign: 'center'
            }}
          >
            <IoLockClosed size={28} style={{ color: C.muted, marginBottom: 10 }} />
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              الدومين المخصص متاح في الخطط المدفوعة
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16, lineHeight: 1.8 }}>
              اجعل متجرك يظهر على نطاقك الخاص بدل الرابط الفرعي — يعزّز الثقة والعلامة التجارية.
            </div>
            <button type="button" onClick={() => (window.location.href = '/plans')} style={btnPrimary}>
              ترقية الخطة
            </button>
          </div>
        ) : isVerified ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.28)',
                borderRadius: 12,
                padding: 16,
                flexWrap: 'wrap'
              }}
            >
              <IoCheckmarkCircle size={26} style={{ color: C.green, flexShrink: 0 }} />
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ color: C.green, fontSize: 13, fontWeight: 800, marginBottom: 3 }}>
                  الدومين موثّق ويعمل
                </div>
                <a
                  href={`https://${status?.customDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.text, fontSize: 13, direction: 'ltr', display: 'inline-block' }}
                >
                  {status?.customDomain}
                </a>
              </div>
              {canEdit && (
                <button type="button" onClick={removeDomain} disabled={removing} style={btnDanger}>
                  <IoTrashOutline size={15} /> {removing ? 'جاري الإزالة...' : 'إزالة'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>نطاقك</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.trim().toLowerCase())}
                placeholder="mystore.com"
                disabled={!canEdit}
                style={{ ...inputStyle, flex: '1 1 240px' }}
              />
              <button
                type="button"
                onClick={verifyDomain}
                disabled={!canEdit || verifying || !customDomain.trim()}
                style={{ ...btnPrimary, opacity: !canEdit || verifying || !customDomain.trim() ? 0.5 : 1 }}
              >
                <IoRefresh size={15} className={verifying ? 'spin' : undefined} />
                {verifying ? 'جاري التحقق...' : 'تحقق وفعّل'}
              </button>
              {dns && (
                <button type="button" onClick={() => setShowInstructions((v) => !v)} style={btnGhost}>
                  <IoInformationCircleOutline size={15} />
                  {showInstructions ? 'إخفاء التعليمات' : 'تعليمات DNS'}
                </button>
              )}
            </div>

            {dnsCheck && (
              <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'سجل TXT (إثبات الملكية)', ok: dnsCheck.txtVerified },
                  { label: 'توجيه النطاق (CNAME/A)', ok: dnsCheck.cnameVerified || dnsCheck.aVerified }
                ].map(({ label, ok }) => (
                  <span
                    key={label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: ok ? C.green : C.yellow,
                      fontSize: 12
                    }}
                  >
                    {ok ? <IoCheckmarkCircle size={14} /> : <IoAlertCircleOutline size={14} />}
                    {label}
                  </span>
                ))}
              </div>
            )}

            {(showInstructions || dnsCheck) && dns && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    background: 'rgba(96,165,250,0.08)',
                    border: '1px solid rgba(96,165,250,0.25)',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 14
                  }}
                >
                  <IoInformationCircleOutline size={18} style={{ color: C.blue, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.9 }}>
                    أضف السجلين التاليين في لوحة إدارة نطاقك (Cloudflare، GoDaddy، Namecheap...)، ثم اضغط
                    «تحقق وفعّل». قد يستغرق انتشار الـ DNS من دقائق حتى 24 ساعة.
                  </div>
                </div>

                <DnsRecordCard record={dns.instructions.txt} hint="لإثبات ملكيتك للنطاق" />
                <DnsRecordCard record={dns.instructions.cname} hint="لتوجيه الزوار إلى متجرك" />
              </div>
            )}
          </div>
        )}
      </div>

      <style>{'.spin{animation:sf-spin 0.8s linear infinite}@keyframes sf-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
};

export default DomainManager;
