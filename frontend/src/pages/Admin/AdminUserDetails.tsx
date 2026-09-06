// pages/Admin/AdminUserDetails.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IoArrowBack, IoPerson, IoMail, IoCall, IoCalendar,
  IoKey, IoEye, IoEyeOff, IoTrash, IoCheckmarkCircle,
  IoCloseCircle, IoRefresh, IoRestaurant, IoStorefront,
  IoCar, IoWallet, IoSettings, IoShield, IoLockClosed
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
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
};

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';
  isActive: boolean;
  isEmailVerified?: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  restaurant?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    plan: { name: string; price: number };
  };
  store?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    isActive: boolean;
    plan: { name: string; price: number };
  };
  orders?: Array<{
    id: string;
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  stats?: {
    totalOrders: number;
    totalSpent: number;
    completedOrders: number;
    cancelledOrders: number;
  };
}

const AdminUserDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [newBusinessType, setNewBusinessType] = useState<'store' | 'restaurant'>('store');
  const [newBusinessName, setNewBusinessName] = useState('');
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      const response = await api.get(`/admin/users/${id}`);
      setUser(response);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('فشل تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setUpdatingPassword(true);
    try {
      await api.post(`/admin/users/${id}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      toast.error('فشل إعادة تعيين كلمة المرور');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    setChangingRole(true);
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });
      toast.success('تم تحديث دور المستخدم بنجاح');
      fetchUserDetails();
    } catch (error) {
      toast.error('فشل تحديث دور المستخدم');
    } finally {
      setChangingRole(false);
    }
  };

  const handleCreateBusiness = async () => {
    const name = newBusinessName.trim();
    if (name.length < 2) {
      toast.error('أدخل اسم النشاط');
      return;
    }
    setCreatingBusiness(true);
    try {
      await api.post(`/admin/users/${id}/business`, { type: newBusinessType, name });
      toast.success(newBusinessType === 'store' ? 'أُنشئ المتجر ورُبط بالحساب' : 'أُنشئ المطعم ورُبط بالحساب');
      setNewBusinessName('');
      fetchUserDetails();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'فشل إنشاء النشاط');
    } finally {
      setCreatingBusiness(false);
    }
  };

  const handleToggleEmailVerified = async () => {
    if (!user) return;
    const next = !user.isEmailVerified;
    if (
      !window.confirm(
        next
          ? `تفعيل بريد ${user.email} بدون رسالة تحقّق؟ سيتمكّن من تسجيل الدخول فوراً.`
          : `إلغاء تفعيل بريد ${user.email}؟ سيُمنع من تسجيل الدخول.`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/admin/users/${id}/email-verified`, { isEmailVerified: next });
      toast.success(next ? 'تم تفعيل البريد' : 'تم إلغاء تفعيل البريد');
      fetchUserDetails();
    } catch {
      /* الرسالة تظهر عبر interceptor */
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      await api.patch(`/admin/users/${id}/toggle`);
      toast.success(user.isActive ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
      fetchUserDetails();
    } catch (error) {
      toast.error('فشل تغيير حالة المستخدم');
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    if (user.role === 'super_admin') {
      toast.error('لا يمكن حذف المستخدم الأساسي');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`)) {
      try {
        await api.delete(`/admin/users/${id}`);
        toast.success('تم حذف المستخدم بنجاح');
        navigate('/admin/users');
      } catch (error) {
        toast.error('فشل حذف المستخدم');
      }
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, React.CSSProperties> = {
      super_admin: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
      owner:       { background: 'rgba(96,165,250,0.15)',  color: C.blue },
      staff:       { background: 'rgba(200,226,53,0.15)',  color: C.accent },
      delivery_driver: { background: 'rgba(251,146,60,0.15)', color: '#fb923c' },
      user:        { background: 'rgba(157,196,172,0.15)', color: C.muted },
    };
    const labels: Record<string, string> = {
      super_admin: 'مدير المنصة',
      owner: 'مالك مطعم',
      staff: 'موظف',
      delivery_driver: 'مندوب توصيل',
      user: 'مستخدم عادي'
    };
    return (
      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontFamily: 'Cairo, sans-serif', ...(styles[role] || styles.user) }}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, background: 'rgba(200,226,53,0.15)', color: C.accent }}>
        <IoCheckmarkCircle size={14} /> نشط
      </span>
    ) : (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, background: 'rgba(255,107,107,0.15)', color: C.red }}>
        <IoCloseCircle size={14} /> غير نشط
      </span>
    );
  };

  const getOrderStatusBadge = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      pending:   { background: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
      preparing: { background: 'rgba(96,165,250,0.15)',  color: C.blue },
      ready:     { background: 'rgba(200,226,53,0.15)',  color: C.accent },
      delivering:{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
      delivered: { background: 'rgba(157,196,172,0.15)', color: C.muted },
      cancelled: { background: 'rgba(255,107,107,0.15)', color: C.red },
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار', preparing: 'قيد التحضير', ready: 'جاهز',
      delivering: 'قيد التوصيل', delivered: 'مكتمل', cancelled: 'ملغي'
    };
    return (
      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, ...(styles[status] || styles.delivered) }}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;
  if (!user) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: 'Cairo, sans-serif' }}>
      المستخدم غير موجود
    </div>
  );

  const inputStyle: React.CSSProperties = {
    background: C.surf,
    border: '1px solid ' + C.border,
    borderRadius: 10,
    color: C.text,
    padding: '10px 14px',
    fontFamily: 'Cairo, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    background: C.card,
    border: '1px solid ' + C.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 0,
  };

  const labelStyle: React.CSSProperties = { color: C.muted, fontSize: 12, display: 'block', marginBottom: 4 };
  const valueStyle: React.CSSProperties = { color: C.text, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/admin/users')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 14 }}
        >
          <IoArrowBack size={18} /> ← العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, background: C.surfL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + C.border }}>
            <IoPerson style={{ color: C.accent, fontSize: 24 }} />
          </div>
          <div>
            <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{user.name}</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{user.email}</p>
          </div>
        </div>
        {getRoleBadge(user.role)}
        {getStatusBadge(user.isActive)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, gridColumn: 'span 2' }}>
          {/* معلومات الحساب */}
          <div style={cardStyle}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoPerson style={{ color: C.accent }} /> معلومات الحساب
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>الاسم الكامل</label>
                <p style={valueStyle}>{user.name}</p>
              </div>
              <div>
                <label style={labelStyle}>البريد الإلكتروني</label>
                <p style={valueStyle}><IoMail size={14} style={{ color: C.muted }} />{user.email}</p>
              </div>
              <div>
                <label style={labelStyle}>رقم الهاتف</label>
                <p style={valueStyle}><IoCall size={14} style={{ color: C.muted }} />{user.phone || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>آخر تسجيل دخول</label>
                <p style={valueStyle}><IoCalendar size={14} style={{ color: C.muted }} />{user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-SA') : '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>تاريخ التسجيل</label>
                <p style={valueStyle}><IoCalendar size={14} style={{ color: C.muted }} />{new Date(user.createdAt).toLocaleDateString('ar-SA')}</p>
              </div>
              <div>
                <label style={labelStyle}>آخر تحديث</label>
                <p style={valueStyle}><IoRefresh size={14} style={{ color: C.muted }} />{new Date(user.updatedAt).toLocaleDateString('ar-SA')}</p>
              </div>
            </div>
          </div>

          {/* إحصائيات */}
          {user.stats && (
            <div style={cardStyle}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoWallet style={{ color: C.accent }} /> إحصائيات الطلبات
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                {[
                  { val: user.stats.totalOrders, label: 'إجمالي الطلبات', color: C.blue },
                  { val: user.stats.completedOrders, label: 'مكتملة', color: C.accent },
                  { val: user.stats.cancelledOrders, label: 'ملغية', color: C.red },
                  { val: `${user.stats.totalSpent} ل.س`, label: 'إجمالي المشتريات', color: '#a78bfa' },
                ].map((stat, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 16, background: C.surf, borderRadius: 12, border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.val}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* آخر الطلبات */}
          {user.orders && user.orders.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoCar style={{ color: C.accent }} /> آخر الطلبات
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['رقم الطلب', 'المبلغ', 'الحالة', 'التاريخ'].map(h => (
                        <th key={h} style={{ background: C.surf, color: C.muted, fontSize: 12, padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {user.orders.slice(0, 5).map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        style={{ cursor: 'pointer', borderBottom: '1px solid ' + C.border }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,226,53,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px', color: C.text, fontFamily: 'monospace', fontSize: 13 }}>{order.orderNumber}</td>
                        <td style={{ padding: '12px 16px', color: C.accent, fontWeight: 700 }}>{order.total} ل.س</td>
                        <td style={{ padding: '12px 16px' }}>{getOrderStatusBadge(order.status)}</td>
                        <td style={{ padding: '12px 16px', color: C.muted, fontSize: 13 }}>{new Date(order.createdAt).toLocaleDateString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column - actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* معلومات المطعم */}
          {user.restaurant && (
            <div style={cardStyle}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoRestaurant style={{ color: C.accent }} /> المطعم
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'اسم المطعم', val: user.restaurant.name, link: `/admin/restaurants/${user.restaurant.id}` },
                  { label: 'البريد الإلكتروني', val: user.restaurant.email },
                  { label: 'رقم الهاتف', val: user.restaurant.phone || '-' },
                  { label: 'العنوان', val: user.restaurant.address || '-' },
                  { label: 'الخطة', val: `${user.restaurant.plan?.name || 'free'} - ${user.restaurant.plan?.price || 0} ل.س/شهر` },
                ].map((row, i) => (
                  <div key={i}>
                    <label style={labelStyle}>{row.label}</label>
                    {row.link ? (
                      <p style={{ ...valueStyle, color: C.accent, cursor: 'pointer' }} onClick={() => navigate(row.link!)}>{row.val}</p>
                    ) : (
                      <p style={valueStyle}>{row.val}</p>
                    )}
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>الحالة</label>
                  {getStatusBadge(user.restaurant.isActive)}
                </div>
                <button onClick={() => navigate(`/admin/restaurants/${user.restaurant?.id}`)}
                  style={{ width: '100%', marginTop: 8, background: C.accent, color: C.bg, border: 'none', borderRadius: 10, padding: '10px 0', fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  إدارة المطعم
                </button>
              </div>
            </div>
          )}

          {/* معلومات المتجر */}
          {user.store && (
            <div style={cardStyle}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoStorefront style={{ color: C.accent }} /> المتجر
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'اسم المتجر', val: user.store.name, link: `/admin/stores/${user.store.id}` },
                  { label: 'البريد الإلكتروني', val: user.store.email },
                  { label: 'رقم الهاتف', val: user.store.phone || '-' },
                  { label: 'العنوان', val: user.store.address || '-' },
                  { label: 'الخطة', val: `${user.store.plan?.name || 'free'} - ${user.store.plan?.price || 0} ل.س/شهر` },
                ].map((row, i) => (
                  <div key={i}>
                    <label style={labelStyle}>{row.label}</label>
                    {row.link ? (
                      <p style={{ ...valueStyle, color: C.accent, cursor: 'pointer' }} onClick={() => navigate(row.link!)}>{row.val}</p>
                    ) : (
                      <p style={valueStyle}>{row.val}</p>
                    )}
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>الحالة</label>
                  {getStatusBadge(user.store.isActive)}
                </div>
                <button onClick={() => navigate(`/admin/stores/${user.store?.id}`)}
                  style={{ width: '100%', marginTop: 8, background: C.accent, color: C.bg, border: 'none', borderRadius: 10, padding: '10px 0', fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  إدارة المتجر
                </button>
              </div>
            </div>
          )}

          {/* تغيير الدور */}
          {user.role !== 'super_admin' && (
            <div style={cardStyle}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoShield style={{ color: C.accent }} /> تغيير الدور
              </h2>
              <select
                value={user.role}
                onChange={(e) => handleUpdateRole(e.target.value)}
                disabled={changingRole}
                style={{ ...inputStyle }}
              >
                <option value="user">مستخدم عادي</option>
                <option value="owner">صاحب مطعم أو متجر</option>
                <option value="staff">موظف</option>
                <option value="delivery_driver">مندوب توصيل</option>
              </select>
              {changingRole && <p style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>جاري التحديث...</p>}
            </div>
          )}

          {/* إنشاء نشاط — الدور وحده لا يصنع تاجراً */}
          {user.role !== 'super_admin' && !user.restaurant && !user.store && (
            <div style={cardStyle}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoStorefront style={{ color: C.accent }} /> إنشاء نشاط لهذا الحساب
              </h2>
              <p style={{ color: C.muted, fontSize: 12.5, margin: '0 0 14px', lineHeight: 1.9 }}>
                دور «صاحب مطعم أو متجر» وحده لا يكفي: من يحمله بلا نشاط مرتبط
                تردّه لوحة التحكم إلى الصفحة الرئيسية. الإنشاء هنا يربط النشاط
                ويرفع الدور معاً.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {([
                  { key: 'store' as const, label: 'متجر' },
                  { key: 'restaurant' as const, label: 'مطعم' }
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setNewBusinessType(key)}
                    aria-pressed={newBusinessType === key}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${newBusinessType === key ? C.accent : C.border}`,
                      background: newBusinessType === key ? 'rgba(200,226,53,0.1)' : C.surf,
                      color: newBusinessType === key ? C.accent : C.muted,
                      fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label style={labelStyle} htmlFor="new-business-name">
                {newBusinessType === 'store' ? 'اسم المتجر' : 'اسم المطعم'}
              </label>
              <input
                id="new-business-name"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                maxLength={80}
                placeholder={newBusinessType === 'store' ? 'متجري الإلكتروني' : 'مطعمي المفضل'}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <Button
                variant="primary"
                onClick={handleCreateBusiness}
                loading={creatingBusiness}
                fullWidth
              >
                إنشاء وربط
              </Button>
            </div>
          )}

          {/* إعادة تعيين كلمة المرور */}
          <div style={cardStyle}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoKey style={{ color: C.accent }} /> إعادة تعيين كلمة المرور
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  style={{ ...inputStyle, paddingLeft: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
                >
                  {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
              <Button variant="primary" onClick={handleResetPassword} loading={updatingPassword} fullWidth>
                إعادة تعيين كلمة المرور
              </Button>
            </div>
          </div>

          {/* حالة الحساب */}
          <div style={cardStyle}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoSettings style={{ color: C.accent }} /> حالة الحساب
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.muted, fontSize: 14 }}>الحالة الحالية:</span>
                {getStatusBadge(user.isActive)}
              </div>
              <button
                onClick={handleToggleStatus}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14,
                  ...(user.isActive
                    ? { background: 'rgba(255,107,107,0.15)', color: C.red, border: '1px solid rgba(255,107,107,0.3)' }
                    : { background: C.accent, color: C.bg })
                }}
              >
                {user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
              </button>

              {/* تفعيل البريد قرارٌ مستقلّ عن تفعيل الحساب.
                  الدخول محجوب على من لم يُفعّل بريده، وهناك حسابات لا يمرّ
                  بريدها بالتحقّق أصلاً: سائقٌ يُنشئه التاجر بعنوان صوريّ، أو
                  حسابُ اختبار، أو من انقطع عنه SMTP يوم تسجيله. */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 14 }}>البريد الإلكتروني:</span>
                  <span
                    style={{
                      background: user.isEmailVerified ? 'rgba(200,226,53,0.15)' : 'rgba(245,158,11,0.15)',
                      color: user.isEmailVerified ? C.accent : '#F59E0B',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {user.isEmailVerified ? 'مُفعَّل' : 'غير مُفعَّل'}
                  </span>
                </div>
                <button
                  onClick={handleToggleEmailVerified}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14,
                    ...(user.isEmailVerified
                      ? { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }
                      : { background: 'rgba(200,226,53,0.15)', color: C.accent, border: '1px solid rgba(200,226,53,0.35)' })
                  }}
                >
                  {user.isEmailVerified ? 'إلغاء تفعيل البريد' : 'تفعيل البريد بدون رسالة'}
                </button>
                {!user.isEmailVerified && (
                  <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.8, margin: '8px 0 0' }}>
                    لن يستطيع تسجيل الدخول قبل تفعيل بريده.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* حذف الحساب */}
          {user.role !== 'super_admin' && (
            <div style={{ ...cardStyle, borderColor: 'rgba(255,107,107,0.3)' }}>
              <h2 style={{ color: C.red, fontSize: 16, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoTrash style={{ color: C.red }} /> منطقة الخطر
              </h2>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
                حذف هذا الحساب سيؤدي إلى حذف جميع البيانات المرتبطة به بشكل دائم.
              </p>
              <button
                onClick={handleDeleteUser}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: 'rgba(255,107,107,0.15)', color: C.red, border: '1px solid rgba(255,107,107,0.3)', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14 }}
              >
                حذف الحساب
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetails;
