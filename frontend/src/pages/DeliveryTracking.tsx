import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IoLocation, IoNavigate, IoCall, IoTime, IoCheckmarkCircle, IoCar } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../services/api';
import Loader from '../components/common/Loader';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  accent: '#C8E235',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#FBBF24',
};

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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'قيد الانتظار',  color: C.yellow,  bg: 'rgba(251,191,36,0.15)' },
  preparing:  { label: 'قيد التحضير',  color: C.blue,    bg: 'rgba(96,165,250,0.15)' },
  ready:      { label: 'جاهز للتوصيل', color: C.accent,  bg: 'rgba(200,226,53,0.15)' },
  delivering: { label: 'قيد التوصيل',  color: C.blue,    bg: 'rgba(96,165,250,0.15)' },
  delivered:  { label: 'تم التوصيل',   color: C.accent,  bg: 'rgba(200,226,53,0.15)' },
};

const STEPS = ['pending', 'preparing', 'ready', 'delivering', 'delivered'];

const DeliveryTracking: React.FC = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
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

  if (loading) return <Loader fullScreen />;
  if (!order) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Cairo, sans-serif' }}>
      الطلب غير موجود
    </div>
  );

  const status = statusConfig[order.status] || { label: order.status, color: C.muted, bg: 'rgba(157,196,172,0.1)' };
  const currentStepIndex = STEPS.indexOf(order.status);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 16px', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: C.prim, padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: C.accent, fontWeight: 800, fontSize: 18 }}>طلب #{order.orderNumber}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                  <IoTime size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                  {new Date(order.createdAt).toLocaleString('ar-SA')}
                </div>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: status.bg, color: status.color }}>
                {status.label}
              </span>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            {/* Progress steps */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 0 }}>
              {STEPS.map((step, i) => {
                const done = i <= currentStepIndex;
                const sc = statusConfig[step];
                return (
                  <React.Fragment key={step}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? C.accent : C.surf, border: `2px solid ${done ? C.accent : C.border}`, transition: 'all 0.3s' }}>
                        {done ? <IoCheckmarkCircle size={18} style={{ color: C.bg }} /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.border }} />}
                      </div>
                      <div style={{ color: done ? C.accent : C.muted, fontSize: 10, marginTop: 4, textAlign: 'center' }}>{sc?.label}</div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ flex: 2, height: 2, background: i < currentStepIndex ? C.accent : C.border, transition: 'all 0.3s', marginBottom: 20 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Customer info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: C.surf, borderRadius: 12, padding: 16 }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>معلومات العميل</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text, fontSize: 14, marginBottom: 6 }}>
                  <IoLocation size={14} style={{ color: C.accent }} />
                  {order.customerName}
                </div>
                <a href={`tel:${order.customerPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.accent, fontSize: 14, textDecoration: 'none' }}>
                  <IoCall size={14} />
                  {order.customerPhone}
                </a>
              </div>

              <div style={{ background: C.surf, borderRadius: 12, padding: 16 }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>المجموع</div>
                <div style={{ color: C.accent, fontSize: 26, fontWeight: 800 }}>{order.total}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>ل.س</div>
              </div>
            </div>

            {/* Delivery address */}
            {order.deliveryAddress && (
              <div style={{ background: 'rgba(200,226,53,0.06)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.accent, fontWeight: 700, marginBottom: 8 }}>
                  <IoNavigate size={16} /> عنوان التوصيل
                </div>
                <p style={{ color: C.text, fontSize: 14, marginBottom: 12 }}>{order.deliveryAddress}</p>
                <button
                  onClick={openInGoogleMaps}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: C.accent, color: C.bg, border: 'none', borderRadius: 8, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  <IoNavigate size={14} /> فتح في خرائط جوجل
                </button>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: 16, marginTop: 16 }}>
                <div style={{ color: C.yellow, fontWeight: 700, marginBottom: 6, fontSize: 14 }}>ملاحظات</div>
                <p style={{ color: C.text, fontSize: 14 }}>{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        {order.deliveryLat && order.deliveryLng && mapLoaded && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoLocation size={18} style={{ color: C.red }} />
              <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>موقع التوصيل</span>
            </div>
            <div style={{ height: 320 }}>
              <iframe
                title="Delivery Location"
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.deliveryLng - 0.01},${order.deliveryLat - 0.01},${order.deliveryLng + 0.01},${order.deliveryLat + 0.01}&layer=mapnik&marker=${order.deliveryLat},${order.deliveryLng}`}
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
