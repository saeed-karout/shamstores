// frontend/src/components/marketing/PlatformShowcase.tsx
//
// «منصة مصمّمة لتسهّل إدارة متجرك» — لوحة التاجر مبنيّةً بـHTML وCSS حقيقيين
// لا صورةً مصغّرة: النصّ يبقى حادّاً ومقروءاً بأي عرض، وعلى الجوال يتحوّل
// الشريط الجانبي إلى شريط تبويبٍ سفليّ كما في اللوحة الفعلية.
//
// الأرقام هنا أمثلة عرضٍ لشكل الواجهة (كما في شاشات الأجهزة الأخرى)، لا
// إحصاءات إنجاز — قاعدة الصفحة الرئيسية.

import React from 'react';
import {
  PiHouseDuotone, PiReceiptDuotone, PiPackageDuotone, PiUsersThreeDuotone, PiTicketDuotone,
  PiChartLineUpDuotone, PiGearSixDuotone, PiMagnifyingGlassBold, PiBellSimpleDuotone,
  PiCoinsDuotone, PiShoppingBagDuotone, PiArrowsClockwiseDuotone, PiWarningDuotone,
  PiMopedDuotone, PiStorefrontDuotone, PiForkKnifeDuotone, PiTruckDuotone, PiWalletDuotone
} from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { BrandMark } from './Brand';
import { CountUp, useInView } from './motion';

// ===== بيانات العرض =====

const NAV: Array<{ icon: IconType; label: string; tab?: boolean; count?: number }> = [
  { icon: PiHouseDuotone, label: 'الرئيسية', tab: true },
  { icon: PiReceiptDuotone, label: 'الطلبات', tab: true, count: 4 },
  { icon: PiPackageDuotone, label: 'المنتجات', tab: true },
  { icon: PiUsersThreeDuotone, label: 'الزبائن', tab: true },
  { icon: PiTicketDuotone, label: 'الكوبونات' },
  { icon: PiChartLineUpDuotone, label: 'التحليلات', tab: true },
  { icon: PiGearSixDuotone, label: 'الإعدادات' }
];

const KPIS: Array<{
  icon: IconType;
  label: string;
  value: number;
  format: (n: number) => string;
  unit?: string;
  note: string;
  tone: 'forest' | 'lime' | 'purple' | 'amber';
}> = [
  { icon: PiCoinsDuotone, label: 'مبيعات اليوم', value: 1250000, format: (n) => Math.round(n).toLocaleString('en-US'), unit: 'ل.س', note: '▲ 12% عن أمس', tone: 'forest' },
  { icon: PiShoppingBagDuotone, label: 'طلبات جديدة', value: 32, format: (n) => String(Math.round(n)), note: '4 بانتظار التأكيد', tone: 'lime' },
  { icon: PiArrowsClockwiseDuotone, label: 'زبائن عائدون', value: 64, format: (n) => `${Math.round(n)}%`, note: 'من طلبات الشهر', tone: 'purple' },
  { icon: PiWarningDuotone, label: 'منتجات منخفضة', value: 5, format: (n) => String(Math.round(n)), note: 'تحتاج إعادة تخزين', tone: 'amber' }
];

// مبيعات ٣٠ يوماً بالألف ليرة — آخرها مبيعات اليوم في البطاقة أعلاه
const SERIES = [
  620, 680, 640, 720, 700, 760, 740, 690, 780, 820, 800, 760, 850, 880, 840,
  900, 930, 870, 960, 990, 950, 1020, 1060, 1010, 1090, 1120, 1080, 1160, 1190, 1250
];

const MIX: Array<{ label: string; icon: IconType; pct: number; color: string }> = [
  { label: 'توصيل', icon: PiMopedDuotone, pct: 38, color: '#117257' },
  { label: 'استلام', icon: PiStorefrontDuotone, pct: 24, color: '#c07cdf' },
  { label: 'في المطعم', icon: PiForkKnifeDuotone, pct: 22, color: '#b9e24f' },
  { label: 'شحن', icon: PiTruckDuotone, pct: 16, color: '#e6a94a' }
];

const ORDERS: Array<{ id: string; who: string; type: string; amount: string; status: string; tone: 'amber' | 'lime' | 'muted' | 'purple' }> = [
  { id: '#1256', who: 'أحمد', type: 'توصيل', amount: '185,000', status: 'قيد التحضير', tone: 'amber' },
  { id: '#1255', who: 'سارة', type: 'استلام', amount: '72,000', status: 'جاهز', tone: 'lime' },
  { id: '#1254', who: 'طاولة 7', type: 'في المطعم', amount: '140,000', status: 'تم التقديم', tone: 'muted' },
  { id: '#1253', who: 'محمد', type: 'شحن', amount: '260,000', status: 'في الطريق', tone: 'purple' }
];

// ===== الرسم =====

const CW = 600;
const CH = 210;
const PAD_X = 8;
const PAD_T = 18;
const PAD_B = 10;
const Y_MAX = 1400;

const yOf = (v: number) => PAD_T + (1 - v / Y_MAX) * (CH - PAD_T - PAD_B);
const Y_TICKS: Array<[number, string]> = [[1200, '1.2M'], [800, '800K'], [400, '400K'], [0, '0']];

const points = SERIES.map((v, i) => [PAD_X + (i * (CW - PAD_X * 2)) / (SERIES.length - 1), yOf(v)]);

/** منحنى Catmull-Rom ناعم يمرّ بكل النقاط — بلا مكتبة رسوم. */
const smoothPath = (pts: number[][]) => {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};

const LINE = smoothPath(points);
const AREA = `${LINE} L${points[points.length - 1][0].toFixed(1)},${CH} L${points[0][0].toFixed(1)},${CH} Z`;
const LAST = points[points.length - 1];

const R = 42;
const C = 2 * Math.PI * R;

// ===== المكوّن =====

const PlatformShowcase: React.FC = () => {
  const [mockRef, live] = useInView<HTMLDivElement>(0.2);

  let acc = 0;
  const segments = MIX.map((m) => {
    const len = (m.pct / 100) * C;
    const seg = { ...m, len: Math.max(0, len - 2), off: acc };
    acc += len;
    return seg;
  });

  return (
    <section className="ss-section ss-dark ss-pf" aria-labelledby="pf-title">
      <div className="ss-pf-glow" aria-hidden="true" />
      <div className="ss-container">
        <div className="ss-pf-head ss-reveal">
          <span className="ss-eyebrow">
            <BrandMark size={12} color="currentColor" /> لوحة التاجر
          </span>
          <h2 id="pf-title" className="ss-h2">
            منصة مصمّمة <span className="ss-accent-text">لتسهّل إدارة متجرك</span>
          </h2>
          <p className="ss-lead">طلباتك ومنتجاتك وزبائنك ومبيعاتك — على لوحة واحدة، من الجوال أو الحاسوب.</p>
        </div>

        <div className="ss-pf-stage">
          <div
            ref={mockRef}
            className={`ss-pf-window ${live ? 'is-live' : ''}`}
            role="img"
            aria-label="مثال للوحة تحكم التاجر في شام ستورز: مبيعات اليوم 1,250,000 ليرة، 32 طلباً جديداً، 64% زبائن عائدون، 5 منتجات منخفضة المخزون، ورسم المبيعات لآخر ثلاثين يوماً وأحدث الطلبات."
          >
            <div className="ss-pf-chrome" aria-hidden="true">
              <span className="ss-pf-dots"><i /><i /><i /></span>
              <span className="ss-pf-url latin">shamstores.com/dashboard</span>
            </div>

            <div className="ss-pf-app" aria-hidden="true">
              {/* الشريط الجانبي — يصير شريط تبويبٍ سفليّاً على العرض الضيّق */}
              <aside className="ss-pf-side">
                <div className="ss-pf-brand">
                  <BrandMark size={18} color="#cdef7c" />
                  <span>
                    <b>شام ستورز</b>
                    <small className="latin">SHAM STORES</small>
                  </span>
                </div>
                <nav className="ss-pf-nav">
                  {NAV.map((n, i) => (
                    <span key={n.label} className={`ss-pf-nav-item ${i === 0 ? 'is-active' : ''} ${n.tab ? 'is-tab' : ''}`}>
                      <n.icon />
                      <em>{n.label}</em>
                      {n.count ? <sup className="latin">{n.count}</sup> : null}
                    </span>
                  ))}
                </nav>
                <div className="ss-pf-side-foot">
                  <span className="ss-pf-avatar">م</span>
                  <span>
                    <b>متجر الشام</b>
                    <small>المالك</small>
                  </span>
                </div>
              </aside>

              <div className="ss-pf-main">
                <header className="ss-pf-top">
                  <div className="ss-pf-hello">
                    <b>صباح الخير، متجر الشام 👋</b>
                    <small>هذا ملخّص نشاطك اليوم</small>
                  </div>
                  <div className="ss-pf-tools">
                    <span className="ss-pf-search">
                      <PiMagnifyingGlassBold />
                      بحث...
                    </span>
                    <span className="ss-pf-bell">
                      <PiBellSimpleDuotone />
                      <i />
                    </span>
                  </div>
                </header>

                <div className="ss-pf-kpis">
                  {KPIS.map((k, i) => (
                    <div key={k.label} className={`ss-pf-kpi is-${k.tone}`} style={{ ['--i' as any]: i }}>
                      <span className="ss-pf-kpi-icon"><k.icon /></span>
                      <small>{k.label}</small>
                      <b>
                        <bdi className="latin"><CountUp value={k.value} start={live} format={k.format} delay={i * 90} /></bdi>
                        {k.unit && <span>{k.unit}</span>}
                      </b>
                      <em>{k.note}</em>
                    </div>
                  ))}
                </div>

                <div className="ss-pf-row">
                  <div className="ss-pf-card ss-pf-chart">
                    <div className="ss-pf-card-head">
                      <b>المبيعات — آخر ٣٠ يوماً</b>
                      <span className="ss-pf-up"><bdi className="latin">▲ 18%</bdi></span>
                    </div>
                    <div className="ss-pf-chart-body">
                      <div className="ss-pf-yaxis latin">
                        {Y_TICKS.map(([v, l]) => (
                          <span key={l} style={{ top: `${(yOf(v) / CH) * 100}%` }}>{l}</span>
                        ))}
                      </div>
                      <div className="ss-pf-plot">
                      <svg viewBox={`0 0 ${CW} ${CH}`} className="ss-pf-svg">
                        <defs>
                          <linearGradient id="pf-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#117257" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#117257" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {Y_TICKS.map(([v]) => (
                          <line key={v} x1="0" x2={CW} y1={yOf(v)} y2={yOf(v)} className="ss-pf-grid" />
                        ))}
                        <path d={AREA} fill="url(#pf-area)" className="ss-pf-area" />
                        <path d={LINE} pathLength={1} className="ss-pf-line" />
                      </svg>
                      <span
                        className="ss-pf-point"
                        style={{ left: `${(LAST[0] / CW) * 100}%`, top: `${(LAST[1] / CH) * 100}%` }}
                      >
                        <span className="ss-pf-tip latin">1.25M</span>
                      </span>
                      </div>
                    </div>
                    <div className="ss-pf-xaxis">
                      <span>قبل شهر</span><span>قبل أسبوعين</span><span>اليوم</span>
                    </div>
                  </div>

                  <div className="ss-pf-card ss-pf-mix">
                    <div className="ss-pf-card-head">
                      <b>الطلبات حسب النوع</b>
                    </div>
                    <div className="ss-pf-mix-body">
                      <div className="ss-pf-donut">
                        <svg viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r={R} className="ss-pf-donut-track" />
                          {segments.map((s, i) => (
                            <circle
                              key={s.label}
                              cx="50"
                              cy="50"
                              r={R}
                              className="ss-pf-seg"
                              stroke={s.color}
                              style={{
                                ['--len' as any]: s.len,
                                ['--c' as any]: C,
                                strokeDashoffset: -s.off,
                                transitionDelay: `${300 + i * 220}ms`
                              }}
                            />
                          ))}
                        </svg>
                        <span className="ss-pf-donut-c">
                          <b className="latin"><CountUp value={32} start={live} delay={300} /></b>
                          <small>طلب اليوم</small>
                        </span>
                      </div>
                      <ul className="ss-pf-legend">
                        {MIX.map((m) => (
                          <li key={m.label}>
                            <i style={{ background: m.color }} />
                            <span>{m.label}</span>
                            <b className="latin">{m.pct}%</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="ss-pf-card ss-pf-orders">
                  <div className="ss-pf-card-head">
                    <b>أحدث الطلبات</b>
                    <span className="ss-pf-link">عرض الكل</span>
                  </div>
                  <ul>
                    {ORDERS.map((o, i) => (
                      <li key={o.id} style={{ ['--i' as any]: i }}>
                        <span className="ss-pf-oid latin">{o.id}</span>
                        <span className="ss-pf-who">
                          <b>{o.who}</b>
                          <small>{o.type}</small>
                        </span>
                        <span className="ss-pf-type">{o.type}</span>
                        <span className="ss-pf-amt"><bdi className="latin">{o.amount}</bdi> ل.س</span>
                        <span className={`ss-pf-pill is-${o.tone}`}><i />{o.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* تنبيهٌ يصل بعد الطلبات — كما يحدث فعلاً في اللوحة */}
          <div className={`ss-pf-toast ${live ? 'is-live' : ''}`} aria-hidden="true">
            <span className="ss-pf-toast-icon"><PiBellSimpleDuotone /></span>
            <span>
              <b>طلب جديد <bdi className="latin">#1257</bdi></b>
              <small>تنبيه صوتيّ + تيليغرام</small>
            </span>
          </div>
          <div className={`ss-pf-toast is-alt ${live ? 'is-live' : ''}`} aria-hidden="true">
            <span className="ss-pf-toast-icon"><PiWalletDuotone /></span>
            <span>
              <b>دفع عبر شام كاش</b>
              <small>يصل محفظتك مباشرة</small>
            </span>
          </div>
        </div>

        {/* التوقيع */}
        <div className="ss-pf-sign ss-reveal">
          <div className="ss-pf-word">
            <BrandMark size={34} color="#cdef7c" />
            <span className="latin">SHAM STORES</span>
          </div>
          <div className="ss-pf-motto">
            <b>أنت ركّز على تجارتك</b>
            <span>وشام ستورز يرتّب لك التجربة الرقمية</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformShowcase;
