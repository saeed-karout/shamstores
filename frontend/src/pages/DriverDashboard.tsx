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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'delivering': return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'delivered': return 'bg-gradient-to-r from-gray-500 to-gray-600';
      default: return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
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
      case 'cash': return <IoCash className="text-green-600" />;
      case 'card': return <IoCard className="text-blue-600" />;
      default: return <IoWallet className="text-purple-600" />;
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
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header مع خريطة مصغرة */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 to-blue-700">
        {/* خريطة في الخلفية */}
        {selectedOrder?.deliveryLat && selectedOrder?.deliveryLng && (
          <iframe
            ref={mapRef}
            title="Map"
            className="absolute inset-0 w-full h-full opacity-30"
            frameBorder="0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedOrder.deliveryLng - 0.02},${selectedOrder.deliveryLat - 0.02},${selectedOrder.deliveryLng + 0.02},${selectedOrder.deliveryLat + 0.02}&layer=mapnik&marker=${selectedOrder.deliveryLat},${selectedOrder.deliveryLng}`}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/80 to-blue-700/80" />
        
        {/* محتوى الهيدر */}
        <div className="relative z-10 p-4 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="lg:hidden p-2 rounded-lg bg-white/20"
              >
                <IoMenu size={24} />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <IoCar className="text-yellow-300" />
                  {user?.name}
                </h1>
                <p className="text-sm opacity-90">مندوب توصيل</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentLocation && (
                <div className="bg-green-500/30 rounded-lg px-3 py-1 text-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="hidden sm:inline">متصل</span>
                </div>
              )}
              <button
                onClick={() => { setRefreshing(true); fetchOrders(); }}
                disabled={refreshing}
                className="bg-white/20 p-2 rounded-lg hover:bg-white/30"
              >
                <IoRefresh size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={logout}
                className="bg-red-500/30 p-2 rounded-lg hover:bg-red-500/50"
              >
                <IoLogOut size={20} />
              </button>
            </div>
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{activeOrders.length}</div>
              <div className="text-xs">طلبات نشطة</div>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{completedOrders.length}</div>
              <div className="text-xs">مكتملة اليوم</div>
            </div>
            <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm">
              <div className="text-2xl font-bold">{orders.length}</div>
              <div className="text-xs">جميع الطلبات</div>
            </div>
          </div>
        </div>

        {/* زر العودة للخلف */}
        {selectedOrder && (
          <button
            onClick={() => setSelectedOrder(null)}
            className="absolute top-20 left-4 z-20 bg-black/50 p-2 rounded-full"
          >
            <IoArrowBack size={20} className="text-white" />
          </button>
        )}
      </div>

      {/* القائمة الجانبية للجوال */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 shadow-xl"
            >
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">القائمة</h3>
                  <button onClick={() => setShowMenu(false)} className="p-1">
                    <IoClose size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">المندوب</p>
                    <p className="font-bold">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">طلبات اليوم</p>
                    <p className="font-bold text-2xl text-green-600">{completedOrders.length}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* قائمة الطلبات */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeOrders.length === 0 && completedOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <IoCar className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">لا توجد طلبات مخصصة لك حالياً</p>
            <p className="text-sm text-gray-400 mt-2">سيظهر هنا الطلبات عندما يتم تعيينك من قبل المطعم</p>
          </div>
        ) : (
          <>
            {/* الطلبات النشطة */}
            {activeOrders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  الطلبات النشطة ({activeOrders.length})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {activeOrders.map(order => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                        selectedOrder?.id === order.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className={`p-4 ${getStatusColor(order.status)} text-white`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-lg">#{order.orderNumber}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">
                                {getStatusText(order.status)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{order.total} ل.س</div>
                            <div className="text-xs opacity-90">{formatTime(order.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <IoPerson className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <a href={`tel:${order.customerPhone}`} className="text-sm text-blue-500 flex items-center gap-1">
                              <IoCall size={12} />
                              {order.customerPhone}
                            </a>
                          </div>
                          <div className="mr-auto flex items-center gap-1">
                            {getPaymentIcon(order.paymentMethod)}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              order.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.isPaid ? 'مدفوع' : 'غير مدفوع'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                          <IoLocation className="mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{order.deliveryAddress}</span>
                        </div>

                        <div className="flex gap-2">
                          {order.status === 'ready' && order.restaurantLat && order.restaurantLng && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                getDirections(order.restaurantLat!, order.restaurantLng!);
                              }}
                              className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1"
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
                              className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1"
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
                              className="flex-1 bg-purple-500 text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1"
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
                              className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1"
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
                <h2 className="text-lg font-bold mb-4 text-gray-500">الطلبات المكتملة</h2>
                <div className="grid grid-cols-1 gap-3">
                  {completedOrders.slice(0, 5).map(order => (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm p-3 opacity-75">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold">#{order.orderNumber}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{order.customerName}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{order.total} ل.س</div>
                          <div className="text-xs text-gray-400">{formatTime(order.createdAt)}</div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <IoHappy className="text-4xl text-green-600" />
              </div>
              <h3 className="text-xl font-bold">تقييم الطلب #{selectedOrderForRating.orderNumber}</h3>
              <p className="text-gray-500 text-sm mt-1">كيف كانت تجربة التوصيل؟</p>
            </div>

            {/* نجوم التقييم */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating({ ...rating, stars: star })}
                  className="text-4xl focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= rating.stars ? (
                    <IoStar className="text-yellow-400" />
                  ) : (
                    <IoStarOutline className="text-gray-300" />
                  )}
                </button>
              ))}
            </div>

            {/* ملاحظات */}
            <textarea
              value={rating.comment}
              onChange={(e) => setRating({ ...rating, comment: e.target.value })}
              placeholder="أضف ملاحظاتك (اختياري)..."
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-2 border rounded-xl hover:bg-gray-50"
              >
                تخطي
              </button>
              <button
                onClick={submitRating}
                className="flex-1 bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600"
              >
                إرسال التقييم
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* مودال الدفع */}
      {showPaymentModal && selectedPaymentOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold mb-4">تأكيد الدفع</h3>
            <p className="text-gray-600 mb-4">
              طلب #{selectedPaymentOrder.orderNumber}
              <br />
              المبلغ: <span className="font-bold text-green-600">{selectedPaymentOrder.total} ل.س</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updatePaymentStatus(selectedPaymentOrder.id, true)}
                className="flex-1 bg-green-500 text-white py-2 rounded-xl hover:bg-green-600"
              >
                تأكيد الدفع
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 border py-2 rounded-xl hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* تفاصيل الطلب الموسعة */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-40 overflow-y-auto" onClick={() => setSelectedOrder(null)}>
          <div className="min-h-screen flex items-end md:items-center justify-center p-4">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 ${getStatusColor(selectedOrder.status)} text-white rounded-t-2xl`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">#{selectedOrder.orderNumber}</span>
                  <button onClick={() => setSelectedOrder(null)} className="p-1">
                    <IoClose size={24} />
                  </button>
                </div>
                <p className="text-sm opacity-90 mt-1">{new Date(selectedOrder.createdAt).toLocaleString('ar-SA')}</p>
              </div>

              <div className="p-5 space-y-4">
                {/* معلومات العميل */}
                <div>
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <IoPerson />
                    معلومات العميل
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <p><span className="text-gray-500">الاسم:</span> {selectedOrder.customerName}</p>
                    <p><span className="text-gray-500">الهاتف:</span> 
                      <a href={`tel:${selectedOrder.customerPhone}`} className="text-blue-500 mr-2">{selectedOrder.customerPhone}</a>
                    </p>
                    <p><span className="text-gray-500">العنوان:</span> {selectedOrder.deliveryAddress}</p>
                  </div>
                </div>

                {/* معلومات المطعم */}
                <div>
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <IoLocation />
                    المطعم
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="font-medium">{selectedOrder.restaurantName}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.restaurantAddress}</p>
                  </div>
                </div>

                {/* تفاصيل الدفع */}
                <div>
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <IoWallet />
                    تفاصيل الدفع
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{selectedOrder.subtotal} ل.س</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>الخصم:</span>
                        <span>- {selectedOrder.discountAmount} ل.س</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>الإجمالي:</span>
                      <span className="text-green-600">{selectedOrder.total} ل.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span>طريقة الدفع:</span>
                      <span className="flex items-center gap-1">
                        {getPaymentIcon(selectedOrder.paymentMethod)}
                        {selectedOrder.paymentMethod === 'cash' ? 'كاش' : 'بطاقة'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>حالة الدفع:</span>
                      <button
                        onClick={() => {
                          setSelectedPaymentOrder(selectedOrder);
                          setShowPaymentModal(true);
                          setSelectedOrder(null);
                        }}
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          selectedOrder.isPaid 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {selectedOrder.isPaid ? 'مدفوع' : 'غير مدفوع - اضغط للتحديث'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ملاحظات */}
                {selectedOrder.notes && (
                  <div>
                    <h4 className="font-bold mb-2">ملاحظات</h4>
                    <div className="bg-yellow-50 rounded-xl p-3">
                      <p className="text-sm">{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}

                {/* أزرار الإجراءات */}
                <div className="flex gap-2 pt-2">
                  {selectedOrder.status === 'ready' && (
                    <>
                      <button
                        onClick={() => {
                          if (selectedOrder.restaurantLat && selectedOrder.restaurantLng) {
                            getDirections(selectedOrder.restaurantLat, selectedOrder.restaurantLng);
                          }
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 rounded-xl"
                      >
                        الاتجاه إلى المطعم
                      </button>
                      <button
                        onClick={() => acceptOrder(selectedOrder.id)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-xl"
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
                        className="flex-1 bg-purple-500 text-white py-2 rounded-xl"
                      >
                        الاتجاه إلى العميل
                      </button>
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                        className="flex-1 bg-green-600 text-white py-2 rounded-xl"
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