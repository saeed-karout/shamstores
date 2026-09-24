// pages/Owner/StoreDashboard.tsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import {
  IoAddCircleOutline,
  IoCarOutline,
  IoCubeOutline,
  IoLayersOutline,
  IoPricetagOutline,
  IoReceiptOutline,
  IoSettingsOutline,
  IoTimeOutline,
  IoWarningOutline
} from 'react-icons/io5';
import { format, subDays } from 'date-fns';
import DashboardHomeView, { HomeAction, HomeAttention, HomeKpi, HomeSetupStep } from '@/components/dashboard/DashboardHomeView';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import PlanStatusCard from '@/components/dashboard/PlanStatusCard';

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
  if (response.data) return response.data;
  return response;
};

const StoreDashboard: React.FC = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const { data: business } = useBusinessSummary();

  useEffect(() => {
    if (permissions.loading) return;
    fetchDashboardData();
    fetchStoreData();
  }, [permissions.loading, permissions.canViewOrders, permissions.canViewAnalytics, permissions.canViewDelivery]);

  const fetchStoreData = async () => {
    try {
      const res = await api.get('/store/profile');
      const data = extractData(res);
      setStoreData(data);
    } catch (error) {
      console.error('Error fetching store data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const paidPlan = (permissions.currentPlan?.price || 0) > 0 && permissions.currentPlan?.name !== 'free' && permissions.currentPlan?.slug !== 'free';
      const canInventory = permissions.checkPermission('inventory') || paidPlan;

      const [
        ordersStatsRes,
        productsRes,
        inventoryStatsRes,
        recentOrdersRes,
        salesHistoryRes,
        driversRes
      ] = await Promise.allSettled([
        permissions.canViewOrders ? api.get('/store/orders/stats?period=today') : Promise.resolve(null),
        api.get('/store/products'),
        canInventory ? api.get('/store/inventory/stats') : Promise.resolve(null),
        permissions.canViewOrders ? api.get('/store/orders?limit=5') : Promise.resolve(null),
        permissions.canViewOrders ? api.get('/store/orders/stats?period=week') : Promise.resolve(null),
        permissions.canViewDelivery ? api.get('/store/drivers') : Promise.resolve(null),
      ]);

      const ordersStats = ordersStatsRes.status === 'fulfilled' ? extractData(ordersStatsRes.value) : null;
      const products = productsRes.status === 'fulfilled' ? extractData(productsRes.value) : null;
      const inventoryStats = inventoryStatsRes.status === 'fulfilled' ? extractData(inventoryStatsRes.value) : null;
      const recentOrders = recentOrdersRes.status === 'fulfilled' ? extractData(recentOrdersRes.value) : null;
      const salesHistory = salesHistoryRes.status === 'fulfilled' ? extractData(salesHistoryRes.value) : null;
      const drivers = driversRes.status === 'fulfilled' ? extractData(driversRes.value) : null;

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

  const paidPlan = (permissions.currentPlan?.price || 0) > 0 && permissions.currentPlan?.name !== 'free' && permissions.currentPlan?.slug !== 'free';
  const canInventory = permissions.checkPermission('inventory') || paidPlan;

  const lowStock = stats?.lowStock || 0;
  const pending = stats?.pendingOrders || 0;
  const productCount = stats?.totalProducts || 0;

  // يحتاج تصرّفاً الآن — يظهر فقط حين يوجد فعلاً
  const attention: HomeAttention[] = [
    ...(permissions.canViewOrders && pending > 0
      ? [{ icon: IoTimeOutline, tone: 'amber' as const, to: '/store/orders', title: `${pending} ${pending === 1 ? 'طلب ينتظر' : 'طلبات تنتظر'} تأكيدك`, text: 'الزبون ينتظر — التأكيد السريع يرفع التقييم' }]
      : []),
    ...(canInventory && lowStock > 0
      ? [{ icon: IoWarningOutline, tone: 'red' as const, to: '/store/inventory', title: `${lowStock} ${lowStock === 1 ? 'منتج' : 'منتجات'} على وشك النفاد`, text: 'أعد التخزين قبل أن تتوقّف الطلبات عليها' }]
      : [])
  ];

  const kpis: HomeKpi[] = [
    ...(permissions.canViewOrders ? [{ label: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceiptOutline, to: '/store/orders', tone: 'green' as const, hint: pending ? `${pending} بانتظار التأكيد` : 'لا شيء معلّق' }] : []),
    ...(permissions.canViewOrders ? [{ label: 'بانتظار التأكيد', value: pending, icon: IoTimeOutline, to: '/store/orders', tone: (pending ? 'amber' : 'gray') as HomeKpi['tone'] }] : []),
    { label: 'المنتجات', value: productCount, icon: IoCubeOutline, to: '/store/products', tone: 'purple' as const, hint: 'في متجرك الآن' },
    ...(canInventory
      ? [{ label: 'مخزون منخفض', value: lowStock, icon: IoLayersOutline, to: '/store/inventory', tone: (lowStock ? 'red' : 'gray') as HomeKpi['tone'] }]
      : permissions.canViewDelivery
        ? [{ label: 'السائقون', value: stats?.totalDrivers || 0, icon: IoCarOutline, to: '/store/drivers', tone: 'blue' as const }]
        : [])
  ];

  const setup: HomeSetupStep[] = [
    { label: 'أضف شعار متجرك', done: !!storeData?.logo, to: '/store/settings' },
    { label: 'أضف صورة الغلاف', done: !!storeData?.coverImage, to: '/store/settings' },
    { label: 'أضف أول منتج', done: productCount > 0, to: '/store/products' },
    { label: 'اكتب وصفاً قصيراً للمتجر', done: !!storeData?.description, to: '/store/settings' }
  ];

  const actions: HomeAction[] = [
    { label: 'إضافة منتج', icon: IoAddCircleOutline, to: '/store/products' },
    ...(permissions.canViewOrders ? [{ label: 'الطلبات', icon: IoReceiptOutline, to: '/store/orders' }] : []),
    ...(canInventory ? [{ label: 'المخزون', icon: IoLayersOutline, to: '/store/inventory' }] : []),
    ...(permissions.canViewCoupons ? [{ label: 'كوبون جديد', icon: IoPricetagOutline, to: '/store/coupons' }] : []),
    { label: 'الإعدادات', icon: IoSettingsOutline, to: '/store/settings' }
  ];

  if (permissions.loading || loading) return <Loader fullScreen variant="dashboard" />;

  return (
    <DashboardHomeView
      kind="store"
      ownerName={user?.name}
      businessName={storeData?.name}
      todaySales={permissions.canViewOrders ? stats?.todaySales || 0 : null}
      todayOrders={permissions.canViewOrders ? stats?.todayOrders || 0 : null}
      kpis={kpis}
      attention={attention}
      setup={setup}
      actions={actions}
      salesData={permissions.canViewOrders ? stats?.salesData : null}
      recentOrders={
        permissions.canViewOrders
          ? (stats?.recentOrders || []).map((o: any) => ({
              id: o.id,
              number: String(o.orderNumber || o.id.slice(0, 8)),
              customer: o.customerName,
              total: Number(o.total ?? o.totalAmount ?? 0),
              status: o.status,
              createdAt: o.createdAt
            }))
          : null
      }
      ordersPath="/store/orders"
      publicUrl={business?.publicUrl}
      planCard={<PlanStatusCard />}
    />
  );
};

export default StoreDashboard;
