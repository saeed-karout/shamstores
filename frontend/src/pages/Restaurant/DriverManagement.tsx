// pages/DriverDashboard.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  IoCar, IoNavigate, IoCheckmarkCircle, IoTime, IoCall,
  IoLogOut, IoLocation, IoRefresh, IoMap, IoNotifications,
  IoCheckmark, IoClose, IoWarningOutline, IoStar, IoStarOutline,
  IoChatbubble, IoWallet, IoCash, IoCard, IoHappy, IoSad,
  IoMenu, IoArrowBack, IoInformationCircle, IoFastFood,
  IoReceipt, IoPricetag, IoCalendar, IoPerson, IoHome
} from 'react-icons/io5';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  size?: string;
  addons?: string[];
  notes?: string;
  menuItem?: {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    image?: string;
    price: number;
  };
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  status: 'ready' | 'delivering' | 'delivered';
  total: number;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  isPaid: boolean;
  paymentMethod: 'cash' | 'card' | 'online';
  deliveryFee: number;
  deliveryDistance?: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  driverAcceptedAt?: string;
  driverReachedAt?: string;
  paymentCollectedAt?: string;
  createdAt: string;
  notes?: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat?: number;
  restaurantLng?: number;
  restaurantPhone?: string;
  orderItems?: OrderItem[];
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
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showReachedModal, setShowReachedModal] = useState(false);
  const [selectedReachedOrder, setSelectedReachedOrder] = useState<DeliveryOrder | null>(null);

  const locationInterval = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrdersCount = useRef(0);

  useEffect(() => {
    fetchOrders();
    startLocationTracking();
    loadNotificationSound();

    const refreshInterval = setInterval(fetchOrders, 30000);
    const checkNewOrders = setInterval(() => {
      if (orders.length > previousOrdersCount.current) {
        audioRef.current?.play();
        toast.success('📢 طلب جديد متاح!', {
          duration: 5000,
          icon: '🚚',
          style: {
            background: '#10B981',
            color: 'white',
          },
        });
      }
      previousOrdersCount.current = orders.length;
    }, 5000);

    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
      clearInterval(refreshInterval);
      clearInterval(checkNewOrders);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [orders.length]);

  const loadNotificationSound = () => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  };

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
      await api.patch(`/delivery/orders/${orderId}/status`, { paymentCollected: true });
      toast.success(isPaid ? 'تم تأكيد الدفع' : 'تم تحديث حالة الدفع');
      setShowPaymentModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('فشل تحديث حالة الدفع');
    }
  };

  const markReachedRestaurant = async (orderId: string) => {
    try {
      await api.post(`/delivery/orders/${orderId}/reached-restaurant`, {});
      toast.success('تم تأكيد الوصول إلى المطعم');
      setShowReachedModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('فشل تأكيد الوصول');
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل قبول الطلب');
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

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'ready': return 'linear-gradient(135deg, #16A34A, #22C55E)';
      case 'delivering': return 'linear-gradient(135deg, #2563EB, #3B82F6)';
      case 'delivered': return 'linear-gradient(135deg, #4B5563, #6B7280)';
      default: return 'linear-gradient(135deg, #D97706, #F59E0B)';
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'كاش';
      case 'card': return 'بطاقة';
      default: return 'أونلاين';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy - hh:mm a', { locale: arSA });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'hh:mm a', { locale: arSA });
  };

  const activeOrders = orders.filter(o => o.status === 'ready' || o.status === 'delivering');
  const completedOrders = orders.filter(o => o.status === 'delivered');

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', paddingBottom: 80, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0F3D31, #082E24)', color: C.text, position: 'relative' }}>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{ background: 'rgba(200,226,53,0.1)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: C.text }}
              >
                <IoMenu size={24} />
              </button>
              <div>
                <h1 style={{ color: C.text, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoCar style={{ color: C.accent, display: 'inline' }} />
                  {user?.name}
                </h1>
                <p style={{ color: C.muted, fontSize: 13 }}>مندوب توصيل</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentLocation && (
                <div style={{ background: 'rgba(200,226,53,0.12)', borderRadius: 8, padding: '4px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%' }}></div>
                  <span>متصل</span>
                </div>
              )}
              <button
                onClick={() => { setRefreshing(true); fetchOrders(); }}
                disabled={refreshing}
                style={{ background: 'rgba(200,226,53,0.1)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: C.text }}
              >
                <IoRefresh size={20} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
              <button
                aria-label="تسجيل الخروج"
                onClick={logout}
                style={{ background: 'rgba(255,107,107,0.15)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: C.red }}
              >
                <IoLogOut size={20} />
              </button>
            </div>
          </div>

          {/* إحصائيات */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 24 }}>
            <div style={{ background: 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <div style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>{activeOrders.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>طلبات نشطة</div>
            </div>
            <div style={{ background: 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <div style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>{completedOrders.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>مكتملة اليوم</div>
            </div>
            <div style={{ background: 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 8, textAlign: 'center' }}>
              <div style={{ color: C.accent, fontSize: 24, fontWeight: 700 }}>{orders.length}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>جميع الطلبات</div>
            </div>
          </div>
        </div>
      </div>

      {/* القائمة الجانبية */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 256, background: C.card, zIndex: 50, boxShadow: '4px 0 24px rgba(0,0,0,0.5)', border: '1px solid ' + C.border }}
            >
              <div style={{ padding: 16, borderBottom: '1px solid ' + C.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: C.text, fontWeight: 700 }}>القائمة</h3>
                  <button onClick={() => setShowMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}>
                    <IoClose size={20} />
                  </button>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: 12, background: C.surf, borderRadius: 10 }}>
                    <p style={{ color: C.muted, fontSize: 13 }}>المندوب</p>
                    <p style={{ color: C.text, fontWeight: 700 }}>{user?.name}</p>
                    <p style={{ color: C.muted, fontSize: 12 }}>{user?.email}</p>
                  </div>
                  <div style={{ padding: 12, background: 'rgba(200,226,53,0.08)', borderRadius: 10 }}>
                    <p style={{ color: C.muted, fontSize: 13 }}>طلبات اليوم</p>
                    <p style={{ color: C.accent, fontWeight: 700, fontSize: 24 }}>{completedOrders.length}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* قائمة الطلبات */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px' }}>
        {activeOrders.length === 0 && completedOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', background: C.card, borderRadius: 16, border: '1px solid ' + C.border }}>
            <IoCar style={{ fontSize: 64, color: C.muted, opacity: 0.3, display: 'block', margin: '0 auto 16px' }} />
            <p style={{ color: C.muted, fontSize: 17 }}>لا توجد طلبات مخصصة لك حالياً</p>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 8, opacity: 0.7 }}>سيظهر هنا الطلبات عندما يتم تعيينك من قبل المطعم</p>
          </div>
        ) : (
          <>
            {/* الطلبات النشطة */}
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ color: C.text, fontSize: 17, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, background: C.accent, borderRadius: '50%' }}></div>
                  الطلبات النشطة ({activeOrders.length})
                </h2>
                <div style={{ display: 'grid', gap: 16 }}>
                  {activeOrders.map(order => (
                    <div
                      key={order.id}
                      style={{ background: C.card, borderRadius: 16, border: '1px solid ' + C.border, overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderDetails(true);
                      }}
                    >
                      {/* رأس البطاقة */}
                      <div style={{ padding: 16, background: getStatusGradient(order.status), color: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: 17 }}>#{order.orderNumber}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.2)' }}>
                                {getStatusText(order.status)}
                              </span>
                              {!order.isPaid && order.paymentMethod === 'cash' && (
                                <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.3)' }}>
                                  دفع عند الاستلام
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{order.total} ل.س</div>
                            <div style={{ fontSize: 12, opacity: 0.9 }}>{formatTime(order.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      {/* المحتوى المختصر */}
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <div style={{ width: 40, height: 40, background: 'rgba(96,165,250,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IoPerson style={{ color: C.blue }} />
                          </div>
                          <div>
                            <p style={{ color: C.text, fontWeight: 500 }}>{order.customerName}</p>
                            <a href={`tel:${order.customerPhone}`} style={{ color: C.blue, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                              <IoCall size={12} />
                              {order.customerPhone}
                            </a>
                          </div>
                          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {getPaymentIcon(order.paymentMethod)}
                            <span style={{ color: C.muted, fontSize: 12 }}>{getPaymentMethodText(order.paymentMethod)}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.muted, marginBottom: 12 }}>
                          <IoLocation style={{ marginTop: 2, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{order.deliveryAddress}</span>
                        </div>

                        {order.deliveryFee > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.accent, marginBottom: 12 }}>
                            <IoCar size={14} />
                            <span>سعر التوصيل: {order.deliveryFee} ل.س</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          {order.status === 'ready' && order.restaurantLat && order.restaurantLng && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                getDirections(order.restaurantLat!, order.restaurantLng!);
                              }}
                              style={{ flex: 1, background: C.blue, color: '#fff', border: 'none', padding: '8px 0', borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
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
                              style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '8px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                            >
                              <IoCheckmarkCircle size={14} />
                              قبول الطلب
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                            style={{ background: C.surf, color: C.text, border: 'none', padding: '8px 16px', borderRadius: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                          >
                            تفاصيل
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* الطلبات المكتملة */}
            {completedOrders.length > 0 && (
              <div>
                <h2 style={{ color: C.muted, fontSize: 17, fontWeight: 700, marginBottom: 16 }}>الطلبات المكتملة</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {completedOrders.slice(0, 5).map(order => (
                    <div key={order.id} style={{ background: C.card, borderRadius: 12, border: '1px solid ' + C.border, padding: 12, opacity: 0.75 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: C.text, fontWeight: 700 }}>#{order.orderNumber}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{ color: C.muted, fontSize: 13 }}>{order.customerName}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: C.accent, fontWeight: 700 }}>{order.total} ل.س</div>
                          <div style={{ color: C.muted, fontSize: 12 }}>{formatTime(order.createdAt)}</div>
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

      {/* مودال تفاصيل الطلب */}
      {showOrderDetails && selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, overflowY: 'auto' }} onClick={() => setShowOrderDetails(false)}>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ background: C.card, borderRadius: 16, maxWidth: 672, width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid ' + C.border }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* رأس المودال */}
              <div style={{ padding: 16, background: getStatusGradient(selectedOrder.status), borderRadius: '16px 16px 0 0', position: 'sticky', top: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>#{selectedOrder.orderNumber}</span>
                  <button onClick={() => setShowOrderDetails(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                    <IoClose size={24} />
                  </button>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>{formatDate(selectedOrder.createdAt)}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                  {!selectedOrder.isPaid && selectedOrder.paymentMethod === 'cash' && (
                    <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.3)', color: '#fff' }}>
                      دفع عند الاستلام
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* معلومات العميل */}
                <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                  <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoPerson style={{ color: C.blue }} />
                    معلومات العميل
                  </h3>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>الاسم:</span>
                      <span style={{ color: C.text, fontWeight: 500 }}>{selectedOrder.customerName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>الهاتف:</span>
                      <a href={`tel:${selectedOrder.customerPhone}`} style={{ color: C.blue, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <IoCall size={14} />
                        {selectedOrder.customerPhone}
                      </a>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>العنوان:</span>
                      <span style={{ color: C.text }}>{selectedOrder.deliveryAddress}</span>
                    </div>
                  </div>
                </div>

                {/* معلومات المطعم */}
                <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                  <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoHome style={{ color: C.accent }} />
                    المطعم
                  </h3>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>الاسم:</span>
                      <span style={{ color: C.text, fontWeight: 500 }}>{selectedOrder.restaurantName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>العنوان:</span>
                      <span style={{ color: C.text }}>{selectedOrder.restaurantAddress}</span>
                    </div>
                    {selectedOrder.restaurantPhone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.muted }}>الهاتف:</span>
                        <a href={`tel:${selectedOrder.restaurantPhone}`} style={{ color: C.blue, textDecoration: 'none' }}>
                          {selectedOrder.restaurantPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* تفاصيل الطلب - المنتجات */}
                <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                  <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoFastFood style={{ color: '#FB923C' }} />
                    المنتجات المطلوبة
                  </h3>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                      selectedOrder.orderItems.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < selectedOrder.orderItems!.length - 1 ? '1px solid ' + C.border : 'none' }}>
                          <div>
                            <span style={{ color: C.text, fontWeight: 500 }}>{item.menuItem?.name || 'منتج'}</span>
                            <span style={{ color: C.muted, marginRight: 8 }}>x{item.quantity}</span>
                            {item.size && (
                              <span style={{ color: C.muted, fontSize: 12, display: 'block' }}>المقاس: {item.size}</span>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <span style={{ color: C.muted, fontSize: 12, display: 'block' }}>إضافات: {item.addons.join(', ')}</span>
                            )}
                            {item.notes && (
                              <span style={{ color: '#FBB91F', fontSize: 12, display: 'block' }}>ملاحظة: {item.notes}</span>
                            )}
                          </div>
                          <span style={{ color: C.accent, fontWeight: 700 }}>{item.price * item.quantity} ل.س</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: C.muted, textAlign: 'center' }}>لا توجد منتجات</p>
                    )}
                  </div>
                </div>

                {/* تفاصيل الدفع */}
                <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                  <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoWallet style={{ color: C.purple }} />
                    تفاصيل الدفع
                  </h3>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>المجموع الفرعي:</span>
                      <span style={{ color: C.text }}>{selectedOrder.subtotal} ل.س</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.accent }}>الخصم:</span>
                        <span style={{ color: C.accent }}>- {selectedOrder.discountAmount} ل.س</span>
                      </div>
                    )}
                    {selectedOrder.deliveryFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.muted }}>سعر التوصيل:</span>
                        <span style={{ color: C.text }}>{selectedOrder.deliveryFee} ل.س</span>
                      </div>
                    )}
                    {selectedOrder.deliveryDistance && selectedOrder.deliveryDistance > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.muted, fontSize: 12 }}>المسافة:</span>
                        <span style={{ color: C.muted, fontSize: 12 }}>{selectedOrder.deliveryDistance} كم</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 8, borderTop: '1px solid ' + C.border }}>
                      <span style={{ color: C.text }}>الإجمالي:</span>
                      <span style={{ color: C.accent, fontSize: 17 }}>{selectedOrder.total} ل.س</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>طريقة الدفع:</span>
                      <span style={{ color: C.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {getPaymentIcon(selectedOrder.paymentMethod)}
                        {getPaymentMethodText(selectedOrder.paymentMethod)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: C.muted }}>حالة الدفع:</span>
                      <button
                        onClick={() => {
                          setSelectedPaymentOrder(selectedOrder);
                          setShowPaymentModal(true);
                        }}
                        style={{
                          padding: '2px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'Cairo, sans-serif',
                          ...(selectedOrder.isPaid
                            ? { background: 'rgba(200,226,53,0.12)', color: C.accent }
                            : { background: 'rgba(251,191,36,0.12)', color: '#FBB91F' })
                        }}
                      >
                        {selectedOrder.isPaid ? 'مدفوع' : 'غير مدفوع - اضغط للتحديث'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* معلومات التوصيل */}
                <div style={{ borderBottom: '1px solid ' + C.border, paddingBottom: 12 }}>
                  <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoTime style={{ color: C.blue }} />
                    معلومات التوصيل
                  </h3>
                  <div style={{ background: C.surf, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedOrder.estimatedDeliveryTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.muted }}>الوقت المتوقع:</span>
                        <span style={{ color: C.text }}>{formatTime(selectedOrder.estimatedDeliveryTime)}</span>
                      </div>
                    )}
                    {selectedOrder.driverAcceptedAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.accent }}>وقت قبول الطلب:</span>
                        <span style={{ color: C.accent }}>{formatTime(selectedOrder.driverAcceptedAt)}</span>
                      </div>
                    )}
                    {selectedOrder.actualDeliveryTime && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.accent }}>وقت التوصيل:</span>
                        <span style={{ color: C.accent }}>{formatTime(selectedOrder.actualDeliveryTime)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ملاحظات */}
                {selectedOrder.notes && (
                  <div>
                    <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IoChatbubble style={{ color: '#FBB91F' }} />
                      ملاحظات
                    </h3>
                    <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 12, padding: 12, border: '1px solid rgba(251,191,36,0.2)' }}>
                      <p style={{ color: C.text, fontSize: 14 }}>{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}

                {/* أزرار الإجراءات */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 16 }}>
                  {selectedOrder.status === 'ready' && selectedOrder.restaurantLat && selectedOrder.restaurantLng && (
                    <button
                      onClick={() => getDirections(selectedOrder.restaurantLat!, selectedOrder.restaurantLng!)}
                      style={{ flex: 1, background: C.blue, color: '#fff', border: 'none', padding: '12px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                    >
                      <IoNavigate size={18} />
                      الاتجاه إلى المطعم
                    </button>
                  )}

                  {selectedOrder.status === 'ready' && (
                    <button
                      onClick={() => acceptOrder(selectedOrder.id)}
                      style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '12px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                    >
                      <IoCheckmarkCircle size={18} />
                      قبول الطلب
                    </button>
                  )}

                  {selectedOrder.status === 'delivering' && selectedOrder.deliveryLat && selectedOrder.deliveryLng && (
                    <button
                      onClick={() => getDirections(selectedOrder.deliveryLat!, selectedOrder.deliveryLng!)}
                      style={{ flex: 1, background: C.purple, color: '#fff', border: 'none', padding: '12px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                    >
                      <IoNavigate size={18} />
                      الاتجاه إلى العميل
                    </button>
                  )}

                  {selectedOrder.status === 'delivering' && (
                    <>
                      {!selectedOrder.isPaid && selectedOrder.paymentMethod === 'cash' && (
                        <button
                          onClick={() => {
                            setSelectedPaymentOrder(selectedOrder);
                            setShowPaymentModal(true);
                          }}
                          style={{ flex: 1, background: '#F59E0B', color: '#fff', border: 'none', padding: '12px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                        >
                          <IoCash size={18} />
                          تأكيد الدفع
                        </button>
                      )}
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                        style={{ flex: 1, background: '#16A34A', color: '#fff', border: 'none', padding: '12px 0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                      >
                        <IoCheckmarkCircle size={18} />
                        {selectedOrder.isPaid ? 'إنهاء الطلب' : 'تسليم بدون دفع'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* مودال الدفع */}
      {showPaymentModal && selectedPaymentOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: C.card, borderRadius: 16, maxWidth: 448, width: '100%', padding: 24, border: '1px solid ' + C.border }}
          >
            <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 16 }}>تأكيد الدفع</h3>
            <p style={{ color: C.muted, marginBottom: 16 }}>
              طلب #{selectedPaymentOrder.orderNumber}
              <br />
              المبلغ: <span style={{ color: C.accent, fontWeight: 700 }}>{selectedPaymentOrder.total} ل.س</span>
              <br />
              طريقة الدفع: {getPaymentMethodText(selectedPaymentOrder.paymentMethod)}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updatePaymentStatus(selectedPaymentOrder.id, true)}
                style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
              >
                تأكيد الدفع
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ flex: 1, background: C.surf, color: C.text, border: '1px solid ' + C.border, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* مودال التقييم */}
      {showRatingModal && selectedOrderForRating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: C.card, borderRadius: 16, maxWidth: 448, width: '100%', padding: 24, border: '1px solid ' + C.border }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, background: 'rgba(200,226,53,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <IoHappy style={{ fontSize: 36, color: C.accent }} />
              </div>
              <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>تقييم الطلب #{selectedOrderForRating.orderNumber}</h3>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>كيف كانت تجربة التوصيل؟</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating({ ...rating, stars: star })}
                  style={{ background: 'none', border: 'none', fontSize: 36, cursor: 'pointer' }}
                >
                  {star <= rating.stars ? (
                    <IoStar style={{ color: '#FBB91F' }} />
                  ) : (
                    <IoStarOutline style={{ color: C.muted }} />
                  )}
                </button>
              ))}
            </div>

            <textarea
              value={rating.comment}
              onChange={(e) => setRating({ ...rating, comment: e.target.value })}
              placeholder="أضف ملاحظاتك (اختياري)..."
              style={{ width: '100%', padding: 12, background: C.surf, border: '1px solid ' + C.border, borderRadius: 12, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, marginBottom: 16, resize: 'none', boxSizing: 'border-box' }}
              rows={3}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{ flex: 1, background: C.surf, color: C.text, border: '1px solid ' + C.border, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
              >
                تخطي
              </button>
              <button
                onClick={submitRating}
                style={{ flex: 1, background: C.accent, color: C.bg, border: 'none', padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
              >
                إرسال التقييم
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
