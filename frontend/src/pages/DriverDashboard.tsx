// pages/DriverDashboard.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  IoCar, IoNavigate, IoCheckmarkCircle, IoTime, IoCall,
  IoLogOut, IoLocation, IoRefresh, IoMap, IoNotifications,
  IoCheckmark, IoClose, IoWarningOutline, IoStar, IoStarOutline,
  IoChatbubble, IoWallet, IoCash, IoCard, IoHappy, IoSad,
  IoMenu, IoArrowBack, IoInformationCircle,
  IoPerson
} from 'react-icons/io5';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/common/Loader';
import { motion, AnimatePresence } from 'framer-motion';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  status: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  isPaid: boolean;
  paymentMethod: string;
  createdAt: string;
  notes?: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat?: number;
  restaurantLng?: number;
  estimatedDeliveryTime?: string;
}

interface Rating {
  stars: number;
  comment: string;
}

const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState<Rating>({ stars: 0, comment: '' });
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<DeliveryOrder | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentOrder, setSelectedPaymentOrder] = useState<DeliveryOrder | null>(null);

  const locationInterval = useRef<NodeJS.Timeout>();
  const mapRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchOrders();
    startLocationTracking();

    const refreshInterval = setInterval(fetchOrders, 30000);

    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/delivery/driver/orders');
      setOrders(response);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('فشل تحميل الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    locationInterval.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);

          try {
            await api.post('/delivery/driver/location', location);
          } catch (error) {
            console.error('Error sending location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }, 10000);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/delivery/orders/${orderId}/status`, { status });

      if (status === 'delivered') {
        // عرض مودال التقييم بعد إتمام التوصيل
        const completedOrder = orders.find(o => o.id === orderId);
        if (completedOrder) {
          setSelectedOrderForRating(completedOrder);
          setShowRatingModal(true);
        }
      }

      toast.success(getStatusMessage(status));
      fetchOrders();
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const updatePaymentStatus = async (orderId: string, isPaid: boolean) => {
    try {
      await api.patch(`/orders/${orderId}/payment`, { isPaid });
      toast.success(isPaid ? 'تم تأكيد الدفع' : 'تم تحديث حالة الدفع');
      setShowPaymentModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('فشل تحديث حالة الدفع');
    }
  };

  const submitRating = async () => {
    if (rating.stars === 0) {
      toast.error('الرجاء تقييم الطلب');
      return;
    }

    try {
      await api.post(`/delivery/orders/${selectedOrderForRating?.id}/rate`, rating);
      toast.success('شكراً لتقييمك');
      setShowRatingModal(false);
      setRating({ stars: 0, comment: '' });
      fetchOrders();
    } catch (error) {
      toast.error('فشل إرسال التقييم');
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await api.post(`/delivery/orders/${orderId}/accept`, {});
      toast.success('تم قبول الطلب');
      fetchOrders();
    } catch (error) {
      toast.error('فشل قبول الطلب');
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const getDirections = (lat: number, lng: number) => {
    if (currentLocation) {
      const url = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      openInMaps(lat, lng);
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'delivering': return 'تم بدء التوصيل';
      case 'delivered': return 'تم إتمام التوصيل بنجاح';
      default: return 'تم تحديث الحالة';
    }
  };

  const getStatusBg = (status: string): string => {
    switch (status) {
      case 'ready': return C.accent;
      case 'delivering': return C.blue;
      case 'delivered': return C.muted;
      default: return C.orange;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'جاهز للتوصيل';
      case 'delivering': return 'قيد التوصيل';
      case 'delivered': return 'تم التوصيل';
      default: return status;
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <IoCash style={{ color: C.accent }} />;
      case 'card': return <IoCard style={{ color: C.blue }} />;
      default: return <IoWallet style={{ color: C.purple }} />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const activeOrders = orders.filter(o => o.status === 'ready' || o.status === 'delivering');
  const completedOrders = orders.filter(o => o.status === 'delivered');

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Cairo, sans-serif', paddingBottom: 80 }} dir="rtl">
      {/* Header */}
      <div style={{ position: 'relative', height: 256, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        {/* خريطة في الخلفية */}
        {selectedOrder?.deliveryLat && selectedOrder?.deliveryLng && (
          <iframe
            ref={mapRef}
            title="Map"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.2, border: 'none' }}
            frameBorder="0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedOrder.deliveryLng - 0.02},${selectedOrder.deliveryLat - 0.02},${selectedOrder.deliveryLng + 0.02},${selectedOrder.deliveryLat + 0.02}&layer=mapnik&marker=${selectedOrder.deliveryLat},${selectedOrder.deliveryLng}`}
          />
        )}

        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,46,36,0.85)' }} />

        {/* محتوى الهيدر */}
        <div style={{ position: 'relative', zIndex: 10, padding: 16, color: C.text }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{ padding: 8, borderRadius: 8, background: 'rgba(200,226,53,0.1)', border: 'none', cursor: 'pointer', color: C.text }}
              >
                <IoMenu size={24} />
              </button>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <IoCar style={{ color: C.accent }} />
                  <span style={{ color: C.accent }}>{user?.name}</span>
                </h1>
                <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>مندوب توصيل</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentLocation && (
                <div style={{ background: 'rgba(200,226,53,0.1)', borderRadius: 8, padding: '4px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                  <span>متصل</span>
                </div>
              )}
              <button
                onClick={() => { setRefreshing(true); fetchOrders(); }}
                disabled={refreshing}
                style={{ background: 'rgba(200,226,53,0.1)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: C.text }}
              >
                <IoRefresh size={20} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
              <button
                onClick={logout}
                style={{ background: 'rgba(255,107,107,0.15)', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: C.red }}
              >
                <IoLogOut size={20} />
              </button>
            </div>
          </div>

          {/* إحصائيات سريعة */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 24 }}>
            <div style={{ background: 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{activeOrders.length}</div>
              <div style={{ fontSize: 11, color: C.muted }}>طلبات نشطة</div>
            </div>
            <div style={{ background: 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{completedOrders.length}</div>
              <div style={{ fontSize: 11, color: C.muted }}>مكتملة اليوم</div>
            </div>
            <div style={{ background: 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.accent }}>{orders.length}</div>
              <div style={{ fontSize: 11, color: C.muted }}>جميع الطلبات</div>
            </div>
          </div>
        </div>

        {/* زر العودة للخلف */}
        {selectedOrder && (
          <button
            onClick={() => setSelectedOrder(null)}
            style={{ position: 'absolute', top: 80, left: 16, zIndex: 20, background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', color: C.text }}
          >
            <IoArrowBack size={20} />
          </button>
        )}
      </div>

      {/* القائمة الجانبية للجوال */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 256, background: C.card, zIndex: 50, boxShadow: '4px 0 20px rgba(0,0,0,0.4)' }}
            >
              <div style={{ padding: 16, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 700, color: C.text, margin: 0 }}>القائمة</h3>
                  <button onClick={() => setShowMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
                    <IoClose size={20} />
                  </button>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: 12, background: C.surf, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 13, color: C.muted, margin: '0 0 4px' }}>المندوب</p>
                    <p style={{ fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{user?.email}</p>
                  </div>
                  <div style={{ padding: 12, background: C.surf, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 13, color: C.muted, margin: '0 0 4px' }}>طلبات اليوم</p>
                    <p style={{ fontWeight: 700, fontSize: 24, color: C.accent, margin: 0 }}>{completedOrders.length}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* قائمة الطلبات */}
      <div style={{ maxWidth: 896, margin: '0 auto', padding: '24px 16px' }}>
        {activeOrders.length === 0 && completedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <IoCar style={{ fontSize: 64, color: C.muted, display: 'block', margin: '0 auto 16px' }} />
            <p style={{ color: C.muted, fontSize: 18, margin: '0 0 8px' }}>لا توجد طلبات مخصصة لك حالياً</p>
            <p style={{ fontSize: 13, color: C.muted, opacity: 0.7, margin: 0 }}>سيظهر هنا الطلبات عندما يتم تعيينك من قبل المطعم</p>
          </div>
        ) : (
          <>
            {/* الطلبات النشطة */}
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
                  <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%' }}></div>
                  الطلبات النشطة ({activeOrders.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  {activeOrders.map(order => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: C.card,
                        borderRadius: 16,
                        border: selectedOrder?.id === order.id
                          ? `2px solid ${C.accent}`
                          : `1px solid ${C.border}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                      }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Status band */}
                      <div style={{
                        padding: 16,
                        background: order.status === 'ready'
                          ? 'rgba(200,226,53,0.12)'
                          : order.status === 'delivering'
                          ? 'rgba(96,165,250,0.12)'
                          : 'rgba(157,196,172,0.12)',
                        borderBottom: `1px solid ${C.border}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 18, color: C.text }}>#{order.orderNumber}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <span style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 20,
                                background: order.status === 'ready'
                                  ? 'rgba(200,226,53,0.15)'
                                  : order.status === 'delivering'
                                  ? 'rgba(96,165,250,0.15)'
                                  : 'rgba(157,196,172,0.15)',
                                color: order.status === 'ready'
                                  ? C.accent
                                  : order.status === 'delivering'
                                  ? C.blue
                                  : C.muted
                              }}>
                                {getStatusText(order.status)}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{order.total} ل.س</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{formatTime(order.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 40, height: 40, background: 'rgba(96,165,250,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IoPerson style={{ color: C.blue }} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 500, color: C.text, margin: 0 }}>{order.customerName}</p>
                            <a href={`tel:${order.customerPhone}`} style={{ fontSize: 13, color: C.blue, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                              <IoCall size={12} />
                              {order.customerPhone}
                            </a>
                          </div>
                          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {getPaymentIcon(order.paymentMethod)}
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 20,
                              background: order.isPaid ? 'rgba(200,226,53,0.15)' : 'rgba(251,146,60,0.15)',
                              color: order.isPaid ? C.accent : C.orange
                            }}>
                              {order.isPaid ? 'مدفوع' : 'غير مدفوع'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.muted, marginBottom: 12 }}>
                          <IoLocation style={{ marginTop: 2, flexShrink: 0, color: C.accent }} />
                          <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{order.deliveryAddress}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          {order.status === 'ready' && order.restaurantLat && order.restaurantLng && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                getDirections(order.restaurantLat!, order.restaurantLng!);
                              }}
                              style={{ flex: 1, background: 'rgba(96,165,250,0.15)', color: C.blue, border: `1px solid rgba(96,165,250,0.3)`, padding: '8px 0', borderRadius: 12, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            >
                              <IoNavigate size={14} />
                              إلى المطعم
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptOrder(order.id);
                              }}
                              style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '8px 0', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            >
                              <IoCheckmarkCircle size={14} />
                              قبول
                            </button>
                          )}

                          {order.status === 'delivering' && order.deliveryLat && order.deliveryLng && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                getDirections(order.deliveryLat!, order.deliveryLng!);
                              }}
                              style={{ flex: 1, background: 'rgba(167,139,250,0.15)', color: C.purple, border: `1px solid rgba(167,139,250,0.3)`, padding: '8px 0', borderRadius: 12, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            >
                              <IoNavigate size={14} />
                              إلى العميل
                            </button>
                          )}

                          {order.status === 'delivering' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrderStatus(order.id, 'delivered');
                              }}
                              style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '8px 0', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            >
                              <IoCheckmarkCircle size={14} />
                              إتمام
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* الطلبات المكتملة */}
            {completedOrders.length > 0 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: C.muted }}>الطلبات المكتملة</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {completedOrders.slice(0, 5).map(order => (
                    <div key={order.id} style={{ background: '#0A2018', borderRadius: 12, border: `1px solid ${C.border}`, padding: 12, opacity: 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: C.text }}>#{order.orderNumber}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>{order.customerName}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, color: C.accent }}>{order.total} ل.س</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{formatTime(order.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* مودال التقييم */}
      {showRatingModal && selectedOrderForRating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: C.card, borderRadius: 16, maxWidth: 448, width: '100%', padding: 24, border: `1px solid ${C.border}` }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, background: 'rgba(200,226,53,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <IoHappy style={{ fontSize: 32, color: C.accent }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>تقييم الطلب #{selectedOrderForRating.orderNumber}</h3>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>كيف كانت تجربة التوصيل؟</p>
            </div>

            {/* نجوم التقييم */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating({ ...rating, stars: star })}
                  style={{ fontSize: 36, background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.1s' }}
                >
                  {star <= rating.stars ? (
                    <IoStar style={{ color: '#FBBF24' }} />
                  ) : (
                    <IoStarOutline style={{ color: C.muted }} />
                  )}
                </button>
              ))}
            </div>

            {/* ملاحظات */}
            <textarea
              value={rating.comment}
              onChange={(e) => setRating({ ...rating, comment: e.target.value })}
              placeholder="أضف ملاحظاتك (اختياري)..."
              style={{ width: '100%', padding: 12, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 16, background: C.surf, color: C.text, resize: 'none', fontFamily: 'Cairo, sans-serif', boxSizing: 'border-box', outline: 'none' }}
              rows={3}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{ flex: 1, padding: '8px 0', border: `1px solid ${C.border}`, borderRadius: 12, background: 'transparent', cursor: 'pointer', color: C.muted, fontFamily: 'Cairo, sans-serif' }}
              >
                تخطي
              </button>
              <button
                onClick={submitRating}
                style={{ flex: 1, background: C.accent, color: C.bg, padding: '8px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}
              >
                إرسال التقييم
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* مودال الدفع */}
      {showPaymentModal && selectedPaymentOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: C.card, borderRadius: 16, maxWidth: 448, width: '100%', padding: 24, border: `1px solid ${C.border}` }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginTop: 0, marginBottom: 16 }}>تأكيد الدفع</h3>
            <p style={{ color: C.muted, marginBottom: 16 }}>
              طلب #{selectedPaymentOrder.orderNumber}
              <br />
              المبلغ: <span style={{ fontWeight: 700, color: C.accent }}>{selectedPaymentOrder.total} ل.س</span>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updatePaymentStatus(selectedPaymentOrder.id, true)}
                style={{ flex: 1, background: C.accent, color: C.bg, padding: '8px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}
              >
                تأكيد الدفع
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ flex: 1, border: `1px solid ${C.border}`, padding: '8px 0', borderRadius: 12, background: 'transparent', cursor: 'pointer', color: C.muted, fontFamily: 'Cairo, sans-serif' }}
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* تفاصيل الطلب الموسعة */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, overflowY: 'auto' }} onClick={() => setSelectedOrder(null)}>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ background: C.card, borderRadius: 16, maxWidth: 512, width: '100%', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Status header */}
              <div style={{
                padding: 16,
                background: selectedOrder.status === 'ready'
                  ? 'rgba(200,226,53,0.12)'
                  : selectedOrder.status === 'delivering'
                  ? 'rgba(96,165,250,0.12)'
                  : 'rgba(157,196,172,0.12)',
                borderRadius: '16px 16px 0 0',
                borderBottom: `1px solid ${C.border}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 18, color: C.text }}>#{selectedOrder.orderNumber}</span>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}>
                    <IoClose size={24} />
                  </button>
                </div>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 0 }}>{new Date(selectedOrder.createdAt).toLocaleString('ar-SA')}</p>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* معلومات العميل */}
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: C.text, marginTop: 0 }}>
                    <IoPerson style={{ color: C.accent }} />
                    معلومات العميل
                  </h4>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, border: `1px solid ${C.border}` }}>
                    <p style={{ margin: 0, color: C.text }}><span style={{ color: C.muted }}>الاسم:</span> {selectedOrder.customerName}</p>
                    <p style={{ margin: 0, color: C.text }}><span style={{ color: C.muted }}>الهاتف:</span>{' '}
                      <a href={`tel:${selectedOrder.customerPhone}`} style={{ color: C.blue }}>{selectedOrder.customerPhone}</a>
                    </p>
                    <p style={{ margin: 0, color: C.text }}><span style={{ color: C.muted }}>العنوان:</span> {selectedOrder.deliveryAddress}</p>
                  </div>
                </div>

                {/* معلومات المطعم */}
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: C.text, marginTop: 0 }}>
                    <IoLocation style={{ color: C.accent }} />
                    المطعم
                  </h4>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, border: `1px solid ${C.border}` }}>
                    <p style={{ fontWeight: 500, color: C.text, margin: '0 0 4px' }}>{selectedOrder.restaurantName}</p>
                    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{selectedOrder.restaurantAddress}</p>
                  </div>
                </div>

                {/* تفاصيل الدفع */}
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: C.text, marginTop: 0 }}>
                    <IoWallet style={{ color: C.accent }} />
                    تفاصيل الدفع
                  </h4>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                      <span>المجموع الفرعي:</span>
                      <span>{selectedOrder.subtotal} ل.س</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.accent }}>
                        <span>الخصم:</span>
                        <span>- {selectedOrder.discountAmount} ل.س</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 8, borderTop: `1px solid ${C.border}`, color: C.text }}>
                      <span>الإجمالي:</span>
                      <span style={{ color: C.accent }}>{selectedOrder.total} ل.س</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.text }}>
                      <span>طريقة الدفع:</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {getPaymentIcon(selectedOrder.paymentMethod)}
                        {selectedOrder.paymentMethod === 'cash' ? 'كاش' : 'بطاقة'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: C.text }}>
                      <span>حالة الدفع:</span>
                      <button
                        onClick={() => {
                          setSelectedPaymentOrder(selectedOrder);
                          setShowPaymentModal(true);
                          setSelectedOrder(null);
                        }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 11,
                          border: 'none',
                          cursor: 'pointer',
                          background: selectedOrder.isPaid ? 'rgba(200,226,53,0.15)' : 'rgba(251,146,60,0.15)',
                          color: selectedOrder.isPaid ? C.accent : C.orange
                        }}
                      >
                        {selectedOrder.isPaid ? 'مدفوع' : 'غير مدفوع - اضغط للتحديث'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ملاحظات */}
                {selectedOrder.notes && (
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: 8, color: C.text, marginTop: 0 }}>ملاحظات</h4>
                    <div style={{ background: 'rgba(251,146,60,0.08)', borderRadius: 12, padding: 12, border: `1px solid rgba(251,146,60,0.2)` }}>
                      <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}

                {/* أزرار الإجراءات */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                  {selectedOrder.status === 'ready' && (
                    <>
                      <button
                        onClick={() => {
                          if (selectedOrder.restaurantLat && selectedOrder.restaurantLng) {
                            getDirections(selectedOrder.restaurantLat, selectedOrder.restaurantLng);
                          }
                        }}
                        style={{ flex: 1, background: 'rgba(96,165,250,0.15)', color: C.blue, border: `1px solid rgba(96,165,250,0.3)`, padding: '8px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                      >
                        الاتجاه إلى المطعم
                      </button>
                      <button
                        onClick={() => acceptOrder(selectedOrder.id)}
                        style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '8px 0', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}
                      >
                        قبول الطلب
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'delivering' && (
                    <>
                      <button
                        onClick={() => {
                          if (selectedOrder.deliveryLat && selectedOrder.deliveryLng) {
                            getDirections(selectedOrder.deliveryLat, selectedOrder.deliveryLng);
                          }
                        }}
                        style={{ flex: 1, background: 'rgba(167,139,250,0.15)', color: C.purple, border: `1px solid rgba(167,139,250,0.3)`, padding: '8px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                      >
                        الاتجاه إلى العميل
                      </button>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                        style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '8px 0', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}
                      >
                        إتمام التوصيل
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
