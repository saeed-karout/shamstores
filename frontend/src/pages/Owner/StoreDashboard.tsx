// pages/Owner/StoreDashboard.tsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import {
  IoStorefront,
  IoCube,
  IoReceipt,
  IoStatsChart,
  IoPricetag,
  IoPeople,
  IoCar,
  IoWarning,
  IoAdd,
  IoSettings,
  IoCheckmarkCircle
} from 'react-icons/io5';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import PlanStatusCard from '@/components/dashboard/PlanStatusCard';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

interface DashboardStats {
  todayOrders: number;
  todaySales: number;
  pendingOrders: number;
  totalProducts: number;
  lowStock: number;
  totalDrivers: number;
  recentOrders: any[];
  salesData: Array<{ date: string; sales: number }>;
}

// دالة مساعدة لاستخراج البيانات من الاستجابة
const extractData = (response: any) => {
  if (!response) return null;
  if (response.data) return response.data;
  return response;
};

const getStatusBadgeStyle = (status: string): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-block',
  };
  switch (status) {
    case 'pending':    return { ...base, background: 'rgba(245,158,11,0.15)', color: C.yellow };
    case 'processing': return { ...base, background: 'rgba(96,165,250,0.15)', color: C.blue };
    case 'shipped':    return { ...base, background: 'rgba(167,139,250,0.15)', color: C.purple };
    case 'delivered':  return { ...base, background: 'rgba(200,226,53,0.15)', color: C.accent };
    case 'cancelled':  return { ...base, background: 'rgba(255,107,107,0.15)', color: C.red };
    default:           return { ...base, background: 'rgba(157,196,172,0.15)', color: C.muted };
  }
};

const StoreDashboard: React.FC = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    if (permissions.loading) return;
    fetchDashboardData();
    fetchStoreData();
  }, [permissions.loading, permissions.canViewOrders, permissions.canViewAnalytics, permissions.canViewDelivery]);

  const fetchStoreData = async () => {
    try {
      const res = await api.get('/store/profile');
      console.log('Store profile response:', res);
      const data = extractData(res);
      setStoreData(data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const paidPlan = (permissions.currentPlan?.price || 0) > 0 && permissions.currentPlan?.name !== 'free' && permissions.currentPlan?.slug !== 'free';
      const canInventory = permissions.checkPermission('inventory') || paidPlan;

      const [
        ordersStatsRes,
        productsRes,
        inventoryStatsRes,
        recentOrdersRes,
        salesHistoryRes,
        driversRes
      ] = await Promise.allSettled([
        permissions.canViewOrders ? api.get('/store/orders/stats?period=today') : Promise.resolve(null),
        api.get('/store/products'),
        canInventory ? api.get('/store/inventory/stats') : Promise.resolve(null),
        permissions.canViewOrders ? api.get('/store/orders?limit=5') : Promise.resolve(null),
        permissions.canViewOrders ? api.get('/store/orders/stats?period=week') : Promise.resolve(null),
        permissions.canViewDelivery ? api.get('/store/drivers') : Promise.resolve(null),
      ]);

      const ordersStats = ordersStatsRes.status === 'fulfilled' ? extractData(ordersStatsRes.value) : null;
      const products = productsRes.status === 'fulfilled' ? extractData(productsRes.value) : null;
      const inventoryStats = inventoryStatsRes.status === 'fulfilled' ? extractData(inventoryStatsRes.value) : null;
      const recentOrders = recentOrdersRes.status === 'fulfilled' ? extractData(recentOrdersRes.value) : null;
      const salesHistory = salesHistoryRes.status === 'fulfilled' ? extractData(salesHistoryRes.value) : null;
      const drivers = driversRes.status === 'fulfilled' ? extractData(driversRes.value) : null;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: format(date, 'dd/MM'),
          sales: 0
        };
      }).reverse();

      if (salesHistory?.dailyStats && Array.isArray(salesHistory.dailyStats)) {
        salesHistory.dailyStats.forEach((day: any) => {
          const dayIndex = last7Days.findIndex(d =>
            d.date === format(new Date(day.date), 'dd/MM')
          );
          if (dayIndex !== -1) {
            last7Days[dayIndex].sales = day.sales || 0;
          }
        });
      }

      setStats({
        todayOrders: ordersStats?.totalOrders || 0,
        todaySales: ordersStats?.totalSales || 0,
        pendingOrders: ordersStats?.pendingOrders || 0,
        totalProducts: products?.length || 0,
        lowStock: inventoryStats?.lowStock || 0,
        totalDrivers: drivers?.length || 0,
        recentOrders: (recentOrders && Array.isArray(recentOrders) ? recentOrders.slice(0, 5) : []) || [],
        salesData: last7Days,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const paidPlan = (permissions.currentPlan?.price || 0) > 0 && permissions.currentPlan?.name !== 'free' && permissions.currentPlan?.slug !== 'free';
  const canInventory = permissions.checkPermission('inventory') || paidPlan;

  const quickActions = [
    { label: 'إضافة منتج', icon: IoAdd, path: '/store/products' },
    ...(permissions.canViewOrders ? [{ label: 'عرض الطلبات', icon: IoReceipt, path: '/store/orders' }] : []),
    ...(canInventory ? [{ label: 'مراجعة المخزون', icon: IoStatsChart, path: '/store/inventory' }] : []),
    ...(permissions.canViewCoupons ? [{ label: 'إنشاء كوبون', icon: IoPricetag, path: '/store/coupons' }] : []),
    ...(permissions.canViewDelivery ? [{ label: 'إضافة سائق', icon: IoCar, path: '/store/drivers' }] : []),
    { label: 'الإعدادات', icon: IoSettings, path: '/store/settings' },
  ];

  const statCards = [
    ...(permissions.canViewOrders ? [{ title: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceipt, path: '/store/orders', highlight: false }] : []),
    ...(permissions.canViewAnalytics ? [{ title: 'مبيعات اليوم', value: `${stats?.todaySales?.toFixed(2) || 0} ر.س`, icon: IoPricetag, path: '/store/analytics', highlight: false }] : []),
    { title: 'المنتجات', value: stats?.totalProducts || 0, icon: IoCube, path: '/store/products', highlight: false },
    ...(canInventory ? [{ title: 'منتجات منخفضة', value: stats?.lowStock || 0, icon: IoWarning, path: '/store/inventory', highlight: true }] : []),
  ];

  if (permissions.loading || loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '1.5rem', color: C.text }} dir="rtl">

      <PlanStatusCard />

      {/* الترحيب */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 44, height: 44, background: 'rgba(200,226,53,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IoStorefront style={{ color: C.accent, fontSize: 22 }} />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: C.text, margin: 0 }}>
            مرحباً {user?.name || 'عزيزي المالك'} 👋
          </h1>
        </div>
        <p style={{ color: C.muted, marginTop: '0.25rem', fontSize: '0.95rem' }}>
          {storeData?.name || 'متجرك'} •{' '}
          {new Date().toLocaleDateString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: '2rem' }}>
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.path}
            style={{
              background: C.card,
              border: card.highlight && (stats?.lowStock || 0) > 0
                ? '1px solid rgba(255,107,107,0.3)'
                : `1px solid ${C.border}`,
              borderRadius: 16,
              padding: '1.5rem',
              textDecoration: 'none',
              display: 'block',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.surfL)}
            onMouseLeave={e => (e.currentTarget.style.background = C.card)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0 }}>{card.title}</p>
                <p style={{
                  color: card.highlight && (stats?.lowStock || 0) > 0 ? C.red : C.accent,
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  marginTop: '0.5rem',
                  marginBottom: 0,
                }}>
                  {card.value}
                </p>
              </div>
              <div style={{
                width: 48,
                height: 48,
                background: card.highlight && (stats?.lowStock || 0) > 0
                  ? 'rgba(255,107,107,0.1)'
                  : 'rgba(200,226,53,0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <card.icon style={{
                  color: card.highlight && (stats?.lowStock || 0) > 0 ? C.red : C.accent,
                  fontSize: 22,
                }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* إجراءات سريعة (للموبايل) */}
      <div className="lg:hidden" style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          style={{
            width: '100%',
            background: C.accent,
            color: C.bg,
            fontWeight: 700,
            padding: '0.75rem',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
          }}
        >
          <IoAdd style={{ fontSize: 20 }} />
          إجراءات سريعة
        </button>
        {showQuickActions && (
          <div style={{ marginTop: '0.5rem', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    background: C.surf,
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: C.text,
                    display: 'block',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.surfL)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.surf)}
                >
                  <action.icon style={{ color: C.accent, fontSize: 20, display: 'block', margin: '0 auto 4px' }} />
                  <span style={{ fontSize: '0.75rem' }}>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* الرسم البياني + نظرة سريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: '2rem' }}>

        {/* الرسم البياني */}
        {permissions.canViewOrders && (
          <div className="lg:col-span-2" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '1rem' }}>
              المبيعات خلال آخر 7 أيام
            </h2>
            <div style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.salesData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <Tooltip
                    formatter={(value) => [`${value} ر.س`, 'المبيعات']}
                    contentStyle={{ background: C.prim, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text }}
                    labelStyle={{ color: C.muted }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke={C.accent}
                    strokeWidth={2.5}
                    dot={{ fill: C.accent, r: 4 }}
                    activeDot={{ r: 6, fill: C.accent }}
                    name="المبيعات"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* نظرة سريعة */}
        {(permissions.canViewOrders || permissions.canViewDelivery || canInventory) && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '1rem' }}>
              📊 نظرة سريعة
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {permissions.canViewOrders && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.muted, fontSize: '0.9rem' }}>طلبات معلقة</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: C.accent }}>{stats?.pendingOrders || 0}</span>
                  </div>
                  <div style={{ height: 1, background: C.border }} />
                </>
              )}
              {permissions.canViewDelivery && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.muted, fontSize: '0.9rem' }}>السائقين</span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: C.accent }}>{stats?.totalDrivers || 0}</span>
                  </div>
                  <div style={{ height: 1, background: C.border }} />
                </>
              )}
              {canInventory && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.muted, fontSize: '0.9rem' }}>منتجات منخفضة المخزون</span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: (stats?.lowStock || 0) > 0 ? C.red : C.accent,
                    }}>
                      {stats?.lowStock || 0}
                    </span>
                  </div>
                  <div style={{ paddingTop: '0.5rem', borderTop: `1px solid ${C.border}` }}>
                    <Link
                      to="/store/inventory"
                      style={{ color: C.accent, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      مراجعة المخزون <IoStatsChart style={{ fontSize: 16 }} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* تنبيه منتجات منخفضة المخزون */}
      {canInventory && (stats?.lowStock || 0) > 0 && (
        <div style={{ marginBottom: '2rem', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRight: `4px solid ${C.red}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <IoWarning style={{ color: C.red, fontSize: 22, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, color: C.red, margin: '0 0 4px', fontSize: '0.95rem' }}>
                تنبيه: منتجات منخفضة المخزون
              </p>
              <p style={{ fontSize: '0.875rem', color: C.muted, margin: '0 0 6px' }}>
                يوجد {stats?.lowStock} منتج (منتجات) تحتاج إلى إعادة تخزين. يرجى مراجعة المخزون قريباً.
              </p>
              <Link to="/store/inventory" style={{ fontSize: '0.875rem', color: C.red, fontWeight: 600, textDecoration: 'underline' }}>
                مراجعة المخزون الآن →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* آخر الطلبات */}
      {permissions.canViewOrders && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, margin: 0 }}>🛒 آخر الطلبات</h2>
            <Link to="/store/orders" style={{ color: C.accent, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              عرض الكل
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>رقم الطلب</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>العميل</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>الحالة</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>المجموع</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  stats.recentOrders.map((order: any) => (
                    <tr
                      key={order.id}
                      style={{ borderTop: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surfL)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.5rem', color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>
                        #{order.orderNumber || order.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: C.muted, fontSize: '0.875rem' }}>
                        {order.customerName || 'عميل'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={getStatusBadgeStyle(order.status)}>
                          {order.status === 'pending' && 'قيد الانتظار'}
                          {order.status === 'processing' && 'قيد التجهيز'}
                          {order.status === 'shipped' && 'تم الشحن'}
                          {order.status === 'delivered' && 'تم التوصيل'}
                          {order.status === 'cancelled' && 'ملغي'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: C.accent, fontWeight: 700, fontSize: '0.875rem' }}>
                        {order.total || order.totalAmount || 0} ر.س
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: C.muted, fontSize: '0.875rem' }}>
                        {order.createdAt ? format(new Date(order.createdAt), 'hh:mm a', { locale: ar }) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: C.muted, fontSize: '0.875rem' }}>
                      لا توجد طلبات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نصائح سريعة للمتجر */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: 'rgba(200,226,53,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <IoCheckmarkCircle style={{ color: C.accent, fontSize: 20 }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: C.text, margin: '0 0 6px', fontSize: '1rem' }}>
              💡 نصائح لنجاح متجرك
            </h3>
            <p style={{ fontSize: '0.875rem', color: C.muted, margin: 0, lineHeight: 1.7 }}>
              📦 حافظ على تحديث المخزون باستمرار • 🏷️ قدم عروضاً موسمية لجذب العملاء • 📊 حلل المنتجات الأكثر مبيعاً • 🚀 فعّل نظام التوصيل لزيادة المبيعات
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDashboard;
