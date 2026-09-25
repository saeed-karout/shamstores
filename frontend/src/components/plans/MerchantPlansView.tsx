// frontend/src/components/plans/MerchantPlansView.tsx
//
// صفحة «الخطط» في لوحة التاجر — مشتركة بين المتجر والمطعم (يختلف نوع
// النشاط في طلب الترقية وفي الكلمات فقط).
//
// ١. خطتك الحالية أوّلاً — حتى لو كانت خطةً مخفيّة (basic / pos) لم تعد تُعرض
//    في `GET /api/plans`: تُقرأ من `/plans/current/me` فلا يضيع مشتركها.
// ٢. بطاقات الخطط المتاحة، بزرّ «طلب ترقية» لما فوق خطتك.
// ٣. المقارنة التفصيلية نفسها التي في الصفحة الرئيسية، بعمود «خطتك الحالية».
// ٤. الإضافات المنفردة، تُشترى من صفحة «الميزات».
//
// الترقية طلبٌ يراجعه الأدمن (`POST /admin/upgrade-request`) — لا تُفعَّل مباشرة.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoAlertCircle, IoSend } from 'react-icons/io5';
import { PiCheckBold, PiArrowUpRightBold } from 'react-icons/pi';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import Modal from '@/components/common/Modal';
import { planLabel } from '@/utils/planLabels';
import { planPriceText } from '@/utils/planPrice';
import PlanComparison, { PlanPrice } from './PlanComparison';
import PlanAddons, { usePublicAddons, scrollToAddons } from './PlanAddons';
import { sortPlans, audienceTag, planHeadlines, planUsd, planIncludes, moreFeatures, type ComparablePlan, type RowCtx } from './planRows';
import './plans.css';

const C = {
  card: '#FFFFFF',
  surf: '#F1F5F2',
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  yellow: '#B7791F'
};

const monthsOptions = [
  { value: 1, label: 'شهر واحد', discount: 0 },
  { value: 3, label: '3 أشهر', discount: 5, savings: 'وفر 5%' },
  { value: 6, label: '6 أشهر', discount: 10, savings: 'وفر 10%' },
  { value: 12, label: '12 شهر', discount: 15, savings: 'وفر 15%' }
];

const calculatePrice = (price: number, months: number): number => {
  const discount = monthsOptions.find((m) => m.value === months)?.discount || 0;
  const total = price * months;
  return total - (total * discount) / 100;
};

/** تقريبٌ كالخادم: لأقرب ألف تحت المئة ألف، ولأقرب خمسة آلاف فوقها */
const roundSyp = (amount: number) => Math.round(amount / (amount >= 100_000 ? 5_000 : 1_000)) * (amount >= 100_000 ? 5_000 : 1_000);

const withSypPricing = (plan: ComparablePlan, ref: ComparablePlan[]): ComparablePlan => {
  if (plan.pricing) return plan;
  const usd = plan.price || 0;
  const sample = ref.find((p) => p.pricing?.amountSyp && p.pricing.amountUsd);
  const rate = sample ? (sample.pricing!.amountSyp as number) / sample.pricing!.amountUsd : 0;
  return {
    ...plan,
    pricing: { amountUsd: usd, amountSyp: rate && usd > 0 ? roundSyp(usd * rate) : null, isFree: usd <= 0 }
  };
};

/** ترتيب الخطة: الموضع الذي يضبطه الأدمن، وإلا السعر */
const rank = (p?: ComparablePlan | null) => (p ? (p.position ?? 0) * 1000 + planUsd(p) : 0);

interface Props {
  kind: 'store' | 'restaurant';
}

const MerchantPlansView: React.FC<Props> = ({ kind }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<ComparablePlan[] | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ComparablePlan | null>(null);
  const [currentLoaded, setCurrentLoaded] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ComparablePlan | null>(null);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { addons, failed: addonsFailed } = usePublicAddons();

  useEffect(() => {
    let cancelled = false;
    api
      .get<ComparablePlan[]>('/plans')
      .then((res: any) => {
        const list: ComparablePlan[] = Array.isArray(res) ? res : res?.data || [];
        if (!cancelled) setPlans(list.filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) {
          setPlans([]);
          toast.error('فشل تحميل الخطط');
        }
      });
    api
      .get<ComparablePlan>('/plans/current/me')
      .then((res: any) => !cancelled && res && setCurrentPlan(res?.id ? res : res?.data || null))
      .catch(() => null)
      .finally(() => !cancelled && setCurrentLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const addonCodes = useMemo(
    () => (addons && !addonsFailed ? new Set(addons.map((a) => a.code)) : null),
    [addons, addonsFailed]
  );

  // `/plans/current/me` يعيد الخطة بلا `pricing` — نأخذ نسختها من القائمة إن
  // وُجدت، وإلا (خطة مخفيّة) نحسب سعرها بالليرة بسعر الصرف نفسه
  const current = useMemo(() => {
    const listed = currentPlan && plans?.find((p) => p.id === currentPlan.id);
    if (listed) return listed;
    if (currentPlan) return withSypPricing(currentPlan, plans || []);
    return plans?.find((p) => p.name === 'free' || p.slug === 'free') || null;
  }, [currentPlan, plans]);

  // الخطط المعروضة + خطتك الحالية إن كانت مخفيّة، مرتّبةً بالسعر
  const columns = useMemo(() => {
    const list = plans || [];
    if (current && !list.some((p) => p.id === current.id)) return sortPlans([...list, current]);
    return sortPlans(list);
  }, [plans, current]);

  const ctx: RowCtx = useMemo(() => ({ kind, addons: addonCodes }), [kind, addonCodes]);
  const headlines = useMemo(() => columns.map((_, i) => planHeadlines(columns, i, ctx)), [columns, ctx]);

  const currentHidden = !!current && !!plans && !plans.some((p) => p.id === current.id);
  const canUpgradeTo = (p: ComparablePlan) => !!current && p.id !== current.id && rank(p) > rank(current);
  const nextPlan = (plans ? sortPlans(plans) : []).find(canUpgradeTo);

  const handleUpgrade = (plan: ComparablePlan) => {
    setSelectedPlan(plan);
    setSelectedMonths(1);
    setShowUpgradeModal(true);
  };

  const handleSendUpgradeRequest = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    try {
      const totalAmount = calculatePrice(selectedPlan.price, selectedMonths);
      await api.post('/admin/upgrade-request', {
        planId: selectedPlan.id,
        entityType: kind,
        entityId: kind === 'store' ? user?.storeId : user?.restaurantId,
        notes: `طلب ترقية من خطة ${current?.name || 'مجانية'} إلى خطة ${selectedPlan.name}`,
        months: selectedMonths,
        totalAmount
      });
      toast.success('تم إرسال طلب الترقية بنجاح، سيتم مراجعته من قبل الإدارة');
      setShowUpgradeModal(false);
    } catch (error: any) {
      console.error('Upgrade request error:', error);
      toast.error(error.response?.data?.error || 'فشل إرسال طلب الترقية');
    } finally {
      setProcessing(false);
    }
  };

  const ctaFor = (p: ComparablePlan, compact = false) => {
    if (current && p.id === current.id) {
      return <span className="pc-cta-btn is-muted">{compact ? 'حالية' : 'خطتك الحالية'}</span>;
    }
    if (canUpgradeTo(p)) {
      return (
        <button type="button" className={`pc-cta-btn ${p.isPopular ? 'is-primary' : 'is-ghost'}`} onClick={() => handleUpgrade(p)}>
          {compact ? 'ترقية' : 'اطلب الترقية'}
        </button>
      );
    }
    return compact ? <span className="pc-cta-none" aria-label="غير متاحة للترقية">—</span> : <span className="pc-cta-btn is-muted">خطتك أعلى منها</span>;
  };

  const loading = !plans || !currentLoaded;

  return (
    <div className="ss-page" dir="rtl" style={{ fontFamily: 'Cairo, sans-serif' }}>
      {/* الرأس */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>الخطط والاشتراكات</h1>
        <p style={{ color: C.muted, fontSize: 13.5, margin: 0 }}>
          قارن الخطط ميزةً بميزة، واطلب الترقية حين تحتاج — أو أضف ميزةً واحدة دون تغيير خطتك.
        </p>
      </div>

      {/* خطتك الحالية */}
      {current && (
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            background: 'linear-gradient(135deg, rgba(192,124,223,0.10), rgba(8,72,53,0.04))',
            border: '1px solid rgba(192,124,223,0.45)', borderRadius: 16, padding: '16px 20px', marginBottom: 22
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: '#7b3fa0', fontWeight: 800, marginBottom: 2 }}>خطتك الحالية</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{planLabel(current)}</span>
              <PlanPrice plan={current} size="sm" />
            </div>
            {currentHidden && (
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                خطةٌ لم تعد متاحةً للمشتركين الجدد — تبقى لك بميزاتها كما هي ما دمت مشتركاً بها.
              </div>
            )}
          </div>
          {nextPlan && (
            <button type="button" className="pc-cta-btn is-primary" onClick={() => handleUpgrade(nextPlan)}>
              <PiArrowUpRightBold aria-hidden /> ترقية إلى «{planLabel(nextPlan)}»
            </button>
          )}
        </div>
      )}

      {/* البطاقات */}
      {loading ? (
        <div className="pc-cards" aria-busy="true" aria-label="جارٍ تحميل الخطط">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pc-dcard is-skeleton" />
          ))}
        </div>
      ) : (
        <div className="pc-cards">
          {columns.map((p, i) => {
            const isCurrent = !!current && p.id === current.id;
            const tag = audienceTag(p);
            const { base, limits, perks } = headlines[i];
            return (
              <article
                key={p.id}
                className={`pc-dcard ${p.isPopular ? 'is-popular' : ''} ${isCurrent ? 'is-current' : ''}`}
                aria-label={`خطة ${planLabel(p)}${isCurrent ? ' — خطتك الحالية' : ''}`}
              >
                {(isCurrent || p.isPopular) && (
                  <span className="pc-dcard-flag">{isCurrent ? 'خطتك الحالية' : 'الأكثر اختياراً'}</span>
                )}
                <div>
                  {tag && !p.isPopular && <span className="pc-tag">{tag}</span>}
                  <h3 style={{ marginTop: tag && !p.isPopular ? 8 : 0 }}>{planLabel(p)}</h3>
                  {p.description && <p className="pc-desc">{p.description}</p>}
                </div>
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
                  {perks.slice(0, 3).map((t) => (
                    <li key={t}><PiCheckBold aria-hidden />{t}</li>
                  ))}
                  {perks.length > 3 && <li className="is-more">{moreFeatures(perks.length - 3)}</li>}
                </ul>
                <div className="pc-dcard-cta">{ctaFor(p)}</div>
              </article>
            );
          })}
        </div>
      )}

      {/* المقارنة */}
      {!loading && columns.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <PlanComparison
            plans={columns}
            variant="dash"
            kind={kind}
            addonCodes={addonCodes}
            currentPlanId={current?.id}
            stickyTop={64}
            onAddonClick={addons && addons.length ? scrollToAddons : undefined}
            renderCta={columns.some(canUpgradeTo) ? (p) => ctaFor(p, true) : undefined}
          />
        </div>
      )}

      {/* الإضافات */}
      {!loading && (
        <div style={{ marginTop: 36 }}>
          <PlanAddons
            addons={addons}
            plans={columns}
            variant="dash"
            renderCta={(a) => {
              const included = !!current && planIncludes(current, a.code);
              return included ? (
                <span className="pc-cta-btn is-muted">مشمولة في خطتك</span>
              ) : (
                <Link to="/features" className="pc-cta-btn is-ghost">أضفها من «الميزات»</Link>
              );
            }}
          />
        </div>
      )}

      {/* طلب الترقية */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={`طلب ترقية إلى خطة ${selectedPlan ? planLabel(selectedPlan) : ''}`}
        size="md"
      >
        {selectedPlan && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: C.muted, fontSize: 13, marginBottom: 8, display: 'block' }}>فترة الاشتراك</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
                {monthsOptions.map(({ value, label, discount, savings }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedMonths(value)}
                    aria-pressed={selectedMonths === value}
                    style={{
                      padding: '10px',
                      background: selectedMonths === value ? C.accent : C.surf,
                      border: `1px solid ${selectedMonths === value ? C.accent : C.border}`,
                      borderRadius: 10,
                      color: selectedMonths === value ? '#fff' : C.text,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'inherit'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{label}</div>
                    {discount > 0 && (
                      <div style={{ fontSize: 10, color: selectedMonths === value ? '#fff' : C.accent }}>{savings}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: C.surf, padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>السعر الشهري</span>
                <span style={{ color: C.text }}>{planPriceText(selectedPlan as any)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>عدد الأشهر</span>
                <span style={{ color: C.text }}>{selectedMonths}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: C.muted }}>السعر الكلي</span>
                <span style={{ color: C.text }}>{planPriceText(selectedPlan as any, selectedPlan.price * selectedMonths)}</span>
              </div>
              {selectedMonths > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.accent }}>الخصم</span>
                  <span style={{ color: C.accent }}>{monthsOptions.find((m) => m.value === selectedMonths)?.discount}%</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.text, fontWeight: 700 }}>الإجمالي</span>
                <span style={{ color: C.accent, fontWeight: 700, fontSize: 18 }}>
                  {planPriceText(selectedPlan as any, calculatePrice(selectedPlan.price, selectedMonths))}
                </span>
              </div>
            </div>

            <div style={{ background: 'rgba(183,121,31,0.08)', border: '1px solid rgba(183,121,31,0.2)', borderRadius: 12, padding: 12, marginBottom: 20 }}>
              <p style={{ color: C.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <IoAlertCircle size={18} style={{ color: C.yellow, flexShrink: 0 }} />
                سيتم إرسال طلب الترقية إلى الإدارة للمراجعة. سيتم تفعيل الخطة بعد الموافقة عليها.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                style={{ flex: 1, padding: '10px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendUpgradeRequest}
                disabled={processing}
                style={{
                  flex: 1, padding: '10px', background: C.accent, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'inherit'
                }}
              >
                {processing ? 'جارٍ الإرسال…' : <><IoSend size={16} /> إرسال طلب الترقية</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MerchantPlansView;
