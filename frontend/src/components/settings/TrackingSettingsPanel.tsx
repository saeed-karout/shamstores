// frontend/src/components/settings/TrackingSettingsPanel.tsx
//
// معرّفات أدوات التتبّع الإعلانية — Meta Pixel وTikTok Pixel وGoogle Analytics.
//
// **المعرّف وحده لا الشيفرة:** التاجر ينسخ رقماً من مدير إعلاناته، ونحن
// نحقن الشيفرة الرسمية. والخادم يرفض الصيغة الخاطئة برسالةٍ تسمّي الحقل —
// معرّفٌ منسوخ ناقصاً كان سيُحفظ ولا يعمل، ولا يعرف التاجر لماذا.
//
// **والأحداث تُرسل تلقائياً:** مشاهدة الصفحة والمنتج، والإضافة إلى السلّة،
// وبدء الطلب، وإتمامه بقيمته — فتتعلّم خوارزمية الإعلان من مشتريه هو.

import React, { useEffect, useState } from 'react';
import { IoAnalyticsOutline, IoSaveOutline, IoLogoFacebook, IoLogoTiktok, IoLogoGoogle, IoInformationCircleOutline } from 'react-icons/io5';

export interface TrackingSettingsValue {
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  ga4Id?: string | null;
}

interface Props {
  value?: TrackingSettingsValue | null;
  onSave: (value: TrackingSettingsValue) => Promise<void> | void;
  saving?: boolean;
  canEdit?: boolean;
  /** هل تستحقّ خطة التاجر الميزة؟ غير معروفٍ = يُعرض بلا تحذير */
  entitled?: boolean;
  colors: { bg: string; card: string; surf: string; accent: string; text: string; muted: string; border: string; red: string };
}

const FIELDS: Array<{
  key: keyof TrackingSettingsValue;
  label: string;
  placeholder: string;
  hint: string;
  icon: React.ReactNode;
  pattern: RegExp;
}> = [
  {
    key: 'metaPixelId',
    label: 'Meta Pixel (فيسبوك وإنستغرام)',
    placeholder: '123456789012345',
    hint: 'مدير الأحداث ← مصادر البيانات ← رقم البكسل (أرقام فقط).',
    icon: <IoLogoFacebook size={18} />,
    pattern: /^\d{8,20}$/
  },
  {
    key: 'tiktokPixelId',
    label: 'TikTok Pixel',
    placeholder: 'C1A2B3C4D5E6F7G8H9I0',
    hint: 'مدير الأحداث في تيك توك ← الويب ← معرّف البكسل.',
    icon: <IoLogoTiktok size={18} />,
    pattern: /^[A-Z0-9]{12,30}$/
  },
  {
    key: 'ga4Id',
    label: 'Google Analytics 4',
    placeholder: 'G-XXXXXXXXXX',
    hint: 'الإدارة ← مصادر البيانات ← معرّف القياس (يبدأ بـ G-).',
    icon: <IoLogoGoogle size={18} />,
    pattern: /^G-[A-Z0-9]{4,16}$/
  }
];

const TrackingSettingsPanel: React.FC<Props> = ({ value, onSave, saving, canEdit = true, entitled, colors: C }) => {
  const [form, setForm] = useState<Record<string, string>>({ metaPixelId: '', tiktokPixelId: '', ga4Id: '' });

  useEffect(() => {
    setForm({
      metaPixelId: value?.metaPixelId || '',
      tiktokPixelId: value?.tiktokPixelId || '',
      ga4Id: value?.ga4Id || ''
    });
  }, [value]);

  const errors = Object.fromEntries(
    FIELDS.map((f) => {
      const v = (form[f.key] || '').trim().toUpperCase();
      return [f.key, v && !f.pattern.test(v) ? 'صيغةٌ غير صحيحة — انسخ المعرّف كما هو' : ''];
    })
  );
  const hasError = Object.values(errors).some(Boolean);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <h2 style={{ color: C.text, fontSize: 16, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IoAnalyticsOutline style={{ color: C.accent }} /> التتبّع والإعلانات
      </h2>
      <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 16px', lineHeight: 1.8 }}>
        اربط حساباتك الإعلانية لتعرف أيّ إعلانٍ جلب المبيعات. تُرسَل تلقائياً: زيارة الصفحة، ومشاهدة المنتج،
        والإضافة إلى السلّة، وبدء الطلب، وإتمامه بقيمته.
      </p>

      {entitled === false && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            background: `${C.accent}12`,
            border: `1px solid ${C.accent}40`,
            borderRadius: 12,
            padding: '10px 12px',
            color: C.text,
            fontSize: 12.5,
            lineHeight: 1.8,
            marginBottom: 16
          }}
        >
          <IoInformationCircleOutline size={17} style={{ color: C.accent, flexShrink: 0, marginTop: 3 }} />
          تحفظ المعرّفات الآن، وتبدأ العمل في خطة «النموّ» فما فوق أو مع إضافة «لوحة التحليلات».
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label
              htmlFor={`trk-${f.key}`}
              style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.text, fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}
            >
              {f.icon} {f.label}
            </label>
            <input
              id={`trk-${f.key}`}
              dir="ltr"
              value={form[f.key]}
              disabled={!canEdit}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value.replace(/\s+/g, '') }))}
              placeholder={f.placeholder}
              aria-invalid={!!errors[f.key]}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: C.surf,
                border: `1px solid ${errors[f.key] ? C.red : C.border}`,
                borderRadius: 10,
                padding: '10px 12px',
                color: C.text,
                fontSize: 14,
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                textAlign: 'left'
              }}
            />
            <p style={{ color: errors[f.key] ? C.red : C.muted, fontSize: 11.5, margin: '5px 0 0' }}>
              {errors[f.key] || f.hint}
            </p>
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            type="button"
            disabled={saving || hasError}
            onClick={() =>
              onSave({
                metaPixelId: form.metaPixelId.trim() || null,
                tiktokPixelId: form.tiktokPixelId.trim().toUpperCase() || null,
                ga4Id: form.ga4Id.trim().toUpperCase() || null
              })
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              padding: '0 22px',
              borderRadius: 12,
              border: 'none',
              background: C.accent,
              color: C.bg,
              fontWeight: 800,
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: saving || hasError ? 'not-allowed' : 'pointer',
              opacity: saving || hasError ? 0.6 : 1
            }}
          >
            <IoSaveOutline size={17} />
            {saving ? 'جارٍ الحفظ…' : 'حفظ أدوات التتبّع'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TrackingSettingsPanel;
