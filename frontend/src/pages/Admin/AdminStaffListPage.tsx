// frontend/src/pages/Admin/AdminStaffListPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { IoEye, IoSearch, IoRefresh, IoStorefront, IoRestaurant, IoAdd, IoTrash, IoPencil, IoKey, IoPerson, IoMail, IoCall, IoLockClosed } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  storeId?: string;
  restaurantId?: string;
  store?: { id: string; name: string };
  restaurant?: { id: string; name: string };
  permissions?: any;
}

const AdminStaffListPage: React.FC = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'platform' | 'restaurant' | 'store'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    permissions: {
      canManageRestaurants: false,
      canManageStores: false,
      canManageUsers: false,
      canManageDrivers: false,
      canManagePlans: false,
      canManageSettings: false,
      canViewReports: false
    }
  });

  useEffect(() => {
    fetchStaff();
  }, []);


const fetchStaff = async () => {
  setLoading(true);
  try {
    const response = await api.get('/admin/staff');
    console.log('=== FETCH STAFF RESPONSE ===');
    console.log('Full response:', response);
    
    // ✅ تصحيح: response هو مصفوفة مباشرة، وليس response.data
    // لأن apiClient يعيد response.data تلقائياً
    let staffData = [];
    
    if (Array.isArray(response)) {
      // إذا كان response نفسه مصفوفة
      staffData = response;
    } else if (response?.data && Array.isArray(response.data)) {
      staffData = response.data;
    } else if (response?.data?.data && Array.isArray(response.data.data)) {
      staffData = response.data.data;
    }
    
    console.log('staffData array:', staffData);
    console.log('staffData length:', staffData.length);
    
    setStaff(staffData);
  } catch (error) {
    console.error('Error fetching staff:', error);
    toast.error('حدث خطأ في جلب الموظفين');
    setStaff([]);
  } finally {
    setLoading(false);
  }
};

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        permissions: formData.permissions
      };
      
      await api.post('/admin/platform-staff', payload);
      toast.success('تم إضافة موظف المنصة بنجاح');
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        permissions: {
          canManageRestaurants: false,
          canManageStores: false,
          canManageUsers: false,
          canManageDrivers: false,
          canManagePlans: false,
          canManageSettings: false,
          canViewReports: false
        }
      });
      fetchStaff();
    } catch (error: any) {
      console.error('Add staff error:', error);
      toast.error(error.response?.data?.error || 'فشل إضافة الموظف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlatformStaff = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${name}"؟`)) return;
    try {
      await api.delete(`/admin/platform-staff/${id}`);
      toast.success('تم حذف الموظف بنجاح');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل حذف الموظف');
    }
  };

  const handleToggleActive = async (staffMember: StaffMember) => {
    try {
      const endpoint = staffMember.restaurantId || staffMember.storeId 
        ? `/admin/staff/${staffMember.id}/toggle` 
        : `/admin/platform-staff/${staffMember.id}/toggle`;
      
      await api.patch(endpoint, { isActive: !staffMember.isActive });
      toast.success(`تم ${staffMember.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const getFilteredStaff = () => {
    let filtered = [...staff];
    
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm))
      );
    }
    
    if (filterType === 'platform') {
      filtered = filtered.filter(s => !s.storeId && !s.restaurantId);
    } else if (filterType === 'restaurant') {
      filtered = filtered.filter(s => s.restaurantId);
    } else if (filterType === 'store') {
      filtered = filtered.filter(s => s.storeId);
    }
    
    if (filterActive === 'active') {
      filtered = filtered.filter(s => s.isActive);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(s => !s.isActive);
    }
    
    return filtered;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: C.muted,
    fontSize: 13,
    marginBottom: 6,
  };

  if (loading) return <Loader fullScreen />;
  const filteredStaff = getFilteredStaff();

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>👥 إدارة موظفي المنصة</h1>
          <p style={{ color: C.muted, fontSize: 13 }}>إدارة جميع موظفي المطاعم والمتاجر وموظفي المنصة</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <IoAdd size={18} style={{ marginLeft: 4 }} /> إضافة موظف منصة
        </Button>
      </div>

      {/* Filters */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <IoSearch size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="بحث عن موظف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingRight: 36, paddingLeft: 12, paddingTop: 10, paddingBottom: 10, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} style={{ padding: '9px 12px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none' }}>
          <option value="all">جميع الموظفين</option>
          <option value="platform">👑 موظفي المنصة</option>
          <option value="restaurant">🍽️ موظفي المطاعم</option>
          <option value="store">🛍️ موظفي المتاجر</option>
        </select>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)} style={{ padding: '9px 12px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: 'none' }}>
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <Button variant="secondary" onClick={fetchStaff}><IoRefresh size={16} /></Button>
      </div>

      {/* Staff Table */}
      {filteredStaff.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
          <IoPerson size={48} style={{ color: C.border, marginBottom: 12 }} />
          <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>لا يوجد موظفين</h3>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>قم بإضافة موظفين لمساعدتك في إدارة المنصة</p>
          <Button variant="primary" onClick={() => setShowAddModal(true)}><IoAdd size={16} style={{ marginLeft: 4 }} />إضافة موظف منصة</Button>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surf }}>
                  {['#', 'الاسم', 'البريد', 'الهاتف', 'النوع', 'التابع لـ', 'الحالة', 'التسجيل', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member, idx) => (
                  <tr key={member.id} style={{ borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', color: C.muted }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: 600, fontSize: 13 }}>{member.name}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.email}</td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{member.phone || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {!member.storeId && !member.restaurantId ? (
                        <span style={{ background: `${C.accent}20`, color: C.accent, padding: '3px 8px', borderRadius: 10, fontSize: 11 }}>👑 منصة</span>
                      ) : member.storeId ? (
                        <span style={{ background: `${C.purple}20`, color: C.purple, padding: '3px 8px', borderRadius: 10, fontSize: 11 }}><IoStorefront size={11} /> متجر</span>
                      ) : (
                        <span style={{ background: `${C.blue}20`, color: C.blue, padding: '3px 8px', borderRadius: 10, fontSize: 11 }}><IoRestaurant size={11} /> مطعم</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>
                      {member.store?.name || member.restaurant?.name || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => handleToggleActive(member)} style={{ background: member.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)', color: member.isActive ? C.accent : C.red, border: 'none', borderRadius: 10, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        {member.isActive ? 'نشط' : 'غير نشط'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{member.createdAt ? format(new Date(member.createdAt), 'dd/MM/yyyy', { locale: ar }) : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => navigate(`/admin/staff/${member.id}`)} style={{ background: 'none', border: 'none', color: C.purple, cursor: 'pointer', padding: 2, display: 'flex' }} title="تفاصيل"><IoEye size={17} /></button>
                        {!member.storeId && !member.restaurantId && (
                          <button onClick={() => handleDeletePlatformStaff(member.id, member.name)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 2, display: 'flex' }} title="حذف"><IoTrash size={17} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Platform Staff Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="➕ إضافة موظف منصة جديد" size="lg">
        <form onSubmit={handleAddStaff}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>الاسم الكامل *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} required />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>البريد الإلكتروني *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>كلمة المرور *</label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>رقم الهاتف</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
            <h4 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🔑 صلاحيات الموظف</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canManageRestaurants} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canManageRestaurants: e.target.checked } })} style={{ width: 16, height: 16 }} />
                إدارة المطاعم
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canManageStores} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canManageStores: e.target.checked } })} style={{ width: 16, height: 16 }} />
                إدارة المتاجر
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canManageUsers} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canManageUsers: e.target.checked } })} style={{ width: 16, height: 16 }} />
                إدارة المستخدمين
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canManageDrivers} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canManageDrivers: e.target.checked } })} style={{ width: 16, height: 16 }} />
                إدارة السائقين
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canManagePlans} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canManagePlans: e.target.checked } })} style={{ width: 16, height: 16 }} />
                إدارة الخطط
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canManageSettings} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canManageSettings: e.target.checked } })} style={{ width: 16, height: 16 }} />
                إعدادات المنصة
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={formData.permissions.canViewReports} onChange={e => setFormData({ ...formData, permissions: { ...formData.permissions, canViewReports: e.target.checked } })} style={{ width: 16, height: 16 }} />
                التقارير والإحصائيات
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>إلغاء</Button>
            <Button variant="primary" type="submit" loading={submitting}>إضافة الموظف</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminStaffListPage;