// pages/Admin/AdminDashboard.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoRestaurant, IoStorefront, IoPeople, IoReceipt,
  IoCar, IoRocket, IoSettings, IoTrendingUp, IoTime,
  IoCheckmarkCircle, IoWarning, IoCalendar
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

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

interface Stats {
  overview: {
    restaurants: number;
    stores: number;
    users: number;
    drivers: number;
    orders: number;
    revenue: number;
  };
  orders: {
    total: number;
    pending: number;
    delivering: number;
    completed: number;
    restaurantOrders: number;
    storeOrders: number;
  };
  weeklyOrders: Array<{ date: string; count: number }>;
  lastUpdated: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  const statCards = [
    { title: 'المطاعم',    value: stats?.overview.restaurants || 0,                  icon: IoRestaurant,  iconColor: C.blue   },
    { title: 'المتاجر',    value: stats?.overview.stores || 0,                        icon: IoStorefront,  iconColor: C.accent },
    { title: 'المستخدمين', value: stats?.overview.users || 0,                         icon: IoPeople,      iconColor: C.purple },
    { title: 'السائقين',   value: stats?.overview.drivers || 0,                       icon: IoCar,         iconColor: C.yellow },
    { title: 'الطلبات',    value: stats?.orders.total || 0,                           icon: IoReceipt,     iconColor: C.red    },
    { title: 'الإيرادات',  value: `${stats?.overview.revenue || 0} ل.س`,             icon: IoTrendingUp,  iconColor: C.accent },
  ];

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, color: C.text }}>
        لوحة تحكم المنصة
      </h1>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/admin/contact-messages')}
          style={{
            background: C.surf,
            color: C.accent,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '10px 16px',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            fontWeight: 700,
          }}
        >
          رسائل التواصل
        </button>
        <button
          onClick={() => navigate('/admin/branches')}
          style={{
            background: C.surf,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '10px 16px',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            fontWeight: 700,
            marginLeft: 8,
          }}
        >
          إدارة الفروع
        </button>
      </div>

      {/* بطاقات الإحصائيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map((card, index) => (
          <div
            key={index}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: '20px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              transition: 'box-shadow 0.2s',
            }}
          >
            <div>
              <p style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>{card.title}</p>
              <p style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>{card.value}</p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${card.iconColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <card.icon style={{ color: card.iconColor, fontSize: 20 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* حالة الطلبات */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoReceipt style={{ color: C.accent }} />
            حالة الطلبات
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: '16px 8px', background: `${C.yellow}14`, border: `1px solid ${C.yellow}30`, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.yellow }}>{stats?.orders.pending || 0}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>قيد الانتظار</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 8px', background: `${C.blue}14`, border: `1px solid ${C.blue}30`, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.blue }}>{stats?.orders.delivering || 0}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>قيد التوصيل</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 8px', background: `${C.accent}14`, border: `1px solid ${C.accent}30`, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.accent }}>{stats?.orders.completed || 0}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>مكتملة</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 8px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text }}>{stats?.orders.total || 0}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>الإجمالي</div>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <IoRestaurant style={{ color: C.blue }} />
              <span>طلبات المطاعم: <strong style={{ color: C.text }}>{stats?.orders.restaurantOrders || 0}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted }}>
              <IoStorefront style={{ color: C.accent }} />
              <span>طلبات المتاجر: <strong style={{ color: C.text }}>{stats?.orders.storeOrders || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* الطلبات الأسبوعية */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoCalendar style={{ color: C.accent }} />
            الطلبات آخر 7 أيام
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats?.weeklyOrders?.map((day, index) => {
              const maxCount = Math.max(...(stats.weeklyOrders.map(d => d.count)), 1);
              const pct = Math.min(100, (day.count / maxCount) * 100);
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 88, fontSize: 12, color: C.muted, flexShrink: 0 }}>{day.date}</div>
                  <div style={{ flex: 1, height: 28, background: C.surf, borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${C.prim}, ${C.accent})`,
                        borderRadius: 99,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: 10,
                        transition: 'width 0.4s ease',
                      }}
                    >
                      {day.count > 0 && <span style={{ color: C.bg, fontSize: 11, fontWeight: 700 }}>{day.count}</span>}
                    </div>
                  </div>
                  <div style={{ width: 30, fontSize: 13, fontWeight: 700, color: C.text, textAlign: 'right' }}>{day.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* آخر تحديث */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: C.muted }}>
        آخر تحديث: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('ar-SA') : 'جاري التحميل...'}
      </div>
    </div>
  );
};

export default AdminDashboard;
