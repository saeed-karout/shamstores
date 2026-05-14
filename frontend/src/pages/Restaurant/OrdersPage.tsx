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
          paymentMethod: paymentMethod || selectedOrder.paymentMethod 
        });
      }
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    
    // تصفية حسب الحالة
    if (filter !== 'all') {
      filtered = filtered.filter(o => o.status === filter);
    }
    
    // تصفية حسب الدفع
    if (paymentFilter === 'paid') {
      filtered = filtered.filter(o => o.isPaid);
    } else if (paymentFilter === 'unpaid') {
      filtered = filtered.filter(o => !o.isPaid);
    }
    
    return filtered;
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'served': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'preparing': return 'قيد التحضير';
      case 'ready': return 'جاهز';
      case 'served': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const getPaymentBadge = (isPaid: boolean) => {
    return isPaid ? (
      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
        <IoWallet size={12} />
        مدفوع
      </span>
    ) : (
      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
        <IoWallet size={12} />
        غير مدفوع
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة الطلبات</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <IoFilter className="inline ml-1" />
            تصفية
          </Button>
          <Button
            variant="outline"
            onClick={fetchOrders}
          >
            <IoRefresh className="inline ml-1" />
            تحديث
          </Button>
        </div>
      </div>

      {/* فلاتر الحالة والدفع */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold mb-2">حالة الطلب</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              الكل ({orders.length})
            </button>
            {(['pending', 'preparing', 'ready', 'served', 'cancelled'] as OrderStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm ${
                  filter === status ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {getStatusText(status)} ({orders.filter(o => o.status === status).length})
              </button>
            ))}
          </div>

          <h3 className="font-semibold mb-2">حالة الدفع</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                paymentFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-1 rounded-full text-sm ${
                paymentFilter === 'paid' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              مدفوع ({orders.filter(o => o.isPaid).length})
            </button>
            <button
              onClick={() => setPaymentFilter('unpaid')}
              className={`px-3 py-1 rounded-full text-sm ${
                paymentFilter === 'unpaid' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              غير مدفوع ({orders.filter(o => !o.isPaid).length})
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة الطلبات */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">الطلبات</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {getFilteredOrders().map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">{order.orderNumber}</span>
                  <div className="flex items-center gap-2">
                    {getPaymentBadge(order.isPaid)}
                  </div>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {order.table?.name && `طاولة ${order.table.name} • `}
                  {order.customerName || 'زبون'}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    {format(new Date(order.createdAt), 'hh:mm a', { locale: ar })}
                  </span>
                  <span className="font-bold">{Number(order.total).toFixed(2)} ل.س</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* تفاصيل الطلب */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <OrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
              onUpdatePayment={(isPaid, paymentMethod) => 
                updateOrderPayment(selectedOrder.id, isPaid, paymentMethod)
              }
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              اختر طلباً لعرض التفاصيل
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;