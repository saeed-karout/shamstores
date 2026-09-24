import React, { useEffect, useState } from 'react';
import { formatPrice } from '@/utils/currency';
import { useAuth } from '../hooks/useAuth';
import { useRestaurant } from '../hooks/useRestaurant';
import api from '../services/api';
import StatsCards from '../components/dashboard/StatsCards';
import RecentOrders from '../components/dashboard/RecentOrders';
import Loader from '../components/common/Loader';
import { IoRestaurant, IoFastFood, IoReceipt, IoPeople } from 'react-icons/io5';

const C = {
  bg: '#F4F7F4', card: '#FFFFFF', surf: '#F1F5F2', accent: '#084835',
  text: '#10231B', muted: '#5F736A', border: 'rgba(8,72,53,0.15)',
  blue: '#2563EB',
};

interface DashboardStats {
  totalOrders: number;
  totalSales: number;
  averageOrder: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  totalTables: number;
  totalMenuItems: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersStats, tables, menuItems] = await Promise.all([
        api.get<any>('/orders/stats?period=today'),
        api.get<any[]>('/tables'),
        api.get<any[]>('/menu/items'),
      ]);
      setStats({
        totalOrders: ordersStats.totalOrders || 0,
        totalSales: ordersStats.totalSales || 0,
        averageOrder: ordersStats.averageOrder || 0,
        pendingOrders: ordersStats.pendingOrders || 0,
        preparingOrders: ordersStats.preparingOrders || 0,
        readyOrders: ordersStats.readyOrders || 0,
        totalTables: tables.length,
        totalMenuItems: menuItems.length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 24 }}>مرحباً {user?.name}!</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatsCards title="المطعم" value={restaurant?.name || 'غير محدد'} icon={IoRestaurant} color="blue" />
        <StatsCards title="عناصر القائمة" value={stats?.totalMenuItems || 0} icon={IoFastFood} color="green" />
        <StatsCards title="الطلبات اليوم" value={stats?.totalOrders || 0} icon={IoReceipt} color="purple" />
        <StatsCards title="الطاولات" value={stats?.totalTables || 0} icon={IoPeople} color="orange" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>إجمالي المبيعات اليوم</h3>
          <p style={{ color: C.accent, fontSize: 26, fontWeight: 800 }}>{formatPrice(stats?.totalSales)}</p>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>متوسط قيمة الطلب</h3>
          <p style={{ color: C.blue, fontSize: 26, fontWeight: 800 }}>{formatPrice(stats?.averageOrder)}</p>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>حالات الطلبات</h3>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: C.muted, flexWrap: 'wrap', marginTop: 4 }}>
            <span>قيد الانتظار: <strong style={{ color: C.text }}>{stats?.pendingOrders}</strong></span>
            <span>قيد التحضير: <strong style={{ color: C.text }}>{stats?.preparingOrders}</strong></span>
            <span>جاهز: <strong style={{ color: C.accent }}>{stats?.readyOrders}</strong></span>
          </div>
        </div>
      </div>

      <RecentOrders />
    </div>
  );
};

export default Dashboard;
