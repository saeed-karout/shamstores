// pages/Store/StoreDeliveryDashboard.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  IoLocation, IoCheckmarkCircle, IoTime, IoCar,
  IoPerson, IoCall, IoRefresh, IoClose, IoWallet,
  IoAlertCircle, IoReceipt, IoSearch,
  IoCash, IoCard, IoCalendar
} from 'react-icons/io5';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product?: { name: string; image?: string; price: number };
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  deliveryFee?: number;
  notes?: string;
  createdAt: string;
  paymentMethod: 'cash' | 'card' | 'online';
  isPaid: boolean;
  assignedDriver?: Driver;
  orderItems: OrderItem[];
}

interface Stats {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  totalSales: number;
  todaySales: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'قيد الانتظار', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  processing: { label: 'قيد المعالجة', color: 'text-blue-700', bg: 'bg-blue-100' },
  shipped: { label: 'تم الشحن', color: 'text-purple-700', bg: 'bg-purple-100' },
  delivered: { label: 'تم التوصيل', color: 'text-green-700', bg: 'bg-green-100' },
  cancelled: { label: 'ملغي', color: 'text-red-700', bg: 'bg-red-100' },
};

const nextStatus: Record<string, string> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

const StoreDeliveryDashboard: React.FC = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [assigningDriver, setAssigningDriver] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, driversRes, statsRes] = await Promise.allSettled([
        api.get('/store/orders?limit=100'),
        api.get('/store/drivers'),
        api.get('/store/orders/stats'),
      ]);

      if (ordersRes.status === 'fulfilled') {
        const raw = ordersRes.value;
        const list = raw?.data || raw?.orders || [];
        const deliveryOrders = list.filter((o: DeliveryOrder) =>
          ['pending', 'processing', 'shipped'].includes(o.status)
        );
        setOrders(deliveryOrders);
      }

      if (driversRes.status === 'fulfilled') {
        const raw = driversRes.value;
        setDrivers(raw?.data || raw?.drivers || []);
      }

      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value;
        setStats(raw?.data || null);
      }
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      await api.patch(`/store/orders/${orderId}/status`, { status: newStatus });
      toast.success('تم تحديث حالة الطلب');
      await fetchData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus as DeliveryOrder['status'] } : null);
      }
    } catch (error) {
      toast.error('فشل تحديث حالة الطلب');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    setAssigningDriver(true);
    try {
      await api.post('/orders/assign-driver', { orderId, driverId });
      toast.success('تم تعيين السائق');
      await fetchData();
    } catch (error) {
      toast.error('فشل تعيين السائق');
    } finally {
      setAssigningDriver(false);
    }
  };

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchSearch =
      !searchTerm ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone?.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل طلبات التوصيل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <IoCar className="text-green-600" />
            لوحة التوصيل
          </h1>
          <p className="text-gray-500 text-sm mt-1">إدارة طلبات التوصيل للمتجر</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
        >
          <IoRefresh />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: IoReceipt, color: 'blue' },
            { label: 'طلبات اليوم', value: stats.todayOrders, icon: IoCalendar, color: 'purple' },
            { label: 'قيد الانتظار', value: stats.pendingOrders, icon: IoTime, color: 'yellow' },
            { label: 'مبيعات اليوم', value: `${stats.todaySales?.toLocaleString()} ل.س`, icon: IoCash, color: 'green' },
            { label: 'إجمالي المبيعات', value: `${stats.totalSales?.toLocaleString()} ل.س`, icon: IoWallet, color: 'emerald' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-4">
              <p className="text-gray-500 text-xs mb-1">{card.label}</p>
              <p className={`text-xl font-bold text-${card.color}-600`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <IoSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الطلب..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'processing', 'shipped'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'الكل' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <IoCar className="text-6xl mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد طلبات توصيل نشطة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-800">#{order.orderNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status]?.bg} ${statusConfig[order.status]?.color}`}>
                    {statusConfig[order.status]?.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoPerson className="text-green-500 flex-shrink-0" />
                    <span>{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <IoCall className="text-blue-500 flex-shrink-0" />
                    <span dir="ltr">{order.customerPhone}</span>
                  </div>
                  {order.deliveryAddress && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <IoLocation className="text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{order.deliveryAddress}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    {order.paymentMethod === 'cash' ? (
                      <IoCash className="text-green-500" />
                    ) : (
                      <IoCard className="text-blue-500" />
                    )}
                    <span className="font-bold text-green-600">{order.total?.toLocaleString()} ل.س</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(order.createdAt), 'HH:mm', { locale: arSA })}
                  </span>
                </div>

                {order.assignedDriver && (
                  <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs text-gray-500">
                    <IoCar className="text-purple-500" />
                    <span>{order.assignedDriver.name}</span>
                  </div>
                )}

                {nextStatus[order.status] && (
                  <button
                    disabled={updatingStatus === order.id}
                    onClick={e => {
                      e.stopPropagation();
                      updateOrderStatus(order.id, nextStatus[order.status]);
                    }}
                    className="mt-3 w-full py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-60 transition-colors"
                  >
                    {updatingStatus === order.id ? '...' : `→ ${statusConfig[nextStatus[order.status]]?.label}`}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">تفاصيل الطلب #{selectedOrder.orderNumber}</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl"
                >
                  <IoClose />
                </button>
              </div>

              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-4 ${statusConfig[selectedOrder.status]?.bg} ${statusConfig[selectedOrder.status]?.color}`}>
                {statusConfig[selectedOrder.status]?.label}
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <IoPerson className="text-green-500" />
                  <span className="font-medium">{selectedOrder.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IoCall className="text-blue-500" />
                  <span dir="ltr">{selectedOrder.customerPhone}</span>
                </div>
                {selectedOrder.deliveryAddress && (
                  <div className="flex items-start gap-2">
                    <IoLocation className="text-red-500 mt-0.5" />
                    <span>{selectedOrder.deliveryAddress}</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-medium mb-2">المنتجات</h3>
                {selectedOrder.orderItems?.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{item.product?.name || 'منتج'}</span>
                    <div className="flex gap-3 text-sm text-gray-600">
                      <span>×{item.quantity}</span>
                      <span className="font-medium">{(item.price * item.quantity).toLocaleString()} ل.س</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between mt-2 pt-2 font-bold">
                  <span>الإجمالي</span>
                  <span className="text-green-600">{selectedOrder.total?.toLocaleString()} ل.س</span>
                </div>
              </div>

              {/* Assign Driver */}
              {!selectedOrder.assignedDriver && drivers.length > 0 && selectedOrder.status !== 'delivered' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">تعيين سائق</label>
                  <select
                    onChange={e => {
                      if (e.target.value) assignDriver(selectedOrder.id, e.target.value);
                    }}
                    disabled={assigningDriver}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    <option value="">اختر سائقاً...</option>
                    {drivers.filter(d => d.isActive).map(d => (
                      <option key={d.id} value={d.id}>{d.name} - {d.phone}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedOrder.assignedDriver && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50 rounded-xl">
                  <IoCar className="text-purple-500" />
                  <div>
                    <p className="font-medium text-sm">{selectedOrder.assignedDriver.name}</p>
                    <p className="text-xs text-gray-500" dir="ltr">{selectedOrder.assignedDriver.phone}</p>
                  </div>
                </div>
              )}

              {nextStatus[selectedOrder.status] && (
                <button
                  disabled={updatingStatus === selectedOrder.id}
                  onClick={() => updateOrderStatus(selectedOrder.id, nextStatus[selectedOrder.status])}
                  className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-60 transition-colors"
                >
                  {updatingStatus === selectedOrder.id
                    ? 'جاري التحديث...'
                    : `تحديث إلى: ${statusConfig[nextStatus[selectedOrder.status]]?.label}`}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StoreDeliveryDashboard;
