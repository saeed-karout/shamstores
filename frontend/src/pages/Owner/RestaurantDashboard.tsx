// pages/Owner/RestaurantDashboard.tsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import {
  IoFastFood,
  IoReceipt,
  IoRestaurant,
  IoPeople,
  IoQrCode,
  IoStatsChart,
  IoPricetag,
  IoSettings,
  IoAdd,
  IoWarning
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
  totalMenuItems: number;
  totalTables: number;
  pendingOrders: number;
  recentOrders: any[];
  salesData: Array<{ date: string; sales: number }>;
}

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
    case 'preparing':  return { ...base, background: 'rgba(96,165,250,0.15)', color: C.blue };
    case 'ready':      return { ...base, background: 'rgba(200,226,53,0.15)', color: C.accent };
    case 'served':     return { ...base, background: 'rgba(157,196,172,0.15)', color: C.muted };
    case 'cancelled':  return { ...base, background: 'rgba(255,107,107,0.15)', color: C.red };
    default:           return { ...base, background: 'rgba(157,196,172,0.15)', color: C.muted };
  }
};

const RestaurantDashboard: React.FC = () => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const permissions = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    if (permissions.loading) return;
    fetchDashboardData();
  }, [permissions.loading, permissions.canViewOrders, permissions.canViewTables]);

  const fetchDashboardData = async () => {
    try {
      const requests: Record<string, Promise<any>> = {
        menuItems: api.get('/menu/items'),
      };
      if (permissions.canViewOrders) {
        requests.ordersStats = api.get('/orders/stats?period=today');
        requests.recentOrders = api.get('/orders?limit=5');
        requests.salesHistory = api.get('/orders/stats?period=week');
      }
      if (permissions.canViewTables) {
        requests.tables = api.get('/tables');
      }

      const entries = Object.entries(requests);
      const results = await Promise.allSettled(entries.map(([, promise]) => promise));
      const dataMap: Record<string, any> = {};
      entries.forEach(([key], index) => {
        const result = results[index];
        dataMap[key] = result.status === 'fulfilled' ? result.value?.data || result.value : null;
      });

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: format(date, 'dd/MM'),
          sales: 0
        };
      }).reverse();

      if (dataMap.salesHistory?.dailyStats) {
        dataMap.salesHistory.dailyStats.forEach((day: any) => {
          const dayIndex = last7Days.findIndex(d =>
            d.date === format(new Date(day.date), 'dd/MM')
          );
          if (dayIndex !== -1) {
            last7Days[dayIndex].sales = day.sales;
          }
        });
      }

      setStats({
        todayOrders: dataMap.ordersStats?.totalOrders || 0,
        todaySales: dataMap.ordersStats?.totalSales || 0,
        totalMenuItems: dataMap.menuItems?.length || 0,
        totalTables: dataMap.tables?.length || 0,
        pendingOrders: dataMap.ordersStats?.pendingOrders || 0,
        recentOrders: dataMap.recentOrders?.slice?.(0, 5) || [],
        salesData: last7Days,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'إضافة عنصر للقائمة', icon: IoAdd, path: '/menu' },
    ...(permissions.canViewOrders ? [{ label: 'عرض الطلبات', icon: IoReceipt, path: '/orders' }] : []),
    ...(permissions.canViewTables ? [{ label: 'إنشاء QR للطاولات', icon: IoQrCode, path: '/tables' }] : []),
    ...(permissions.canViewStaff ? [{ label: 'إضافة موظف', icon: IoPeople, path: '/staff' }] : []),
    ...(permissions.canViewAnalytics ? [{ label: 'عرض الإحصائيات', icon: IoStatsChart, path: '/analytics' }] : []),
    { label: 'تعديل الإعدادات', icon: IoSettings, path: '/settings' },
  ];

  const statCards = [
    ...(permissions.canViewOrders ? [{ title: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceipt, path: '/orders' }] : []),
    ...(permissions.canViewAnalytics ? [{ title: 'مبيعات اليوم', value: `${stats?.todaySales?.toFixed(2) || 0} ر.س`, icon: IoPricetag, path: '/analytics' }] : []),
    { title: 'عناصر القائمة', value: stats?.totalMenuItems || 0, icon: IoFastFood, path: '/menu' },
    ...(permissions.canViewTables ? [{ title: 'الطاولات', value: stats?.totalTables || 0, icon: IoRestaurant, path: '/tables' }] : []),
  ];

  if (permissions.loading || loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '1.5rem', color: C.text }} dir="rtl">

      <PlanStatusCard />

      {/* الترحيب */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: C.text, margin: 0 }}>
          مرحباً {user?.name} 👋
        </h1>
        <p style={{ color: C.muted, marginTop: '0.5rem', fontSize: '0.95rem' }}>
          {restaurant?.name} •{' '}
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
              border: `1px solid ${C.border}`,
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
                <p style={{ color: C.accent, fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem', marginBottom: 0 }}>
                  {card.value}
                </p>
              </div>
              <div style={{ width: 48, height: 48, background: 'rgba(200,226,53,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon style={{ color: C.accent, fontSize: 22 }} />
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

      {/* الرسم البياني + التنبيهات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: '2rem' }}>

        {/* الرسم البياني */}
        {permissions.canViewOrders && (
          <div className="lg:col-span-2" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '1rem' }}>
              المبيعات خلال آخر 7 أيام
            </h2>
            <div style={{ height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <Tooltip
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

        {/* التنبيهات */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, marginTop: 0, marginBottom: '1rem' }}>تنبيهات</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {permissions.canViewOrders && stats?.pendingOrders > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
                <IoWarning style={{ color: C.yellow, fontSize: 18, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: C.text, margin: '0 0 2px' }}>طلبات معلقة</p>
                  <p style={{ fontSize: '0.8rem', color: C.muted, margin: 0 }}>لديك {stats.pendingOrders} طلب في انتظار المراجعة</p>
                </div>
              </div>
            )}
            {stats?.totalMenuItems === 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12 }}>
                <IoWarning style={{ color: C.red, fontSize: 18, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: C.text, margin: '0 0 2px' }}>القائمة فارغة</p>
                  <p style={{ fontSize: '0.8rem', color: C.muted, margin: 0 }}>أضف عناصر للقائمة ليتمكن الزبائن من الطلب</p>
                </div>
              </div>
            )}
            {(!restaurant?.logo || !restaurant?.coverImage) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'rgba(200,226,53,0.08)', border: `1px solid ${C.border}`, borderRadius: 12 }}>
                <IoWarning style={{ color: C.accent, fontSize: 18, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: C.text, margin: '0 0 2px' }}>إكمال الملف الشخصي</p>
                  <p style={{ fontSize: '0.8rem', color: C.muted, margin: 0 }}>أضف شعار وصورة غلاف للمطعم</p>
                </div>
              </div>
            )}
            {(!permissions.canViewOrders || stats?.pendingOrders === 0) && stats?.totalMenuItems > 0 && restaurant?.logo && restaurant?.coverImage && (
              <p style={{ color: C.muted, fontSize: '0.875rem', textAlign: 'center', margin: '1rem 0' }}>لا توجد تنبيهات جديدة</p>
            )}
          </div>
        </div>
      </div>

      {/* آخر الطلبات */}
      {permissions.canViewOrders && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: C.text, margin: 0 }}>آخر الطلبات</h2>
            <Link to="/orders" style={{ color: C.accent, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
              عرض الكل
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>رقم الطلب</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>الطاولة</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>الحالة</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>المجموع</th>
                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    style={{ borderTop: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.surfL)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem', color: C.text, fontSize: '0.875rem' }}>{order.orderNumber}</td>
                    <td style={{ padding: '1rem 1.5rem', color: C.muted, fontSize: '0.875rem' }}>{order.table?.name || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={getStatusBadgeStyle(order.status)}>
                        {order.status === 'pending' && 'قيد الانتظار'}
                        {order.status === 'preparing' && 'قيد التحضير'}
                        {order.status === 'ready' && 'جاهز'}
                        {order.status === 'served' && 'مكتمل'}
                        {order.status === 'cancelled' && 'ملغي'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: C.accent, fontWeight: 700, fontSize: '0.875rem' }}>{order.total} ر.س</td>
                    <td style={{ padding: '1rem 1.5rem', color: C.muted, fontSize: '0.875rem' }}>
                      {format(new Date(order.createdAt), 'hh:mm a')}
                    </td>
                  </tr>
                ))}
                {(!stats?.recentOrders || stats.recentOrders.length === 0) && (
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
    </div>
  );
};

export default RestaurantDashboard;
