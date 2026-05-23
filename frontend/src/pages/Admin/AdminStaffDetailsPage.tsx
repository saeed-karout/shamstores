// frontend/src/pages/Admin/AdminStaffDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { IoArrowBack, IoPencil, IoStorefront, IoRestaurant, IoEye, IoEyeOff, IoPerson, IoBusiness, IoKey, IoTrash } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', gold: '#FBBF24',
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
  updatedAt: string;
  storeId?: string;
  restaurantId?: string;
  store?: { id: string; name: string; slug: string };
  restaurant?: { id: string; name: string; slug: string };
  permissions?: {
    canManageRestaurants?: boolean;
    canManageStores?: boolean;
    canManageUsers?: boolean;
    canManageDrivers?: boolean;
    canManagePlans?: boolean;
    canManageSettings?: boolean;
    canViewReports?: boolean;
    viewOrders?: boolean;
    updateOrderStatus?: boolean;
    viewProducts?: boolean;
    updateProducts?: boolean;
    viewInventory?: boolean;
    updateInventory?: boolean;
  };
}

const AdminStaffDetailsPage: React.FC = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => { fetchStaff(); }, [staffId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/staff/${staffId}`);
      const data = response.data?.data || response.data;
      setStaff(data);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        password: ''
      });
      setPermissions(data.permissions || {});
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('فشل تحميل بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const data: any = { 
        name: formData.name, 
        email: formData.email, 
        phone: formData.phone 
      };
      if (formData.password) data.password = formData.password;
      
      // تحديد المسار المناسب (موظف منصة أو موظف مطعم/متجر)
      const isPlatformStaff = !staff?.storeId && !staff?.restaurantId;
      const endpoint = isPlatformStaff 
        ? `/admin/platform-staff/${staffId}` 
        : `/admin/staff/${staffId}`;
      
      await api.put(endpoint, data);
      toast.success('تم تحديث بيانات الموظف');
      setEditing(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.error || 'فشل تحديث البيانات');
    }
  };

  const handleUpdatePermissions = async () => {
    try {
      const isPlatformStaff = !staff?.storeId && !staff?.restaurantId;
      const endpoint = isPlatformStaff 
        ? `/admin/platform-staff/${staffId}/permissions` 
        : (staff?.storeId 
            ? `/admin/stores/${staff.storeId}/staff/${staffId}/permissions`
            : `/admin/restaurants/${staff.restaurantId}/staff/${staffId}/permissions`);
      
      await api.put(endpoint, { permissions });
      toast.success('تم تحديث صلاحيات الموظف');
      setEditingPermissions(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Permissions update error:', error);
      toast.error(error.response?.data?.error || 'فشل تحديث الصلاحيات');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const isPlatformStaff = !staff?.storeId && !staff?.restaurantId;
      const endpoint = isPlatformStaff 
        ? `/admin/platform-staff/${staffId}/toggle` 
        : `/admin/staff/${staffId}/toggle`;
      
      await api.patch(endpoint);
      toast.success(`تم ${staff?.isActive ? 'تعطيل' : 'تفعيل'} الموظف`);
      fetchStaff();
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('فشل تغيير حالة الموظف');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('⚠️ هل أنت متأكد من حذف هذا الموظف؟\n\nهذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      const isPlatformStaff = !staff?.storeId && !staff?.restaurantId;
      const endpoint = isPlatformStaff 
        ? `/admin/platform-staff/${staffId}` 
        : `/admin/staff/${staffId}`;
      
      await api.delete(endpoint);
      toast.success('تم حذف الموظف');
      navigate('/admin/staff');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('فشل حذف الموظف');
    }
  };

  const handleResetPassword = async () => {
    const newPassword = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل)');
    if (!newPassword) return;
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    try {
      await api.post(`/admin/users/${staffId}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل إعادة تعيين كلمة المرور');
    }
  };

  const getStaffType = () => {
    if (!staff) return 'unknown';
    if (staff.storeId) return 'store';
    if (staff.restaurantId) return 'restaurant';
    return 'platform';
  };

  const staffType = getStaffType();
  const isPlatformStaff = staffType === 'platform';

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
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    color: C.muted,
    fontSize: 12,
    display: 'block',
    marginBottom: 4
  };

  const valueStyle: React.CSSProperties = {
    color: C.text,
    fontSize: 14
  };

  // صلاحيات موظفي المنصة
  const platformPermissionsList = [
    { key: 'canManageRestaurants', label: '🍽️ إدارة المطاعم' },
    { key: 'canManageStores', label: '🛍️ إدارة المتاجر' },
    { key: 'canManageUsers', label: '👥 إدارة المستخدمين' },
    { key: 'canManageDrivers', label: '🚚 إدارة السائقين' },
    { key: 'canManagePlans', label: '💰 إدارة الخطط' },
    { key: 'canManageSettings', label: '⚙️ إعدادات المنصة' },
    { key: 'canViewReports', label: '📊 التقارير والإحصائيات' },
  ];

  // صلاحيات موظفي المطاعم/المتاجر
  const businessPermissionsList = [
    { key: 'viewOrders', label: '📋 عرض الطلبات' },
    { key: 'updateOrderStatus', label: '🔄 تحديث حالة الطلب' },
    { key: 'viewProducts', label: '📦 عرض المنتجات' },
    { key: 'updateProducts', label: '✏️ إدارة المنتجات' },
    { key: 'viewInventory', label: '📊 عرض المخزون' },
    { key: 'updateInventory', label: '📦 إدارة المخزون' },
  ];

  if (loading) return <Loader fullScreen />;
  if (!staff) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Cairo, sans-serif' }}>
      الموظف غير موجود
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/staff')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <IoArrowBack size={18} /> العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            background: staffType === 'store' ? 'rgba(167,139,250,0.15)' : 
                        staffType === 'restaurant' ? 'rgba(96,165,250,0.15)' : 
                        'rgba(200,226,53,0.15)',
            borderRadius: 14, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {staffType === 'store' ? <IoStorefront size={24} style={{ color: C.purple }} /> : 
             staffType === 'restaurant' ? <IoRestaurant size={24} style={{ color: C.blue }} /> : 
             <IoPerson size={24} style={{ color: C.accent }} />}
          </div>
          <div>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{staff.name}</h1>
            <p style={{ color: C.muted, fontSize: 13 }}>
              {staffType === 'store' ? 'موظف متجر' : 
               staffType === 'restaurant' ? 'موظف مطعم' : 
               'موظف منصة'} • {staff.email}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleResetPassword} style={{ padding: '8px 16px', background: `${C.accent}15`, color: C.accent, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IoKey size={14} /> إعادة تعيين كلمة المرور
          </button>
          <button onClick={handleToggleStatus} style={{ padding: '8px 16px', background: staff.isActive ? 'rgba(251,191,36,0.12)' : 'rgba(200,226,53,0.12)', color: staff.isActive ? C.gold : C.accent, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
            {staff.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button onClick={handleDelete} style={{ padding: '8px 16px', background: 'rgba(255,107,107,0.12)', color: C.red, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
            <IoTrash size={14} style={{ marginLeft: 4 }} /> حذف
          </button>
        </div>
      </div>

      {/* Details card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
        {/* معلومات أساسية */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>📋 معلومات الموظف</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(167,139,250,0.12)', color: C.purple, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
              <IoPencil size={14} /> تعديل
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleUpdate} style={{ padding: '8px 16px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>حفظ</button>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', background: C.surf, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>إلغاء</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          {[
            { label: 'الاسم', field: 'name', type: 'text' },
            { label: 'البريد الإلكتروني', field: 'email', type: 'email' },
            { label: 'رقم الهاتف', field: 'phone', type: 'tel' },
          ].map(f => (
            <div key={f.field}>
              <label style={labelStyle}>{f.label}</label>
              {editing ? (
                <input type={f.type} value={(formData as any)[f.field]} onChange={e => setFormData({ ...formData, [f.field]: e.target.value })} style={inputStyle} />
              ) : (
                <p style={valueStyle}>{(staff as any)[f.field] || '-'}</p>
              )}
            </div>
          ))}

          <div>
            <label style={labelStyle}>التابع لـ</label>
            {staff.store ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 14 }}>
                <IoStorefront size={14} /> {staff.store.name}
              </div>
            ) : staff.restaurant ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.blue, fontSize: 14 }}>
                <IoRestaurant size={14} /> {staff.restaurant.name}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.accent, fontSize: 14 }}>
                <IoPerson size={14} /> منصة شام ستورز
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>نوع الموظف</label>
            <span style={{ 
              background: staffType === 'store' ? `${C.purple}20` : 
                          staffType === 'restaurant' ? `${C.blue}20` : 
                          `${C.accent}20`,
              color: staffType === 'store' ? C.purple : 
                     staffType === 'restaurant' ? C.blue : 
                     C.accent,
              padding: '4px 12px', 
              borderRadius: 10, 
              fontSize: 12,
              display: 'inline-block'
            }}>
              {staffType === 'store' ? '🛍️ متجر' : 
               staffType === 'restaurant' ? '🍽️ مطعم' : 
               '👑 منصة'}
            </span>
          </div>

          <div>
            <label style={labelStyle}>الحالة</label>
            <span style={{ background: staff.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)', color: staff.isActive ? C.accent : C.red, padding: '4px 10px', borderRadius: 10, fontSize: 12 }}>
              {staff.isActive ? '✅ نشط' : '❌ غير نشط'}
            </span>
          </div>

          <div>
            <label style={labelStyle}>تاريخ التسجيل</label>
            <p style={valueStyle}>{format(new Date(staff.createdAt), 'dd MMMM yyyy', { locale: ar })}</p>
          </div>

          {staff.lastLogin && (
            <div>
              <label style={labelStyle}>آخر دخول</label>
              <p style={valueStyle}>{format(new Date(staff.lastLogin), 'dd MMMM yyyy - hh:mm a', { locale: ar })}</p>
            </div>
          )}

          {editing && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>كلمة المرور (اتركها فارغة لعدم التغيير)</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ ...inputStyle, paddingLeft: 38 }} placeholder="••••••" />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0, display: 'flex' }}>
                  {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* صلاحيات الموظف */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700 }}>🔑 صلاحيات الموظف</h3>
            {!editingPermissions ? (
              <button onClick={() => setEditingPermissions(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(167,139,250,0.12)', color: C.purple, border: 'none', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>
                <IoPencil size={12} /> تعديل الصلاحيات
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleUpdatePermissions} style={{ padding: '6px 14px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>حفظ</button>
                <button onClick={() => setEditingPermissions(false)} style={{ padding: '6px 14px', background: C.surf, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>إلغاء</button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {(isPlatformStaff ? platformPermissionsList : businessPermissionsList).map(perm => (
              <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: editingPermissions ? 'pointer' : 'default', color: C.text, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={editingPermissions ? (permissions[perm.key] || false) : (staff.permissions?.[perm.key] || false)}
                  onChange={(e) => {
                    if (editingPermissions) {
                      setPermissions({ ...permissions, [perm.key]: e.target.checked });
                    }
                  }}
                  disabled={!editingPermissions}
                  style={{ width: 16, height: 16, cursor: editingPermissions ? 'pointer' : 'default', accentColor: C.accent }}
                />
                {perm.label}
              </label>
            ))}
          </div>

          {!editingPermissions && Object.keys(staff.permissions || {}).filter(k => staff.permissions?.[k]).length === 0 && (
            <p style={{ color: C.muted, fontSize: 12, marginTop: 12, textAlign: 'center' }}>
              لا توجد صلاحيات محددة لهذا الموظف
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStaffDetailsPage;