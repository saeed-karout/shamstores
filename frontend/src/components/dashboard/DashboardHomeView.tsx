// frontend/src/components/dashboard/DashboardHomeView.tsx
//
// الشاشة الأولى للتاجر — مطعماً كان أو متجراً. الصفحتان تجلبان بياناتهما
// (مساراتهما مختلفة) وتمرّرانها هنا فيبقى الشكل واحداً.
//
// الترتيب مقصود: ما يستدعي تصرّفاً الآن (طلبات تنتظر، مخزون ينفد) قبل
// الأرقام، والأرقام قبل الرسم. ودليل الإعداد يظهر للتاجر الجديد وحده
// ويختفي حين يكتمل.

import React from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  IoArrowBack,
  IoCheckmark,
  IoChevronBack,
  IoOpenOutline,
  IoReceiptOutline,
  IoSparklesOutline
} from 'react-icons/io5';
import { formatPrice } from '@/utils/currency';
import '@/styles/dashboard-home.css';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';
type IconType = React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;

export interface HomeKpi {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: IconType;
  to: string;
  tone?: Tone;
}

export interface HomeAttention {
  icon: IconType;
  title: string;
  text: string;
  to: string;
  tone: Tone;
}

export interface HomeOrder {
  id: string;
  number: string;
  customer: string;
  total: number;
  status: string;
  createdAt?: string;
}

export interface HomeSetupStep {
  label: string;
  done: boolean;
  to: string;
}

export interface HomeAction {
  label: string;
  icon: IconType;
  to: string;
}

interface Props {
  ownerName?: string;
  businessName?: string;
  kind: 'restaurant' | 'store';
  todaySales?: number | null;
  todayOrders?: number | null;
  kpis: HomeKpi[];
  attention: HomeAttention[];
  setup: HomeSetupStep[];
  actions: HomeAction[];
  salesData?: Array<{ date: string; sales: number }> | null;
  recentOrders?: HomeOrder[] | null;
  ordersPath?: string;
  publicUrl?: string | null;
  planCard?: React.ReactNode;
}

// حالات الطلب للمطعم والمتجر معاً — الأسماء لا تتقاطع في المعنى
const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'بانتظار التأكيد', tone: 'amber' },
  confirmed: { label: 'مؤكَّد', tone: 'blue' },
  processing: { label: 'قيد التجهيز', tone: 'blue' },
  preparing: { label: 'قيد التحضير', tone: 'blue' },
  ready: { label: 'جاهز', tone: 'green' },
  shipped: { label: 'قيد التوصيل', tone: 'purple' },
  out_for_delivery: { label: 'قيد التوصيل', tone: 'purple' },
  served: { label: 'قُدِّم', tone: 'green' },
  delivered: { label: 'تم التسليم', tone: 'green' },
  completed: { label: 'مكتمل', tone: 'green' },
  cancelled: { label: 'ملغى', tone: 'red' }
};

export const statusMeta = (status: string) => STATUS[status] || { label: status, tone: 'gray' as Tone };

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'مساء الخير';
  if (h < 12) return 'صباح الخير';
  return 'مساء الخير';
};

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return new Date(iso).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' });
};

const DashboardHomeView: React.FC<Props> = ({
  ownerName,
  businessName,
  kind,
  todaySales,
  todayOrders,
  kpis,
  attention,
  setup,
  actions,
  salesData,
  recentOrders,
  ordersPath,
  publicUrl,
  planCard
}) => {
  const setupDone = setup.filter((s) => s.done).length;
  const setupComplete = setup.length === 0 || setupDone === setup.length;
  const weekTotal = (salesData || []).reduce((sum, d) => sum + (d.sales || 0), 0);
  const firstName = (ownerName || '').trim().split(/\s+/)[0];

  return (
    <div className="ss-page ss-home">
      {/* ===== الترحيب ===== */}
      <section className="ss-hello" aria-labelledby="hello-title">
        <div className="ss-hello-copy">
          <p className="ss-hello-date">
            {new Date().toLocaleDateString('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h2 id="hello-title">
            {greeting()}
            {firstName ? `، ${firstName}` : ''}
          </h2>
          <p className="ss-hello-sub">
            {businessName ? `هذا ما يجري في ${businessName} اليوم.` : 'هذا ما يجري في نشاطك اليوم.'}
          </p>
          <div className="ss-hello-actions">
            {actions.slice(0, 2).map((a, i) => (
              <Link key={a.to + a.label} to={a.to} className={`ss-hello-btn ${i === 0 ? 'is-primary' : ''}`}>
                <a.icon size={17} aria-hidden />
                {a.label}
              </Link>
            ))}
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="ss-hello-btn is-store">
                <IoOpenOutline size={17} aria-hidden="true" />
                {kind === 'restaurant' ? 'افتح قائمتي' : 'افتح متجري'}
              </a>
            )}
          </div>
        </div>

        {todaySales !== null && todaySales !== undefined && (
          <div className="ss-hello-figure" aria-label="مبيعات اليوم">
            <span>مبيعات اليوم</span>
            <strong>{formatPrice(todaySales)}</strong>
            {todayOrders !== null && todayOrders !== undefined && (
              <small>
                {todayOrders === 0
                  ? 'لا طلبات بعد اليوم'
                  : todayOrders === 1
                    ? 'من طلبٍ واحد'
                    : todayOrders === 2
                      ? 'من طلبين'
                      : `من ${todayOrders} ${todayOrders <= 10 ? 'طلبات' : 'طلباً'}`}
              </small>
            )}
          </div>
        )}
      </section>

      {/* ===== يحتاج انتباهك ===== */}
      {attention.length > 0 && (
        <section className="ss-attn" aria-label="يحتاج انتباهك">
          {attention.map((a) => (
            <Link key={a.title} to={a.to} className={`ss-attn-item tone-${a.tone}`}>
              <span className="ss-attn-ico"><a.icon size={20} aria-hidden /></span>
              <span className="ss-attn-text">
                <b>{a.title}</b>
                <small>{a.text}</small>
              </span>
              <IoChevronBack size={18} aria-hidden="true" className="ss-attn-go" />
            </Link>
          ))}
        </section>
      )}

      {/* ===== الأرقام ===== */}
      <section className="ss-kpis" aria-label="أرقامٌ سريعة">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className={`ss-kpi tone-${k.tone || 'green'}`}>
            <span className="ss-kpi-ico"><k.icon size={20} aria-hidden /></span>
            <span className="ss-kpi-label">{k.label}</span>
            <strong className="ss-kpi-value">{k.value}</strong>
            {k.hint && <small className="ss-kpi-hint">{k.hint}</small>}
          </Link>
        ))}
      </section>

      <div className="ss-home-grid">
        {/* ===== المبيعات ===== */}
        {salesData && (
          <section className="ss-card ss-panel ss-chart" aria-labelledby="chart-title">
            <header className="ss-panel-head">
              <div>
                <h3 id="chart-title">المبيعات — آخر ٧ أيام</h3>
                <p>{formatPrice(weekTotal)} خلال الأسبوع</p>
              </div>
            </header>
            <div className="ss-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ssSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#084835" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#084835" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(16,35,27,0.07)" />
                  <XAxis dataKey="date" tick={{ fill: '#5F736A', fontSize: 12 }} axisLine={false} tickLine={false} reversed />
                  <YAxis
                    orientation="right"
                    width={44}
                    tick={{ fill: '#5F736A', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(8,72,53,0.25)' }}
                    formatter={(value: any) => [formatPrice(Number(value)), 'المبيعات']}
                    contentStyle={{ background: '#fff', border: '1px solid rgba(16,35,27,0.1)', borderRadius: 12, boxShadow: '0 8px 24px rgba(16,35,27,0.1)', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}
                    labelStyle={{ color: '#5F736A' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#084835" strokeWidth={2.5} fill="url(#ssSales)" activeDot={{ r: 5, fill: '#084835', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ===== دليل الإعداد أو الاختصارات ===== */}
        {!setupComplete ? (
          <section className="ss-card ss-panel ss-setup" aria-labelledby="setup-title">
            <header className="ss-panel-head">
              <div>
                <h3 id="setup-title">جهّز {kind === 'restaurant' ? 'قائمتك' : 'متجرك'}</h3>
                <p>
                  {setupDone} من {setup.length} — خطواتٌ قليلة ويصبح جاهزاً لزبائنك
                </p>
              </div>
              <span className="ss-ring" style={{ ['--p' as any]: `${Math.round((setupDone / setup.length) * 100)}%` }} aria-hidden="true">
                <span>{Math.round((setupDone / setup.length) * 100)}%</span>
              </span>
            </header>
            <ol className="ss-steps">
              {setup.map((s) => (
                <li key={s.label} className={s.done ? 'is-done' : ''}>
                  <Link to={s.to}>
                    <span className="ss-step-dot">{s.done && <IoCheckmark size={14} aria-hidden="true" />}</span>
                    <span className="ss-step-label">{s.label}</span>
                    {!s.done && <IoChevronBack size={16} aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="ss-card ss-panel" aria-labelledby="shortcuts-title">
            <header className="ss-panel-head">
              <div>
                <h3 id="shortcuts-title">اختصارات</h3>
                <p>أكثر ما تحتاجه يومياً</p>
              </div>
            </header>
            <div className="ss-shortcuts">
              {actions.map((a) => (
                <Link key={a.to + a.label} to={a.to} className="ss-shortcut">
                  <span><a.icon size={20} aria-hidden /></span>
                  {a.label}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ===== آخر الطلبات ===== */}
      {recentOrders && ordersPath && (
        <section className="ss-card ss-panel" aria-labelledby="orders-title">
          <header className="ss-panel-head">
            <div>
              <h3 id="orders-title">آخر الطلبات</h3>
              <p>تُحدَّث مع كلّ طلبٍ جديد</p>
            </div>
            <Link to={ordersPath} className="ss-panel-link">
              كلّ الطلبات <IoArrowBack size={15} aria-hidden="true" />
            </Link>
          </header>
          {recentOrders.length === 0 ? (
            <div className="ss-empty">
              <span><IoReceiptOutline size={26} aria-hidden="true" /></span>
              <b>لا طلبات بعد</b>
              <p>شارك رابط {kind === 'restaurant' ? 'قائمتك' : 'متجرك'} مع زبائنك — وسيظهر كلّ طلبٍ هنا لحظة وصوله.</p>
            </div>
          ) : (
            <ul className="ss-orders">
              {recentOrders.map((o) => {
                const meta = statusMeta(o.status);
                return (
                  <li key={o.id}>
                    <Link to={ordersPath}>
                      <span className="ss-order-avatar" aria-hidden="true">{(o.customer || '؟').trim().charAt(0)}</span>
                      <span className="ss-order-main">
                        <b>{o.customer || 'زبون'}</b>
                        <small>
                          <bdi>#{o.number}</bdi> · {timeAgo(o.createdAt)}
                        </small>
                      </span>
                      <span className={`ss-status tone-${meta.tone}`}>{meta.label}</span>
                      <span className="ss-order-total">{formatPrice(o.total)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {planCard}

      {setupComplete && (
        <p className="ss-home-tip">
          <IoSparklesOutline size={16} aria-hidden="true" />
          نصيحة: الصور الواضحة ترفع الطلبات أكثر من أيّ خصم — راجع صور أكثر {kind === 'restaurant' ? 'أطباقك' : 'منتجاتك'} مبيعاً.
        </p>
      )}
    </div>
  );
};

export default DashboardHomeView;
