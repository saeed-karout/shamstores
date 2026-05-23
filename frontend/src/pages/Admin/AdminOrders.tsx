// frontend/src/pages/Admin/AdminOrders.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  IoSearch, IoRefresh, IoEye, IoPrint, IoReceipt, 
  IoCheckmarkCircle, IoTime, IoCloseCircle, IoCar,
  IoRestaurant, IoStorefront, IoPerson, IoCall, IoLocation,
  IoCash, IoCard, IoArrowBack, IoArrowForward
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24',
  card: '#112E23',
  prim: '#0D4A3A',
  surf: '#0F3D31',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
  purple: '#A78BFA',
  yellow: '#FBBF24',
  orange: '#FB923C',
};

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  total: number;
  paymentMethod: string;
  isPaid: boolean;
  orderType: string;
  deliveryAddress?: string;
  createdAt: string;
  restaurantId?: string;
  storeId?: string;
  assignedDriverId?: string;
  restaurant?: { id: string; name: string; slug: string };
  store?: { id: string; name: string; slug: string };
  assignedDriver?: { id: string; name: string; phone: string };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0
  });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, filterStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      
      const response = await api.get('/admin/orders', params);
      console.log('Orders response:', response);
      
      // استخراج البيانات
      const ordersData = response?.data?.orders || response?.orders || response?.data || [];
      const paginationData = response?.data?.pagination || response?.pagination || {
        total: ordersData.length,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(ordersData.length / pagination.limit)
      };
      
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('فشل تحميل الطلبات');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success('تم تحديث حالة الطلب');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
        setShowDetailsModal(false);
      }
    } catch (error) {
      toast.error('فشل تحديث حالة الطلب');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: JSX.Element; label: string }> = {
      pending: { color: C.yellow, icon: <IoTime size={14} />, label: 'قيد الانتظار' },
      preparing: { color: C.blue, icon: <IoTime size={14} />, label: 'قيد التحضير' },
      ready: { color: C.accent, icon: <IoCheckmarkCircle size={14} />, label: 'جاهز' },
      delivering: { color: C.orange, icon: <IoCar size={14} />, label: 'قيد التوصيل' },
      delivered: { color: C.accent, icon: <IoCheckmarkCircle size={14} />, label: 'تم التوصيل' },
      served: { color: C.accent, icon: <IoCheckmarkCircle size={14} />, label: 'تم التقديم' },
      cancelled: { color: C.red, icon: <IoCloseCircle size={14} />, label: 'ملغي' },
    };
    const config = statusConfig[status] || { color: C.muted, icon: null, label: status };
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: `${config.color}20`,
        color: config.color,
      }}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getPaymentBadge = (method: string, isPaid: boolean) => {
    if (isPaid) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          background: `${C.accent}20`,
          color: C.accent,
        }}>
          <IoCheckmarkCircle size={12} /> مدفوع
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: `${C.red}20`,
        color: C.red,
      }}>
        غير مدفوع
      </span>
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchOrders();
  };

  if (loading) return <Loader fullScreen />;

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'right',
    color: C.muted,
    fontSize: 12,
    fontWeight: 600,
    background: C.surf,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    color: C.text,
    fontSize: 13,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }} dir="rtl">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📋 إدارة الطلبات</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>مراقبة وإدارة جميع طلبات المطاعم والمتاجر</p>
      </div>

      {/* Filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IoSearch size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              width: '100%',
              paddingRight: 36,
              paddingLeft: 12,
              paddingTop: 10,
              paddingBottom: 10,
              background: C.surf,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '9px 12px',
            background: C.surf,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text,
            fontSize: 13,
            outline: 'none',
          }}
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="preparing">قيد التحضير</option>
          <option value="ready">جاهز</option>
          <option value="delivering">قيد التوصيل</option>
          <option value="delivered">تم التوصيل</option>
          <option value="cancelled">ملغي</option>
        </select>
        <button
          onClick={fetchOrders}
          style={{
            padding: '8px 14px',
            background: `${C.accent}15`,
            border: `1px solid ${C.accent}`,
            borderRadius: 10,
            color: C.accent,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <IoRefresh size={16} /> تحديث
        </button>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoReceipt size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا توجد طلبات</h3>
          <p style={{ color: C.muted, fontSize: 13 }}>لم يتم العثور على طلبات مطابقة للبحث</p>
        </div>
      ) : (
        <>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.surf }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>رقم الطلب</th>
                    <th style={thStyle}>العميل</th>
                    <th style={thStyle}>النشاط</th>
                    <th style={thStyle}>المبلغ</th>
                    <th style={thStyle}>طريقة الدفع</th>
                    <th style={thStyle}>الحالة</th>
                    <th style={thStyle}>التاريخ</th>
                    <th style={thStyle}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ ...tdStyle, color: C.muted, width: 40 }}>
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: C.accent }}>{order.orderNumber}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500 }}>{order.customerName || 'عميل'}</div>
                        {order.customerPhone && (
                          <div style={{ fontSize: 11, color: C.muted }}>{order.customerPhone}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {order.restaurant ? (
                            <>
                              <IoRestaurant size={14} color={C.blue} />
                              <span>{order.restaurant.name}</span>
                            </>
                          ) : order.store ? (
                            <>
                              <IoStorefront size={14} color={C.purple} />
                              <span>{order.store.name}</span>
                            </>
                          ) : '-'}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.accent }}>{order.total} ر.س</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11 }}>
                            {order.paymentMethod === 'cash' ? '💰 كاش' : order.paymentMethod === 'card' ? '💳 بطاقة' : '📱 أونلاين'}
                          </span>
                          {getPaymentBadge(order.paymentMethod, order.isPaid)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {getStatusBadge(order.status)}
                          {order.orderType === 'delivery' && (
                            <span style={{ fontSize: 10, color: C.orange }}>🚚 توصيل</span>
                          )}
                        </div>
                       </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                        {format(new Date(order.createdAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                       </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailsModal(true);
                          }}
                          style={{
                            padding: 6,
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: `${C.accent}15`,
                            color: C.accent,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="عرض التفاصيل"
                        >
                          <IoEye size={16} />
                        </button>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.surf,
                  color: pagination.page === 1 ? C.muted : C.text,
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                  opacity: pagination.page === 1 ? 0.5 : 1,
                }}
              >
                <IoArrowForward size={16} />
              </button>
              
              <span style={{ color: C.text, fontSize: 13 }}>
                صفحة {pagination.page} من {pagination.pages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.surf,
                  color: pagination.page === pagination.pages ? C.muted : C.text,
                  cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                  opacity: pagination.page === pagination.pages ? 0.5 : 1,
                }}
              >
                <IoArrowBack size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      <Modal isOpen={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedOrder(null); }} title={`تفاصيل الطلب #${selectedOrder?.orderNumber}`} size="lg">
        {selectedOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ background: C.surf, padding: 12, borderRadius: 10 }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>رقم الطلب</div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 16 }}>{selectedOrder.orderNumber}</div>
              </div>
              <div style={{ background: C.surf, padding: 12, borderRadius: 10 }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>الحالة</div>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div style={{ background: C.surf, padding: 12, borderRadius: 10 }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>العميل</div>
                <div style={{ color: C.text }}>{selectedOrder.customerName || '-'}</div>
                {selectedOrder.customerPhone && (
                  <div style={{ color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <IoCall size={12} /> {selectedOrder.customerPhone}
                  </div>
                )}
              </div>
              <div style={{ background: C.surf, padding: 12, borderRadius: 10 }}>
                <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>المبلغ</div>
                <div style={{ color: C.accent, fontWeight: 700, fontSize: 20 }}>{selectedOrder.total} ر.س</div>
              </div>
            </div>

            {selectedOrder.deliveryAddress && (
              <div style={{ marginBottom: 16, padding: 12, background: C.surf, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <IoLocation size={16} color={C.accent} />
                  <span style={{ fontWeight: 600 }}>عنوان التوصيل</span>
                </div>
                <div style={{ color: C.text }}>{selectedOrder.deliveryAddress}</div>
              </div>
            )}

            {selectedOrder.assignedDriver && (
              <div style={{ marginBottom: 16, padding: 12, background: C.surf, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <IoCar size={16} color={C.accent} />
                  <span style={{ fontWeight: 600 }}>مندوب التوصيل</span>
                </div>
                <div style={{ color: C.text }}>{selectedOrder.assignedDriver.name}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{selectedOrder.assignedDriver.phone}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                disabled={selectedOrder.status !== 'pending'}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: selectedOrder.status === 'pending' ? C.blue : C.surf,
                  color: selectedOrder.status === 'pending' ? '#fff' : C.muted,
                  border: 'none',
                  borderRadius: 8,
                  cursor: selectedOrder.status === 'pending' ? 'pointer' : 'not-allowed',
                }}
              >
                بدء التحضير
              </button>
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                disabled={selectedOrder.status !== 'preparing'}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: selectedOrder.status === 'preparing' ? C.accent : C.surf,
                  color: selectedOrder.status === 'preparing' ? C.bg : C.muted,
                  border: 'none',
                  borderRadius: 8,
                  cursor: selectedOrder.status === 'preparing' ? 'pointer' : 'not-allowed',
                }}
              >
                جاهز
              </button>
              <button
                onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                disabled={selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled'}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: (selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled') ? C.red : C.surf,
                  color: (selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled') ? '#fff' : C.muted,
                  border: 'none',
                  borderRadius: 8,
                  cursor: (selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled') ? 'pointer' : 'not-allowed',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrders;