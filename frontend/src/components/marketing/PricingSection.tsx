// frontend/src/components/marketing/PricingSection.tsx
//
// الأسعار في الصفحة الرئيسية: بطاقات الخطط، ثم «مقارنة تفصيلية بين الخطط»
// بأقسامٍ تُطوى، ثم «إضافات اختيارية تكمّل خطتك».
//
// **كلّه من بيانات الخادم.** الخطط من `GET /api/plans` (النشطة فقط)، والإضافات
// من `GET /api/public/addons`، وصفوف المقارنة في `components/plans/planRows.ts`
// — المصدر نفسه الذي تعرضه صفحة الخطط في لوحة التاجر، فلا يتباعد الوعد عمّا
// يُفتح فعلاً.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PiCheckBold, PiWalletDuotone, PiInfoDuotone } from 'react-icons/pi';
import { planLabel } from '@/utils/planLabels';
import PlanComparison, { PlanPrice } from '@/components/plans/PlanComparison';
import PlanAddons, { usePublicAddons, scrollToAddons } from '@/components/plans/PlanAddons';
import {
  sortPlans, isFreePlan, audienceTag, planHeadlines, moreFeatures,
  type ComparablePlan, type RowCtx
} from '@/components/plans/planRows';

// ===== النوع =====

export type PublicPlan = ComparablePlan;

// ===== المكوّن =====

interface Props {
  plans: PublicPlan[] | null;
  failed: boolean;
}

const MAX_PERKS = 3;

const PricingSection: React.FC<Props> = ({ plans, failed }) => {
  const sorted = useMemo(() => sortPlans(plans || []), [plans]);
  const { addons, failed: addonsFailed } = usePublicAddons();
  const addonCodes = useMemo(
    () => (addons && !addonsFailed ? new Set(addons.map((a) => a.code)) : null),
    [addons, addonsFailed]
  );
  const ctx: RowCtx = useMemo(() => ({ kind: undefined, addons: addonCodes }), [addonCodes]);
  const headlines = useMemo(() => sorted.map((_, i) => planHeadlines(sorted, i, ctx)), [sorted, ctx]);

  const hasSyp = sorted.some((p) => p.pricing?.amountSyp);

  return (
    <section id="pricing" className="ss-section ss-pl" aria-labelledby="pricing-title">
      <div className="ss-container">
        <div className="ss-section-head ss-reveal">
          <span className="ss-eyebrow"><PiWalletDuotone /> أسعار واضحة بالليرة</span>
          <h2 id="pricing-title" className="ss-h2">ابدأ مجاناً — بلا بطاقة ائتمان</h2>
          <p className="ss-lead">
            {hasSyp
              ? 'الأسعار شهرية بالليرة السورية وفق سعر الصرف الموحّد على المنصّة. ترقّي خطتك حين تكبر، أو تضيف ميزةً واحدة فقط.'
              : 'الأسعار شهرية. ترقّي خطتك حين تكبر، أو تضيف ميزةً واحدة فقط.'}
          </p>
        </div>

        {/* ===== البطاقات ===== */}
        {failed ? (
          <p className="ss-pl-note">
            تعذّر تحميل الخطط الآن — <Link to="/contact">تواصل معنا</Link> لمعرفة الأسعار.
          </p>
        ) : !plans ? (
          <div className="ss-pl-cards" aria-busy="true" aria-label="جارٍ تحميل الخطط" data-count={4}>
            {[0, 1, 2, 3].map((i) => <div key={i} className="ss-pl-card is-skeleton" />)}
          </div>
        ) : (
          <div className="ss-pl-cards pc-cards-brand" data-count={sorted.length}>
            {sorted.map((p, i) => {
              const free = isFreePlan(p);
              const { base, limits, perks } = headlines[i];
              const tag = audienceTag(p);
              return (
                <article
                  key={p.id}
                  className={`ss-pl-card ss-reveal ${p.isPopular ? 'is-popular' : ''}`}
                  style={{ transitionDelay: `${(i % 4) * 70}ms` }}
                  aria-label={`خطة ${planLabel(p)}`}
                >
                  {p.isPopular && <span className="ss-pl-flag">الأكثر اختياراً</span>}
                  <header>
                    {tag && !p.isPopular && <span className="pc-tag">{tag}</span>}
                    <h3>{planLabel(p)}</h3>
                    {p.description && <p>{p.description}</p>}
                  </header>
                  <PlanPrice plan={p} />
                  <ul className="pc-bullets">
                    {limits.map((t) => (
                      <li key={t} className="is-limit"><PiCheckBold aria-hidden />{t}</li>
                    ))}
                    {perks.length > 0 && <li aria-hidden className="pc-bullets-sep" />}
                    {perks.length > 0 && (
                      <li className="is-more" style={{ fontWeight: 800 }}>
                        {base ? `كل ما في «${planLabel(base)}»، و:` : 'وتشمل:'}
                      </li>
                    )}
                    {perks.slice(0, MAX_PERKS).map((t) => (
                      <li key={t}><PiCheckBold aria-hidden />{t}</li>
                    ))}
                    {perks.length > MAX_PERKS && (
                      <li className="is-more">{moreFeatures(perks.length - MAX_PERKS)}</li>
                    )}
                  </ul>
                  <Link to="/register" className={`ss-btn ${p.isPopular ? 'ss-btn-primary' : 'ss-btn-forest'}`}>
                    {free ? 'ابدأ مجاناً' : 'اختر الخطة'}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {/* ===== المقارنة التفصيلية ===== */}
        {sorted.length > 0 && (
          <div className="ss-pl-block ss-reveal">
            <PlanComparison
              plans={sorted}
              variant="brand"
              addonCodes={addonCodes}
              stickyTop={72}
              onAddonClick={addons && addons.length ? scrollToAddons : undefined}
              renderCta={(p) => (
                <Link to="/register" className={`ss-btn ss-btn-sm ${p.isPopular ? 'ss-btn-primary' : 'ss-btn-forest'}`}>
                  {isFreePlan(p) ? 'ابدأ مجاناً' : 'اختر'}
                </Link>
              )}
            />
          </div>
        )}

        {/* ===== الإضافات ===== */}
        {sorted.length > 0 && (
          <div className="ss-pl-block">
            <PlanAddons
              addons={addons}
              plans={sorted}
              variant="brand"
              note={
                <>
                  <PiInfoDuotone aria-hidden style={{ flexShrink: 0, marginTop: 4 }} />
                  تُفعَّل الإضافة من صفحة «الميزات» في لوحتك بعد التسجيل. الحدود تُحتسب لكل نشاط، والطلبات تُعدّ شهرياً.
                </>
              }
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
