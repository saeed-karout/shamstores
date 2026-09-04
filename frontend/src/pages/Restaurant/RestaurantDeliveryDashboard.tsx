// components/RestaurantDeliveryDashboard.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  IoLocation,
  IoNavigate,
  IoCheckmarkCircle,
  IoTime,
  IoMap,
  IoCar,
  IoPerson,
  IoCall,
  IoRefresh,
  IoClose,
  IoFastFood,
  IoWallet,
  IoAlertCircle,
  IoPricetag,
  IoReceipt,
  IoCalendar,
  IoClipboard,
  IoCash,
  IoCard,
  IoSearch
} from 'react-icons/io5';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { motion } from 'framer-motion';

// ==================== Color Tokens ====================

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
};

// ==================== Types ====================

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  size?: string;
  addons?: string[];
  notes?: string;
  menuItem: {
    name: string;
    nameEn?: string;
    image?: string;
    price: number;
  };
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryLat?: number | string;
  deliveryLng?: number | string;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  total: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee?: number;
  deliveryDistance?: number;
  couponCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderType: string;
  paymentMethod: 'cash' | 'card' | 'online';
  isPaid: boolean;
  assignedDriverId?: string;
  assignedDriver?: Driver;
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  orderItems?: OrderItem[];
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  driverAcceptedAt?: string;
  driverReachedAt?: string;
}

// ==================== Helper Functions ====================

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'cash': return <IoCash style={{ color: C.accent }} size={14} />;
    case 'card': return <IoCard style={{ color: C.blue }} size={14} />;
    default: return <IoWallet style={{ color: C.purple }} size={14} />;
  }
};

const getPaymentMethodText = (method: string) => {
  switch (method) {
    case 'cash': return 'كاش';
    case 'card': return 'بطاقة';
    default: return 'أونلاين';
  }
};


const parseAddons = (addons: any): string[] => {
  if (!addons) return [];
  if (Array.isArray(addons)) return addons;
  if (typeof addons === 'string') {
    try {
      const parsed = JSON.parse(addons);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};


const getStatusStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case 'pending': return { background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' };
    case 'preparing': return { background: 'rgba(96,165,250,0.15)', color: C.blue, border: '1px solid rgba(96,165,250,0.3)' };
    case 'ready': return { background: 'rgba(200,226,53,0.15)', color: C.accent, border: '1px solid rgba(200,226,53,0.3)' };
    case 'delivering': return { background: 'rgba(167,139,250,0.15)', color: C.purple, border: '1px solid rgba(167,139,250,0.3)' };
    case 'delivered': return { background: 'rgba(157,196,172,0.15)', color: C.muted, border: '1px solid rgba(157,196,172,0.3)' };
    case 'cancelled': return { background: 'rgba(255,107,107,0.15)', color: C.red, border: '1px solid rgba(255,107,107,0.3)' };
    default: return { background: 'rgba(157,196,172,0.15)', color: C.muted, border: '1px solid rgba(157,196,172,0.3)' };
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'قيد الانتظار';
    case 'preparing': return 'قيد التحضير';
    case 'ready': return 'جاهز للتوصيل';
    case 'delivering': return 'قيد التوصيل';
    case 'delivered': return 'تم التوصيل';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
};

const getStatusMessage = (status: string) => {
  switch (status) {
    case 'preparing': return 'تم بدء تحضير الطلب';
    case 'ready': return 'الطلب جاهز للتوصيل';
    case 'delivering': return 'تم بدء التوصيل';
    case 'delivered': return 'تم توصيل الطلب';
    default: return 'تم تحديث الحالة';
  }
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd MMMM yyyy - hh:mm a', { locale: arSA });
};

const formatPrice = (price: number) => {
  return price.toLocaleString('ar-SY') + ' ل.س';
};

// ==================== Main Component ====================

const RestaurantDeliveryDashboard: React.FC = () => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<DeliveryOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    delivering: 0,
    delivered: 0,
    totalRevenue: 0
  });

  const fetchDeliveryOrders = useCallback(async () => {
    try {
      const response = await api.get('/delivery/restaurant/orders');
      setOrders(response);

      const newStats = {
        total: response.length,
        pending: response.filter((o: DeliveryOrder) => o.status === 'pending').length,
        preparing: response.filter((o: DeliveryOrder) => o.status === 'preparing').length,
        ready: response.filter((o: DeliveryOrder) => o.status === 'ready').length,
        delivering: response.filter((o: DeliveryOrder) => o.status === 'delivering').length,
        delivered: response.filter((o: DeliveryOrder) => o.status === 'delivered').length,
        totalRevenue: response.reduce((sum: number, o: DeliveryOrder) => sum + Number(o.total), 0)
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      toast.error('فشل تحميل طلبات التوصيل');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await api.get('/delivery/drivers');
      setDrivers(response);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  }, []);

  useEffect(() => {
    fetchDeliveryOrders();
    fetchDrivers();
    const interval = setInterval(() => fetchDeliveryOrders(), 30000);
    return () => clearInterval(interval);
  }, [fetchDeliveryOrders, fetchDrivers]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/delivery/orders/${orderId}/status`, { status });
      toast.success(getStatusMessage(status));
      fetchDeliveryOrders();
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      await api.post(`/delivery/orders/${orderId}/assign-driver`, { driverId });
      toast.success('تم تعيين السائق بنجاح');
      setShowAssignModal(false);
      setSelectedOrderForAssign(null);
      fetchDeliveryOrders();
    } catch (error) {
      toast.error('فشل تعيين السائق');
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const getDirections = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const getLat = (order: DeliveryOrder) => {
    if (order.deliveryLat) {
      return typeof order.deliveryLat === 'string' ? parseFloat(order.deliveryLat) : order.deliveryLat;
    }
    return null;
  };

  const getLng = (order: DeliveryOrder) => {
    if (order.deliveryLng) {
      return typeof order.deliveryLng === 'string' ? parseFloat(order.deliveryLng) : order.deliveryLng;
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter !== 'all' && order.status !== activeFilter) return false;
    if (searchTerm && !order.orderNumber.includes(searchTerm) &&
        !order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const deliveryOrders = filteredOrders.filter(o => o.orderType === 'delivery');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 384, background: C.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `3px solid transparent`,
            borderTopColor: C.accent,
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <p style={{ marginTop: 16, color: C.muted }}>جاري تحميل الطلبات...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #082E24, #0A2A1E)',
        color: C.text,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                <div style={{ background: 'rgba(200,226,53,0.15)', padding: 8, borderRadius: 12 }}>
                  <IoCar style={{ color: C.accent }} size={28} />
                </div>
                <span>طلبات التوصيل</span>
              </h1>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة طلبات التوصيل وتعيين السائقين</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'rgba(200,226,53,0.1)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: '8px 40px 8px 16px',
                    color: C.text,
                    outline: 'none',
                    fontFamily: 'Cairo, sans-serif',
                    fontSize: 13,
                    width: 260
                  }}
                />
                <IoSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} size={18} />
              </div>
              <button
                onClick={() => { setRefreshing(true); fetchDeliveryOrders(); }}
                disabled={refreshing}
                style={{
                  background: 'rgba(200,226,53,0.1)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 8,
                  color: C.text,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <IoRefresh size={22} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginTop: 24 }}>
            <StatCard title="جميع الطلبات" value={stats.total} color="blue" />
            <StatCard title="قيد الانتظار" value={stats.pending} color="amber" />
            <StatCard title="قيد التحضير" value={stats.preparing} color="blue" />
            <StatCard title="جاهز للتوصيل" value={stats.ready} color="emerald" />
            <StatCard title="قيد التوصيل" value={stats.delivering} color="purple" />
            <StatCard title="تم التوصيل" value={stats.delivered} color="gray" />
            <StatCard title="الإيرادات" value={`${stats.totalRevenue} ل.س`} color="green" />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
            {['all', 'pending', 'preparing', 'ready', 'delivering', 'delivered'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif',
                  transition: 'all 0.2s',
                  background: activeFilter === filter ? C.accent : 'rgba(200,226,53,0.1)',
                  color: activeFilter === filter ? C.bg : C.text
                }}
              >
                {filter === 'all' ? 'الكل' : getStatusText(filter)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Orders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: 8 }}>
            {deliveryOrders.length === 0 ? (
              <EmptyState />
            ) : (
              deliveryOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrder?.id === order.id}
                  onSelect={() => setSelectedOrder(order)}
                  onStatusUpdate={updateOrderStatus}
                  onAssign={() => {
                    setSelectedOrderForAssign(order);
                    setShowAssignModal(true);
                    fetchDrivers();
                  }}
                  onViewDetails={() => {
                    setSelectedOrder(order);
                    setShowOrderDetails(true);
                  }}
                  onGetDirections={() => {
                    const lat = getLat(order);
                    const lng = getLng(order);
                    if (lat && lng) getDirections(lat, lng);
                  }}
                />
              ))
            )}
          </div>

          {/* Map Section */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', position: 'sticky', top: 112 }}>
            <MapSection
              selectedOrder={selectedOrder}
              getLat={getLat}
              getLng={getLng}
              openInMaps={openInMaps}
              getDirections={getDirections}
            />
          </div>
        </div>
      </div>

      {/* Assign Driver Modal */}
      <AssignDriverModal
        isOpen={showAssignModal}
        selectedOrder={selectedOrderForAssign}
        drivers={drivers}
        onAssign={assignDriver}
        onClose={() => setShowAssignModal(false)}
      />

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showOrderDetails}
        order={selectedOrder}
        onClose={() => setShowOrderDetails(false)}
        getDirections={getDirections}
        getLat={getLat}
        getLng={getLng}
        openInMaps={openInMaps}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ==================== Subcomponents ====================

const StatCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => {
  const bgMap: Record<string, string> = {
    blue: 'rgba(96,165,250,0.12)',
    amber: 'rgba(251,191,36,0.12)',
    emerald: 'rgba(200,226,53,0.12)',
    purple: 'rgba(167,139,250,0.12)',
    gray: 'rgba(157,196,172,0.12)',
    green: 'rgba(200,226,53,0.12)'
  };
  const textMap: Record<string, string> = {
    blue: C.blue,
    amber: '#FBBF24',
    emerald: C.accent,
    purple: C.purple,
    gray: C.muted,
    green: C.accent
  };

  return (
    <div style={{ background: bgMap[color] || 'rgba(200,226,53,0.08)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: textMap[color] || C.text }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{title}</div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '64px 24px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
    <div style={{ width: 96, height: 96, background: 'rgba(200,226,53,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      <IoCar style={{ color: C.muted, fontSize: 40 }} />
    </div>
    <p style={{ color: C.muted, fontSize: 17 }}>لا توجد طلبات توصيل حالياً</p>
    <p style={{ fontSize: 13, color: C.muted, opacity: 0.7, marginTop: 8 }}>سيظهر هنا الطلبات عندما يطلب العميل التوصيل</p>
  </div>
);

const OrderCard: React.FC<{
  order: DeliveryOrder;
  isSelected: boolean;
  onSelect: () => void;
  onStatusUpdate: (id: string, status: string) => void;
  onAssign: () => void;
  onViewDetails: () => void;
  onGetDirections: () => void;
}> = ({ order, isSelected, onSelect, onStatusUpdate, onAssign, onViewDetails, onGetDirections }) => {
  const hasLocation = order.deliveryLat && order.deliveryLng;
  const isReadyForAssign = order.status === 'ready' && !order.assignedDriverId;
  const deliveryFee = Number(order.deliveryFee || 0);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card,
        borderRadius: 16,
        overflow: 'hidden',
        border: isSelected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
        boxShadow: isSelected ? `0 0 0 2px rgba(200,226,53,0.2)` : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        backgroundColor: hovered ? 'rgba(200,226,53,0.04)' : C.card
      }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card Header */}
      <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, background: C.surf }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 17, color: C.text }}>#{order.orderNumber}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, ...getStatusStyle(order.status) }}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <IoTime style={{ color: C.muted, fontSize: 12 }} />
              <span style={{ fontSize: 11, color: C.muted }}>{formatDate(order.createdAt)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{order.total} ل.س</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.muted }}>
              {getPaymentMethodIcon(order.paymentMethod)}
              <span>{getPaymentMethodText(order.paymentMethod)}</span>
              {!order.isPaid && order.paymentMethod === 'cash' && (
                <span style={{ color: '#FBBF24', marginRight: 4 }}>(غير مدفوع)</span>
              )}
            </div>
            {deliveryFee > 0 && (
              <div style={{ fontSize: 11, color: C.muted }}>+{deliveryFee} ل.س توصيل</div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(96,165,250,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IoPerson style={{ color: C.blue }} size={18} />
          </div>
          <div>
            <p style={{ fontWeight: 500, color: C.text, margin: 0 }}>{order.customerName}</p>
            <a href={`tel:${order.customerPhone}`} style={{ fontSize: 13, color: C.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <IoCall size={12} />
              {order.customerPhone}
            </a>
          </div>
        </div>

        {order.deliveryAddress && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 12 }}>
            <IoLocation style={{ color: C.muted, flexShrink: 0, marginTop: 2 }} size={16} />
            <span style={{ color: C.muted }}>{order.deliveryAddress}</span>
          </div>
        )}

        {order.orderItems && order.orderItems.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 12 }}>
            <IoFastFood size={14} />
            <span>
              {order.orderItems.slice(0, 2).map(item => item.menuItem.name).join(', ')}
              {order.orderItems.length > 2 && ` +${order.orderItems.length - 2} أخرى`}
            </span>
          </div>
        )}

        {order.assignedDriver && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'rgba(167,139,250,0.1)', padding: 8, borderRadius: 12 }}>
            <IoCar style={{ color: C.purple }} size={14} />
            <span style={{ color: C.purple }}>السائق: {order.assignedDriver.name}</span>
          </div>
        )}

        {hasLocation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, background: 'rgba(200,226,53,0.08)', padding: 8, borderRadius: 12 }}>
            <IoMap style={{ color: C.accent }} size={14} />
            <span style={{ color: C.accent }}>موقع متوفر على الخريطة</span>
          </div>
        )}

        {order.notes && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, background: 'rgba(251,191,36,0.08)', padding: 8, borderRadius: 12 }}>
            <IoAlertCircle style={{ color: '#FBBF24', flexShrink: 0, marginTop: 2 }} size={14} />
            <span style={{ color: '#FBBF24' }}>{order.notes}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: C.surf, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {order.status === 'pending' && (
          <ActionButton onClick={() => onStatusUpdate(order.id, 'preparing')} color="blue" icon={IoTime}>
            بدء التحضير
          </ActionButton>
        )}

        {order.status === 'preparing' && (
          <ActionButton onClick={() => onStatusUpdate(order.id, 'ready')} color="emerald" icon={IoCheckmarkCircle}>
            جاهز للتوصيل
          </ActionButton>
        )}

        {isReadyForAssign && (
          <ActionButton onClick={onAssign} color="purple" icon={IoCar}>
            تعيين سائق
          </ActionButton>
        )}

        {order.status === 'ready' && order.assignedDriverId && (
          <ActionButton onClick={() => onStatusUpdate(order.id, 'delivering')} color="orange" icon={IoNavigate}>
            بدء التوصيل
          </ActionButton>
        )}

        {order.status === 'delivering' && (
          <ActionButton onClick={() => onStatusUpdate(order.id, 'delivered')} color="green" icon={IoCheckmarkCircle}>
            تم التوصيل
          </ActionButton>
        )}

        {hasLocation && (
          <ActionButton onClick={onGetDirections} color="blue" icon={IoNavigate}>
            الاتجاهات
          </ActionButton>
        )}

        <ActionButton onClick={onViewDetails} color="gray" icon={IoReceipt}>
          تفاصيل
        </ActionButton>
      </div>
    </motion.div>
  );
};

const ActionButton: React.FC<{
  onClick: () => void;
  color: 'blue' | 'emerald' | 'purple' | 'orange' | 'green' | 'gray';
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ onClick, color, icon: Icon, children }) => {
  const bgMap: Record<string, string> = {
    blue: '#2563EB',
    emerald: '#059669',
    purple: '#7C3AED',
    orange: C.orange,
    green: '#16A34A',
    gray: '#4B5563'
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        flex: 1,
        background: bgMap[color],
        color: '#fff',
        padding: '8px 4px',
        borderRadius: 12,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'Cairo, sans-serif',
        transition: 'opacity 0.2s'
      }}
    >
      <Icon size={14} />
      {children}
    </button>
  );
};

const MapSection: React.FC<{
  selectedOrder: DeliveryOrder | null;
  getLat: (order: DeliveryOrder) => number | null;
  getLng: (order: DeliveryOrder) => number | null;
  openInMaps: (lat: number, lng: number) => void;
  getDirections: (lat: number, lng: number) => void;
}> = ({ selectedOrder, getLat, getLng, openInMaps, getDirections }) => {
  const lat = selectedOrder ? getLat(selectedOrder) : null;
  const lng = selectedOrder ? getLng(selectedOrder) : null;
  const hasLocation = lat && lng;

  return (
    <>
      <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, background: C.surf }}>
        <h3 style={{ fontWeight: 700, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: C.text }}>
          <IoMap style={{ color: C.red }} />
          موقع التوصيل
          {selectedOrder && <span style={{ fontSize: 13, color: C.muted }}>طلب #{selectedOrder.orderNumber}</span>}
        </h3>
        {selectedOrder && selectedOrder.deliveryAddress && (
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{selectedOrder.deliveryAddress}</p>
        )}
      </div>
      <div style={{ height: 500, position: 'relative' }}>
        {hasLocation ? (
          <iframe
            title="Delivery Location"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.01},${lat! - 0.01},${lng! + 0.01},${lat! + 0.01}&layer=mapnik&marker=${lat},${lng}`}
            allowFullScreen
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 24, background: C.bg }}>
            <IoMap style={{ fontSize: 64, color: C.muted, opacity: 0.4, marginBottom: 16 }} />
            <p style={{ color: C.muted, textAlign: 'center' }}>اختر طلباً من القائمة لعرض موقع التوصيل على الخريطة</p>
          </div>
        )}
      </div>
      {hasLocation && (
        <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: C.surf, display: 'flex', gap: 8 }}>
          <button
            onClick={() => openInMaps(lat!, lng!)}
            style={{ flex: 1, background: '#2563EB', color: '#fff', padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
          >
            <IoNavigate size={18} />
            فتح في خرائط جوجل
          </button>
          <button
            onClick={() => getDirections(lat!, lng!)}
            style={{ flex: 1, background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 600 }}
          >
            <IoNavigate size={18} />
            الاتجاهات
          </button>
        </div>
      )}
    </>
  );
};

const AssignDriverModal: React.FC<{
  isOpen: boolean;
  selectedOrder: DeliveryOrder | null;
  drivers: Driver[];
  onAssign: (orderId: string, driverId: string) => void;
  onClose: () => void;
}> = ({ isOpen, selectedOrder, drivers, onAssign, onClose }) => {
  if (!isOpen || !selectedOrder) return null;

  const activeDrivers = drivers.filter(d => d.isActive);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: C.card, borderRadius: 16, maxWidth: 480, width: '100%', maxHeight: '80vh', overflow: 'hidden', border: `1px solid ${C.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, background: 'linear-gradient(135deg, #2D1B69, #1E1145)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>تعيين سائق للطلب #{selectedOrder.orderNumber}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 4 }}>
              aria-label="إغلاق"
              <IoClose size={24} />
            </button>
          </div>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 384 }}>
          {activeDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <IoCar style={{ fontSize: 40, color: C.muted, opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
              <p style={{ color: C.muted }}>لا يوجد سائقين نشطين</p>
              <p style={{ fontSize: 13, color: C.muted, opacity: 0.7, marginTop: 4 }}>قم بإضافة سائقين من صفحة إدارة السائقين</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeDrivers.map(driver => (
                <DriverButton key={driver.id} driver={driver} onAssign={() => onAssign(selectedOrder.id, driver.id)} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const DriverButton: React.FC<{ driver: Driver; onAssign: () => void }> = ({ driver, onAssign }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onAssign}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        padding: 16,
        border: hovered ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
        borderRadius: 12,
        textAlign: 'right',
        background: hovered ? 'rgba(200,226,53,0.06)' : C.surf,
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s',
        fontFamily: 'Cairo, sans-serif'
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: C.text }}>{driver.name}</div>
        <div style={{ fontSize: 13, color: C.muted }}>{driver.email}</div>
      </div>
      <div style={{ fontSize: 13, color: C.muted }}>{driver.phone}</div>
    </button>
  );
};


const OrderDetailsModal: React.FC<{
  isOpen: boolean;
  order: DeliveryOrder | null;
  onClose: () => void;
  getDirections: (lat: number, lng: number) => void;
  getLat: (order: DeliveryOrder) => number | null;
  getLng: (order: DeliveryOrder) => number | null;
  openInMaps: (lat: number, lng: number) => void;
}> = ({ isOpen, order, onClose, getDirections, getLat, getLng, openInMaps }) => {
  if (!isOpen || !order) return null;

  const lat = getLat(order);
  const lng = getLng(order);
  const deliveryFee = Number(order.deliveryFee || 0);

  const parseAddons = (addons: any): string[] => {
    if (!addons) return [];
    if (Array.isArray(addons)) return addons;
    if (typeof addons === 'string') {
      try {
        const parsed = JSON.parse(addons);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const statusSt = getStatusStyle(order.status);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: C.card, borderRadius: 16, maxWidth: 768, width: '100%', maxHeight: '90vh', overflow: 'hidden', border: `1px solid ${C.border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: 20, borderBottom: `1px solid ${C.border}`, background: statusSt.background }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: C.text }}>طلب #{order.orderNumber}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, ...statusSt }}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                <IoCalendar style={{ display: 'inline', marginLeft: 4 }} size={14} />
                {formatDate(order.createdAt)}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: C.text, cursor: 'pointer', padding: 8, borderRadius: '50%' }}>
              aria-label="إغلاق"
              <IoClose size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(90vh - 80px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Customer Info */}
          <div style={{ background: C.surf, borderRadius: 12, padding: 16, border: `1px solid rgba(96,165,250,0.2)` }}>
            <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.blue, margin: '0 0 12px' }}>
              <IoPerson size={20} />
              معلومات العميل
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.muted, width: 80 }}>الاسم:</span>
                <span style={{ fontWeight: 500, color: C.text }}>{order.customerName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: C.muted, width: 80 }}>الهاتف:</span>
                <a href={`tel:${order.customerPhone}`} style={{ color: C.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoCall size={14} />
                  {order.customerPhone}
                </a>
              </div>
              {order.deliveryAddress && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: C.muted, width: 80 }}>العنوان:</span>
                  <span style={{ flex: 1, color: C.text }}>{order.deliveryAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div style={{ background: C.surf, borderRadius: 12, padding: 16, border: `1px solid rgba(251,191,36,0.2)` }}>
            <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#FBBF24', margin: '0 0 12px' }}>
              <IoFastFood size={20} />
              تفاصيل الطلب
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.orderItems?.map((item, idx) => {
                const addonsList = parseAddons(item.addons);
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `1px solid rgba(251,191,36,0.1)` }}>
                    <div>
                      <span style={{ fontWeight: 500, color: C.text }}>{item.menuItem?.name || 'منتج'}</span>
                      <span style={{ color: C.muted, marginRight: 8 }}>x{item.quantity}</span>
                      {item.size && <span style={{ fontSize: 12, color: C.muted, display: 'block' }}>المقاس: {item.size}</span>}
                      {addonsList.length > 0 && (
                        <span style={{ fontSize: 12, color: C.muted, display: 'block' }}>إضافات: {addonsList.join(', ')}</span>
                      )}
                      {item.notes && <span style={{ fontSize: 12, color: '#FBBF24', display: 'block' }}>ملاحظة: {item.notes}</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: C.text }}>{item.price * item.quantity} ل.س</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Details */}
          <div style={{ background: C.surf, borderRadius: 12, padding: 16, border: `1px solid rgba(200,226,53,0.2)` }}>
            <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.accent, margin: '0 0 12px' }}>
              <IoWallet size={20} />
              تفاصيل الدفع
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>المجموع الفرعي:</span>
                <span style={{ color: C.text }}>{order.subtotal} ل.س</span>
              </div>
              {order.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted }}>الخصم:</span>
                  <span style={{ color: C.accent }}>- {order.discountAmount} ل.س</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted }}>سعر التوصيل:</span>
                  <span style={{ color: C.text }}>{deliveryFee} ل.س</span>
                </div>
              )}
              {order.deliveryDistance && order.deliveryDistance > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: C.muted }}>المسافة:</span>
                  <span style={{ color: C.muted }}>{order.deliveryDistance} كم</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.text }}>الإجمالي:</span>
                <span style={{ color: C.accent }}>{order.total} ل.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>طريقة الدفع:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.text }}>
                  {getPaymentMethodIcon(order.paymentMethod)}
                  {getPaymentMethodText(order.paymentMethod)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>حالة الدفع:</span>
                <span style={{ color: order.isPaid ? C.accent : '#FBBF24' }}>
                  {order.isPaid ? 'مدفوع' : 'غير مدفوع'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {(order.estimatedDeliveryTime || order.actualDeliveryTime || order.driverAcceptedAt) && (
            <div style={{ background: C.surf, borderRadius: 12, padding: 16, border: `1px solid rgba(167,139,250,0.2)` }}>
              <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.purple, margin: '0 0 12px' }}>
                <IoTime size={20} />
                معلومات التوصيل
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {order.estimatedDeliveryTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>الوقت المتوقع:</span>
                    <span style={{ color: C.text }}>{formatDate(order.estimatedDeliveryTime)}</span>
                  </div>
                )}
                {order.driverAcceptedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>وقت قبول السائق:</span>
                    <span style={{ color: C.accent }}>{formatDate(order.driverAcceptedAt)}</span>
                  </div>
                )}
                {order.actualDeliveryTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: C.muted }}>وقت التوصيل:</span>
                    <span style={{ color: C.accent }}>{formatDate(order.actualDeliveryTime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Driver Info */}
          {order.assignedDriver && (
            <div style={{ background: C.surf, borderRadius: 12, padding: 16, border: `1px solid rgba(96,165,250,0.2)` }}>
              <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.blue, margin: '0 0 12px' }}>
                <IoCar size={20} />
                معلومات السائق
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted }}>الاسم:</span>
                  <span style={{ fontWeight: 500, color: C.text }}>{order.assignedDriver.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted }}>الهاتف:</span>
                  <a href={`tel:${order.assignedDriver.phone}`} style={{ color: C.blue, textDecoration: 'none' }}>
                    {order.assignedDriver.phone}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div style={{ background: C.surf, borderRadius: 12, padding: 16, border: `1px solid rgba(251,191,36,0.2)` }}>
              <h4 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: '#FBBF24', margin: '0 0 8px' }}>
                <IoClipboard size={20} />
                ملاحظات
              </h4>
              <p style={{ color: C.text, margin: 0 }}>{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          {(lat && lng) && (
            <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
              <button
                onClick={() => openInMaps(lat, lng)}
                style={{ flex: 1, background: '#2563EB', color: '#fff', padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Cairo, sans-serif', fontSize: 14 }}
              >
                <IoNavigate size={18} />
                فتح في خرائط جوجل
              </button>
              <button
                onClick={() => getDirections(lat, lng)}
                style={{ flex: 1, background: C.accent, color: C.bg, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 600 }}
              >
                <IoNavigate size={18} />
                الاتجاهات
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RestaurantDeliveryDashboard;
