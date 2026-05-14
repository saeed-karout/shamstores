// src/pages/TrackOrder.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  IoCheckmarkCircle, IoTime, IoCar, IoRestaurant, 
  IoLocation, IoCall, IoWallet, IoArrowBack,
  IoMap, IoRefresh, IoCopy, IoShare
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { getImageUrl } from '@/utils/imageHelpers';

interface OrderStatus {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  isPaid: boolean;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  createdAt: string;
  assignedDriver?: {
    id: string;
    name: string;
    phone: string;
    lastLocationLat?: number;
    lastLocationLng?: number;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    product?: {
      id: string;
      name: string;
      image?: string;
    };
    menuItem?: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
}

const TrackOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      const interval = setInterval(fetchOrder, 10000); // تحديث كل 10 ثواني
      return () => clearInterval(interval);
    }
  }, [orderId]);

  useEffect(() => {
    if (order?.assignedDriver?.id && (order.status === 'processing' || order.status === 'shipped')) {
      const driverInterval = setInterval(fetchDriverLocation, 5000);
      return () => clearInterval(driverInterval);
    }
  }, [order?.assignedDriver?.id, order?.status]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}/track`);
      setOrder(response);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.error || 'حدث خطأ في جلب بيانات الطلب');
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverLocation = async () => {
    if (!order?.assignedDriver?.id) return;
    try {
      const response = await api.get(`/delivery/driver/${order.assignedDriver.id}/location`);
      if (response.lat && response.lng) {
        setDriverLocation({ lat: response.lat, lng: response.lng });
      }
    } catch (error) {
      console.error('Error fetching driver location:', error);
    }
  };

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success('تم نسخ رقم الطلب');
    }
  };

  const shareOrder = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('تم نسخ رابط التتبع');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
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

  const getStatusStep = (status: string) => {
    const steps = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(status);
    return Math.max(0, currentIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل معلومات الطلب...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الطلب غير موجود</h2>
          <p className="text-gray-500 mb-6">{error || 'لم نتمكن من العثور على الطلب'}</p>
          <Link to="/" className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition">
            العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const statusSteps = [
    { key: 'pending', label: 'تم الاستلام', icon: IoCheckmarkCircle },
    { key: 'processing', label: 'قيد التجهيز', icon: IoTime },
    { key: 'shipped', label: 'تم الشحن', icon: IoCar },
    { key: 'delivered', label: 'تم التوصيل', icon: IoLocation },
  ];

  const currentStep = getStatusStep(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-xl font-bold">تتبع الطلب</h1>
            <button onClick={shareOrder} className="p-2 hover:bg-gray-100 rounded-full transition">
              <IoShare size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Order Number */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-gray-500 text-sm">رقم الطلب</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-800 font-mono">{order.orderNumber}</p>
                <button onClick={copyOrderNumber} className="p-1 text-gray-400 hover:text-green-500 transition">
                  <IoCopy size={18} />
                </button>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full text-white font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg mb-6">حالة الطلب</h2>
          <div className="relative">
            <div className="absolute top-5 right-0 left-0 h-0.5 bg-gray-200">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>
            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div key={step.key} className="text-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 transition-all ${
                        isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-green-200 scale-110' : ''}`}
                    >
                      <Icon size={20} />
                    </div>
                    <p className={`text-sm ${isCompleted ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        {order.deliveryAddress && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <IoLocation className="text-green-500" />
              عنوان التوصيل
            </h2>
            <p className="text-gray-700">{order.deliveryAddress}</p>
            {order.deliveryLat && order.deliveryLng && (
              <a 
                href={`https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-green-600 text-sm hover:underline"
              >
                <IoMap size={16} />
                فتح في خرائط جوجل
              </a>
            )}
          </div>
        )}

        {/* Driver Info */}
        {order.assignedDriver && (order.status === 'processing' || order.status === 'shipped') && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <IoCar className="text-green-500" />
              معلومات المندوب
            </h2>
            <div className="space-y-2">
              <p><span className="text-gray-500">الاسم:</span> {order.assignedDriver.name}</p>
              <p className="flex items-center gap-2">
                <span className="text-gray-500">الهاتف:</span>
                <a href={`tel:${order.assignedDriver.phone}`} className="text-green-600 hover:underline">
                  {order.assignedDriver.phone}
                </a>
                <IoCall size={14} className="text-gray-400" />
              </p>
              {driverLocation && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <IoRefresh className="animate-spin" size={14} />
                    موقع المندوب يتم تحديثه تلقائياً
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">المنتجات المطلوبة</h2>
          <div className="space-y-3">
            {order.orderItems.map((item) => {
              const product = item.product || item.menuItem;
              return (
                <div key={item.id} className="flex gap-3 py-3 border-b last:border-0">
                  {product?.image && (
                    <img 
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{product?.name || 'منتج'}</p>
                    <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-green-600">{item.price * item.quantity} ر.س</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t flex justify-between">
            <span className="font-bold">الإجمالي</span>
            <span className="font-bold text-green-600 text-lg">{order.total} ر.س</span>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-bold text-lg mb-4">معلومات إضافية</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">تاريخ الطلب:</span> {new Date(order.createdAt).toLocaleString('ar')}</p>
            {order.estimatedDeliveryTime && (
              <p><span className="text-gray-500">الوقت المتوقع:</span> {new Date(order.estimatedDeliveryTime).toLocaleString('ar')}</p>
            )}
            {order.actualDeliveryTime && (
              <p><span className="text-gray-500">وقت التوصيل:</span> {new Date(order.actualDeliveryTime).toLocaleString('ar')}</p>
            )}
            <p className="flex items-center gap-2">
              <span className="text-gray-500">طريقة الدفع:</span>
              {order.paymentMethod === 'cash' ? 'كاش' : order.paymentMethod === 'card' ? 'بطاقة' : 'أونلاين'}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-gray-500">حالة الدفع:</span>
              {order.isPaid ? (
                <span className="text-green-600">مدفوع</span>
              ) : (
                <span className="text-yellow-600">غير مدفوع</span>
              )}
              {!order.isPaid && order.paymentMethod === 'cash' && (
                <span className="text-xs text-gray-400">(سيتم الدفع عند الاستلام)</span>
              )}
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchOrder}
          className="w-full mt-6 py-3 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition flex items-center justify-center gap-2"
        >
          <IoRefresh size={18} />
          تحديث البيانات
        </button>
      </div>
    </div>
  );
};

export default TrackOrder;
