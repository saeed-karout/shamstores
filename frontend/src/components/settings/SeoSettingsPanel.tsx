// frontend/src/components/settings/SeoSettingsPanel.tsx
//
// إعدادات محرّكات البحث والمشاركة — لكل متجرٍ أو مطعمٍ وحده.
//
// **ما يضبطه التاجر هنا:** عنوان صفحته في جوجل، ووصفها، وكلماتٍ مفتاحية،
// وصورة المشاركة (ما يظهر حين يُرسَل رابطه في واتساب)، وأيقونة التبويب،
// وإخفاء الواجهة عن محرّكات البحث أثناء التجهيز.
//
// **ولماذا المعاينة أهمّ من الحقول:** التاجر لا يعرف ما «meta description»،
// لكنه يعرف نتيجة جوجل وبطاقة واتساب حين يراهما. فالحقل يُكتب والنتيجة
// تتغيّر أمامه بالشكل الذي سيراه زبونه — والعدّاد يقول متى يُقصّ النصّ.
//
// **والفارغ ليس خطأً:** كل حقلٍ فارغ يُشتقّ من اسم النشاط ووصفه وشعاره —
// والمعاينة تعرض المشتقّ باهتاً كي يعرف التاجر ما سيظهر إن لم يكتب شيئاً.
//
// الحدود هنا تطابق backend/src/services/seo.service.ts — الخادم يقصّ ما فوقها.

import React, { useEffect, useMemo, useState } from 'react';
import {
  IoSearchOutline,
  IoShareSocialOutline,
  IoEyeOffOutline,
  IoSaveOutline,
  IoInformationCircleOutline,
  IoLogoGoogle
} from 'react-icons/io5';
import ImageUploadField from '@/components/common/ImageUploadField';
import TagsInput from '@/components/common/TagsInput';
import { getImageUrl } from '@/utils/imageHelpers';

export interface SeoSettingsValue {
  title?: string | null;
  description?: string | null;
  keywords?: string[];
  ogImage?: string | null;
  favicon?: string | null;
  noindex?: boolean;
}

const LIMITS = { title: 70, description: 170 };
/** ما يعرضه جوجل فعلاً قبل أن يقصّ — العدّاد يلوّن ما بعده */
const VISIBLE = { title: 60, description: 155 };

interface Props {
  value?: SeoSettingsValue | null;
  business: {
    type: 'restaurant' | 'store';
    name: string;
    description?: string | null;
    logo?: string | null;
    coverImage?: string | null;
    /** الرابط العامّ كما يراه الزبون */
    url: string;
    id?: string;
  };
  onSave: (value: SeoSettingsValue) => Promise<void> | void;
  saving?: boolean;
  canEdit?: boolean;
  colors: {
    bg: string;
    card: string;
    surf: string;
    accent: string;
    text: string;
    muted: string;
    border: string;
    red: string;
  };
}

const SeoSettingsPanel: React.FC<Props> = ({ value, business, onSave, saving, canEdit = true, colors: C }) => {
  const [form, setForm] = useState<Required<SeoSettingsValue>>({
    title: '',
    description: '',
    keywords: [],
    ogImage: '',
    favicon: '',
    noindex: false
  });

  useEffect(() => {
    setForm({
      title: value?.title || '',
      description: value?.description || '',
      keywords: Array.isArray(value?.keywords) ? value!.keywords : [],
      ogImage: value?.ogImage || '',
      favicon: value?.favicon || '',
      noindex: value?.noindex === true
    });
  }, [value]);

  // القيم المشتقّة — نفس قواعد الخادم، تُعرض حين يترك التاجر الحقل فارغاً
  const derived = useMemo(() => {
    const name = business.name || (business.type === 'restaurant' ? 'مطعم' : 'متجر');
    return {
      title:
        business.type === 'restaurant'
          ? `${name} — القائمة الرقمية والطلب أونلاين`
          : `${name} — متجر إلكتروني`,
      description:
        (business.description || '').trim().slice(0, LIMITS.description) ||
        (business.type === 'restaurant'
          ? `تصفّح قائمة ${name} واطلب أونلاين. الأسعار بالليرة السورية.`
          : `تصفّح منتجات ${name} واطلب أونلاين. الأسعار بالليرة السورية.`),
      image: business.coverImage || business.logo || '',
      favicon: business.logo || ''
    };
  }, [business]);

  const shown = {
    title: form.title.trim() || derived.title,
    description: form.description.trim() || derived.description,
    image: form.ogImage || derived.image,
    favicon: form.favicon || derived.favicon
  };

  const set = <K extends keyof SeoSettingsValue>(key: K, next: SeoSettingsValue[K]) =>
    setForm((f) => ({ ...f, [key]: next }));

  const host = business.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const card: React.CSSProperties = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  };
  const label: React.CSSProperties = { display: 'block', color: C.text, fontSize: 13.5, fontWeight: 700, marginBottom: 6 };
  const input: React.CSSProperties = {
    width: '100%',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '10px 12px',
    color: C.text,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  };

  const Counter: React.FC<{ n: number; visible: number; max: number }> = ({ n, visible, max }) => (
    <span
      style={{
        fontSize: 11.5,
        fontVariantNumeric: 'tabular-nums',
        color: n > visible ? '#C2410C' : C.muted,
        fontWeight: n > visible ? 700 : 500
      }}
      title={n > visible ? 'قد يقصّ جوجل ما بعد هذا الطول' : undefined}
    >
      {n}/{max}
    </span>
  );

  return (
    <div style={{ display: 'grid', gap: 0 }}>
      {/* ===== المعاينة ===== */}
      <div style={{ ...card, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            <IoLogoGoogle size={14} /> هكذا تظهر في نتائج جوجل
          </div>
          <div
            dir="rtl"
            style={{
              background: '#fff',
              border: '1px solid #E8EAED',
              borderRadius: 12,
              padding: '14px 16px',
              fontFamily: 'Arial, Cairo, sans-serif'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: '#F1F3F4',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {shown.favicon ? (
                  <img src={getImageUrl(shown.favicon)} alt="" style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <IoSearchOutline size={13} color="#5F6368" />
                )}
              </span>
              <span style={{ display: 'grid', lineHeight: 1.3, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: '#202124' }}>{business.name}</span>
                <bdi dir="ltr" style={{ fontSize: 11.5, color: '#4D5156', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {host}
                </bdi>
              </span>
            </div>
            <div
              style={{
                color: '#1A0DAB',
                fontSize: 18,
                lineHeight: 1.35,
                marginBottom: 4,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                opacity: form.title.trim() ? 1 : 0.7
              }}
            >
              {shown.title}
            </div>
            <div
              style={{
                color: '#4D5156',
                fontSize: 13.5,
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                opacity: form.description.trim() ? 1 : 0.7
              }}
            >
              {shown.description}
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            <IoShareSocialOutline size={14} /> هكذا يظهر رابطك في واتساب وفيسبوك
          </div>
          <div
            style={{
              background: '#fff',
              border: '1px solid #E8EAED',
              borderRadius: 12,
              overflow: 'hidden',
              maxWidth: 380
            }}
          >
            <div style={{ aspectRatio: '1.91 / 1', background: '#F1F3F4', display: 'grid', placeItems: 'center' }}>
              {shown.image ? (
                <img src={getImageUrl(shown.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#80868B', fontSize: 12.5 }}>بلا صورة — أضف غلافاً أو صورة مشاركة</span>
              )}
            </div>
            <div style={{ padding: '10px 12px', background: '#F7F8F8', fontFamily: 'Arial, Cairo, sans-serif' }} dir="rtl">
              <bdi dir="ltr" style={{ display: 'block', fontSize: 11, color: '#65676B', textTransform: 'uppercase' }}>{host}</bdi>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#050505', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shown.title}
              </div>
              <div style={{ fontSize: 12.5, color: '#65676B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {shown.description}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== العنوان والوصف ===== */}
      <div style={card}>
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoSearchOutline style={{ color: C.accent }} /> محرّكات البحث
        </h2>
        <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 18px', lineHeight: 1.8 }}>
          هذه الإعدادات لـ{business.type === 'restaurant' ? 'مطعمك' : 'متجرك'} وحده. ما تتركه فارغاً يُؤخذ من الاسم والوصف
          والشعار تلقائياً.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={label} htmlFor="seo-title">عنوان الصفحة</label>
            <Counter n={form.title.length} visible={VISIBLE.title} max={LIMITS.title} />
          </div>
          <input
            id="seo-title"
            value={form.title}
            maxLength={LIMITS.title}
            disabled={!canEdit}
            onChange={(e) => set('title', e.target.value)}
            placeholder={derived.title}
            style={input}
          />
          <p style={{ color: C.muted, fontSize: 11.5, margin: '6px 0 0' }}>
            اذكر ما تبيعه ومدينتك: «متجر ياسمين — فساتين وعبايات في دمشق» أقوى من الاسم وحده.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={label} htmlFor="seo-description">الوصف</label>
            <Counter n={form.description.length} visible={VISIBLE.description} max={LIMITS.description} />
          </div>
          <textarea
            id="seo-description"
            value={form.description}
            maxLength={LIMITS.description}
            disabled={!canEdit}
            rows={3}
            onChange={(e) => set('description', e.target.value)}
            placeholder={derived.description}
            style={{ ...input, resize: 'vertical', lineHeight: 1.8 }}
          />
        </div>

        <div>
          <label style={label}>كلمات مفتاحية</label>
          <TagsInput
            value={form.keywords}
            onChange={(next) => set('keywords', next)}
            max={12}
            colors={{ text: C.text, muted: C.muted, surface: C.surf, border: C.border, accent: C.accent, bg: C.bg }}
          />
          <p style={{ color: C.muted, fontSize: 11.5, margin: '6px 0 0' }}>
            حتى ١٢ كلمة — ما يكتبه زبونك في البحث: «شاورما»، «توصيل دمشق»، «فساتين سهرة».
          </p>
        </div>
      </div>

      {/* ===== الصور ===== */}
      <div style={card}>
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 800, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoShareSocialOutline style={{ color: C.accent }} /> المشاركة وأيقونة التبويب
        </h2>
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <ImageUploadField
            label="صورة المشاركة"
            value={form.ogImage}
            onChange={(url) => set('ogImage', url)}
            uploadType={`${business.type}s`}
            entityId={business.id}
            subType="cover"
            previewAspect="1.91 / 1"
            hint="١٢٠٠×٦٣٠ بكسل مثالية. تظهر حين يُشارَك رابطك. بلا صورة يُستعمل الغلاف."
          />
          <ImageUploadField
            label="أيقونة التبويب"
            value={form.favicon}
            onChange={(url) => set('favicon', url)}
            uploadType={`${business.type}s`}
            entityId={business.id}
            subType="icon"
            previewAspect="1 / 1"
            hint="مربّعة، ١٩٢×١٩٢ على الأقلّ. تظهر في تبويب المتصفّح وبجانب نتيجة جوجل. بلا صورة يُستعمل شعارك."
          />
        </div>
      </div>

      {/* ===== الإخفاء ===== */}
      <div style={{ ...card, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <IoEyeOffOutline size={22} style={{ color: form.noindex ? C.red : C.muted, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canEdit ? 'pointer' : 'default' }}>
            <input
              type="checkbox"
              checked={form.noindex}
              disabled={!canEdit}
              onChange={(e) => set('noindex', e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C.accent }}
            />
            <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>إخفاء الواجهة عن محرّكات البحث</span>
          </label>
          <p style={{ color: C.muted, fontSize: 12, margin: '6px 0 0', lineHeight: 1.8 }}>
            <IoInformationCircleOutline style={{ verticalAlign: 'middle' }} /> مفيدٌ أثناء تجهيز{' '}
            {business.type === 'restaurant' ? 'المطعم' : 'المتجر'}. رابطك يبقى يعمل لمن تشاركه معه، لكن جوجل لن يعرضه.
            أطفئه حين تجهز.
          </p>
        </div>
      </div>

      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onSave({
                title: form.title.trim() || null,
                description: form.description.trim() || null,
                keywords: form.keywords,
                ogImage: form.ogImage || null,
                favicon: form.favicon || null,
                noindex: form.noindex
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
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            <IoSaveOutline size={17} />
            {saving ? 'جارٍ الحفظ…' : 'حفظ إعدادات البحث'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SeoSettingsPanel;
