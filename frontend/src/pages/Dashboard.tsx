import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRestaurant } from '../hooks/useRestaurant';
import api from '../services/api';
import StatsCards from '../components/dashboard/StatsCards';
import RecentOrders from '../components/dashboard/RecentOrders';
import Loader from '../components/common/Loader';
import { IoRestaurant, IoFastFood, IoReceipt, IoPeople } from 'react-icons/io5';

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">مرحباً {user?.name}!</h1>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCards
          title="المطعم"
          value={restaurant?.name || 'غير محدد'}
          icon={IoRestaurant}
          color="blue"
        />
        <StatsCards
          title="عناصر القائمة"
          value={stats?.totalMenuItems || 0}
          icon={IoFastFood}
          color="green"
        />
        <StatsCards
          title="الطلبات اليوم"
          value={stats?.totalOrders || 0}
          icon={IoReceipt}
          color="purple"
        />
        <StatsCards
          title="الطاولات"
          value={stats?.totalTables || 0}
          icon={IoPeople}
          color="orange"
        />
      </div>

      {/* إحصائيات المبيعات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm mb-2">إجمالي المبيعات اليوم</h3>
          <p className="text-2xl font-bold text-green-600">
            {stats?.totalSales?.toFixed(2)} ر.س
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm mb-2">متوسط قيمة الطلب</h3>
          <p className="text-2xl font-bold text-blue-600">
            {stats?.averageOrder?.toFixed(2)} ر.س
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm mb-2">حالات الطلبات</h3>
          <div className="flex justify-between text-sm">
            <span>قيد الانتظار: {stats?.pendingOrders}</span>
            <span>قيد التحضير: {stats?.preparingOrders}</span>
            <span>جاهز: {stats?.readyOrders}</span>
          </div>
        </div>
      </div>

      {/* آخر الطلبات */}
      <RecentOrders />
    </div>
  );
};

export default Dashboard;