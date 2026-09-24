// pages/Admin/AdminDashboard.tsx — الشاشة الأولى لمدير المنصّة
//
// بترتيب شاشة التاجر نفسه: ما ينتظر قراراً منه (طلبات ترقية، رسائل،
// اشتراكاتٌ تنتهي) قبل الأرقام، والأرقام قبل الرسم. كانت الشاشة ستّ بطاقاتٍ
// بلا سياق ورسماً فارغاً، و«الإيرادات» فيها مجموع كلّ الطلبات بما فيها
// الملغاة — رقمٌ لا يعني شيئاً.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  IoArrowBack,
  IoCarOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmarkCircleOutline,
  IoDiamondOutline,
  IoPeopleOutline,
  IoReceiptOutline,
  IoRestaurantOutline,
  IoRocketOutline,
  IoStorefrontOutline,
  IoTimeOutline
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/utils/currency';
import '@/styles/dashboard-home.css';

interface Stats {
  overview: { restaurants: number; stores: number; users: number; drivers: number; orders: number; revenue: number };
  orders: { total: number; pending: number; delivering: number; completed: number };
  growth?: { newRestaurants: number; newStores: number };
  attention?: { upgradeRequests: number; featureRequests: number; contactMessages: number; expiringSubscriptions: number };
  weekly?: Array<{ date: string; count: number; sales: number }>;
  latestBusinesses?: Array<{ id: string; name: string; logo?: string | null; createdAt: string; isActive: boolean; type: 'restaurant' | 'store' }>;
}

const plural = (n: number, one: string, two: string, few: string, many: string) =>
  n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;

const since = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days < 30) return `قبل ${days} يوماً`;
  return new Date(iso).toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' });
};

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStats(await api.get<Stats>('/admin/stats'));
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader fullScreen />;

  const o = stats?.overview;
  const a = stats?.attention;
  const weekly = (stats?.weekly || []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('ar-SY', { day: 'numeric', month: 'numeric' })
  }));
  const weekSales = weekly.reduce((s, d) => s + d.sales, 0);
  const weekOrders = weekly.reduce((s, d) => s + d.count, 0);
  const newBiz = (stats?.growth?.newRestaurants || 0) + (stats?.growth?.newStores || 0);
  const firstName = (user?.name || '').trim().split(/\s+/)[0];

  const attention = [
    a?.upgradeRequests
      ? { icon: IoRocketOutline, tone: 'purple', to: '/admin/plans', title: plural(a.upgradeRequests, 'طلب ترقية ينتظر', 'طلبا ترقية ينتظران', 'طلبات ترقية تنتظر', 'طلب ترقية ينتظر'), text: 'تاجرٌ جاهزٌ للدفع — الردّ السريع يحسم البيعة' }
      : null,
    a?.featureRequests
      ? { icon: IoDiamondOutline, tone: 'blue', to: '/admin/features', title: plural(a.featureRequests, 'طلب إضافة ينتظر', 'طلبا إضافة ينتظران', 'طلبات إضافات تنتظر', 'طلب إضافة ينتظر'), text: 'تفعيل ميزاتٍ مدفوعة طلبها التجّار' }
      : null,
    a?.contactMessages
      ? { icon: IoChatbubbleEllipsesOutline, tone: 'amber', to: '/admin/contact-messages', title: plural(a.contactMessages, 'رسالة جديدة', 'رسالتان جديدتان', 'رسائل جديدة', 'رسالة جديدة'), text: 'من نموذج «تواصل معنا»' }
      : null,
    a?.expiringSubscriptions
      ? { icon: IoTimeOutline, tone: 'red', to: '/admin/subscriptions', title: plural(a.expiringSubscriptions, 'اشتراك ينتهي', 'اشتراكان ينتهيان', 'اشتراكات تنتهي', 'اشتراكاً ينتهي') + ' خلال أسبوع', text: 'ذكّر أصحابها قبل أن تُغلق ميزاتهم' }
      : null
  ].filter(Boolean) as Array<{ icon: any; tone: string; to: string; title: string; text: string }>;

  const kpis = [
    { label: 'المطاعم', value: o?.restaurants || 0, icon: IoRestaurantOutline, to: '/admin/restaurants', tone: 'green', hint: stats?.growth?.newRestaurants ? `+${stats.growth.newRestaurants} هذا الأسبوع` : 'لا جديد هذا الأسبوع' },
    { label: 'المتاجر', value: o?.stores || 0, icon: IoStorefrontOutline, to: '/admin/stores', tone: 'purple', hint: stats?.growth?.newStores ? `+${stats.growth.newStores} هذا الأسبوع` : 'لا جديد هذا الأسبوع' },
    { label: 'المستخدمون', value: o?.users || 0, icon: IoPeopleOutline, to: '/admin/users', tone: 'blue', hint: `${o?.drivers || 0} سائق` },
    { label: 'الطلبات', value: o?.orders || 0, icon: IoReceiptOutline, to: '/admin/orders', tone: stats?.orders.pending ? 'amber' : 'gray', hint: stats?.orders.pending ? `${stats.orders.pending} بانتظار التجّار` : 'لا شيء معلّق' }
  ];

  return (
    <div className="ss-page ss-home">
      {failed && (
        <div className="ss-attn">
          <div className="ss-attn-item tone-red">
            <span className="ss-attn-text">
              <b>تعذّر جلب الإحصاءات</b>
              <small>أعد تحميل الصفحة بعد قليل.</small>
            </span>
          </div>
        </div>
      )}

      <section className="ss-hello" aria-labelledby="hello-title">
        <div className="ss-hello-copy">
          <p className="ss-hello-date">{new Date().toLocaleDateString('ar-SY', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 id="hello-title">أهلاً{firstName ? `، ${firstName}` : ''}</h2>
          <p className="ss-hello-sub">
            {(o?.restaurants || 0) + (o?.stores || 0)} نشاطاً على شام ستورز
            {newBiz ? ` — ${newBiz} ${newBiz === 1 ? 'انضمّ' : 'انضمّوا'} هذا الأسبوع.` : '.'}
          </p>
          <div className="ss-hello-actions">
            <Link to="/admin/plans" className="ss-hello-btn is-primary">
              <IoRocketOutline size={17} aria-hidden="true" /> الخطط والترقيات
            </Link>
            <Link to="/admin/restaurants" className="ss-hello-btn">
              <IoRestaurantOutline size={17} aria-hidden="true" /> المطاعم
            </Link>
            <Link to="/admin/stores" className="ss-hello-btn">
              <IoStorefrontOutline size={17} aria-hidden="true" /> المتاجر
            </Link>
          </div>
        </div>
        <div className="ss-hello-figure" aria-label="مبيعات التجّار هذا الأسبوع">
          <span>مبيعات التجّار — ٧ أيام</span>
          <strong>{formatPrice(weekSales)}</strong>
          <small>{weekOrders === 0 ? 'لا طلبات هذا الأسبوع' : `من ${weekOrders} طلب`}</small>
        </div>
      </section>

      <section className="ss-attn" aria-label="ينتظر قرارك">
        {attention.length > 0 ? (
          attention.map((item) => (
            <Link key={item.to} to={item.to} className={`ss-attn-item tone-${item.tone}`}>
              <span className="ss-attn-ico"><item.icon size={20} aria-hidden="true" /></span>
              <span className="ss-attn-text">
                <b>{item.title}</b>
                <small>{item.text}</small>
              </span>
              <IoArrowBack size={18} aria-hidden="true" className="ss-attn-go" />
            </Link>
          ))
        ) : (
          <div className="ss-attn-item tone-green">
            <span className="ss-attn-ico"><IoCheckmarkCircleOutline size={20} aria-hidden="true" /></span>
            <span className="ss-attn-text">
              <b>لا شيء ينتظر قرارك</b>
              <small>لا طلبات ترقية ولا رسائل جديدة ولا اشتراكات تنتهي هذا الأسبوع.</small>
            </span>
          </div>
        )}
      </section>

      <section className="ss-kpis" aria-label="أرقام المنصّة">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className={`ss-kpi tone-${k.tone}`}>
            <span className="ss-kpi-ico"><k.icon size={20} aria-hidden="true" /></span>
            <span className="ss-kpi-label">{k.label}</span>
            <strong className="ss-kpi-value">{k.value}</strong>
            <small className="ss-kpi-hint">{k.hint}</small>
          </Link>
        ))}
      </section>

      <div className="ss-home-grid">
        <section className="ss-card ss-panel" aria-labelledby="chart-title">
          <header className="ss-panel-head">
            <div>
              <h3 id="chart-title">مبيعات التجّار — آخر ٧ أيام</h3>
              <p>
                مجموع كلّ ما بيع عبر المنصّة منذ البداية: {formatPrice(o?.revenue || 0)}
              </p>
            </div>
          </header>
          <div className="ss-chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="ssAdminSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#084835" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#084835" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(16,35,27,0.07)" />
                <XAxis dataKey="label" tick={{ fill: '#5F736A', fontSize: 12 }} axisLine={false} tickLine={false} reversed />
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
                  formatter={(value: any, name: any) => (name === 'sales' ? [formatPrice(Number(value)), 'المبيعات'] : [value, 'الطلبات'])}
                  contentStyle={{ background: '#fff', border: '1px solid rgba(16,35,27,0.1)', borderRadius: 12, boxShadow: '0 8px 24px rgba(16,35,27,0.1)', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}
                  labelStyle={{ color: '#5F736A' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#084835" strokeWidth={2.5} fill="url(#ssAdminSales)" activeDot={{ r: 5, fill: '#084835', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ss-card ss-panel" aria-labelledby="latest-title">
          <header className="ss-panel-head">
            <div>
              <h3 id="latest-title">أحدث التجّار</h3>
              <p>آخر من انضمّ إلى المنصّة</p>
            </div>
          </header>
          {(stats?.latestBusinesses || []).length === 0 ? (
            <div className="ss-empty">
              <b>لا تجّار بعد</b>
            </div>
          ) : (
            <ul className="ss-orders">
              {(stats?.latestBusinesses || []).map((b) => (
                <li key={b.id}>
                  <Link to={`/admin/${b.type === 'restaurant' ? 'restaurants' : 'stores'}/${b.id}`} style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto', gridTemplateAreas: '"av main status"' }}>
                    <span className="ss-order-avatar" aria-hidden="true" style={{ overflow: 'hidden' }}>
                      {b.logo ? <img src={b.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : b.name.charAt(0)}
                    </span>
                    <span className="ss-order-main">
                      <b>{b.name}</b>
                      <small>
                        {b.type === 'restaurant' ? 'مطعم' : 'متجر'} · {since(b.createdAt)}
                      </small>
                    </span>
                    <span className={`ss-status ${b.isActive ? 'tone-green' : 'tone-gray'}`}>{b.isActive ? 'نشط' : 'موقوف'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="ss-kpis" aria-label="حالة الطلبات">
        {[
          { label: 'بانتظار التجّار', value: stats?.orders.pending || 0, icon: IoTimeOutline, tone: 'amber' },
          { label: 'قيد التوصيل', value: stats?.orders.delivering || 0, icon: IoCarOutline, tone: 'blue' },
          { label: 'مكتملة', value: stats?.orders.completed || 0, icon: IoCheckmarkCircleOutline, tone: 'green' },
          { label: 'السائقون', value: o?.drivers || 0, icon: IoCarOutline, tone: 'purple' }
        ].map((k) => (
          <Link key={k.label} to={k.label === 'السائقون' ? '/admin/drivers' : '/admin/orders'} className={`ss-kpi tone-${k.tone}`}>
            <span className="ss-kpi-ico"><k.icon size={20} aria-hidden="true" /></span>
            <span className="ss-kpi-label">{k.label}</span>
            <strong className="ss-kpi-value">{k.value}</strong>
          </Link>
        ))}
      </section>
    </div>
  );
};

export default AdminDashboard;
