// frontend/src/components/storefront/ProductReviews.tsx
//
// تقييمات المنتج كما يراها من يفكّر بالشراء.
//
// **قرار العرض:** التوزيع قبل النصوص. «٤٫٦ من ١٢ تقييماً» رقمٌ يُصدَّق أكثر
// من ثلاث مراجعات مختارة، والشريط يقول إن كان هناك رأيٌ مخالف — وهو ما
// يبحث عنه المتردّد فعلاً.
//
// ولا يُعرض القسم أصلاً بلا تقييمات: «لا تقييمات بعد» تزرع شكّاً لم يكن.

import React, { useEffect, useState } from 'react';
import { IoStar, IoStarOutline } from 'react-icons/io5';
import api from '@/services/api';
import { sf } from '@/utils/storefrontTheme';
import { useT } from '@/i18n/storefront';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: string;
  avatarUrl: string | null;
}

interface ReviewData {
  average: number;
  count: number;
  distribution: Record<string, number>;
  reviews: Review[];
}

export const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <span style={{ display: 'inline-flex', gap: 1, verticalAlign: 'middle' }} aria-label={`${value} من 5`}>
    {[1, 2, 3, 4, 5].map((n) =>
      n <= Math.round(value)
        ? <IoStar key={n} size={size} color="#F5B301" />
        : <IoStarOutline key={n} size={size} color={sf.muted} />
    )}
  </span>
);

/** ملخّص صغير يُدسّ في بطاقة المنتج — نجوم ورقم، بلا مساحة تُذكر */
export const RatingBadge: React.FC<{ average?: number; count?: number }> = ({ average, count }) => {
  if (!count || !average) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11.5, color: sf.muted, fontFamily: sf.font
    }}>
      <IoStar size={11} color="#F5B301" />
      <span style={{ fontWeight: 700, color: sf.text }}>{average.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
};

const ProductReviews: React.FC<{ productId: string }> = ({ productId }) => {
  const { t } = useT();
  const [data, setData] = useState<ReviewData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result: any = await api.get(`/public/product/${productId}/reviews`);
        if (!cancelled) setData(result);
      } catch {
        // التقييمات إضافةٌ لا شرط: فشلها لا يمنع الشراء ولا يُعرض كخطأ
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  if (!data || data.count === 0) return null;

  return (
    <section
      style={{
        marginTop: 24, paddingTop: 20,
        borderTop: `1px solid ${sf.border}`, fontFamily: sf.font
      }}
    >
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800, color: sf.text }}>{t('آراء المشترين')}</h2>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ textAlign: 'center', minWidth: 90 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: sf.text, lineHeight: 1.1 }}>
            {data.average.toFixed(1)}
          </div>
          <Stars value={data.average} size={15} />
          <div style={{ fontSize: 11.5, color: sf.muted, marginTop: 4 }}>
            {data.count} تقييماً
          </div>
        </div>

        {/* التوزيع: يقول إن كان ثمّة رأيٌ مخالف، وهو ما يبحث عنه المتردّد */}
        <div style={{ flex: 1, minWidth: 190, display: 'grid', gap: 5 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const n = data.distribution?.[String(star)] || 0;
            const pct = data.count > 0 ? (n / data.count) * 100 : 0;
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ color: sf.muted, width: 34, flexShrink: 0 }}>{star} نجوم</span>
                <span style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: sf.surface, overflow: 'hidden'
                }}>
                  <span style={{
                    display: 'block', height: '100%', width: `${pct}%`,
                    background: '#F5B301', borderRadius: 3
                  }} />
                </span>
                <span style={{
                  color: sf.muted, width: 22, textAlign: 'end',
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0
                }}>
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {data.reviews.filter((r) => r.comment).map((review) => (
          <article
            key={review.id}
            style={{
              background: sf.surface, borderRadius: 12, padding: '13px 15px',
              display: 'grid', gap: 6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: sf.primarySoft, color: sf.text,
                display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800
              }}>
                {review.author.charAt(0)}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: sf.text }}>{review.author}</span>
              <Stars value={review.rating} size={12} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: sf.muted, lineHeight: 1.8 }}>
              {review.comment}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ProductReviews;
