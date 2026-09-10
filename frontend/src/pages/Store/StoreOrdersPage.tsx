// pages/Store/StoreOrdersPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import StoreOrderDetails from '../../components/store/StoreOrderDetails';
import { IoRefresh, IoFilter, IoWallet, IoCube, IoTime, IoArrowForward } from 'react-icons/io5';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';
import { ExportButton } from '@/components/common/CsvTools';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};
/** لوحة أدوات CSV — نفس ألوان الشاشة باسمٍ يفهمه المكوّن المشترك */
const csvColors = {
  text: C.text,
  muted: C.muted,
  card: C.card,
  surface: C.surf,
  border: C.border,
  accent: C.accent,
  bg: C.bg
};


interface StoreOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'served' | 'cancelled';
  total: number;
  isPaid: boolean;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    productId: string;
    quantity: number;
    price: number;
    // خيارات المنتج تصل من الخادم وتُعرض في التفاصيل: بلا اللون والمقاس
    // يُجهَّز الطلب خطأً
    size?: string | null;
    addons?: string[] | null;
    product?: { id?: string; name: string; image?: string; imageUrl?: string };
  }>;
}

const StoreOrdersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const token = localStorage.getItem('token');

  const normalizeStatus = (status: string): StoreOrder['status'] => {
    const statusMap: Record<string, StoreOrder['status']> = {
      processing: 'preparing',
      shipped: 'ready',
      pending: 'pending',
      preparing: 'preparing',
      ready: 'ready',
      delivering: 'delivering',
      delivered: 'delivered',
      served: 'served',
      cancelled: 'cancelled'
    };

    return statusMap[status] || 'pending';
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/store/orders');
      const ordersData = Array.isArray(response)
        ? response.map((order: any) => ({
            ...order,
            status: normalizeStatus(order.status)
          }))
        : [];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ في جلب الطلبات');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // اشتراك Socket.IO لاستقبال الطلبات الجديدة فوراً
  useSocket({
    token,
    enabled: !!token,
    onNotification: (data) => {
      if (data.type === 'order') {
        fetchOrders();
        if (data.event === 'order.created') {
          toast.success(`طلب جديد ${data.orderNumber}`, { duration: 5000 });
        }
      }
    },
    onOrderUpdated: () => {
      fetchOrders();
    },
  });

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (id) fetchOrderById(id);
  }, [id]);

  const fetchOrderById = async (orderId: string) => {
    try {
      const data = await api.get<StoreOrder>(`/store/orders/${orderId}`);
      setSelectedOrder({ ...data, status: normalizeStatus(data.status) });
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const normalizedStatus = normalizeStatus(status);
      await api.patch(`/store/orders/${orderId}/status`, { status: normalizedStatus });
      toast.success('تم تحديث حالة الطلب بنجاح');
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: normalizedStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ في تحديث حالة الطلب');
    }
  };

  // بعد تحديث الدفع نعيد الجلب: الحالة المعروضة يجب أن تأتي من الخادم
  const handlePaymentUpdated = async (isPaid: boolean, paymentMethod: string) => {
    if (selectedOrder) {
      setSelectedOrder({ ...selectedOrder, isPaid, paymentMethod });
    }
    await fetchOrders();
  };

  const getFilteredOrders = (): StoreOrder[] => {
    let filtered = Array.isArray(orders) ? [...orders] : [];
    if (filter !== 'all') filtered = filtered.filter(o => o.status === filter);
    if (paymentFilter === 'paid') filtered = filtered.filter(o => o.isPaid);
    else if (paymentFilter === 'unpaid') filtered = filtered.filter(o => !o.isPaid);
    return filtered;
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      pending:    { bg: `rgba(245,158,11,0.15)`,  color: C.yellow },
      preparing:  { bg: `rgba(96,165,250,0.15)`,  color: C.blue },
      ready:      { bg: `rgba(167,139,250,0.15)`, color: C.purple },
      delivering: { bg: `rgba(96,165,250,0.25)`,  color: '#1D4ED8' },
      delivered:  { bg: `rgba(200,226,53,0.15)`,   color: C.accent },
      served:     { bg: `rgba(200,226,53,0.25)`,   color: C.acDk },
      cancelled:  { bg: `rgba(255,107,107,0.15)`,  color: C.red },
    };
    const s = map[status] || { bg: `rgba(157,196,172,0.15)`, color: C.muted };
    return { background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 12, fontSize: 12 };
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار',
      preparing: 'قيد التجهيز',
      ready: 'جاهز للتوصيل',
      delivering: 'قيد التوصيل',
      delivered: 'تم التوصيل',
      served: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return map[status] || status;
  };

  const getStats = () => {
    const list = Array.isArray(orders) ? orders : [];
    return {
      total: list.length,
      pending: list.filter(o => o.status === 'pending').length,
      preparing: list.filter(o => o.status === 'preparing').length,
      ready: list.filter(o => o.status === 'ready').length,
      delivering: list.filter(o => o.status === 'delivering').length,
      delivered: list.filter(o => o.status === 'delivered').length,
      served: list.filter(o => o.status === 'served').length,
      cancelled: list.filter(o => o.status === 'cancelled').length,
      paid: list.filter(o => o.isPaid).length,
      unpaid: list.filter(o => !o.isPaid).length,
    };
  };

  const filteredOrders = getFilteredOrders();
  const stats = getStats();

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    border: 'none',
    cursor: 'pointer',
    background: active ? C.accent : C.surf,
    color: active ? C.bg : C.muted,
    fontWeight: active ? 700 : 400,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24 }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>إدارة طلبات المتجر</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>متابعة وإدارة جميع طلبات الشراء</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* التصدير من الخادم لا من الشاشة: الشاشة مُصفَّحة والملفّ
              يجب أن يشمل المدى كلّه */}
          <ExportButton path="/orders/export" filename="orders.csv" colors={csvColors} />
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IoFilter size={16} /> تصفية
          </button>
          <button
            onClick={fetchOrders}
            style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.muted, padding: '8px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <IoRefresh size={16} /> تحديث
          </button>
        </div>
      </div>

      {/* فلاتر */}
      {showFilters && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>حالة الطلب</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'all', label: `الكل (${stats.total})` },
              { key: 'pending', label: `قيد الانتظار (${stats.pending})` },
              { key: 'preparing', label: `قيد التجهيز (${stats.preparing})` },
              { key: 'ready', label: `جاهز للتوصيل (${stats.ready})` },
              { key: 'delivering', label: `قيد التوصيل (${stats.delivering})` },
              { key: 'delivered', label: `تم التوصيل (${stats.delivered})` },
              { key: 'served', label: `تم التسليم (${stats.served})` },
              { key: 'cancelled', label: `ملغي (${stats.cancelled})` },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={filterBtnStyle(filter === f.key)}>{f.label}</button>
            ))}
          </div>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>حالة الدفع</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'all', label: 'الكل' },
              { key: 'paid', label: `مدفوع (${stats.paid})` },
              { key: 'unpaid', label: `غير مدفوع (${stats.unpaid})` },
            ].map(f => (
              <button key={f.key} onClick={() => setPaymentFilter(f.key as any)} style={filterBtnStyle(paymentFilter === f.key)}>{f.label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="orders-split">
        {/* قائمة الطلبات */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.surf }}>
            <h2 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>قائمة الطلبات</h2>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {filteredOrders.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <IoCube style={{ color: C.muted, fontSize: 40, marginBottom: 8 }} />
                <p style={{ color: C.muted, margin: 0 }}>لا توجد طلبات</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${C.border}`,
                    borderRight: selectedOrder?.id === order.id ? `3px solid ${C.accent}` : '3px solid transparent',
                    background: selectedOrder?.id === order.id ? C.surfL : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: C.accent, fontSize: 13 }}>#{order.orderNumber}</span>
                    <span style={{ background: order.isPaid ? `rgba(200,226,53,0.15)` : `rgba(245,158,11,0.15)`, color: order.isPaid ? C.accent : C.yellow, fontSize: 11, padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IoWallet size={11} /> {order.isPaid ? 'مدفوع' : 'غير مدفوع'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={getStatusStyle(order.status)}>{getStatusText(order.status)}</span>
                    <span style={{ color: C.muted, fontSize: 12 }}>{order.orderItems?.length || 0} منتج</span>
                  </div>
                  <p style={{ color: C.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>{order.customerName || 'عميل'}</p>
                  {order.customerPhone && <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{order.customerPhone}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IoTime size={12} />
                      {format(new Date(order.createdAt), 'hh:mm a', { locale: ar })}
                    </span>
                    <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{formatPrice(order.total, DEFAULT_CURRENCY)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* تفاصيل الطلب — عمود على اللابتوب، وطبقة ملء الشاشة على الجوال */}
        <div className={`orders-detail${selectedOrder ? ' is-open' : ''}`}>
          {/* زرّ الرجوع للجوال حيث تملأ التفاصيل الشاشة */}
          <button
            type="button"
            className="orders-detail-back"
            onClick={() => setSelectedOrder(null)}
            style={{
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              padding: '9px 14px',
              minHeight: 40,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surf,
              color: C.text,
              fontFamily: 'Cairo, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <IoArrowForward size={16} /> رجوع إلى القائمة
          </button>

          {selectedOrder ? (
            <StoreOrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
              onUpdatePayment={handlePaymentUpdated}
            />
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '80px 24px', textAlign: 'center' }}>
              <IoCube style={{ color: C.muted, fontSize: 56, marginBottom: 16, opacity: 0.4 }} />
              <p style={{ color: C.text, fontSize: 16, margin: '0 0 8px' }}>اختر طلباً لعرض التفاصيل</p>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>اضغط على أي طلب من القائمة لعرض معلوماته الكاملة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreOrdersPage;
