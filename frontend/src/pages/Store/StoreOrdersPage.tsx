// pages/Store/StoreOrdersPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import StoreOrderDetails from '../../components/store/StoreOrderDetails';
import { IoArrowForward, IoReceiptOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';
import { ExportButton } from '@/components/common/CsvTools';
import { OrderRow, OrdersEmpty, OrdersToolbar, matchesQuery, BoardStatus } from '@/components/orders/OrdersBoard';

const C = {
  bg:     '#F4F7F4',
  card:   '#FFFFFF',
  prim:   '#E8EFEA',
  surf:   '#F1F5F2',
  surfL:  '#E2EBE5',
  accent: '#084835',
  acDk:   '#06382A',
  text:   '#10231B',
  muted:  '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  red:    '#D64545',
  blue:   '#2563EB',
  yellow: '#B45309',
  purple: '#8B45B5',
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
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  const list = Array.isArray(orders) ? orders : [];
  const counts = STATUSES.reduce<Record<string, number>>((acc, st) => {
    acc[st.key] = list.filter((o) => o.status === st.key).length;
    return acc;
  }, {});
  const filteredOrders = list.filter(
    (o) =>
      (filter === 'all' || o.status === filter) &&
      (paymentFilter === 'all' || (paymentFilter === 'paid' ? o.isPaid : !o.isPaid)) &&
      matchesQuery(query, o.orderNumber, o.customerName, o.customerPhone)
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
        total={list.length}
        status={filter}
        onStatus={setFilter}
        payment={paymentFilter}
        onPayment={setPaymentFilter}
        query={query}
        onQuery={setQuery}
        onRefresh={refresh}
        refreshing={refreshing}
        // التصدير من الخادم لا من الشاشة: الملفّ يشمل المدى كلّه لا المعروض
        extra={<ExportButton path="/orders/export" filename="orders.csv" colors={csvColors} />}
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
                filtered={isFiltered && list.length > 0}
                onReset={() => {
                  setFilter('all');
                  setPaymentFilter('all');
                  setQuery('');
                }}
              />
            ) : (
              filteredOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  number={order.orderNumber}
                  customer={order.customerName}
                  sub={`${order.orderItems?.length || 0} ${(order.orderItems?.length || 0) === 1 ? 'منتج' : 'منتجات'}`}
                  total={order.total}
                  isPaid={order.isPaid}
                  createdAt={order.createdAt}
                  status={statusOf(order.status)}
                  selected={selectedOrder?.id === order.id}
                  onSelect={() => setSelectedOrder(order)}
                />
              ))
            )}
          </div>
        </section>

        {/* التفاصيل — عمودٌ على الحاسوب، وطبقةٌ تملأ الشاشة على الجوال */}
        <div className={`orders-detail${selectedOrder ? ' is-open' : ''}`}>
          <button type="button" className="orders-detail-back ob-back" onClick={() => setSelectedOrder(null)}>
            <IoArrowForward size={17} /> رجوع إلى الطلبات
          </button>

          {selectedOrder ? (
            <StoreOrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
              onUpdatePayment={handlePaymentUpdated}
            />
          ) : (
            <div className="ob-placeholder">
              <IoReceiptOutline size={40} aria-hidden="true" />
              <b>اختر طلباً لعرض تفاصيله</b>
              <p>المنتجات والعنوان وأزرار تحديث الحالة تظهر هنا.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ترتيب التبويبات يتبع رحلة الطلب — من وصوله إلى تسليمه
const STATUSES: BoardStatus[] = [
  { key: 'pending', label: 'بانتظار التأكيد', tone: 'amber' },
  { key: 'preparing', label: 'قيد التجهيز', tone: 'blue' },
  { key: 'ready', label: 'جاهز للتوصيل', tone: 'purple' },
  { key: 'delivering', label: 'قيد التوصيل', tone: 'blue' },
  { key: 'delivered', label: 'تم التوصيل', tone: 'green' },
  { key: 'served', label: 'تم التسليم', tone: 'green' },
  { key: 'cancelled', label: 'ملغى', tone: 'red' }
];

export default StoreOrdersPage;
