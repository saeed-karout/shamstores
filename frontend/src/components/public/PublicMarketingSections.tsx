// frontend/src/components/public/PublicMarketingSections.tsx
//
// المحتوى التسويقي للنشاط في واجهته: إعلانٌ قصير، وبانراتٌ متحرّكة، وعروض.
//
// **بألوان التاجر لا بألوان ثابتة.** كانت البطاقات مرسومةً بلوحة المنصّة
// الداكنة (نصٌّ فاتح شبه أبيض) فوق واجهاتٍ أغلبها فاتحة — فيختفي عنوان
// العرض في خلفيته. الآن متغيّرات الواجهة `sf` نفسها التي ترسم المنتجات.
//
// **والبانرات شرائح لا بطاقات.** البانر صورةٌ عريضة تُقلَّب بالإصبع؛ ثلاث
// بطاقات متجاورة بعنوان «بانرات» كانت تبدو قائمةً لا إعلاناً.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoMegaphoneOutline, IoPricetagOutline, IoArrowBack } from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';
import api from '@/services/api';
import BannerCarousel from '@/components/storefront/BannerCarousel';
import { sf } from '@/utils/storefrontTheme';
import { sd } from '@/utils/storefrontDesign';
import { useT } from '@/i18n/storefront';
import { SkeletonScope, SkeletonBlock } from '../common/Skeleton';

type SectionType = 'announcement' | 'banner' | 'offer';

export interface MarketingSection {
  id: string;
  businessType: string;
  businessId: string;
  sectionType: SectionType;
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive: boolean;
  sortOrder: number;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingData {
  sectionOrder: SectionType[];
  sections: MarketingSection[];
}

interface PublicMarketingSectionsProps {
  businessId?: string;
  businessType?: 'restaurant' | 'store';
  className?: string;
  limitPerSection?: number;
  /**
   * أيّ الأنواع يُعرض هنا — الصفحة قد تضع البانرات أعلاها والعروض أسفلها.
   * غيابه يعني الكلّ بالترتيب الذي اختاره التاجر.
   */
  only?: SectionType[];
}

/**
 * طلبٌ واحد لكل نشاط ولو رُكّب المكوّن مرّتين في الصفحة (أعلى وأسفل).
 * الوعد يُحفظ لا النتيجة، فالطلبان المتزامنان يتشاركان الاتصال نفسه.
 */
const cache = new Map<string, Promise<MarketingData | null>>();

const fetchMarketing = (businessType: string, businessId: string): Promise<MarketingData | null> => {
  const key = `${businessType}:${businessId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const request = api
    .get(`/marketing/public?businessType=${businessType}&businessId=${businessId}`)
    .then((response: any) => {
      if (response?.sections) return response as MarketingData;
      if (response?.data?.sections) return response.data as MarketingData;
      return null;
    })
    .catch((err) => {
      console.error('Error fetching marketing data:', err);
      cache.delete(key); // فشلٌ عابر لا يُحفظ — الزيارة التالية تعيد المحاولة
      return null;
    });
  cache.set(key, request);
  // بياناتٌ تتغيّر من اللوحة — لا تبقى محفوظةً طوال الجلسة
  window.setTimeout(() => cache.delete(key), 60_000);
  return request;
};

/** رابطٌ داخليّ يفتح في الصفحة نفسها، والخارجيّ في تبويب جديد */
const isInternal = (url: string) => url.startsWith('/');

const PublicMarketingSections: React.FC<PublicMarketingSectionsProps> = ({
  businessId,
  businessType,
  className = '',
  limitPerSection = 10,
  only
}) => {
  const { t, lang } = useT();
  const [marketing, setMarketing] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(!!(businessId && businessType));

  useEffect(() => {
    if (!businessId || !businessType) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchMarketing(businessType, businessId).then((data) => {
      if (!alive) return;
      setMarketing(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [businessId, businessType]);

  const pick = (section: MarketingSection, field: 'title' | 'description') =>
    (lang === 'en' && section[`${field}En` as const]) || section[field] || section[`${field}En` as const] || '';

  if (loading) {
    // ظلّ شريحةٍ عريضة — المساحة محجوزة فلا تقفز الصفحة حين تصل الصور
    return (
      <SkeletonScope className={className} style={{ padding: '8px 0' }}>
        <SkeletonBlock h={0} r={16} style={{ height: 'auto', aspectRatio: '21 / 9' }} />
      </SkeletonScope>
    );
  }

  if (!marketing?.sections?.length) return null;

  const order = (marketing.sectionOrder?.length ? marketing.sectionOrder : ['announcement', 'banner', 'offer']) as SectionType[];
  const types = order.filter((type) => !only || only.includes(type));

  const blocks = types
    .map((type) => {
      const items = marketing.sections
        .filter((section) => section.sectionType === type && section.isActive)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .slice(0, limitPerSection);
      if (items.length === 0) return null;

      if (type === 'announcement') {
        return (
          <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((section) => (
              <div
                key={section.id}
                role="note"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: sd.rCard,
                  background: sf.primarySoft,
                  border: `${sd.borderW} solid ${sf.border}`,
                  color: sf.text
                }}
              >
                <IoMegaphoneOutline size={20} style={{ color: sf.primary, flexShrink: 0 }} />
                <div style={{ minWidth: 0, lineHeight: 1.6 }}>
                  <strong style={{ fontSize: 14 }}>{pick(section, 'title')}</strong>
                  {pick(section, 'description') && (
                    <span style={{ fontSize: 13, color: sf.muted }}> — {pick(section, 'description')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (type === 'banner') {
        return (
          <BannerCarousel
            key={type}
            ariaLabel={t('عروض وإعلانات')}
            slides={items
              .filter((section) => section.imageUrl)
              .map((section) => ({
                id: section.id,
                imageUrl: getImageUrl(section.imageUrl!),
                title: pick(section, 'title'),
                subtitle: pick(section, 'description'),
                linkUrl: section.linkUrl || null
              }))}
          />
        );
      }

      return (
        <section key={type} aria-label={t('عروض خاصة')}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: sf.text }}>
            <IoPricetagOutline size={19} style={{ color: sf.accent }} />
            {t('عروض خاصة')}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
              gap: 14
            }}
          >
            {items.map((section) => {
              const body = (
                <>
                  {section.imageUrl && (
                    <img
                      src={getImageUrl(section.imageUrl)}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <div style={{ padding: 14 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: sf.text, lineHeight: 1.5 }}>
                      {pick(section, 'title')}
                    </h3>
                    {pick(section, 'description') && (
                      <p style={{ margin: 0, fontSize: 13, color: sf.muted, lineHeight: 1.7 }}>{pick(section, 'description')}</p>
                    )}
                    {section.linkUrl && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, fontWeight: 700, color: sf.accent }}>
                        {t('عرض التفاصيل')}
                        <IoArrowBack size={14} />
                      </span>
                    )}
                  </div>
                </>
              );
              const cardStyle: React.CSSProperties = {
                display: 'block',
                borderRadius: sd.rCard,
                overflow: 'hidden',
                background: sf.card,
                border: `${sd.borderW} solid ${sf.border}`,
                boxShadow: sd.shadowCard,
                textDecoration: 'none',
                color: 'inherit'
              };
              if (!section.linkUrl) return <div key={section.id} style={cardStyle}>{body}</div>;
              return isInternal(section.linkUrl) ? (
                <Link key={section.id} to={section.linkUrl} style={cardStyle}>{body}</Link>
              ) : (
                <a key={section.id} href={section.linkUrl} target="_blank" rel="noopener noreferrer" style={cardStyle}>{body}</a>
              );
            })}
          </div>
        </section>
      );
    })
    .filter(Boolean);

  if (blocks.length === 0) return null;

  return (
    <div className={className} dir={lang === 'en' ? 'ltr' : 'rtl'} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {blocks}
    </div>
  );
};

export default PublicMarketingSections;
