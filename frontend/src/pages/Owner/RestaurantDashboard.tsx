// pages/Owner/RestaurantDashboard.tsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRestaurant } from '../../hooks/useRestaurant';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import {
  IoAddCircleOutline,
  IoFastFoodOutline,
  IoGridOutline,
  IoPricetagOutline,
  IoQrCodeOutline,
  IoReceiptOutline,
  IoSettingsOutline,
  IoTimeOutline
} from 'react-icons/io5';
import { format, subDays } from 'date-fns';
import DashboardHomeView, { HomeAction, HomeAttention, HomeKpi, HomeSetupStep } from '@/components/dashboard/DashboardHomeView';
import { useBusinessSummary } from '@/hooks/useBusinessSummary';
import PlanStatusCard from '@/components/dashboard/PlanStatusCard';

interface DashboardStats {
  todayOrders: number;
  todaySales: number;
  totalMenuItems: number;
  totalTables: number;
  pendingOrders: number;
  recentOrders: any[];
  salesData: Array<{ date: string; sales: number }>;
}

const RestaurantDashboard: React.FC = () => {
  const { user } = useAuth();
  const { restaurant } = useRestaurant();
  const permissions = usePermissions();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: business } = useBusinessSummary();

  useEffect(() => {
    if (permissions.loading) return;
    fetchDashboardData();
  }, [permissions.loading, permissions.canViewOrders, permissions.canViewTables]);

  const fetchDashboardData = async () => {
    try {
      const requests: Record<string, Promise<any>> = {
        menuItems: api.get('/menu/items'),
      };
      if (permissions.canViewOrders) {
        requests.ordersStats = api.get('/orders/stats?period=today');
        requests.recentOrders = api.get('/orders?limit=5');
        requests.salesHistory = api.get('/orders/stats?period=week');
      }
      if (permissions.canViewTables) {
        requests.tables = api.get('/tables');
      }

      const entries = Object.entries(requests);
      const results = await Promise.allSettled(entries.map(([, promise]) => promise));
      const dataMap: Record<string, any> = {};
      entries.forEach(([key], index) => {
        const result = results[index];
        dataMap[key] = result.status === 'fulfilled' ? result.value?.data || result.value : null;
      });

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), i);
        return {
          date: format(date, 'dd/MM'),
          sales: 0
        };
      }).reverse();

      if (dataMap.salesHistory?.dailyStats) {
        dataMap.salesHistory.dailyStats.forEach((day: any) => {
          const dayIndex = last7Days.findIndex(d =>
            d.date === format(new Date(day.date), 'dd/MM')
          );
          if (dayIndex !== -1) {
            last7Days[dayIndex].sales = day.sales;
          }
        });
      }

      setStats({
        todayOrders: dataMap.ordersStats?.totalOrders || 0,
        todaySales: dataMap.ordersStats?.totalSales || 0,
        totalMenuItems: dataMap.menuItems?.length || 0,
        totalTables: dataMap.tables?.length || 0,
        pendingOrders: dataMap.ordersStats?.pendingOrders || 0,
        recentOrders: dataMap.recentOrders?.slice?.(0, 5) || [],
        salesData: last7Days,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pending = stats?.pendingOrders || 0;
  const itemCount = stats?.totalMenuItems || 0;

  const attention: HomeAttention[] = [
    ...(permissions.canViewOrders && pending > 0
      ? [{ icon: IoTimeOutline, tone: 'amber' as const, to: '/orders', title: `${pending} ${pending === 1 ? 'طلب ينتظر' : 'طلبات تنتظر'} تأكيدك`, text: 'المطبخ لا يبدأ قبل التأكيد — والزبون ينتظر' }]
      : [])
  ];

  const kpis: HomeKpi[] = [
    ...(permissions.canViewOrders ? [{ label: 'طلبات اليوم', value: stats?.todayOrders || 0, icon: IoReceiptOutline, to: '/orders', tone: 'green' as const, hint: pending ? `${pending} بانتظار التأكيد` : 'لا شيء معلّق' }] : []),
    ...(permissions.canViewOrders ? [{ label: 'بانتظار التأكيد', value: pending, icon: IoTimeOutline, to: '/orders', tone: (pending ? 'amber' : 'gray') as HomeKpi['tone'] }] : []),
    { label: 'أطباق القائمة', value: itemCount, icon: IoFastFoodOutline, to: '/menu', tone: 'purple' as const, hint: 'معروضة لزبائنك' },
    ...(permissions.canViewTables ? [{ label: 'الطاولات', value: stats?.totalTables || 0, icon: IoGridOutline, to: '/tables', tone: 'blue' as const, hint: 'لكلٍّ منها رمز QR' }] : [])
  ];

  const setup: HomeSetupStep[] = [
    { label: 'أضف شعار المطعم', done: !!restaurant?.logo, to: '/settings' },
    { label: 'أضف صورة الغلاف', done: !!restaurant?.coverImage, to: '/settings' },
    { label: 'أضف أوّل طبق للقائمة', done: itemCount > 0, to: '/menu' },
    ...(permissions.canViewTables ? [{ label: 'أنشئ طاولاتك واطبع رموزها', done: (stats?.totalTables || 0) > 0, to: '/tables' }] : [])
  ];

  const actions: HomeAction[] = [
    { label: 'إضافة طبق', icon: IoAddCircleOutline, to: '/menu' },
    ...(permissions.canViewOrders ? [{ label: 'الطلبات', icon: IoReceiptOutline, to: '/orders' }] : []),
    ...(permissions.canViewTables ? [{ label: 'رموز QR', icon: IoQrCodeOutline, to: '/qr-codes' }] : []),
    ...(permissions.canViewCoupons ? [{ label: 'كوبون جديد', icon: IoPricetagOutline, to: '/coupons' }] : []),
    { label: 'الإعدادات', icon: IoSettingsOutline, to: '/settings' }
  ];

  if (permissions.loading || loading) return <Loader fullScreen />;

  return (
    <DashboardHomeView
      kind="restaurant"
      ownerName={user?.name}
      businessName={restaurant?.name}
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
              customer: o.customerName || (o.table?.name ? `طاولة ${o.table.name}` : o.tableNumber ? `طاولة ${o.tableNumber}` : ''),
              total: Number(o.total ?? o.totalAmount ?? 0),
              status: o.status,
              createdAt: o.createdAt
            }))
          : null
      }
      ordersPath="/orders"
      publicUrl={business?.publicUrl}
      planCard={<PlanStatusCard />}
    />
  );
};

export default RestaurantDashboard;
