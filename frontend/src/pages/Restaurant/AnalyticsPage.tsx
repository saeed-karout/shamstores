import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import Loader from '@/components/common/Loader';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

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

interface StatsData {
  totalOrders: number;
  totalSales: number;
  averageOrder: number;
  dailyStats: Array<{ date: string; orders: number; sales: number }>;
  topItems: Array<{ name: string; count: number; total: number }>;
}

const CHART_COLORS = [C.accent, C.blue, C.yellow, C.red, C.purple];

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await api.get<StatsData>(`/orders/stats?period=${period}`);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodTitle = () => {
    switch (period) {
      case 'today': return 'اليوم';
      case 'week':  return 'آخر 7 أيام';
      case 'month': return 'آخر 30 يوماً';
      default:      return '';
    }
  };

  const periodBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 20px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    background: active ? C.accent : C.surf,
    color: active ? C.bg : C.text,
    border: `1px solid ${active ? C.accent : C.border}`,
    cursor: 'pointer',
  });

  const customTooltipStyle = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 13,
  };

  if (loading || !stats) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>الإحصائيات والتقارير</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPeriod('today')} style={periodBtnStyle(period === 'today')}>اليوم</button>
          <button onClick={() => setPeriod('week')}  style={periodBtnStyle(period === 'week')}>أسبوع</button>
          <button onClick={() => setPeriod('month')} style={periodBtnStyle(period === 'month')}>شهر</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 13, color: C.muted, margin: '0 0 8px', fontWeight: 500 }}>إجمالي الطلبات</h3>
          <p style={{ fontSize: 36, fontWeight: 700, color: C.blue, margin: '0 0 8px' }}>{stats.totalOrders}</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>خلال {getPeriodTitle()}</p>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 13, color: C.muted, margin: '0 0 8px', fontWeight: 500 }}>إجمالي المبيعات</h3>
          <p style={{ fontSize: 36, fontWeight: 700, color: C.accent, margin: '0 0 8px' }}>{stats.totalSales.toFixed(2)} ر.س</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>خلال {getPeriodTitle()}</p>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 13, color: C.muted, margin: '0 0 8px', fontWeight: 500 }}>متوسط قيمة الطلب</h3>
          <p style={{ fontSize: 36, fontWeight: 700, color: C.purple, margin: '0 0 8px' }}>{stats.averageOrder.toFixed(2)} ر.س</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>خلال {getPeriodTitle()}</p>
        </div>
      </div>

      {/* Daily Orders Chart */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 20px' }}>الطلبات اليومية</h2>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                stroke={C.muted}
                tick={{ fill: C.muted, fontSize: 12 }}
              />
              <YAxis yAxisId="left" stroke={C.muted} tick={{ fill: C.muted, fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke={C.muted} tick={{ fill: C.muted, fontSize: 12 }} />
              <Tooltip
                labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')}
                formatter={(value: any) => [value, '']}
                contentStyle={customTooltipStyle}
                labelStyle={{ color: C.muted }}
              />
              <Legend wrapperStyle={{ color: C.muted, fontSize: 13 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                stroke={C.blue}
                name="عدد الطلبات"
                strokeWidth={2}
                dot={{ fill: C.blue, r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sales"
                stroke={C.accent}
                name="المبيعات (ر.س)"
                strokeWidth={2}
                dot={{ fill: C.accent, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Items Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 20px' }}>المنتجات الأكثر مبيعاً</h2>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topItems}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" stroke={C.muted} tick={{ fill: C.muted, fontSize: 12 }} />
                <YAxis stroke={C.muted} tick={{ fill: C.muted, fontSize: 12 }} />
                <Tooltip contentStyle={customTooltipStyle} labelStyle={{ color: C.muted }} />
                <Bar dataKey="count" fill={C.accent} name="عدد الطلبات" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 20px' }}>توزيع المبيعات</h2>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topItems}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={100}
                  fill={C.accent}
                  dataKey="count"
                >
                  {stats.topItems.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Items Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: 0 }}>تفاصيل المنتجات الأكثر مبيعاً</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.surf }}>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
                المنتج
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
                عدد الطلبات
              </th>
              <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
                إجمالي المبيعات
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.topItems.map((item, index) => (
              <tr
                key={index}
                style={{ borderTop: `1px solid ${C.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(200,226,53,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
              >
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: CHART_COLORS[index % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: C.text }}>{item.name}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap', color: C.text }}>{item.count}</td>
                <td style={{ padding: '14px 24px', whiteSpace: 'nowrap', color: C.accent, fontWeight: 600 }}>
                  {item.total.toFixed(2)} ر.س
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsPage;
