import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { Order, OrderStatus, PaymentMethod } from '../../services/types';
import Loader from '../../components/common/Loader';
import OrderDetails from '../../components/orders/OrderDetails';
import { IoArrowForward, IoReceiptOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';
import { OrderRow, OrdersEmpty, OrdersToolbar, matchesQuery, BoardStatus } from '@/components/orders/OrdersBoard';

const OrdersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('token');

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get<Order[]>('/orders');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const counts = STATUSES.reduce<Record<string, number>>((acc, st) => {
    acc[st.key] = orders.filter((o) => o.status === st.key).length;
    return acc;
  }, {});
  const filteredOrders = orders.filter(
    (o) =>
      (filter === 'all' || o.status === filter) &&
      (paymentFilter === 'all' || (paymentFilter === 'paid' ? o.isPaid : !o.isPaid)) &&
      matchesQuery(query, o.orderNumber, o.customerName, (o as any).customerPhone, o.table?.name)
  );
  const isFiltered = filter !== 'all' || paymentFilter !== 'all' || !!query.trim();
  const statusOf = (key: string) => STATUSES.find((s) => s.key === key) || { key, label: key, tone: 'gray' as const };

  const refresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  if (loading) return <Loader fullScreen variant="list" />;

  return (
    <div className="ss-page ob-page">
      <OrdersToolbar
        statuses={STATUSES}
        counts={counts}
        total={orders.length}
        status={filter}
        onStatus={(key) => setFilter(key as OrderStatus | 'all')}
        payment={paymentFilter}
        onPayment={setPaymentFilter}
        query={query}
        onQuery={setQuery}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      <div className="orders-split">
        <section className="ob-list" aria-label="قائمة الطلبات">
          <div className="ob-list-head">
            <span>{filteredOrders.length} طلب</span>
            <span>الأحدث أولاً</span>
          </div>
          <div className="ob-list-body">
            {filteredOrders.length === 0 ? (
              <OrdersEmpty
                filtered={isFiltered && orders.length > 0}
                onReset={() => {
                  setFilter('all');
                  setPaymentFilter('all');
                  setQuery('');
                }}
              />
            ) : (
              filteredOrders.map((order) => {
                const items = order.orderItems?.length || 0;
                const parts = [order.table?.name ? `طاولة ${order.table.name}` : '', items ? `${items} ${items === 1 ? 'صنف' : 'أصناف'}` : ''].filter(Boolean);
                return (
                  <OrderRow
                    key={order.id}
                    number={order.orderNumber}
                    customer={order.customerName || (order.table?.name ? `طاولة ${order.table.name}` : '')}
                    sub={parts.join(' · ')}
                    total={order.total}
                    isPaid={order.isPaid}
                    createdAt={order.createdAt as any}
                    status={statusOf(order.status)}
                    selected={selectedOrder?.id === order.id}
                    onSelect={() => setSelectedOrder(order)}
                  />
                );
              })
            )}
          </div>
        </section>

        {/* التفاصيل — عمودٌ على الحاسوب، وطبقةٌ تملأ الشاشة على الجوال */}
        <div className={`orders-detail${selectedOrder ? ' is-open' : ''}`}>
          <button type="button" className="orders-detail-back ob-back" onClick={() => setSelectedOrder(null)}>
            <IoArrowForward size={17} /> رجوع إلى الطلبات
          </button>

          {selectedOrder ? (
            <OrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
              onUpdatePayment={(isPaid, paymentMethod) => updateOrderPayment(selectedOrder.id, isPaid, paymentMethod)}
            />
          ) : (
            <div className="ob-placeholder">
              <IoReceiptOutline size={40} aria-hidden="true" />
              <b>اختر طلباً لعرض تفاصيله</b>
              <p>الأصناف والطاولة وأزرار تحديث الحالة تظهر هنا.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ترتيب التبويبات يتبع رحلة الطلب — من وصوله إلى تقديمه
const STATUSES: BoardStatus[] = [
  { key: 'pending', label: 'بانتظار التأكيد', tone: 'amber' },
  { key: 'preparing', label: 'قيد التحضير', tone: 'blue' },
  { key: 'ready', label: 'جاهز', tone: 'purple' },
  { key: 'delivering', label: 'قيد التوصيل', tone: 'blue' },
  { key: 'delivered', label: 'تم التوصيل', tone: 'green' },
  { key: 'served', label: 'مكتمل', tone: 'green' },
  { key: 'cancelled', label: 'ملغى', tone: 'red' }
];

export default OrdersPage;
