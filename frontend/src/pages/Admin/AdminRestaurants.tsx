// pages/Admin/AdminRestaurants.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoFilter, IoClose, IoCheckmark, IoTrash, IoEye } from 'react-icons/io5';
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

interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  plan: { name: string };
  users: Array<{ name: string; email: string }>;
  createdAt: string;
}

const AdminRestaurants: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await api.get('/admin/restaurants');
      setRestaurants(response.restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('فشل تحميل المطاعم');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/restaurants/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المطعم' : 'تم تفعيل المطعم');
      fetchRestaurants();
    } catch (error) {
      toast.error('فشل تغيير حالة المطعم');
    }
  };

  const deleteRestaurant = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${name}"؟`)) {
      try {
        await api.delete(`/admin/restaurants/${id}`);
        toast.success('تم حذف المطعم بنجاح');
        fetchRestaurants();
      } catch (error) {
        toast.error('فشل حذف المطعم');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/admin/restaurants/${id}`);
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (searchTerm && !restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus === 'active' && !restaurant.isActive) return false;
    if (filterStatus === 'inactive' && restaurant.isActive) return false;
    return true;
  });

  if (loading) return <Loader fullScreen />;

  const inputStyle: React.CSSProperties = {
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: '8px 40px 8px 14px',
    fontSize: 14,
    outline: 'none',
    width: 220,
  };

  const selectStyle: React.CSSProperties = {
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    padding: '8px 14px',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  };

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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>إدارة المطاعم</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            <IoSearch style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={selectStyle}
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>اسم المطعم</th>
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
              {filteredRestaurants.map((restaurant) => (
                <tr
                  key={restaurant.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td
                    style={{ ...tdStyle, color: C.accent, cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => handleViewDetails(restaurant.id)}
                  >
                    {restaurant.name}
                  </td>
                  <td style={tdStyle}>{restaurant.email}</td>
                  <td style={tdStyle}>{restaurant.phone || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: `${C.blue}20`, color: C.blue,
                    }}>
                      {restaurant.plan?.name || 'free'}
                    </span>
                  </td>
                  <td style={tdStyle}>{restaurant.users?.[0]?.name || '-'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleStatus(restaurant.id, restaurant.isActive)}
                      style={{
                        padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        border: 'none', cursor: 'pointer',
                        background: restaurant.isActive ? `${C.accent}20` : `${C.red}20`,
                        color: restaurant.isActive ? C.accent : C.red,
                      }}
                    >
                      {restaurant.isActive ? 'نشط' : 'غير نشط'}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                    {new Date(restaurant.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleViewDetails(restaurant.id)}
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
                        onClick={() => deleteRestaurant(restaurant.id, restaurant.name)}
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

      {filteredRestaurants.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          لا توجد مطاعم
        </div>
      )}
    </div>
  );
};

export default AdminRestaurants;
