// pages/Owner/StoreDashboard.tsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  IoNavigate,
  IoWarning,
  IoAdd,
  IoSettings,
  IoTrendingUp,
  IoCheckmarkCircle
} from 'react-icons/io5';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

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
  // إذا كان response يحتوي على data
  if (response.data) return response.data;
  // إذا كان response هو البيانات مباشرة
  return response;
};

const StoreDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    try {
      const res = await api.get('/store/profile');
      console.log('Store profile response:', res);
      
      // استخراج البيانات بطريقة آمنة
      const data = extractData(res);
      setStoreData(data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // جلب البيانات بشكل متوازي مع معالجة الأخطاء لكل طلب على حدة
      const [
        ordersStatsRes,
        productsRes,
        inventoryStatsRes,
        recentOrdersRes,
        salesHistoryRes,
        driversRes
      ] = await Promise.allSettled([
        api.get('/store/orders/stats?period=today'),
        api.get('/store/products'),
        api.get('/store/inventory/stats'),
        api.get('/store/orders?limit=5'),
        api.get('/store/orders/stats?period=week'),
        api.get('/store/drivers'),
      ]);

      // استخراج البيانات من الاستجابات الناجحة فقط
      const ordersStats = ordersStatsRes.status === 'fulfilled' ? extractData(ordersStatsRes.value) : null;
      const products = productsRes.status === 'fulfilled' ? extractData(productsRes.value) : null;
      const inventoryStats = inventoryStatsRes.status === 'fulfilled' ? extractData(inventoryStatsRes.value) : null;
      const recentOrders = recentOrdersRes.status === 'fulfilled' ? extractData(recentOrdersRes.value) : null;
      const salesHistory = salesHistoryRes.status === 'fulfilled' ? extractData(salesHistoryRes.value) : null;
      const drivers = driversRes.status === 'fulfilled' ? extractData(driversRes.value) : null;

      // تجهيز بيانات المبيعات للرسم البياني
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

  const quickActions = [
    { label: 'إضافة منتج', icon: IoAdd, path: '/store/products', color: 'blue' },
    { label: 'عرض الطلبات', icon: IoReceipt, path: '/store/orders', color: 'green' },
    { label: 'مراجعة المخزون', icon: IoStatsChart, path: '/store/inventory', color: 'orange' },
    { label: 'إنشاء كوبون', icon: IoPricetag, path: '/store/coupons', color: 'purple' },
    { label: 'إضافة سائق', icon: IoCar, path: '/store/drivers', color: 'pink' },
    { label: 'الإعدادات', icon: IoSettings, path: '/store/settings', color: 'gray' },
  ];

  const statCards = [
    { title: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceipt, color: 'blue', path: '/store/orders' },
    { title: 'مبيعات اليوم', value: `${stats?.todaySales?.toFixed(2) || 0} ر.س`, icon: IoPricetag, color: 'green', path: '/store/analytics' },
    { title: 'المنتجات', value: stats?.totalProducts || 0, icon: IoCube, color: 'purple', path: '/store/products' },
    { title: 'منتجات منخفضة', value: stats?.lowStock || 0, icon: IoWarning, color: 'red', path: '/store/inventory' },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6" dir="rtl">
      {/* الترحيب */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IoStorefront className="text-green-500 text-4xl" />
          <h1 className="text-3xl font-bold">مرحباً {user?.name || 'عزيزي المالك'} 👋</h1>
        </div>
        <p className="text-gray-600 mt-2">
          {storeData?.name || 'متجرك'} • {new Date().toLocaleDateString('ar-SA', { 
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
          className="w-full bg-green-500 text-white py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <IoAdd className="text-xl" />
          إجراءات سريعة
        </button>
        {showQuickActions && (
          <div className="mt-2 bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className="p-3 text-center hover:bg-gray-50 rounded-lg transition"
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
              <LineChart data={stats?.salesData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} ر.س`, 'المبيعات']} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="المبيعات"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* معلومات سريعة */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">📊 نظرة سريعة</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">طلبات معلقة</span>
              <span className="font-bold text-lg">{stats?.pendingOrders || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">السائقين</span>
              <span className="font-bold text-lg">{stats?.totalDrivers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">منتجات منخفضة المخزون</span>
              <span className={`font-bold text-lg ${(stats?.lowStock || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {stats?.lowStock || 0}
              </span>
            </div>
            <div className="pt-4 border-t">
              <Link to="/store/inventory" className="text-green-500 hover:text-green-700 text-sm flex items-center gap-1">
                مراجعة المخزون <IoStatsChart size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* تنبيهات المخزون */}
      {(stats?.lowStock || 0) > 0 && (
        <div className="mb-8 bg-red-50 border-r-4 border-red-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <IoWarning className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">تنبيه: منتجات منخفضة المخزون</p>
              <p className="text-sm text-red-600">
                يوجد {stats?.lowStock} منتج (منتجات) تحتاج إلى إعادة تخزين. يرجى مراجعة المخزون قريباً.
              </p>
              <Link to="/store/inventory" className="text-sm text-red-700 underline mt-1 inline-block">
                مراجعة المخزون الآن →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* آخر الطلبات */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">🛒 آخر الطلبات</h2>
          <Link to="/store/orders" className="text-green-500 hover:text-green-700 text-sm">
            عرض الكل
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">رقم الطلب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">العميل</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">المجموع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">#{order.orderNumber || order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">{order.customerName || 'عميل'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'pending' && 'قيد الانتظار'}
                        {order.status === 'processing' && 'قيد التجهيز'}
                        {order.status === 'shipped' && 'تم الشحن'}
                        {order.status === 'delivered' && 'تم التوصيل'}
                        {order.status === 'cancelled' && 'ملغي'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{order.total || order.totalAmount || 0} ر.س</td>
                    <td className="px-6 py-4 text-gray-500">
                      {order.createdAt ? format(new Date(order.createdAt), 'hh:mm a', { locale: ar }) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    لا توجد طلبات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نصائح سريعة للمتجر */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <IoCheckmarkCircle className="text-green-500 text-2xl flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold mb-1">💡 نصائح لنجاح متجرك</h3>
            <p className="text-sm text-gray-600">
              📦 حافظ على تحديث المخزون باستمرار • 🏷️ قدم عروضاً موسمية لجذب العملاء • 📊 حلل المنتجات الأكثر مبيعاً • 🚀 فعّل نظام التوصيل لزيادة المبيعات
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDashboard;