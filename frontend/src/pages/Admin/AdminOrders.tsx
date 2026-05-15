// pages/Admin/AdminOrders.tsx

import React, { useEffect, useState } from 'react';
import { IoSearch, IoEye } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  orderType: string;
  orderSource: string;
  restaurant?: { name: string };
  store?: { name: string };
  assignedDriver?: { name: string };
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:    { label: 'قيد الانتظار', color: C.yellow  },
  preparing:  { label: 'قيد التحضير', color: C.blue    },
  ready:      { label: 'جاهز',         color: C.accent  },
  delivering: { label: 'قيد التوصيل', color: C.purple  },
  delivered:  { label: 'مكتمل',        color: C.muted   },
  cancelled:  { label: 'ملغي',          color: C.red     },
};

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/admin/orders');
      setOrders(response.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || { label: status, color: C.muted };
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        background: `${cfg.color}20`,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}>
        {cfg.label}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    if (searchTerm && !order.orderNumber.includes(searchTerm) && !order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    return true;
  });

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
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>إدارة الطلبات</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="بحث برقم الطلب أو اسم العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: C.surf,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.text,
                padding: '8px 40px 8px 14px',
                fontSize: 14,
                outline: 'none',
                width: 260,
              }}
            />
            <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: C.surf,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text,
              padding: '8px 14px',
              fontSize: 14,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="preparing">قيد التحضير</option>
            <option value="ready">جاهز</option>
            <option value="delivering">قيد التوصيل</option>
            <option value="delivered">مكتمل</option>
          </select>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>رقم الطلب</th>
                <th style={thStyle}>العميل</th>
                <th style={thStyle}>المبلغ</th>
                <th style={thStyle}>المصدر</th>
                <th style={thStyle}>النوع</th>
                <th style={thStyle}>السائق</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>التاريخ</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: C.accent, fontWeight: 600 }}>
                    {order.orderNumber}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{order.customerPhone}</div>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: C.accent }}>
                    {order.total} ل.س
                  </td>
                  <td style={tdStyle}>
                    {order.orderSource === 'restaurant' ? (
                      <span style={{ color: C.blue }}>{order.restaurant?.name}</span>
                    ) : (
                      <span style={{ color: C.accent }}>{order.store?.name}</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>
                    {order.orderType === 'delivery' ? 'توصيل' : order.orderType === 'dine_in' ? 'داخل المطعم' : 'طلبية'}
                  </td>
                  <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>
                    {order.assignedDriver?.name || '-'}
                  </td>
                  <td style={tdStyle}>
                    {getStatusBadge(order.status)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                    {new Date(order.createdAt).toLocaleString('ar-SA')}
                  </td>
                  <td style={tdStyle}>
                    <button
                      title="عرض التفاصيل"
                      style={{
                        padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: `${C.accent}15`, color: C.accent,
                        display: 'flex', alignItems: 'center',
                      }}
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

      {filteredOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          لا توجد طلبات
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
