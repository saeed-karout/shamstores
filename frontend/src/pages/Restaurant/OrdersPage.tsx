import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { Order, OrderStatus, PaymentMethod } from '../../services/types';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import OrderDetails from '../../components/orders/OrderDetails';
import { IoRefresh, IoFilter, IoWallet } from 'react-icons/io5';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: C.surf,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
};

const OrdersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (id) {
      fetchOrderById(id);
    }
  }, [id]);

  const fetchOrders = async () => {
    try {
      const data = await api.get<Order[]>('/orders');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async (orderId: string) => {
    try {
      const data = await api.get<Order>(`/orders/${orderId}`);
      setSelectedOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const updateOrderPayment = async (orderId: string, isPaid: boolean, paymentMethod?: PaymentMethod) => {
    try {
      await api.patch(`/orders/${orderId}/payment`, { isPaid, paymentMethod });
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...selectedOrder,
          isPaid,
          paymentMethod: paymentMethod || selectedOrder.paymentMethod,
        });
      }
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    if (filter !== 'all') {
      filtered = filtered.filter(o => o.status === filter);
    }
    if (paymentFilter === 'paid') {
      filtered = filtered.filter(o => o.isPaid);
    } else if (paymentFilter === 'unpaid') {
      filtered = filtered.filter(o => !o.isPaid);
    }
    return filtered;
  };

  const getStatusStyle = (status: OrderStatus): React.CSSProperties => {
    switch (status) {
      case 'pending':   return { background: 'rgba(245,158,11,0.15)', color: C.yellow };
      case 'preparing': return { background: 'rgba(96,165,250,0.15)', color: C.blue };
      case 'ready':     return { background: 'rgba(200,226,53,0.15)', color: C.accent };
      case 'served':    return { background: 'rgba(157,196,172,0.15)', color: C.muted };
      case 'cancelled': return { background: 'rgba(255,107,107,0.15)', color: C.red };
      default:          return { background: 'rgba(157,196,172,0.15)', color: C.muted };
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending':   return 'قيد الانتظار';
      case 'preparing': return 'قيد التحضير';
      case 'ready':     return 'جاهز';
      case 'served':    return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default:          return status;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => (
    <span style={{
      fontSize: 12,
      background: isPaid ? 'rgba(200,226,53,0.15)' : 'rgba(245,158,11,0.15)',
      color: isPaid ? C.accent : C.yellow,
      padding: '2px 8px',
      borderRadius: 20,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}>
      <IoWallet size={12} />
      {isPaid ? 'مدفوع' : 'غير مدفوع'}
    </span>
  );

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    background: active ? C.accent : C.surf,
    color: active ? C.bg : C.text,
    border: `1px solid ${active ? C.accent : C.border}`,
    cursor: 'pointer',
  });

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, direction: 'rtl', color: C.text }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>إدارة الطلبات</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.text, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <IoFilter size={16} />
            تصفية
          </button>
          <button
            onClick={fetchOrders}
            style={{ background: C.surf, border: `1px solid ${C.border}`, color: C.text, padding: '8px 16px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <IoRefresh size={16} />
            تحديث
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0 }}>حالة الطلب</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setFilter('all')} style={filterBtnStyle(filter === 'all')}>
              الكل ({orders.length})
            </button>
            {(['pending', 'preparing', 'ready', 'served', 'cancelled'] as OrderStatus[]).map(status => (
              <button key={status} onClick={() => setFilter(status)} style={filterBtnStyle(filter === status)}>
                {getStatusText(status)} ({orders.filter(o => o.status === status).length})
              </button>
            ))}
          </div>

          <h3 style={{ fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0 }}>حالة الدفع</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => setPaymentFilter('all')} style={filterBtnStyle(paymentFilter === 'all')}>الكل</button>
            <button onClick={() => setPaymentFilter('paid')} style={filterBtnStyle(paymentFilter === 'paid')}>
              مدفوع ({orders.filter(o => o.isPaid).length})
            </button>
            <button onClick={() => setPaymentFilter('unpaid')} style={filterBtnStyle(paymentFilter === 'unpaid')}>
              غير مدفوع ({orders.filter(o => !o.isPaid).length})
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Orders List */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontWeight: 600, color: C.text, margin: 0, fontSize: 16 }}>الطلبات</h2>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {getFilteredOrders().map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${C.border}`,
                  background: selectedOrder?.id === order.id ? 'rgba(200,226,53,0.07)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (selectedOrder?.id !== order.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(200,226,53,0.04)'; }}
                onMouseLeave={e => { if (selectedOrder?.id !== order.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{order.orderNumber}</span>
                  {getPaymentBadge(order.isPaid)}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ ...getStatusStyle(order.status), padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
                  {order.table?.name && `طاولة ${order.table.name} • `}
                  {order.customerName || 'زبون'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: C.muted }}>
                    {format(new Date(order.createdAt), 'hh:mm a', { locale: ar })}
                  </span>
                  <span style={{ fontWeight: 700, color: C.accent }}>{Number(order.total).toFixed(2)} ل.س</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Details */}
        <div>
          {selectedOrder ? (
            <OrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
              onUpdatePayment={(isPaid, paymentMethod) =>
                updateOrderPayment(selectedOrder.id, isPaid, paymentMethod)
              }
            />
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center', color: C.muted }}>
              اختر طلباً لعرض التفاصيل
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
