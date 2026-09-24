// frontend/src/pages/Admin/AdminOrders.tsx
import React, { useEffect, useRef, useState } from 'react';
import '@/styles/orders.css';
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
import { formatPrice, DEFAULT_CURRENCY } from '@/utils/currency';

const C = {
  bg: '#F4F7F4',
  card: '#FFFFFF',
  prim: '#E8EFEA',
  surf: '#F1F5F2',
  accent: '#084835',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(8,72,53,0.15)',
  red: '#D64545',
  blue: '#2563EB',
  purple: '#8B45B5',
  yellow: '#B7791F',
  orange: '#C2410C',
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

/** اسم النشاط: الخادم يرسله مسطّحاً، والشكل المتداخل يبقى للتوافق */
const businessNameOf = (order: any): string | null =>
  order?.businessName || order?.restaurant?.name || order?.store?.name || null;

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedOnce = useRef(false);
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
      
      // استخراج البيانات
      const ordersData = response?.data?.orders || response?.orders || response?.data || [];
      const paginationData = response?.data?.pagination || response?.pagination || {
        total: ordersData.length,
        page: pagination.page,
        limit: pagination.limit,
        pages: Math.ceil(ordersData.length / pagination.limit)
      };
      
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      loadedOnce.current = true;
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

  if (loading && !loadedOnce.current) return <Loader fullScreen />;

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
    <div className="ss-page ob-page">
      {/* البحث على الخادم (الطلبات مُصفَّحة)، فيُرسَل بـ Enter أو زرّ التحديث */}
      <div className="ob-toolbar">
        <div className="ob-row">
          <form
            className="ob-search-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <label className="ob-search">
              <IoSearch size={18} aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="رقم الطلب أو اسم الزبون — ثم Enter"
                aria-label="بحث في الطلبات"
              />
            </label>
            <button type="submit" className="ob-icon" aria-label="بحث وتحديث" title="بحث وتحديث">
              <IoRefresh size={18} className={loading ? 'ob-spin' : ''} />
            </button>
          </form>
        </div>
        <div className="ob-tabs" role="tablist" aria-label="حالة الطلب">
          {[
            ['all', 'الكل', 'gray'],
            ['pending', 'بانتظار التأكيد', 'amber'],
            ['preparing', 'قيد التحضير', 'blue'],
            ['ready', 'جاهز', 'purple'],
            ['delivering', 'قيد التوصيل', 'blue'],
            ['delivered', 'تم التوصيل', 'green'],
            ['cancelled', 'ملغى', 'red']
          ].map(([key, label, tone]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filterStatus === key}
              className={`ob-tab tone-${tone}`}
              onClick={() => {
                setPagination((p) => ({ ...p, page: 1 }));
                setFilterStatus(key);
              }}
            >
              {label}
              {filterStatus === key && <span>{pagination.total}</span>}
            </button>
          ))}
        </div>
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
          {/* بطاقات على الجوال.
              الجدول بتسعة أعمدة يُمرَّر أفقياً على شاشة 375 بكسل: يرى
              السوبر أدمن أربعة أعمدة ويجب أن يسحب ليرى الحالة والإجراء —
              وهما ما جاء لأجلهما. البطاقة تعرضها كلها بلا سحب. */}
          <div className="show-mobile" style={{ flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {orders.map((order) => (
              <div
                key={`m-${order.id}`}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: C.accent, fontWeight: 800, fontSize: 13 }}>{order.orderNumber}</span>
                  {getStatusBadge(order.status)}
                </div>

                <div style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>{order.customerName}</div>
                <div style={{ color: C.muted, fontSize: 12 }} dir="ltr">{order.customerPhone}</div>

                {businessNameOf(order) && (
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>🏪 {businessNameOf(order)}</div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <span style={{ color: C.accent, fontWeight: 800, fontSize: 15 }}>
                    {formatPrice(order.total, DEFAULT_CURRENCY)}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetailsModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      minHeight: 38,
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      background: `${C.accent}15`,
                      color: C.accent,
                      fontFamily: 'Cairo, sans-serif',
                      fontWeight: 700,
                      fontSize: 12.5
                    }}
                  >
                    <IoEye size={15} /> التفاصيل
                  </button>
                </div>

                <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                  {format(new Date(order.createdAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                </div>
              </div>
            ))}
          </div>

          <div className="hide-mobile" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
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
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,72,53,0.04)')}
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
                          ) : businessNameOf(order) ? (
                            <>
                              {(order as any).businessType === 'restaurant' ? (
                                <IoRestaurant size={14} color={C.blue} />
                              ) : (
                                <IoStorefront size={14} color={C.purple} />
                              )}
                              <span>{businessNameOf(order)}</span>
                            </>
                          ) : '-'}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: C.accent }}>{formatPrice(order.total, DEFAULT_CURRENCY)}</td>
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
                <div style={{ color: C.accent, fontWeight: 700, fontSize: 20 }}>{formatPrice(selectedOrder.total, DEFAULT_CURRENCY)}</div>
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