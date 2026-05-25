// pages/Admin/AdminUsers.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoTrash, IoEye, IoPerson } from 'react-icons/io5';
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

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  restaurantId?: string | null;
  storeId?: string | null;
  restaurant?: { name: string };
  store?: { name: string };
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      // ✅ تصحيح استقبال البيانات
      const usersData = response.data?.users || response.users || response;
      setUsers(usersData);
      console.log('✅ Users fetched:', usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success('تم تحديث دور المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error('فشل تحديث الدور');
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      toast.success(currentStatus ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      fetchUsers();
    } catch (error) {
      toast.error('فشل تغيير حالة المستخدم');
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success('تم حذف المستخدم بنجاح');
        fetchUsers();
      } catch (error) {
        toast.error('فشل حذف المستخدم');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/admin/users/${id}`);
  };

  const filteredUsers = users.filter(user => {
    if (searchTerm && !user.name.toLowerCase().includes(searchTerm.toLowerCase()) && !user.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterRole !== 'all' && user.role !== filterRole) return false;
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

  const roleColors: Record<string, { bg: string; color: string }> = {
    super_admin:      { bg: `${C.purple}20`, color: C.purple },
    owner:            { bg: `${C.blue}20`,   color: C.blue   },
    staff:            { bg: `${C.accent}20`, color: C.accent },
    delivery_driver:  { bg: `${C.yellow}20`, color: C.yellow },
    user:             { bg: `${C.muted}20`,  color: C.muted  },
  };

  const roleLabels: Record<string, string> = {
    super_admin:     'مدير المنصة',
    owner:           'مالك مطعم/متجر',
    staff:           'موظف',
    delivery_driver: 'مندوب توصيل',
    user:            'مستخدم عادي',
  };

  // ✅ دالة لتحديد نوع الارتباط (مطعم أو متجر)
  const getBusinessType = (user: User) => {
    if (user.restaurantId) return { type: 'مطعم', id: user.restaurantId };
    if (user.storeId) return { type: 'متجر', id: user.storeId };
    return null;
  };

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text }}>👥 إدارة المستخدمين</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
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
            <option value="all">جميع الأدوار</option>
            <option value="owner">مالك</option>
            <option value="delivery_driver">مندوب توصيل</option>
            <option value="staff">موظف</option>
            <option value="user">مستخدم عادي</option>
          </select>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>الاسم</th>
                <th style={thStyle}>البريد الإلكتروني</th>
                <th style={thStyle}>رقم الهاتف</th>
                <th style={thStyle}>الدور</th>
                <th style={thStyle}>مرتبط بـ</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>تاريخ التسجيل</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => {
                const business = getBusinessType(user);
                return (
                  <tr
                    key={user.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: C.muted, width: 50 }}>{index + 1}</td>
                    <td
                      style={{ ...tdStyle, color: C.accent, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => handleViewDetails(user.id)}
                    >
                      {user.name}
                    </td>
                    <td style={tdStyle}>{user.email}</td>
                    <td style={tdStyle}>{user.phone || '-'}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: roleColors[user.role]?.bg || `${C.muted}20`,
                          color: roleColors[user.role]?.color || C.muted,
                        }}
                      >
                        {roleLabels[user.role] || user.role}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                      {business ? `${business.type}: ${business.id.slice(0, 8)}...` : '-'}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleStatus(user.id, user.isActive)}
                        style={{
                          padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          border: 'none', cursor: 'pointer',
                          background: user.isActive ? `${C.accent}20` : `${C.red}20`,
                          color: user.isActive ? C.accent : C.red,
                        }}
                      >
                        {user.isActive ? '✅ نشط' : '⛔ غير نشط'}
                      </button>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: C.muted }}>
                      {new Date(user.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleViewDetails(user.id)}
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
                          onClick={() => deleteUser(user.id, user.name)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted, fontSize: 14 }}>
          لا يوجد مستخدمون
        </div>
      )}
    </div>
  );
};

export default AdminUsers;