// pages/Admin/AdminDashboard.tsx

import React, { useEffect, useState } from 'react';
import { 
  IoRestaurant, IoStorefront, IoPeople, IoReceipt, 
  IoCar, IoRocket, IoSettings, IoTrendingUp, IoTime, 
  IoCheckmarkCircle, IoWarning, IoCalendar
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

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
    { title: 'المطاعم', value: stats?.overview.restaurants || 0, icon: IoRestaurant, color: 'blue' },
    { title: 'المتاجر', value: stats?.overview.stores || 0, icon: IoStorefront, color: 'green' },
    { title: 'المستخدمين', value: stats?.overview.users || 0, icon: IoPeople, color: 'purple' },
    { title: 'السائقين', value: stats?.overview.drivers || 0, icon: IoCar, color: 'orange' },
    { title: 'الطلبات', value: stats?.orders.total || 0, icon: IoReceipt, color: 'cyan' },
    { title: 'الإيرادات', value: `${stats?.overview.revenue || 0} ل.س`, icon: IoTrendingUp, color: 'emerald' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">لوحة تحكم المنصة</h1>
      
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${card.color}-100 rounded-xl flex items-center justify-center`}>
                <card.icon className={`text-${card.color}-600 text-xl`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* حالة الطلبات */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <IoReceipt className="text-blue-600" />
            حالة الطلبات
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-xl">
              <div className="text-2xl font-bold text-yellow-600">{stats?.orders.pending || 0}</div>
              <div className="text-sm text-gray-600">قيد الانتظار</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">{stats?.orders.delivering || 0}</div>
              <div className="text-sm text-gray-600">قيد التوصيل</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{stats?.orders.completed || 0}</div>
              <div className="text-sm text-gray-600">مكتملة</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-600">{stats?.orders.total || 0}</div>
              <div className="text-sm text-gray-600">الإجمالي</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <IoRestaurant className="text-blue-600" />
              <span>طلبات المطاعم: {stats?.orders.restaurantOrders || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <IoStorefront className="text-green-600" />
              <span>طلبات المتاجر: {stats?.orders.storeOrders || 0}</span>
            </div>
          </div>
        </div>

        {/* الطلبات الأسبوعية */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <IoCalendar className="text-blue-600" />
            الطلبات آخر 7 أيام
          </h2>
          <div className="space-y-3">
            {stats?.weeklyOrders?.map((day, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600">{day.date}</div>
                <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full flex items-center justify-end px-3 text-white text-xs"
                    style={{ width: `${Math.min(100, (day.count / Math.max(...stats.weeklyOrders.map(d => d.count), 1)) * 100)}%` }}
                  >
                    {day.count > 0 && day.count}
                  </div>
                </div>
                <div className="w-12 text-sm font-bold text-gray-700">{day.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* آخر تحديث */}
      <div className="mt-6 text-center text-sm text-gray-500">
        آخر تحديث: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString('ar-SA') : 'جاري التحميل...'}
      </div>
    </div>
  );
};

export default AdminDashboard;