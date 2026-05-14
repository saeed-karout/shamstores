// pages/DeliveryTracking.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IoLocation, IoNavigate, IoCall, IoTime, IoCheckmarkCircle } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../services/api';
import Loader from '../components/common/Loader';

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  status: string;
  total: number;
  createdAt: string;
  notes?: string;
}

const DeliveryTracking: React.FC = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    // تحميل خريطة Google Maps
    if (!document.querySelector('#google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('فشل تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (order?.deliveryLat && order?.deliveryLng) {
      window.open(`https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`, '_blank');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'preparing': return 'قيد التحضير';
      case 'ready': return 'جاهز للتوصيل';
      case 'delivering': return 'قيد التوصيل';
      case 'delivered': return 'تم التوصيل';
      default: return status;
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!order) return <div>الطلب غير موجود</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* بطاقة معلومات الطلب */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
            <h1 className="text-2xl font-bold">طلب #{order.orderNumber}</h1>
            <p className="text-sm opacity-90 mt-1">
              {new Date(order.createdAt).toLocaleString('ar-SA')}
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-3">معلومات العميل</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <IoLocation className="text-gray-400" />
                    <span>{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IoCall className="text-gray-400" />
                    <a href={`tel:${order.customerPhone}`} className="text-blue-500">
                      {order.customerPhone}
                    </a>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-3">حالة الطلب</h3>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-500' :
                    order.status === 'delivering' ? 'bg-blue-500' :
                    order.status === 'ready' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="font-medium">{getStatusText(order.status)}</span>
                </div>
              </div>
            </div>
            
            {order.deliveryAddress && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <IoNavigate className="text-blue-600" />
                  عنوان التوصيل
                </h3>
                <p className="text-gray-700 mb-3">{order.deliveryAddress}</p>
                <button
                  onClick={openInGoogleMaps}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <IoNavigate />
                  فتح في خرائط جوجل
                </button>
              </div>
            )}
            
            {order.notes && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                <h3 className="font-bold mb-2">ملاحظات</h3>
                <p className="text-gray-700">{order.notes}</p>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">المجموع</span>
                <span className="text-2xl font-bold text-green-600">{order.total} ل.س</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* خريطة الموقع */}
        {order.deliveryLat && order.deliveryLng && mapLoaded && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <IoLocation className="text-red-500" />
                موقع التوصيل على الخريطة
              </h2>
            </div>
            <div className="h-96">
              <iframe
                title="Delivery Location"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.deliveryLng-0.01},${order.deliveryLat-0.01},${order.deliveryLng+0.01},${order.deliveryLat+0.01}&layer=mapnik&marker=${order.deliveryLat},${order.deliveryLng}`}
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryTracking;