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
    case 'cash': return <IoCash className="text-green-600" size={14} />;
    case 'card': return <IoCard className="text-blue-600" size={14} />;
    default: return <IoWallet className="text-purple-600" size={14} />;
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


const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ready': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'delivering': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-amber-500';
    case 'preparing': return 'bg-blue-500';
    case 'ready': return 'bg-emerald-500';
    case 'delivering': return 'bg-purple-500';
    case 'delivered': return 'bg-gray-500';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-gray-500';
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <IoCar className="text-yellow-300" size={28} />
                </div>
                <span>طلبات التوصيل</span>
              </h1>
              <p className="text-white/80 text-sm mt-1">إدارة طلبات التوصيل وتعيين السائقين</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/20 rounded-xl px-4 py-2 pr-10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" size={18} />
              </div>
              <button
                onClick={() => { setRefreshing(true); fetchDeliveryOrders(); }}
                disabled={refreshing}
                className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-all"
              >
                <IoRefresh size={22} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mt-6">
            <StatCard title="جميع الطلبات" value={stats.total} color="blue" />
            <StatCard title="قيد الانتظار" value={stats.pending} color="amber" />
            <StatCard title="قيد التحضير" value={stats.preparing} color="blue" />
            <StatCard title="جاهز للتوصيل" value={stats.ready} color="emerald" />
            <StatCard title="قيد التوصيل" value={stats.delivering} color="purple" />
            <StatCard title="تم التوصيل" value={stats.delivered} color="gray" />
            <StatCard title="الإيرادات" value={`${stats.totalRevenue} ل.س`} color="green" />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['all', 'pending', 'preparing', 'ready', 'delivering', 'delivered'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === filter
                    ? 'bg-white text-blue-700 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {filter === 'all' ? 'الكل' : getStatusText(filter)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Orders List */}
          <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
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
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-28">
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
    </div>
  );
};

// ==================== Subcomponents ====================

const StatCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500/20',
    amber: 'bg-amber-500/20',
    emerald: 'bg-emerald-500/20',
    purple: 'bg-purple-500/20',
    gray: 'bg-gray-500/20',
    green: 'bg-green-500/20'
  };
  
  return (
    <div className={`${colorClasses[color]} rounded-xl p-3 text-center backdrop-blur-sm`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-90">{title}</div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <IoCar className="text-4xl text-gray-400" />
    </div>
    <p className="text-gray-500 text-lg">لا توجد طلبات توصيل حالياً</p>
    <p className="text-sm text-gray-400 mt-2">سيظهر هنا الطلبات عندما يطلب العميل التوصيل</p>
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all cursor-pointer hover:shadow-xl ${
        isSelected ? 'border-blue-500 shadow-xl ring-2 ring-blue-200' : 'border-transparent'
      }`}
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-lg text-gray-800">#{order.orderNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <IoTime className="text-gray-400 text-xs" />
              <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{order.total} ل.س</div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {getPaymentMethodIcon(order.paymentMethod)}
              <span>{getPaymentMethodText(order.paymentMethod)}</span>
              {!order.isPaid && order.paymentMethod === 'cash' && (
                <span className="text-amber-600 mr-1">(غير مدفوع)</span>
              )}
            </div>
            {deliveryFee > 0 && (
              <div className="text-xs text-gray-400">+{deliveryFee} ل.س توصيل</div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <IoPerson className="text-blue-600" size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">{order.customerName}</p>
            <a href={`tel:${order.customerPhone}`} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
              <IoCall size={12} />
              {order.customerPhone}
            </a>
          </div>
        </div>

        {order.deliveryAddress && (
          <div className="flex items-start gap-2 text-sm bg-gray-50 p-2 rounded-xl">
            <IoLocation className="text-gray-400 mt-0.5 flex-shrink-0" size={16} />
            <span className="text-gray-600 text-sm line-clamp-2">{order.deliveryAddress}</span>
          </div>
        )}

        {order.orderItems && order.orderItems.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-xl">
            <IoFastFood size={14} />
            <span className="text-sm">
              {order.orderItems.slice(0, 2).map(item => item.menuItem.name).join(', ')}
              {order.orderItems.length > 2 && ` +${order.orderItems.length - 2} أخرى`}
            </span>
          </div>
        )}

        {order.assignedDriver && (
          <div className="flex items-center gap-2 text-sm bg-purple-50 p-2 rounded-xl">
            <IoCar className="text-purple-600" size={14} />
            <span className="text-purple-700">السائق: {order.assignedDriver.name}</span>
          </div>
        )}

        {hasLocation && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-2 rounded-xl">
            <IoMap size={14} />
            <span>موقع متوفر على الخريطة</span>
          </div>
        )}

        {order.notes && (
          <div className="flex items-start gap-2 text-sm bg-amber-50 p-2 rounded-xl">
            <IoAlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={14} />
            <span className="text-amber-700 text-sm line-clamp-1">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="p-4 border-t bg-gray-50 flex gap-2 flex-wrap">
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
  const colors = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    emerald: 'bg-emerald-500 hover:bg-emerald-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    green: 'bg-green-600 hover:bg-green-700',
    gray: 'bg-gray-500 hover:bg-gray-600'
  };
  
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex-1 ${colors[color]} text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1 transition-all`}
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
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <IoMap className="text-red-500" />
          موقع التوصيل
          {selectedOrder && <span className="text-sm text-gray-500">طلب #{selectedOrder.orderNumber}</span>}
        </h3>
        {selectedOrder && selectedOrder.deliveryAddress && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{selectedOrder.deliveryAddress}</p>
        )}
      </div>
      <div className="h-[500px] relative">
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
          <div className="h-full flex items-center justify-center flex-col p-6 bg-gray-50">
            <IoMap className="text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">اختر طلباً من القائمة لعرض موقع التوصيل على الخريطة</p>
          </div>
        )}
      </div>
      {hasLocation && (
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={() => openInMaps(lat!, lng!)}
            className="flex-1 bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 transition-all"
          >
            <IoNavigate size={18} />
            فتح في خرائط جوجل
          </button>
          <button
            onClick={() => getDirections(lat!, lng!)}
            className="flex-1 bg-emerald-500 text-white py-2 rounded-xl hover:bg-emerald-600 flex items-center justify-center gap-2 transition-all"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">تعيين سائق للطلب #{selectedOrder.orderNumber}</h3>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <IoClose size={24} />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto max-h-96">
          {activeDrivers.length === 0 ? (
            <div className="text-center py-8">
              <IoCar className="text-4xl text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">لا يوجد سائقين نشطين</p>
              <p className="text-sm text-gray-400 mt-1">قم بإضافة سائقين من صفحة إدارة السائقين</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeDrivers.map(driver => (
                <button
                  key={driver.id}
                  onClick={() => onAssign(selectedOrder.id, driver.id)}
                  className="w-full p-4 border rounded-xl text-right hover:bg-gray-50 transition-all flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold">{driver.name}</div>
                    <div className="text-sm text-gray-500">{driver.email}</div>
                  </div>
                  <div className="text-sm text-gray-500">{driver.phone}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
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
  
  // دالة لمعالجة الإضافات
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
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-5 ${getStatusColor(order.status)} border-b`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">طلب #{order.orderNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <p className="text-sm opacity-80 mt-1">
                <IoCalendar className="inline ml-1" size={14} />
                {formatDate(order.createdAt)}
              </p>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-all">
              <IoClose size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
          {/* Customer Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-blue-800">
              <IoPerson size={20} />
              معلومات العميل
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-20">الاسم:</span>
                <span className="font-medium">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-20">الهاتف:</span>
                <a href={`tel:${order.customerPhone}`} className="text-blue-500 hover:underline flex items-center gap-1">
                  <IoCall size={14} />
                  {order.customerPhone}
                </a>
              </div>
              {order.deliveryAddress && (
                <div className="md:col-span-2 flex items-start gap-2">
                  <span className="text-gray-600 w-20">العنوان:</span>
                  <span className="flex-1">{order.deliveryAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-amber-800">
              <IoFastFood size={20} />
              تفاصيل الطلب
            </h4>
            <div className="space-y-2">
              {order.orderItems?.map((item, idx) => {
                const addonsList = parseAddons(item.addons);
                return (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-amber-100 last:border-0">
                    <div>
                      <span className="font-medium">{item.menuItem?.name || 'منتج'}</span>
                      <span className="text-gray-500 mr-2">x{item.quantity}</span>
                      {item.size && <span className="text-xs text-gray-400 block">المقاس: {item.size}</span>}
                      {addonsList.length > 0 && (
                        <span className="text-xs text-gray-400 block">إضافات: {addonsList.join(', ')}</span>
                      )}
                      {item.notes && <span className="text-xs text-amber-600 block">ملاحظة: {item.notes}</span>}
                    </div>
                    <span className="font-bold">{item.price * item.quantity} ل.س</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4">
            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-emerald-800">
              <IoWallet size={20} />
              تفاصيل الدفع
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span>{order.subtotal} ل.س</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>الخصم:</span>
                  <span>- {order.discountAmount} ل.س</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>سعر التوصيل:</span>
                  <span>{deliveryFee} ل.س</span>
                </div>
              )}
              {order.deliveryDistance && order.deliveryDistance > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>المسافة:</span>
                  <span>{order.deliveryDistance} كم</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>الإجمالي:</span>
                <span className="text-emerald-600">{order.total} ل.س</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="flex items-center gap-1">
                  {getPaymentMethodIcon(order.paymentMethod)}
                  {getPaymentMethodText(order.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>حالة الدفع:</span>
                <span className={order.isPaid ? 'text-emerald-600' : 'text-amber-600'}>
                  {order.isPaid ? 'مدفوع' : 'غير مدفوع'}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          {(order.estimatedDeliveryTime || order.actualDeliveryTime || order.driverAcceptedAt) && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-purple-800">
                <IoTime size={20} />
                معلومات التوصيل
              </h4>
              <div className="space-y-2">
                {order.estimatedDeliveryTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">الوقت المتوقع:</span>
                    <span>{formatDate(order.estimatedDeliveryTime)}</span>
                  </div>
                )}
                {order.driverAcceptedAt && (
                  <div className="flex justify-between text-emerald-600">
                    <span>وقت قبول السائق:</span>
                    <span>{formatDate(order.driverAcceptedAt)}</span>
                  </div>
                )}
                {order.actualDeliveryTime && (
                  <div className="flex justify-between text-emerald-600">
                    <span>وقت التوصيل:</span>
                    <span>{formatDate(order.actualDeliveryTime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Driver Info */}
          {order.assignedDriver && (
            <div className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl p-4">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-cyan-800">
                <IoCar size={20} />
                معلومات السائق
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">الاسم:</span>
                  <span className="font-medium">{order.assignedDriver.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الهاتف:</span>
                  <a href={`tel:${order.assignedDriver.phone}`} className="text-blue-500 hover:underline">
                    {order.assignedDriver.phone}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4">
              <h4 className="font-bold text-lg mb-2 flex items-center gap-2 text-yellow-800">
                <IoClipboard size={20} />
                ملاحظات
              </h4>
              <p className="text-gray-700">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          {(lat && lng) && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => openInMaps(lat, lng)}
                className="flex-1 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 transition-all"
              >
                <IoNavigate size={18} />
                فتح في خرائط جوجل
              </button>
              <button
                onClick={() => getDirections(lat, lng)}
                className="flex-1 bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 flex items-center justify-center gap-2 transition-all"
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