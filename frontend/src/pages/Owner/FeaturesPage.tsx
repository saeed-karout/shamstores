// frontend/src/pages/Owner/FeaturesPage.tsx
//
// قسم الميزات المفردة — يشتري التاجر ما يحتاجه وحده بلا ترقية خطة كاملة.
//
// كانت الميزات المفردة موجودة في قاعدة البيانات وبلا طريق إليها: لا التاجر
// يرى قائمتها ولا يستطيع طلب واحدة، والإسناد يدوي من السوبر أدمن وحده.
// فبقيت البنية بلا استعمال، ومعها فرصة بيع أرخص من الترقية وأسهل قبولاً.
//
// الصفحة تفصل ثلاث حالات لا تخلطها: **ضمن خطتك** و**مفعّلة لك** و**متاحة
// للشراء**. خلطها يجعل التاجر يدفع ثمن ما يملكه أصلاً.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoCheckmarkCircle,
  IoSparkles,
  IoTimeOutline,
  IoCartOutline,
  IoRocketOutline
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import Loader from '@/components/common/Loader';

interface CatalogFeature {
  code: string;
  name: string;
  description: string | null;
  group: string;
  price: number;
  isOneTime: boolean;
  pricing: { amountUsd: number; amountSyp: number | null; isFree: boolean };
  includedInPlan: boolean;
  assigned: boolean;
  active: boolean;
  expiresAt: string | null;
  pendingRequest: boolean;
  purchasable: boolean;
}

const C = {
  bg: '#082E24',
  card: '#112E23',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  blue: '#60A5FA',
  orange: '#FB923C'
};

const priceLabel = (feature: CatalogFeature): string => {
  if (feature.price <= 0) return 'مجانية';
  // بلا سعر صرف مضبوط لا نخترع رقماً بالليرة — نعرض الدولار كما هو مخزَّن
  if (feature.pricing.amountSyp != null) {
    return `${feature.pricing.amountSyp.toLocaleString('en-US')} ل.س`;
  }
  return `$${feature.price}`;
};

const FeaturesPage: React.FC = () => {
  const [features, setFeatures] = useState<CatalogFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // api.get يُرجع الحمولة مفكوكة التغليف — لا تفكّها مجدداً
      const data: any = await api.get('/features/catalog');
      setFeatures(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذّر تحميل الميزات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const request = async (feature: CatalogFeature) => {
    setRequesting(feature.code);
    try {
      await api.post('/features/requests', { featureCode: feature.code });
      toast.success('أُرسل طلبك — سنتواصل معك لإتمام الدفع');
      // إعادة التحميل لا تعديل محلي: الخادم هو من يقرّر أن الطلب صار معلّقاً
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذّر إرسال الطلب');
    } finally {
      setRequesting(null);
    }
  };

  if (loading) return <Loader fullScreen />;

  const included = features.filter((f) => f.includedInPlan);
  const owned = features.filter((f) => f.assigned && !f.includedInPlan);
  const available = features.filter((f) => !f.active);

  return (
    <div style={{ padding: 24, fontFamily: 'Cairo, sans-serif', background: C.bg, minHeight: '100vh' }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <IoSparkles style={{ color: C.accent }} /> الميزات
        </h1>
        <p style={{ color: C.muted, fontSize: 13.5, margin: 0, lineHeight: 1.9 }}>
          اشترِ ما تحتاجه وحده بلا ترقية خطة كاملة. الميزة المشتراة تعمل على
          خطتك الحالية أياً كانت — بما فيها المجانية.{' '}
          <Link to="/plans" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>
            أو قارن الخطط
          </Link>
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 12, padding: 16, color: C.text, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {included.length > 0 && (
        <Section title="ضمن خطتك" hint="لا تدفع ثمنها — تأتي مع اشتراكك الحالي">
          {included.map((feature) => (
            <FeatureCard key={feature.code} feature={feature} state="included" />
          ))}
        </Section>
      )}

      {owned.length > 0 && (
        <Section title="ميزات مفعّلة لك" hint="اشتريتها مفردةً أو أسندتها الإدارة">
          {owned.map((feature) => (
            <FeatureCard key={feature.code} feature={feature} state="owned" />
          ))}
        </Section>
      )}

      <Section
        title="متاحة للإضافة"
        hint={available.length === 0 ? undefined : 'اطلبها وسنتواصل معك لإتمام الدفع'}
      >
        {available.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13.5, padding: '20px 0', gridColumn: '1 / -1' }}>
            تملك كل الميزات المتاحة حالياً 🎉
          </div>
        ) : (
          available.map((feature) => (
            <FeatureCard
              key={feature.code}
              feature={feature}
              state={feature.pendingRequest ? 'pending' : 'available'}
              busy={requesting === feature.code}
              onRequest={() => request(feature)}
            />
          ))
        )}
      </Section>
    </div>
  );
};

// ==================== عناصر ====================

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children
}) => (
  <section style={{ marginBottom: 28 }}>
    <div style={{ marginBottom: 12 }}>
      <h2 style={{ color: C.text, fontSize: 16, fontWeight: 800, margin: 0 }}>{title}</h2>
      {hint && <p style={{ color: C.muted, fontSize: 12.5, margin: '4px 0 0' }}>{hint}</p>}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
      {children}
    </div>
  </section>
);

type CardState = 'included' | 'owned' | 'available' | 'pending';

const FeatureCard: React.FC<{
  feature: CatalogFeature;
  state: CardState;
  busy?: boolean;
  onRequest?: () => void;
}> = ({ feature, state, busy, onRequest }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${state === 'included' || state === 'owned' ? `${C.accent}44` : C.border}`,
      borderRadius: 14,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <IoRocketOutline size={19} style={{ color: C.accent, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ color: C.text, fontSize: 14.5, fontWeight: 700, margin: 0 }}>{feature.name}</h3>
        {feature.description && (
          <p style={{ color: C.muted, fontSize: 12.5, margin: '5px 0 0', lineHeight: 1.85 }}>
            {feature.description}
          </p>
        )}
      </div>
    </div>

    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      {state === 'included' ? (
        <Pill icon={<IoCheckmarkCircle size={14} />} color={C.accent} label="ضمن خطتك" />
      ) : state === 'owned' ? (
        <div>
          <Pill icon={<IoCheckmarkCircle size={14} />} color={C.accent} label="مفعّلة" />
          {feature.expiresAt && (
            <div style={{ color: C.muted, fontSize: 11, marginTop: 5 }}>
              حتى {new Date(feature.expiresAt).toLocaleDateString('ar', { day: 'numeric', month: 'long' })}
            </div>
          )}
        </div>
      ) : state === 'pending' ? (
        <Pill icon={<IoTimeOutline size={14} />} color={C.orange} label="طلبك قيد المراجعة" />
      ) : (
        <>
          <div>
            <div style={{ color: C.accent, fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
              {priceLabel(feature)}
            </div>
            {feature.price > 0 && (
              <div style={{ color: C.muted, fontSize: 11 }}>
                {feature.isOneTime ? 'دفعة واحدة' : 'شهرياً'}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRequest}
            disabled={busy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 15px',
              minHeight: 40,
              borderRadius: 11,
              border: 'none',
              background: busy ? C.surf : C.accent,
              color: busy ? C.muted : C.bg,
              fontWeight: 800,
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: busy ? 'not-allowed' : 'pointer',
              flexShrink: 0
            }}
          >
            <IoCartOutline size={16} />
            {busy ? 'جارٍ الإرسال…' : 'اطلبها'}
          </button>
        </>
      )}
    </div>
  </div>
);

const Pill: React.FC<{ icon: React.ReactNode; color: string; label: string }> = ({ icon, color, label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      color,
      fontSize: 12.5,
      fontWeight: 700
    }}
  >
    {icon}
    {label}
  </span>
);

export default FeaturesPage;
