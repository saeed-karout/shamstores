// pages/Store/StoreAnalyticsPage.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
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
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { IoStatsChart, IoTrendingUp, IoCart, IoCash, IoCube, IoWarning } from 'react-icons/io5';
import toast from 'react-hot-toast';

interface DailyStat {
  date: string;
  orders: number;
  sales: number;
}

interface TopProduct {
  id: string;
  name: string;
  nameEn: string;
  count: number;
  total: number;
}

interface StatsData {
  totalOrders: number;
  totalSales: number;
  averageOrder: number;
  totalProducts: number;
  lowStock: number;
  dailyStats: DailyStat[];
  topProducts: TopProduct[];
}

const StoreAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [stats, setStats] = useState<StatsData>({
    totalOrders: 0,
    totalSales: 0,
    averageOrder: 0,
    totalProducts: 0,
    lowStock: 0,
    dailyStats: [],
    topProducts: []
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrderStats(),
      fetchInventoryStats(),
      fetchTopProducts()
    ]);
    setLoading(false);
  };

  const fetchOrderStats = async () => {
    try {
      const response = await api.get(`/store/orders/stats?period=${period}`);
      const data = response || {};
      
      setStats(prev => ({
        ...prev,
        totalOrders: data.totalOrders || 0,
        totalSales: data.totalSales || 0,
        averageOrder: data.averageOrder || 0,
        dailyStats: data.dailyStats || []
      }));
    } catch (error) {
      console.error('Error fetching order stats:', error);
      toast.error('حدث خطأ في جلب إحصائيات الطلبات');
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const response = await api.get('/store/inventory/stats');
      const data = response || {};
      
      setStats(prev => ({
        ...prev,
        totalProducts: data.totalProducts || 0,
        lowStock: data.lowStock || 0
      }));
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const response = await api.get(`/store/orders/top-products?limit=5&period=${period}`);
      const data = response || [];
      
      setStats(prev => ({
        ...prev,
        topProducts: Array.isArray(data) ? data : []
      }));
    } catch (error) {
      console.error('Error fetching top products:', error);
      setStats(prev => ({ ...prev, topProducts: [] }));
    }
  };

  const getPeriodTitle = () => {
    switch (period) {
      case 'today': return 'اليوم';
      case 'week': return 'آخر 7 أيام';
      case 'month': return 'آخر 30 يوماً';
      default: return '';
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <IoStatsChart className="text-green-500 text-3xl" />
          <div>
            <h1 className="text-2xl font-bold">إحصائيات المتجر</h1>
            <p className="text-sm text-gray-500">تحليل شامل لأداء متجرك ومبيعاتك</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('today')}
            className={`px-4 py-2 rounded-lg transition ${
              period === 'today'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg transition ${
              period === 'week'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            أسبوع
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg transition ${
              period === 'month'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            شهر
          </button>
        </div>
      </div>

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalOrders}</p>
            </div>
            <IoCart className="text-blue-500 text-3xl opacity-50" />
          </div>
          <p className="text-xs text-gray-400 mt-2">خلال {getPeriodTitle()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي المبيعات</p>
              <p className="text-2xl font-bold text-green-600">
                {(stats.totalSales || 0).toFixed(2)} ر.س
              </p>
            </div>
            <IoCash className="text-green-500 text-3xl opacity-50" />
          </div>
          <p className="text-xs text-gray-400 mt-2">خلال {getPeriodTitle()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold text-purple-600">
                {(stats.averageOrder || 0).toFixed(2)} ر.س
              </p>
            </div>
            <IoTrendingUp className="text-purple-500 text-3xl opacity-50" />
          </div>
          <p className="text-xs text-gray-400 mt-2">لكل طلب</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي المنتجات</p>
              <p className="text-2xl font-bold text-teal-600">{stats.totalProducts}</p>
            </div>
            <IoCube className="text-teal-500 text-3xl opacity-50" />
          </div>
          <p className="text-xs text-gray-400 mt-2">في المتجر</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">منتجات منخفضة</p>
              <p className={`text-2xl font-bold ${(stats.lowStock || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.lowStock || 0}
              </p>
            </div>
            <IoWarning className={`text-3xl opacity-50 ${(stats.lowStock || 0) > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <p className="text-xs text-gray-400 mt-2">تحتاج إعادة تخزين</p>
        </div>
      </div>

      {/* الرسم البياني للطلبات والمبيعات */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">📊 الطلبات والمبيعات اليومية</h2>
        {stats.dailyStats && stats.dailyStats.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => date ? format(new Date(date), 'dd/MM') : ''}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(date) => date ? format(new Date(date), 'dd/MM/yyyy') : ''}
                  formatter={(value: any) => [value, '']}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  name="عدد الطلبات"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sales"
                  stroke="#10B981"
                  name="المبيعات (ر.س)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-400">
            لا توجد بيانات كافية لعرض الرسم البياني
          </div>
        )}
      </div>

      {/* الرسم البياني للمنتجات الأكثر مبيعاً */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">🏆 المنتجات الأكثر مبيعاً</h2>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" name="عدد المبيعات" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              لا توجد منتجات مباعة بعد
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">🥧 توزيع المبيعات</h2>
          {stats.topProducts && stats.topProducts.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topProducts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name && entry.name.length > 15 ? entry.name.substring(0, 12) + '...' : (entry.name || 'غير معروف')}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              لا توجد بيانات كافية لعرض الرسم البياني
            </div>
          )}
        </div>
      </div>

      {/* جدول المنتجات الأكثر مبيعاً */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">📋 تفاصيل المنتجات الأكثر مبيعاً</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المنتج</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">عدد المبيعات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">إجمالي الإيرادات</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نسبة المشاركة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.topProducts && stats.topProducts.length > 0 ? (
                stats.topProducts.map((item, index) => {
                  const totalCount = stats.topProducts.reduce((sum, p) => sum + (p.count || 0), 0);
                  const percentage = totalCount > 0 ? ((item.count || 0) / totalCount * 100).toFixed(1) : 0;
                  return (
                    <tr key={item.id || index} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          >
                            {index + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{item.name || 'غير معروف'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {item.count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-green-600">
                        {(item.total || 0).toFixed(2)} ر.س
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 rounded-full h-2"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    🛒 لا توجد مبيعات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نصائح سريعة */}
      {(stats.lowStock || 0) > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <IoWarning className="text-yellow-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">تنبيه: منتجات منخفضة المخزون</p>
              <p className="text-sm text-yellow-700">
                يوجد {stats.lowStock} منتج (منتجات) تحتاج إلى إعادة تخزين. يرجى مراجعة المخزون قريباً.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreAnalyticsPage;