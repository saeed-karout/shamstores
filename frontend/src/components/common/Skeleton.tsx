// frontend/src/components/common/Skeleton.tsx
// عُدّة ظلال التحميل: لبناتٌ صغيرة (سطر، كتلة، دائرة) وقوالب بهيئة الصفحات
// الشائعة في اللوحة — رئيسيّة، قائمة، نموذج إعدادات، شبكة بطاقات، تفاصيل —
// وقالبٌ لواجهة متجر. المستخدم يرى هيكل ما ينتظره بدل دائرةٍ تدور في فراغ.

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import '@/styles/skeleton.css';

export type SkeletonVariant = 'page' | 'dashboard' | 'list' | 'form' | 'grid' | 'detail' | 'storefront';

type Len = number | string;

/* ===== اللبنات ===== */

export const SkeletonLine: React.FC<{ w?: Len; h?: number; style?: React.CSSProperties }> = ({
  w = '100%',
  h = 12,
  style
}) => <span className="ss-sk" style={{ width: w, height: h, borderRadius: Math.min(8, h / 2), ...style }} />;

export const SkeletonBlock: React.FC<{ w?: Len; h?: Len; r?: number; style?: React.CSSProperties }> = ({
  w = '100%',
  h = 120,
  r = 12,
  style
}) => <span className="ss-sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;

export const SkeletonCircle: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 40, style }) => (
  <span className="ss-sk ss-sk-circle" style={{ width: size, height: size, ...style }} />
);

const Card: React.FC<{ children: React.ReactNode; pad?: number; style?: React.CSSProperties }> = ({
  children,
  pad = 16,
  style
}) => (
  <div className="ss-sk-card" style={{ padding: pad, ...style }}>
    {children}
  </div>
);

/** ثلاث نقاطٍ تنبض بلون النصّ — مؤشّر الانشغال داخل الأزرار بدل الحلقة الدوّارة */
export const BusyDots: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span className="ss-busy-dots" aria-hidden="true" style={style} />
);

/* ===== النطاق: يضبط ألوان الظلال من الثيم الحاليّ ===== */

/**
 * ألوان الظلال مشتقّةٌ من سياق الثيم: سطحٌ ممزوجٌ بقليلٍ من لون النصّ للقاعدة،
 * ولون البطاقة للبريق. هكذا تبقى الظلال هادئةً على لوحة التاجر الفاتحة،
 * وتتبع ألوان المتجر إن كان ثيمه داكناً — دون فرع خاصّ لكلّ حالة.
 */
export const SkeletonScope: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}> = ({ children, className, style, label = 'جاري التحميل…' }) => {
  const t = useTheme();
  const surface = t.surfaceColor || '#F1F5F2';
  const ink = t.textColor || '#10231B';
  const vars = {
    '--sk-base': `color-mix(in srgb, ${surface} 90%, ${ink})`,
    '--sk-hi': t.cardBgColor || '#FFFFFF',
    '--sk-card': t.cardBgColor || '#FFFFFF',
    '--sk-line': `color-mix(in srgb, ${ink} 8%, transparent)`
  } as React.CSSProperties;

  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className} style={{ ...vars, ...style }}>
      <span className="ss-sk-sr">{label}</span>
      {children}
    </div>
  );
};

/* ===== أجزاءٌ مشتركة بين القوالب ===== */

/** رأس الصفحة: عنوانٌ وسطر وصفٍ، وزرّ إجراءٍ في الطرف الآخر */
const PageHeader: React.FC<{ action?: boolean }> = ({ action = true }) => (
  <div className="ss-sk-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
    <div className="ss-sk-col" style={{ gap: 10 }}>
      <SkeletonLine w="min(220px, 55%)" h={22} />
      <SkeletonLine w="min(340px, 80%)" h={12} />
    </div>
    {action && <SkeletonBlock w={120} h={42} r={12} />}
  </div>
);

/** شريط أدوات: بحثٌ ورقائق تصفية */
const Toolbar: React.FC = () => (
  <div className="ss-sk-row" style={{ flexWrap: 'wrap', gap: 8 }}>
    <SkeletonBlock w="min(320px, 100%)" h={42} r={12} />
    {[78, 96, 70, 88].map((w, i) => (
      <SkeletonBlock key={i} w={w} h={34} r={999} />
    ))}
  </div>
);

/** صفّ قائمة: صورة/رمز، سطران، ثمّ عمودان ثانويّان وشارة حالة */
const ListRow: React.FC<{ i: number; last?: boolean }> = ({ i, last }) => (
  <div
    className="ss-sk-row"
    style={{ padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--sk-line, rgba(16,35,27,0.07))' }}
  >
    <SkeletonBlock w={42} h={42} r={12} />
    <div className="ss-sk-col">
      <SkeletonLine w={`${[58, 44, 66, 50, 38, 62][i % 6]}%`} h={13} />
      <SkeletonLine w={`${[34, 28, 40, 30, 36, 24][i % 6]}%`} h={10} />
    </div>
    <span className="ss-sk-wide-only" style={{ display: 'contents' }}>
      <SkeletonLine w={72} h={12} />
      <SkeletonLine w={90} h={12} />
    </span>
    <SkeletonBlock w={74} h={26} r={999} />
  </div>
);

const ListCard: React.FC<{ rows: number; title?: boolean }> = ({ rows, title }) => (
  <Card pad={0}>
    {title && (
      <div className="ss-sk-row" style={{ padding: '16px 16px 6px', justifyContent: 'space-between' }}>
        <SkeletonLine w={140} h={15} />
        <SkeletonLine w={60} h={11} />
      </div>
    )}
    {Array.from({ length: rows }).map((_, i) => (
      <ListRow key={i} i={i} last={i === rows - 1} />
    ))}
  </Card>
);

const Kpis: React.FC<{ n?: number }> = ({ n = 4 }) => (
  <div className="ss-sk-kpis">
    {Array.from({ length: n }).map((_, i) => (
      <Card key={i}>
        <div className="ss-sk-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <SkeletonLine w="50%" h={11} />
          <SkeletonBlock w={34} h={34} r={10} />
        </div>
        <SkeletonLine w="62%" h={24} />
        <SkeletonLine w="38%" h={10} style={{ marginTop: 10 }} />
      </Card>
    ))}
  </div>
);

/** مخطّطٌ بأعمدةٍ متفاوتة — يوحي بالرسم البيانيّ دون أن يدّعي أرقاماً */
const ChartCard: React.FC = () => (
  <Card>
    <div className="ss-sk-row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
      <SkeletonLine w={150} h={15} />
      <SkeletonBlock w={96} h={30} r={999} />
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3%', height: 180 }}>
      {[45, 70, 55, 85, 60, 95, 72, 50, 80, 66].map((h, i) => (
        <SkeletonBlock key={i} w="7%" h={`${h}%`} r={6} />
      ))}
    </div>
  </Card>
);

const Field: React.FC<{ i: number; tall?: boolean }> = ({ i, tall }) => (
  <div className="ss-sk-col" style={{ gap: 9, flex: 'none' }}>
    <SkeletonLine w={[110, 86, 130, 96, 120, 78][i % 6]} h={12} />
    <SkeletonBlock h={tall ? 96 : 44} r={12} />
  </div>
);

const FormCard: React.FC<{ fields: number; wideLast?: boolean }> = ({ fields, wideLast }) => (
  <Card pad={20}>
    <div className="ss-sk-row" style={{ marginBottom: 20 }}>
      <SkeletonBlock w={38} h={38} r={10} />
      <div className="ss-sk-col">
        <SkeletonLine w={160} h={15} />
        <SkeletonLine w="min(280px, 70%)" h={10} />
      </div>
    </div>
    <div className="ss-sk-fields">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={wideLast && i === fields - 1 ? { gridColumn: '1 / -1' } : undefined}>
          <Field i={i} tall={wideLast && i === fields - 1} />
        </div>
      ))}
    </div>
  </Card>
);

const GridCard: React.FC<{ i: number }> = ({ i }) => (
  <Card pad={0} style={{ overflow: 'hidden' }}>
    <SkeletonBlock h={0} r={0} style={{ height: 'auto', aspectRatio: '4 / 3' }} />
    <div className="ss-sk-col" style={{ padding: 14, gap: 9 }}>
      <SkeletonLine w={`${[72, 58, 80, 64][i % 4]}%`} h={14} />
      <SkeletonLine w="46%" h={10} />
      <div className="ss-sk-row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <SkeletonLine w={64} h={16} />
        <SkeletonBlock w={34} h={34} r={10} />
      </div>
    </div>
  </Card>
);

const KeyValues: React.FC<{ rows: number }> = ({ rows }) => (
  <div className="ss-sk-col" style={{ gap: 0 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="ss-sk-row"
        style={{
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: i === rows - 1 ? 'none' : '1px solid var(--sk-line, rgba(16,35,27,0.07))'
        }}
      >
        <SkeletonLine w={[90, 110, 76, 100, 84][i % 5]} h={11} />
        <SkeletonLine w={[140, 90, 160, 120, 70][i % 5]} h={12} />
      </div>
    ))}
  </div>
);

/* ===== القوالب ===== */

const DashboardPreset: React.FC = () => (
  <>
    <PageHeader />
    <Kpis />
    <div className="ss-sk-split">
      <ChartCard />
      <ListCard rows={4} title />
    </div>
  </>
);

const ListPreset: React.FC<{ rows?: number; header?: boolean }> = ({ rows = 7, header = true }) => (
  <>
    {header && <PageHeader />}
    {header && <Toolbar />}
    <ListCard rows={rows} />
  </>
);

const FormPreset: React.FC = () => (
  <>
    <PageHeader action={false} />
    <div className="ss-sk-row" style={{ gap: 8, overflow: 'hidden' }}>
      {[92, 110, 84, 100, 76].map((w, i) => (
        <SkeletonBlock key={i} w={w} h={38} r={12} />
      ))}
    </div>
    <FormCard fields={6} wideLast />
    <FormCard fields={4} />
    <div className="ss-sk-row" style={{ justifyContent: 'flex-end' }}>
      <SkeletonBlock w={150} h={44} r={12} />
    </div>
  </>
);

const GridPreset: React.FC<{ cards?: number; header?: boolean }> = ({ cards = 8, header = true }) => (
  <>
    {header && <PageHeader />}
    {header && <Toolbar />}
    <div className="ss-sk-grid">
      {Array.from({ length: cards }).map((_, i) => (
        <GridCard key={i} i={i} />
      ))}
    </div>
  </>
);

const DetailPreset: React.FC = () => (
  <>
    <SkeletonLine w={90} h={12} />
    <Card pad={20}>
      <div className="ss-sk-row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <SkeletonBlock w={72} h={72} r={18} />
        <div className="ss-sk-col" style={{ gap: 10, paddingTop: 4 }}>
          <SkeletonLine w="min(260px, 70%)" h={20} />
          <SkeletonLine w="min(360px, 90%)" h={11} />
          <div className="ss-sk-row" style={{ gap: 8, marginTop: 4 }}>
            <SkeletonBlock w={70} h={24} r={999} />
            <SkeletonBlock w={90} h={24} r={999} />
          </div>
        </div>
        <span className="ss-sk-wide-only" style={{ display: 'flex', gap: 8 }}>
          <SkeletonBlock w={104} h={40} r={12} />
          <SkeletonBlock w={40} h={40} r={12} />
        </span>
      </div>
    </Card>
    <Kpis n={4} />
    <div className="ss-sk-split">
      <Card pad={20}>
        <SkeletonLine w={140} h={15} style={{ marginBottom: 8 }} />
        <KeyValues rows={6} />
      </Card>
      <ListCard rows={4} title />
    </div>
  </>
);

/** عامّ: حين لا يُعرف شكل الصفحة — رأسٌ وبطاقاتٌ ثلاث وقائمةٌ قصيرة */
const PagePreset: React.FC = () => (
  <>
    <PageHeader />
    <div className="ss-sk-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <SkeletonLine w="45%" h={11} />
          <SkeletonLine w="70%" h={20} style={{ marginTop: 12 }} />
        </Card>
      ))}
    </div>
    <ListCard rows={5} />
  </>
);

/** واجهة متجر قبل معرفة ألوانه: غلاف، بطاقة المتجر، فئات، أصناف */
const StorefrontPreset: React.FC = () => (
  <div style={{ width: '100%' }}>
    <SkeletonBlock h={0} r={0} style={{ height: 'auto', aspectRatio: '16 / 7', maxHeight: 360 }} />
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 14px 40px' }}>
      <Card style={{ marginTop: -42, position: 'relative', display: 'flex', gap: 14 }}>
        <SkeletonBlock w={72} h={72} r={16} />
        <div className="ss-sk-col" style={{ gap: 9, paddingTop: 4 }}>
          <SkeletonLine w="60%" h={16} />
          <SkeletonLine w="85%" h={11} />
          <SkeletonLine w="45%" h={11} />
        </div>
      </Card>
      <div className="ss-sk-row" style={{ gap: 8, marginTop: 18, overflow: 'hidden' }}>
        {[76, 92, 68, 104, 80].map((w, i) => (
          <SkeletonBlock key={i} w={w} h={36} r={999} />
        ))}
      </div>
      <div className="ss-sk-col" style={{ gap: 12, marginTop: 18 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} pad={12} style={{ display: 'flex', gap: 12 }}>
            <SkeletonBlock w={96} h={96} r={12} />
            <div className="ss-sk-col" style={{ gap: 9, paddingTop: 4 }}>
              <SkeletonLine w={`${[70, 55, 80, 62, 48][i]}%`} h={14} />
              <SkeletonLine w="90%" h={10} />
              <SkeletonLine w="35%" h={14} style={{ marginTop: 'auto' }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

/** محتوى القالب وحده — بلا حشوة الصفحة — ليُستعمل داخل بطاقةٍ أو قسم */
export const SkeletonPreset: React.FC<{ variant?: SkeletonVariant }> = ({ variant = 'page' }) => {
  switch (variant) {
    case 'dashboard':
      return <DashboardPreset />;
    case 'list':
      return <ListPreset />;
    case 'form':
      return <FormPreset />;
    case 'grid':
      return <GridPreset />;
    case 'detail':
      return <DetailPreset />;
    case 'storefront':
      return <StorefrontPreset />;
    default:
      return <PagePreset />;
  }
};

/**
 * ظلّ صفحةٍ كاملة. يُرسم في مكان الصفحة نفسها (لا طبقةً تغطّي الشاشة):
 * داخل اللوحة يبقى العمود الجانبيّ والشريط العلويّ ظاهرين، والظلّ يملأ
 * مساحة العمل وحدها — فالتنقّل بين الشاشات لا «يُطفئ» التطبيق كلّه.
 */
export const PageSkeleton: React.FC<{ variant?: SkeletonVariant; label?: string }> = ({
  variant = 'page',
  label
}) => {
  const t = useTheme();
  if (variant === 'storefront') {
    return (
      <SkeletonScope label={label} style={{ minHeight: '100vh', background: t.backgroundColor || '#F6F8F5' }}>
        <StorefrontPreset />
      </SkeletonScope>
    );
  }
  return (
    <SkeletonScope label={label} style={{ minHeight: '70vh' }}>
      <div className="ss-sk-page">
        <SkeletonPreset variant={variant} />
      </div>
    </SkeletonScope>
  );
};

/** قائمةٌ مدمجة (صفوف فقط) أو شبكةٌ مدمجة — لأقسامٍ تُحمَّل داخل صفحةٍ ظاهرة */
export const InlineListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <SkeletonScope>
    <ListPreset rows={rows} header={false} />
  </SkeletonScope>
);

export const InlineGridSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <SkeletonScope>
    <GridPreset cards={cards} header={false} />
  </SkeletonScope>
);
