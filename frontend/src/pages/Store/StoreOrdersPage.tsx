// pages/Store/StoreOrdersPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import StoreOrderDetails from '../../components/store/StoreOrderDetails';
import { IoRefresh, IoFilter, IoWallet, IoCube, IoTime } from 'react-icons/io5';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface StoreOrder {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
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
    product?: {
      id: string;
      name: string;
      image?: string;
    };
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
      const response = await api.get('/store/orders');
      // التحقق من أن البيانات هي مصفوفة
      const ordersData = Array.isArray(response) ? response : [];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('حدث خطأ في جلب الطلبات');
      setOrders([]); // تعيين مصفوفة فارغة في حالة الخطأ
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async (orderId: string) => {
    try {
      const data = await api.get(`/store/orders/${orderId}`);
      setSelectedOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/store/orders/${orderId}/status`, { status });
      toast.success('تم تحديث حالة الطلب بنجاح');
      await fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: status as any });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('حدث خطأ في تحديث حالة الطلب');
    }
  };

  const getFilteredOrders = (): StoreOrder[] => {
    // التأكد من أن orders هي مصفوفة
    let filtered = Array.isArray(orders) ? [...orders] : [];
    
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'processing': return 'قيد التجهيز';
      case 'shipped': return 'تم الشحن';
      case 'delivered': return 'تم التوصيل';
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

  // حساب الإحصائيات بأمان
  const getStats = () => {
    const ordersList = Array.isArray(orders) ? orders : [];
    return {
      total: ordersList.length,
      pending: ordersList.filter(o => o.status === 'pending').length,
      processing: ordersList.filter(o => o.status === 'processing').length,
      shipped: ordersList.filter(o => o.status === 'shipped').length,
      delivered: ordersList.filter(o => o.status === 'delivered').length,
      cancelled: ordersList.filter(o => o.status === 'cancelled').length,
      paid: ordersList.filter(o => o.isPaid).length,
      unpaid: ordersList.filter(o => !o.isPaid).length,
    };
  };

  if (loading) return <Loader fullScreen />;

  const filteredOrders = getFilteredOrders();
  const stats = getStats();

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🛒 إدارة طلبات المتجر</h1>
          <p className="text-sm text-gray-500 mt-1">متابعة وإدارة جميع طلبات الشراء</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <IoFilter className="inline ml-1" />
            تصفية
          </Button>
          <Button variant="outline" onClick={fetchOrders}>
            <IoRefresh className="inline ml-1" />
            تحديث
          </Button>
        </div>
      </div>

      {/* فلاتر الحالة والدفع */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h3 className="font-semibold mb-2">📋 حالة الطلب</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === 'pending' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              قيد الانتظار ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('processing')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === 'processing' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              قيد التجهيز ({stats.processing})
            </button>
            <button
              onClick={() => setFilter('shipped')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === 'shipped' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              تم الشحن ({stats.shipped})
            </button>
            <button
              onClick={() => setFilter('delivered')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === 'delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              تم التوصيل ({stats.delivered})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === 'cancelled' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              ملغي ({stats.cancelled})
            </button>
          </div>

          <h3 className="font-semibold mb-2">💰 حالة الدفع</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                paymentFilter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                paymentFilter === 'paid' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              مدفوع ({stats.paid})
            </button>
            <button
              onClick={() => setPaymentFilter('unpaid')}
              className={`px-3 py-1 rounded-full text-sm transition ${
                paymentFilter === 'unpaid' ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              غير مدفوع ({stats.unpaid})
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة الطلبات */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold">📋 قائمة الطلبات</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <IoCube className="text-4xl mx-auto mb-2 opacity-50" />
                <p>لا توجد طلبات</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedOrder?.id === order.id ? 'bg-green-50 border-r-4 border-green-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-blue-600">#{order.orderNumber}</span>
                    {getPaymentBadge(order.isPaid)}
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {order.orderItems?.length || 0} منتج
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <p className="font-medium">{order.customerName || 'عميل'}</p>
                    {order.customerPhone && (
                      <p className="text-xs text-gray-400">{order.customerPhone}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 flex items-center gap-1">
                      <IoTime size={12} />
                      {format(new Date(order.createdAt), 'hh:mm a', { locale: ar })}
                    </span>
                    <span className="font-bold text-green-600">{Number(order.total).toFixed(2)} ر.س</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* تفاصيل الطلب */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <StoreOrderDetails
              order={selectedOrder}
              onUpdateStatus={(status) => updateOrderStatus(selectedOrder.id, status)}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
              <IoCube className="text-6xl mx-auto mb-4 opacity-30" />
              <p className="text-lg">اختر طلباً لعرض التفاصيل</p>
              <p className="text-sm mt-1">اضغط على أي طلب من القائمة لعرض معلوماته الكاملة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreOrdersPage;