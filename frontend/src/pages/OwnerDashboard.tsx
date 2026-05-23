import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRestaurant } from '../hooks/useRestaurant';
import api from '../services/api';
import Loader from '../components/common/Loader';
import {
  IoFastFood, IoReceipt, IoRestaurant, IoPeople, IoQrCode,
  IoStatsChart, IoPricetag, IoSettings, IoAdd, IoWarning
} from 'react-icons/io5';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
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

const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersStats, menuItems, tables, recentOrders, salesHistory] = await Promise.all([
        api.get('/orders/stats?period=today'),
        api.get('/menu/items'),
        api.get('/tables'),
        api.get('/orders?limit=5'),
        api.get('/orders/stats?period=week'),
      ]);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return { date: format(date, 'dd/MM'), sales: 0 };
      }).reverse();

      if (salesHistory.dailyStats) {
        salesHistory.dailyStats.forEach((day: any) => {
          const dayIndex = last7Days.findIndex(d => d.date === format(new Date(day.date), 'dd/MM'));
          if (dayIndex !== -1) last7Days[dayIndex].sales = day.sales;
        });
      }

      setStats({
        todayOrders: ordersStats.totalOrders || 0,
        todaySales: ordersStats.totalSales || 0,
        totalMenuItems: menuItems.length,
        totalTables: tables.length,
        pendingOrders: ordersStats.pendingOrders || 0,
        recentOrders: recentOrders.slice(0, 5),
        salesData: last7Days,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'إضافة عنصر للقائمة', icon: IoAdd, path: '/menu', color: C.blue },
    { label: 'عرض الطلبات', icon: IoReceipt, path: '/orders', color: C.accent },
    { label: 'إنشاء QR للطاولات', icon: IoQrCode, path: '/tables', color: C.purple },
    { label: 'إضافة موظف', icon: IoPeople, path: '/staff', color: C.orange },
    { label: 'عرض الإحصائيات', icon: IoStatsChart, path: '/analytics', color: C.red },
    { label: 'تعديل الإعدادات', icon: IoSettings, path: '/settings', color: C.muted },
  ];

  const statCards = [
    { title: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceipt, color: C.blue, path: '/orders' },
    { title: 'مبيعات اليوم', value: `${stats?.todaySales?.toFixed(2) || 0} ر.س`, icon: IoPricetag, color: C.accent, path: '/analytics' },
    { title: 'عناصر القائمة', value: stats?.totalMenuItems || 0, icon: IoFastFood, color: C.purple, path: '/menu' },
    { title: 'الطاولات', value: stats?.totalTables || 0, icon: IoRestaurant, color: C.orange, path: '/tables' },
  ];

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'قيد الانتظار', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
    preparing: { label: 'قيد التحضير', color: C.blue, bg: 'rgba(96,165,250,0.12)' },
    ready: { label: 'جاهز', color: C.accent, bg: 'rgba(200,226,53,0.12)' },
    served: { label: 'مكتمل', color: C.muted, bg: 'rgba(157,196,172,0.12)' },
    cancelled: { label: 'ملغي', color: C.red, bg: 'rgba(255,107,107,0.12)' },
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, marginBottom: 6 }}>مرحباً {user?.name} 👋</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>
          {restaurant?.name} • {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map((card, index) => (
          <Link key={index} to={card.path} style={{ textDecoration: 'none' }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(200,226,53,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{card.title}</p>
                  <p style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>{card.value}</p>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={22} style={{ color: card.color }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setShowQuickActions(!showQuickActions)} style={{ width: '100%', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 16px', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.accent }}>
          <IoAdd size={18} /> إجراءات سريعة
        </button>
        {showQuickActions && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {quickActions.map((action, index) => (
                <Link key={index} to={action.path} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, borderRadius: 10, background: C.surf, gap: 6 }}
                  onClick={() => setShowQuickActions(false)}>
                  <action.icon size={20} style={{ color: action.color }} />
                  <span style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>المبيعات خلال آخر 7 أيام</h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,226,53,0.1)" />
                <XAxis dataKey="date" stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif' }} />
                <Line type="monotone" dataKey="sales" stroke={C.accent} strokeWidth={2} dot={{ fill: C.accent }} name="المبيعات" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>تنبيهات</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(stats?.pendingOrders || 0) > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8 }}>
                <IoWarning size={16} style={{ color: '#FBBF24', marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>طلبات معلقة</p>
                  <p style={{ color: C.muted, fontSize: 12 }}>لديك {stats?.pendingOrders} طلب في انتظار المراجعة</p>
                </div>
              </div>
            )}
            {stats?.totalMenuItems === 0 && (
              <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8 }}>
                <IoWarning size={16} style={{ color: C.red, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>القائمة فارغة</p>
                  <p style={{ color: C.muted, fontSize: 12 }}>أضف عناصر للقائمة ليتمكن الزبائن من الطلب</p>
                </div>
              </div>
            )}
            {(!restaurant?.logo || !(restaurant as any)?.coverImage) && (
              <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8 }}>
                <IoWarning size={16} style={{ color: C.blue, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>إكمال الملف الشخصي</p>
                  <p style={{ color: C.muted, fontSize: 12 }}>أضف شعار وصورة غلاف للمطعم</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>آخر الطلبات</h2>
          <Link to="/orders" style={{ color: C.accent, fontSize: 13, textDecoration: 'none' }}>عرض الكل</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.surf }}>
                {['رقم الطلب', 'الطاولة', 'الحالة', 'المجموع', 'الوقت'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders.map((order: any) => {
                const s = statusConfig[order.status] || statusConfig.pending;
                return (
                  <tr key={order.id} style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(200,226,53,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                    <td style={{ padding: '12px 16px', color: C.text, fontSize: 13 }}>{order.orderNumber}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{order.table?.name || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 10, fontSize: 12 }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.accent, fontSize: 13, fontWeight: 700 }}>{order.total} ر.س</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{format(new Date(order.createdAt), 'hh:mm a')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
