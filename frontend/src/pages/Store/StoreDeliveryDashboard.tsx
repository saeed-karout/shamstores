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

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

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
  pending: { label: 'قيد الانتظار', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  processing: { label: 'قيد المعالجة', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  shipped: { label: 'تم الشحن', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  delivered: { label: 'تم التوصيل', color: '#C8E235', bg: 'rgba(200,226,53,0.12)' },
  cancelled: { label: 'ملغي', color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)' },
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
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, border: `4px solid ${C.accent}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 16px'
          }} />
          <p style={{ color: C.muted }}>جاري تحميل طلبات التوصيل...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Cairo, sans-serif', padding: '24px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoCar style={{ color: C.accent }} />
            لوحة التوصيل
          </h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>إدارة طلبات التوصيل للمتجر</p>
        </div>
        <button
          onClick={fetchData}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: C.accent, color: C.bg,
            border: 'none', borderRadius: 12, fontWeight: 600,
            fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
          }}
        >
          <IoRefresh />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: IoReceipt, color: C.blue },
            { label: 'طلبات اليوم', value: stats.todayOrders, icon: IoCalendar, color: C.purple },
            { label: 'قيد الانتظار', value: stats.pendingOrders, icon: IoTime, color: '#FBBF24' },
            { label: 'مبيعات اليوم', value: `${stats.todaySales?.toLocaleString()} ل.س`, icon: IoCash, color: C.accent },
            { label: 'إجمالي المبيعات', value: `${stats.totalSales?.toLocaleString()} ل.س`, icon: IoWallet, color: C.accent },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{card.label}</p>
                <p style={{ color: card.color, fontSize: 20, fontWeight: 700 }}>{card.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الطلب..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', paddingRight: 36, paddingLeft: 16, paddingTop: 8, paddingBottom: 8,
              background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12,
              color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['all', 'pending', 'processing', 'shipped'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '8px 12px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                fontFamily: 'Cairo, sans-serif', cursor: 'pointer', border: 'none',
                background: filterStatus === s ? C.accent : C.surf,
                color: filterStatus === s ? C.bg : C.muted,
              }}
            >
              {s === 'all' ? 'الكل' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
          <IoCar style={{ fontSize: 64, display: 'block', margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 18 }}>لا توجد طلبات توصيل نشطة</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(order => (
            <motion.div
              key={order.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, cursor: 'pointer' }}
              onClick={() => setSelectedOrder(order)}
            >
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ color: C.text, fontWeight: 700 }}>#{order.orderNumber}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: statusConfig[order.status]?.bg,
                    color: statusConfig[order.status]?.color,
                  }}>
                    {statusConfig[order.status]?.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoPerson style={{ color: C.accent, flexShrink: 0 }} />
                    <span>{order.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
                    <IoCall style={{ color: C.blue, flexShrink: 0 }} />
                    <span dir="ltr">{order.customerPhone}</span>
                  </div>
                  {order.deliveryAddress && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: C.muted }}>
                      <IoLocation style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
                      <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                        {order.deliveryAddress}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {order.paymentMethod === 'cash' ? (
                      <IoCash style={{ color: C.accent }} />
                    ) : (
                      <IoCard style={{ color: C.blue }} />
                    )}
                    <span style={{ color: C.accent, fontWeight: 700 }}>{order.total?.toLocaleString()} ل.س</span>
                  </div>
                  <span style={{ color: C.muted, fontSize: 12 }}>
                    {format(new Date(order.createdAt), 'HH:mm', { locale: arSA })}
                  </span>
                </div>

                {order.assignedDriver && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                    <IoCar style={{ color: C.purple }} />
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
                    style={{
                      marginTop: 12, width: '100%', padding: '8px 0',
                      background: C.accent, color: C.bg, border: 'none',
                      borderRadius: 12, fontSize: 14, fontWeight: 600,
                      fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                      opacity: updatingStatus === order.id ? 0.6 : 1,
                    }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
              maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto'
            }}
          >
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>تفاصيل الطلب #{selectedOrder.orderNumber}</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ padding: 8, background: C.surf, border: 'none', borderRadius: 12, cursor: 'pointer', color: C.muted }}
                >
                  <IoClose />
                </button>
              </div>

              <div style={{
                display: 'inline-flex', padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 500, marginBottom: 16,
                background: statusConfig[selectedOrder.status]?.bg,
                color: statusConfig[selectedOrder.status]?.color,
              }}>
                {statusConfig[selectedOrder.status]?.label}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
                  <IoPerson style={{ color: C.accent }} />
                  <span style={{ fontWeight: 500 }}>{selectedOrder.customerName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
                  <IoCall style={{ color: C.blue }} />
                  <span dir="ltr">{selectedOrder.customerPhone}</span>
                </div>
                {selectedOrder.deliveryAddress && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: C.text }}>
                    <IoLocation style={{ color: C.red, marginTop: 2 }} />
                    <span>{selectedOrder.deliveryAddress}</span>
                  </div>
                )}
              </div>

              <div style={{ background: C.surf, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <h3 style={{ color: C.text, fontWeight: 500, marginBottom: 8 }}>المنتجات</h3>
                {selectedOrder.orderItems?.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.text, fontSize: 14 }}>{item.product?.name || 'منتج'}</span>
                    <div style={{ display: 'flex', gap: 12, fontSize: 14, color: C.muted }}>
                      <span>×{item.quantity}</span>
                      <span style={{ color: C.text, fontWeight: 500 }}>{(item.price * item.quantity).toLocaleString()} ل.س</span>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, fontWeight: 700 }}>
                  <span style={{ color: C.text }}>الإجمالي</span>
                  <span style={{ color: C.accent }}>{selectedOrder.total?.toLocaleString()} ل.س</span>
                </div>
              </div>

              {/* Assign Driver */}
              {!selectedOrder.assignedDriver && drivers.length > 0 && selectedOrder.status !== 'delivered' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: C.muted, marginBottom: 8 }}>تعيين سائق</label>
                  <select
                    onChange={e => {
                      if (e.target.value) assignDriver(selectedOrder.id, e.target.value);
                    }}
                    disabled={assigningDriver}
                    style={{
                      width: '100%', background: C.surf, border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: '8px 12px', color: C.text,
                      fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none'
                    }}
                  >
                    <option value="">اختر سائقاً...</option>
                    {drivers.filter(d => d.isActive).map(d => (
                      <option key={d.id} value={d.id}>{d.name} - {d.phone}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedOrder.assignedDriver && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: 12, background: 'rgba(167,139,250,0.1)', borderRadius: 12 }}>
                  <IoCar style={{ color: C.purple }} />
                  <div>
                    <p style={{ color: C.text, fontWeight: 500, fontSize: 14 }}>{selectedOrder.assignedDriver.name}</p>
                    <p style={{ color: C.muted, fontSize: 12 }} dir="ltr">{selectedOrder.assignedDriver.phone}</p>
                  </div>
                </div>
              )}

              {nextStatus[selectedOrder.status] && (
                <button
                  disabled={updatingStatus === selectedOrder.id}
                  onClick={() => updateOrderStatus(selectedOrder.id, nextStatus[selectedOrder.status])}
                  style={{
                    width: '100%', padding: '12px 0', background: C.accent, color: C.bg,
                    border: 'none', borderRadius: 12, fontWeight: 600,
                    fontFamily: 'Cairo, sans-serif', fontSize: 16, cursor: 'pointer',
                    opacity: updatingStatus === selectedOrder.id ? 0.6 : 1,
                  }}
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
