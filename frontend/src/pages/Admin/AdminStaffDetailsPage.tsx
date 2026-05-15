import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import { IoArrowBack, IoPencil, IoStorefront, IoRestaurant, IoEye, IoEyeOff } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface StaffMember {
  id: string; name: string; email: string; phone: string; role: string; isActive: boolean;
  lastLogin: string | null; createdAt: string; updatedAt: string;
  storeId?: string; restaurantId?: string;
  store?: { id: string; name: string; slug: string };
  restaurant?: { id: string; name: string; slug: string };
  permissions: { viewOrders: boolean; updateOrderStatus: boolean; viewProducts: boolean; updateProducts: boolean; viewInventory: boolean; updateInventory: boolean };
}

const AdminStaffDetailsPage: React.FC = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

  useEffect(() => { fetchStaff(); }, [staffId]);

  const fetchStaff = async () => {
    try {
      const response = await api.get(`/admin/staff/${staffId}`);
      const d = response?.data || response;
      setStaff(d);
      setFormData({ name: d.name || '', email: d.email || '', phone: d.phone || '', password: '' });
    } catch { toast.error('فشل تحميل بيانات الموظف'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    try {
      const data: any = { name: formData.name, email: formData.email, phone: formData.phone };
      if (formData.password) data.password = formData.password;
      await api.put(`/admin/staff/${staffId}`, data);
      toast.success('تم تحديث بيانات الموظف'); setEditing(false); fetchStaff();
    } catch (error: any) { toast.error(error.response?.data?.error || 'فشل تحديث البيانات'); }
  };

  const handleToggleStatus = async () => {
    try { await api.patch(`/admin/staff/${staffId}/toggle`); toast.success(`تم ${staff?.isActive ? 'تعطيل' : 'تفعيل'} الموظف`); fetchStaff(); }
    catch { toast.error('فشل تغيير حالة الموظف'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try { await api.delete(`/admin/staff/${staffId}`); toast.success('تم حذف الموظف'); navigate('/admin/staff'); }
    catch { toast.error('فشل حذف الموظف'); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { color: C.muted, fontSize: 12, display: 'block', marginBottom: 4 };
  const valueStyle: React.CSSProperties = { color: C.text, fontSize: 14 };

  if (loading) return <Loader fullScreen />;
  if (!staff) return <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Cairo, sans-serif' }}>الموظف غير موجود</div>;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/admin/staff')} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <IoArrowBack size={18} /> العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
          <div style={{ width: 48, height: 48, background: 'rgba(167,139,250,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {staff.storeId ? <IoStorefront size={24} style={{ color: C.purple }} /> : <IoRestaurant size={24} style={{ color: C.blue }} />}
          </div>
          <div>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{staff.name}</h1>
            <p style={{ color: C.muted, fontSize: 13 }}>{staff.storeId ? 'موظف متجر' : 'موظف مطعم'} • {staff.email}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleToggleStatus} style={{ padding: '8px 16px', background: staff.isActive ? 'rgba(251,191,36,0.12)' : 'rgba(200,226,53,0.12)', color: staff.isActive ? '#FBBF24' : C.accent, border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {staff.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button onClick={handleDelete} style={{ padding: '8px 16px', background: 'rgba(255,107,107,0.12)', color: C.red, border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            حذف
          </button>
        </div>
      </div>

      {/* Details card */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>معلومات الموظف</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(167,139,250,0.12)', color: C.purple, border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <IoPencil size={14} /> تعديل
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleUpdate} style={{ padding: '8px 16px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>حفظ</button>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', background: C.surf, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>إلغاء</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
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
            ) : <p style={{ color: C.muted, fontSize: 14 }}>غير محدد</p>}
          </div>

          <div>
            <label style={labelStyle}>الحالة</label>
            <span style={{ background: staff.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)', color: staff.isActive ? C.accent : C.red, padding: '4px 10px', borderRadius: 10, fontSize: 12 }}>
              {staff.isActive ? 'نشط' : 'غير نشط'}
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
      </div>
    </div>
  );
};

export default AdminStaffDetailsPage;
