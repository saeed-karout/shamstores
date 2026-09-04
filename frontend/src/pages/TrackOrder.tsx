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

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

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
      case 'pending': return '#FBBF24';
      case 'processing': return C.blue;
      case 'shipped': return C.purple;
      case 'delivered': return C.accent;
      case 'cancelled': return C.red;
      default: return C.muted;
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
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: `2px solid ${C.accent}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto'
          }} />
          <p style={{ marginTop: 16, color: C.muted, fontFamily: 'Cairo, sans-serif' }}>جاري تحميل معلومات الطلب...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, fontFamily: 'Cairo, sans-serif' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>الطلب غير موجود</h2>
          <p style={{ color: C.muted, marginBottom: 24 }}>{error || 'لم نتمكن من العثور على الطلب'}</p>
          <Link
            to="/"
            style={{
              padding: '12px 24px', background: C.accent, color: C.bg,
              borderRadius: 12, textDecoration: 'none', fontWeight: 600
            }}
          >
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
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ background: '#0D3B2E', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 768, margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ padding: 8, background: C.surf, border: 'none', borderRadius: '50%', cursor: 'pointer', color: C.text }}
            >
              <IoArrowBack size={24} />
            </button>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>تتبع الطلب</h1>
            <button
              onClick={shareOrder}
              aria-label="مشاركة الطلب"
              style={{ padding: 8, background: C.surf, border: 'none', borderRadius: '50%', cursor: 'pointer', color: C.text }}
            >
              <IoShare size={22} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 768, margin: '0 auto', padding: '24px 16px' }}>
        {/* Order Number */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ color: C.muted, fontSize: 14 }}>رقم الطلب</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ color: C.text, fontSize: 28, fontWeight: 700, fontFamily: 'monospace' }}>{order.orderNumber}</p>
                <button
                  onClick={copyOrderNumber}
                  aria-label="نسخ رقم الطلب"
                  style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
                >
                  <IoCopy size={18} />
                </button>
              </div>
            </div>
            <div style={{
              padding: '8px 16px', borderRadius: 20, fontWeight: 500,
              background: `${getStatusColor(order.status)}20`,
              color: getStatusColor(order.status),
            }}>
              {getStatusText(order.status)}
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 24 }}>حالة الطلب</h2>
          <div style={{ position: 'relative' }}>
            {/* Track line */}
            <div style={{ position: 'absolute', top: 20, right: 0, left: 0, height: 2, background: C.surf }}>
              <div
                style={{
                  height: '100%', background: C.accent, transition: 'width 0.5s',
                  width: `${(currentStep / (statusSteps.length - 1)) * 100}%`
                }}
              />
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={step.key} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 8px',
                        background: isCompleted ? C.accent : C.surf,
                        color: isCompleted ? C.bg : C.muted,
                        boxShadow: isCurrent ? `0 0 0 4px rgba(200,226,53,0.25)` : 'none',
                        transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.3s',
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <p style={{ fontSize: 12, color: isCompleted ? C.accent : C.muted, fontWeight: isCompleted ? 500 : 400 }}>
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
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoLocation style={{ color: C.accent }} />
              عنوان التوصيل
            </h2>
            <p style={{ color: C.text }}>{order.deliveryAddress}</p>
            {order.deliveryLat && order.deliveryLng && (
              <a
                href={`https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, color: C.accent, fontSize: 14, textDecoration: 'none' }}
              >
                <IoMap size={16} />
                فتح في خرائط جوجل
              </a>
            )}
          </div>
        )}

        {/* Driver Info */}
        {order.assignedDriver && (order.status === 'processing' || order.status === 'shipped') && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCar style={{ color: C.accent }} />
              معلومات المندوب
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ color: C.text }}><span style={{ color: C.muted }}>الاسم:</span> {order.assignedDriver.name}</p>
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
                <span style={{ color: C.muted }}>الهاتف:</span>
                <a href={`tel:${order.assignedDriver.phone}`} style={{ color: C.accent, textDecoration: 'none' }}>
                  {order.assignedDriver.phone}
                </a>
                <IoCall size={14} style={{ color: C.muted }} />
              </p>
              {driverLocation && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(96,165,250,0.1)', borderRadius: 12 }}>
                  <p style={{ fontSize: 14, color: C.blue, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoRefresh style={{ animation: 'spin 1s linear infinite' }} size={14} />
                    موقع المندوب يتم تحديثه تلقائياً
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 16 }}>المنتجات المطلوبة</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {order.orderItems.map((item) => {
              const product = item.product || item.menuItem;
              return (
                <div key={item.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                  {product?.image && (
                    <img
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ color: C.text, fontWeight: 500 }}>{product?.name || 'منتج'}</p>
                    <p style={{ color: C.muted, fontSize: 14 }}>الكمية: {item.quantity}</p>
                  </div>
                  <p style={{ color: C.accent, fontWeight: 700 }}>{item.price * item.quantity} ر.س</p>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: C.text, fontWeight: 700 }}>الإجمالي</span>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 18 }}>{order.total} ر.س</span>
          </div>
        </div>

        {/* Dates */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginBottom: 16 }}>معلومات إضافية</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <p style={{ color: C.text }}><span style={{ color: C.muted }}>تاريخ الطلب:</span> {new Date(order.createdAt).toLocaleString('ar')}</p>
            {order.estimatedDeliveryTime && (
              <p style={{ color: C.text }}><span style={{ color: C.muted }}>الوقت المتوقع:</span> {new Date(order.estimatedDeliveryTime).toLocaleString('ar')}</p>
            )}
            {order.actualDeliveryTime && (
              <p style={{ color: C.text }}><span style={{ color: C.muted }}>وقت التوصيل:</span> {new Date(order.actualDeliveryTime).toLocaleString('ar')}</p>
            )}
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
              <span style={{ color: C.muted }}>طريقة الدفع:</span>
              {order.paymentMethod === 'cash' ? 'كاش' : order.paymentMethod === 'card' ? 'بطاقة' : 'أونلاين'}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
              <span style={{ color: C.muted }}>حالة الدفع:</span>
              {order.isPaid ? (
                <span style={{ color: C.accent }}>مدفوع</span>
              ) : (
                <span style={{ color: '#FBBF24' }}>غير مدفوع</span>
              )}
              {!order.isPaid && order.paymentMethod === 'cash' && (
                <span style={{ fontSize: 12, color: C.muted }}>(سيتم الدفع عند الاستلام)</span>
              )}
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchOrder}
          style={{
            width: '100%', marginTop: 24, padding: '12px 0',
            background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12,
            color: C.muted, fontFamily: 'Cairo, sans-serif', fontSize: 16,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <IoRefresh size={18} />
          تحديث البيانات
        </button>
      </div>
    </div>
  );
};

export default TrackOrder;
