// pages/Store/StoreAnalyticsPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { IoStatsChart, IoTrendingUp, IoCart, IoCash, IoCube, IoWarning } from 'react-icons/io5';
import toast from 'react-hot-toast';
import VisitsPanel from '../../components/store/VisitsPanel';

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

interface DailyStat { date: string; orders: number; sales: number; }
interface TopProduct { id: string; name: string; nameEn: string; count: number; total: number; }
interface StatsData {
  totalOrders: number; totalSales: number; averageOrder: number;
  totalProducts: number; lowStock: number; dailyStats: DailyStat[]; topProducts: TopProduct[];
}

const CHART_COLORS = [C.accent, C.blue, C.purple, C.yellow, C.red, C.muted, C.acDk];

const StoreAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<StatsData>({
    totalOrders: 0, totalSales: 0, averageOrder: 0,
    totalProducts: 0, lowStock: 0, dailyStats: [], topProducts: []
  });

  useEffect(() => { fetchAllData(); }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchOrderStats(), fetchInventoryStats(), fetchTopProducts()]);
    setLoading(false);
  };

  const fetchOrderStats = async () => {
    try {
      const response = await api.get(`/store/orders/stats?period=${period}`);
      const data = response || {};
      setStats(prev => ({ ...prev, totalOrders: data.totalOrders || 0, totalSales: data.totalSales || 0, averageOrder: data.averageOrder || 0, dailyStats: data.dailyStats || [] }));
    } catch (error) {
      console.error('Error fetching order stats:', error);
      toast.error('حدث خطأ في جلب إحصائيات الطلبات');
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const response = await api.get('/store/inventory/stats');
      const data = response || {};
      setStats(prev => ({ ...prev, totalProducts: data.totalProducts || 0, lowStock: data.lowStock || 0 }));
    } catch (error) { console.error('Error fetching inventory stats:', error); }
  };

  const fetchTopProducts = async () => {
    try {
      const response = await api.get(`/store/orders/top-products?limit=5&period=${period}`);
      const data = response || [];
      setStats(prev => ({ ...prev, topProducts: Array.isArray(data) ? data : [] }));
    } catch (error) {
      console.error('Error fetching top products:', error);
      setStats(prev => ({ ...prev, topProducts: [] }));
    }
  };

  const getPeriodTitle = () => ({ today: 'اليوم', week: 'آخر 7 أيام', month: 'آخر 30 يوماً' }[period] || '');

  if (loading) return <Loader fullScreen />;

  const periodBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    background: active ? C.accent : C.surf,
    color: active ? C.bg : C.muted,
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    transition: 'all 0.2s',
  });

  const tooltipStyle = { backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8 };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24 }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IoStatsChart style={{ color: C.accent, fontSize: 32 }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>إحصائيات المتجر</h1>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>تحليل شامل لأداء متجرك ومبيعاتك</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPeriod('today')} style={periodBtnStyle(period === 'today')}>اليوم</button>
          <button onClick={() => setPeriod('week')} style={periodBtnStyle(period === 'week')}>أسبوع</button>
          <button onClick={() => setPeriod('month')} style={periodBtnStyle(period === 'month')}>شهر</button>
        </div>
      </div>

      {/* ===== الزيارات =====
          قبل بطاقات المبيعات مقصوداً: الطلبُ نتيجةٌ، والزيارةُ سببها.
          والتاجر الذي لا طلبات له اليوم يحتاج أن يعرف هل جاء أحدٌ أصلاً. */}
      <div style={{ marginBottom: 32 }}>
        <VisitsPanel period={period} colors={C} />
      </div>

      {/* بطاقات الإحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'إجمالي الطلبات', value: stats.totalOrders, sub: `خلال ${getPeriodTitle()}`, color: C.blue, Icon: IoCart },
          { label: 'إجمالي المبيعات', value: `${(stats.totalSales || 0).toFixed(2)} ر.س`, sub: `خلال ${getPeriodTitle()}`, color: C.accent, Icon: IoCash },
          { label: 'متوسط قيمة الطلب', value: `${(stats.averageOrder || 0).toFixed(2)} ر.س`, sub: 'لكل طلب', color: C.purple, Icon: IoTrendingUp },
          { label: 'إجمالي المنتجات', value: stats.totalProducts, sub: 'في المتجر', color: C.muted, Icon: IoCube },
          { label: 'منتجات منخفضة', value: stats.lowStock || 0, sub: 'تحتاج إعادة تخزين', color: (stats.lowStock || 0) > 0 ? C.red : C.accent, Icon: IoWarning },
        ].map((stat, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{stat.label}</p>
                <p style={{ color: stat.color, fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>{stat.value}</p>
              </div>
              <stat.Icon style={{ color: stat.color, fontSize: 28, opacity: 0.5 }} />
            </div>
            <p style={{ color: C.muted, fontSize: 11, margin: '8px 0 0' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* الرسم البياني للطلبات والمبيعات */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>الطلبات والمبيعات اليومية</h2>
        {stats.dailyStats && stats.dailyStats.length > 0 ? (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tickFormatter={(date) => date ? format(new Date(date), 'dd/MM') : ''} tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                <YAxis yAxisId="left" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(date) => date ? format(new Date(date), 'dd/MM/yyyy') : ''} />
                <Legend wrapperStyle={{ color: C.muted }} />
                <Line yAxisId="left" type="monotone" dataKey="orders" stroke={C.blue} name="عدد الطلبات" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="sales" stroke={C.accent} name="المبيعات (ر.س)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>لا توجد بيانات كافية لعرض الرسم البياني</div>
        )}
      </div>

      {/* المنتجات الأكثر مبيعاً */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>المنتجات الأكثر مبيعاً</h2>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: C.muted, fontSize: 11 }} axisLine={{ stroke: C.border }} />
                  <YAxis tick={{ fill: C.muted, fontSize: 12 }} axisLine={{ stroke: C.border }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={C.accent} name="عدد المبيعات" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>لا توجد منتجات مباعة بعد</div>
          )}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>توزيع المبيعات</h2>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topProducts} cx="50%" cy="50%" labelLine={false}
                    label={(entry) => entry.name && entry.name.length > 15 ? entry.name.substring(0, 12) + '...' : (entry.name || 'غير معروف')}
                    outerRadius={100} dataKey="count"
                  >
                    {stats.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>لا توجد بيانات كافية</div>
          )}
        </div>
      </div>

      {/* جدول المنتجات */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.surf }}>
          <h2 style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>تفاصيل المنتجات الأكثر مبيعاً</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.surf }}>
                {['#', 'المنتج', 'عدد المبيعات', 'إجمالي الإيرادات', 'نسبة المشاركة'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.map((item, index) => {
                  const totalCount = stats.topProducts.reduce((sum, p) => sum + (p.count || 0), 0);
                  const percentage = totalCount > 0 ? ((item.count || 0) / totalCount * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.id || index} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: CHART_COLORS[index % CHART_COLORS.length], color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{index + 1}</div>
                      </td>
                      <td style={{ padding: '14px 20px', color: C.text, fontWeight: 500 }}>{item.name || 'غير معروف'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: `rgba(96,165,250,0.15)`, color: C.blue, padding: '3px 10px', borderRadius: 12, fontSize: 13 }}>{item.count || 0}</span>
                      </td>
                      <td style={{ padding: '14px 20px', color: C.accent, fontWeight: 600 }}>{(item.total || 0).toFixed(2)} ر.س</td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, background: C.surf, borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${percentage}%`, background: C.accent, borderRadius: 4, height: 6 }} />
                          </div>
                          <span style={{ color: C.muted, fontSize: 13, minWidth: 36 }}>{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: C.muted }}>لا توجد مبيعات بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* تنبيه المخزون المنخفض */}
      {(stats.lowStock || 0) > 0 && (
        <div style={{ marginTop: 24, background: `rgba(245,158,11,0.1)`, border: `1px solid rgba(245,158,11,0.3)`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <IoWarning style={{ color: C.yellow, fontSize: 20, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ color: C.yellow, fontWeight: 600, margin: 0 }}>تنبيه: منتجات منخفضة المخزون</p>
            <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>
              يوجد {stats.lowStock} منتج (منتجات) تحتاج إلى إعادة تخزين. يرجى مراجعة المخزون قريباً.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreAnalyticsPage;
