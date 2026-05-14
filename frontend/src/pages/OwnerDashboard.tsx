import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRestaurant } from '../hooks/useRestaurant';
import api from '../services/api';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersStats, menuItems, tables, recentOrders, salesHistory] = await Promise.all([
        api.get('/orders/stats?period=today'),
        api.get('/menu/items'),
        api.get('/tables'),
        api.get('/orders?limit=5'),
        api.get('/orders/stats?period=week'),
      ]);

      // تجهيز بيانات المبيعات للرسم البياني
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: format(date, 'dd/MM'),
          sales: 0
        };
      }).reverse();

      if (salesHistory.dailyStats) {
        salesHistory.dailyStats.forEach((day: any) => {
          const dayIndex = last7Days.findIndex(d => 
            d.date === format(new Date(day.date), 'dd/MM')
          );
          if (dayIndex !== -1) {
            last7Days[dayIndex].sales = day.sales;
          }
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
    { label: 'إضافة عنصر للقائمة', icon: IoAdd, path: '/menu', color: 'blue' },
    { label: 'عرض الطلبات', icon: IoReceipt, path: '/orders', color: 'green' },
    { label: 'إنشاء QR للطاولات', icon: IoQrCode, path: '/tables', color: 'purple' },
    { label: 'إضافة موظف', icon: IoPeople, path: '/staff', color: 'orange' },
    { label: 'عرض الإحصائيات', icon: IoStatsChart, path: '/analytics', color: 'red' },
    { label: 'تعديل الإعدادات', icon: IoSettings, path: '/settings', color: 'gray' },
  ];

  const statCards = [
    { title: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceipt, color: 'blue', path: '/orders' },
    { title: 'مبيعات اليوم', value: `${stats?.todaySales?.toFixed(2) || 0} ر.س`, icon: IoPricetag, color: 'green', path: '/analytics' },
    { title: 'عناصر القائمة', value: stats?.totalMenuItems || 0, icon: IoFastFood, color: 'purple', path: '/menu' },
    { title: 'الطاولات', value: stats?.totalTables || 0, icon: IoRestaurant, color: 'orange', path: '/tables' },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      {/* الترحيب */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">مرحباً {user?.name} 👋</h1>
        <p className="text-gray-600 mt-2">
          {restaurant?.name} • {new Date().toLocaleDateString('ar-SA', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.path}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{card.title}</p>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
              </div>
              <div className={`p-3 bg-${card.color}-100 rounded-full`}>
                <card.icon className={`text-${card.color}-500`} size={24} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* إجراءات سريعة (للموبايل) */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-full bg-blue-500 text-white py-3 rounded-lg flex items-center justify-center"
        >
          <IoAdd className="ml-2" />
          إجراءات سريعة
        </button>
        {showQuickActions && (
          <div className="mt-2 bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className="p-3 text-center hover:bg-gray-50 rounded-lg"
                >
                  <action.icon className={`mx-auto text-${action.color}-500 mb-1`} size={20} />
                  <span className="text-xs">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* الرسم البياني للمبيعات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">المبيعات خلال آخر 7 أيام</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="المبيعات"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* تنبيهات سريعة */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">تنبيهات</h2>
          <div className="space-y-3">
            {stats?.pendingOrders > 0 && (
              <div className="flex items-start p-3 bg-yellow-50 rounded-lg">
                <IoWarning className="text-yellow-500 ml-2 mt-1" size={18} />
                <div>
                  <p className="font-medium">طلبات معلقة</p>
                  <p className="text-sm text-gray-600">لديك {stats.pendingOrders} طلب في انتظار المراجعة</p>
                </div>
              </div>
            )}
            {stats?.totalMenuItems === 0 && (
              <div className="flex items-start p-3 bg-red-50 rounded-lg">
                <IoWarning className="text-red-500 ml-2 mt-1" size={18} />
                <div>
                  <p className="font-medium">القائمة فارغة</p>
                  <p className="text-sm text-gray-600">أضف عناصر للقائمة ليتمكن الزبائن من الطلب</p>
                </div>
              </div>
            )}
            {(!restaurant?.logo || !restaurant?.coverImage) && (
              <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                <IoWarning className="text-blue-500 ml-2 mt-1" size={18} />
                <div>
                  <p className="font-medium">إكمال الملف الشخصي</p>
                  <p className="text-sm text-gray-600">أضف شعار وصورة غلاف للمطعم</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* آخر الطلبات */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">آخر الطلبات</h2>
          <Link to="/orders" className="text-blue-500 hover:text-blue-700 text-sm">
            عرض الكل
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">رقم الطلب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الطاولة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">المجموع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats?.recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{order.orderNumber}</td>
                  <td className="px-6 py-4">{order.table?.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'ready' ? 'bg-green-100 text-green-800' :
                      order.status === 'served' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 'pending' && 'قيد الانتظار'}
                      {order.status === 'preparing' && 'قيد التحضير'}
                      {order.status === 'ready' && 'جاهز'}
                      {order.status === 'served' && 'مكتمل'}
                      {order.status === 'cancelled' && 'ملغي'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{order.total} ر.س</td>
                  <td className="px-6 py-4 text-gray-500">
                    {format(new Date(order.createdAt), 'hh:mm a')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;