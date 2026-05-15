// pages/Admin/AdminStores.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoTrash, IoEye } from 'react-icons/io5';
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

interface Store {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  plan: { name: string };
  owner: { name: string; email: string };
  createdAt: string;
}

const AdminStores: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await api.get('/admin/stores');
      setStores(response.stores);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('فشل تحميل المتاجر');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/stores/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المتجر' : 'تم تفعيل المتجر');
      fetchStores();
    } catch (error) {
      toast.error('فشل تغيير حالة المتجر');
    }
  };

  const deleteStore = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف متجر "${name}"؟`)) {
      try {
        await api.delete(`/admin/stores/${id}`);
        toast.success('تم حذف المتجر بنجاح');
        fetchStores();
      } catch (error) {
        toast.error('فشل حذف المتجر');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/admin/stores/${id}`);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>إدارة المتاجر</h1>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="بحث..."
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
              width: 220,
            }}
          />
          <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>اسم المتجر</th>
                <th style={thStyle}>البريد الإلكتروني</th>
                <th style={thStyle}>رقم الهاتف</th>
                <th style={thStyle}>الخطة</th>
                <th style={thStyle}>المالك</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>تاريخ التسجيل</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredStores.map((store) => (
                <tr
                  key={store.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td
                    style={{ ...tdStyle, color: C.accent, cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => handleViewDetails(store.id)}
                  >
                    {store.name}
                  </td>
                  <td style={tdStyle}>{store.email}</td>
                  <td style={tdStyle}>{store.phone || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: `${C.accent}20`, color: C.accent,
                    }}>
                      {store.plan?.name || 'free'}
                    </span>
                  </td>
                  <td style={tdStyle}>{store.owner?.name || '-'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleStatus(store.id, store.isActive)}
                      style={{
                        padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: store.isActive ? `${C.accent}20` : `${C.red}20`,
                        color: store.isActive ? C.accent : C.red,
                      }}
                    >
                      {store.isActive ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                    {new Date(store.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleViewDetails(store.id)}
                        title="عرض التفاصيل"
                        style={{
                          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: `${C.accent}15`, color: C.accent,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <IoEye size={16} />
                      </button>
                      <button
                        onClick={() => deleteStore(store.id, store.name)}
                        title="حذف"
                        style={{
                          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: `${C.red}15`, color: C.red,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <IoTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredStores.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          لا توجد متاجر
        </div>
      )}
    </div>
  );
};

export default AdminStores;
