// pages/Admin/AdminRestaurantDetails.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IoArrowBack, IoSave, IoTrash, IoKey, IoEye, IoEyeOff,
  IoRestaurant, IoLocation, IoCall, IoMail, IoLogoWhatsapp,
  IoColorPalette, IoSettings, IoLink, IoWarning, IoMegaphone,
  IoRefresh
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  description: string;
  logo: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  plan: { id: string; name: string; price: number };
  users: Array<{ id: string; name: string; email: string; phone: string }>;
  createdAt: string;
}

const AdminRestaurantDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    isActive: true
  });

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      const response = await api.get(`/admin/restaurants/${id}`);
      setRestaurant(response);
      setFormData({
        name: response.name || '',
        slug: response.slug || '',
        email: response.email || '',
        phone: response.phone || '',
        whatsapp: response.whatsapp || '',
        address: response.address || '',
        description: response.description || '',
        primaryColor: response.primaryColor || '#3B82F6',
        secondaryColor: response.secondaryColor || '#10B981',
        isActive: response.isActive
      });
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('فشل تحميل بيانات المطعم');
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === restaurant?.slug) {
      setSlugAvailable(true);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await api.get(`/admin/check-slug?slug=${slug}&type=restaurant&id=${id}`);
      setSlugAvailable(response.available);
      if (!response.available) {
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.success('هذا الرابط متاح');
      }
    } catch (error) {
      console.error('Error checking slug:', error);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, slug: newSlug });
    checkSlugAvailability(newSlug);
  };

  const handleUpdate = async () => {
    if (!slugAvailable && formData.slug !== restaurant?.slug) {
      toast.error('الرابط غير متاح، يرجى اختيار رابط آخر');
      return;
    }

    try {
      await api.put(`/admin/restaurants/${id}`, formData);
      toast.success('تم تحديث بيانات المطعم بنجاح');
      setEditing(false);
      fetchRestaurant();
    } catch (error) {
      toast.error('فشل تحديث البيانات');
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
    try {
      await api.post(`/admin/restaurants/${id}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      toast.error('فشل إعادة تعيين كلمة المرور');
    }
  };

  const handleDelete = async () => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${restaurant?.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`)) {
      try {
        await api.delete(`/admin/restaurants/${id}`);
        toast.success('تم حذف المطعم بنجاح');
        navigate('/admin/restaurants');
      } catch (error) {
        toast.error('فشل حذف المطعم');
      }
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, slug });
    checkSlugAvailability(slug);
  };

  if (loading) return <Loader fullScreen />;
  if (!restaurant) return <div style={{ color: C.text, padding: 24 }}>المطعم غير موجود</div>;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: C.surf,
    border: '1px solid ' + C.border,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 6
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/admin/restaurants')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>{restaurant.name}</h1>
        <span style={{
          padding: '2px 12px', borderRadius: 999, fontSize: 12,
          background: restaurant.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)',
          color: restaurant.isActive ? C.accent : C.red,
        }}>
          {restaurant.isActive ? 'نشط' : 'غير نشط'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate(`/admin/business/restaurant/${id}/marketing`)}
          style={{
            background: 'rgba(96,165,250,0.12)', color: C.blue,
            padding: '6px 14px', borderRadius: 10, fontSize: 13,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'Cairo, sans-serif'
          }}
        >
          <IoMegaphone size={16} />
          الإعلانات
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 24, flexWrap: 'wrap' } as React.CSSProperties}>
          {/* معلومات المطعم */}
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>معلومات المطعم</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    style={{ background: C.blue, color: '#fff', padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                  >
                    تعديل
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleUpdate}
                      style={{ background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}
                    >
                      <IoSave size={18} />
                      حفظ
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      style={{ background: C.surf, color: C.muted, padding: '8px 16px', borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                    >
                      إلغاء
                    </button>
                  </>
                )}
                <button
                  onClick={handleDelete}
                  style={{ background: C.red, color: '#fff', padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Cairo, sans-serif' }}
                >
                  <IoTrash size={18} />
                  حذف
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* اسم المطعم */}
              <div>
                <label style={labelStyle}>اسم المطعم</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={inputStyle}
                  />
                ) : (
                  <p style={{ color: C.text, margin: 0 }}>{restaurant.name}</p>
                )}
              </div>

              {/* حقل الرابط (slug) */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoLink size={16} />
                  الرابط (Slug)
                </label>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={handleSlugChange}
                        style={{
                          ...inputStyle,
                          flex: 1,
                          border: `1px solid ${!slugAvailable && formData.slug !== restaurant.slug ? C.red : C.border}`,
                          background: !slugAvailable && formData.slug !== restaurant.slug ? 'rgba(255,107,107,0.08)' : C.surf,
                        }}
                        placeholder="my-restaurant"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={generateSlug}
                        style={{ padding: '0 12px', background: C.surf, border: '1px solid ' + C.border, borderRadius: 10, cursor: 'pointer', color: C.muted }}
                        title="توليد رابط تلقائي"
                      >
                        <IoRefresh size={18} />
                      </button>
                    </div>
                    {checkingSlug && (
                      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>جاري التحقق من الرابط...</p>
                    )}
                    {!slugAvailable && formData.slug !== restaurant.slug && (
                      <p style={{ color: C.red, fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IoWarning size={14} />
                        هذا الرابط مستخدم بالفعل، يرجى اختيار رابط آخر
                      </p>
                    )}
                    {slugAvailable && formData.slug !== restaurant.slug && formData.slug && (
                      <p style={{ color: C.accent, fontSize: 12, margin: 0 }}>✓ هذا الرابط متاح</p>
                    )}
                    <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>
                      الرابط الخاص بمطعمك: {window.location.origin}/{formData.slug || '...'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: C.accent, fontFamily: 'monospace', margin: 0 }}>{restaurant.slug}</p>
                    <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                      رابط المطعم: {window.location.origin}/{restaurant.slug}
                    </p>
                  </div>
                )}
              </div>

              {/* البريد الإلكتروني */}
              <div>
                <label style={labelStyle}>البريد الإلكتروني</label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={inputStyle}
                  />
                ) : (
                  <p style={{ color: C.text, margin: 0 }}>{restaurant.email}</p>
                )}
              </div>

              {/* الهاتف والواتساب */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>رقم الهاتف</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={inputStyle}
                    />
                  ) : (
                    <p style={{ color: C.text, margin: 0 }}>{restaurant.phone || '-'}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>واتساب</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      style={inputStyle}
                    />
                  ) : (
                    <p style={{ color: C.text, margin: 0 }}>{restaurant.whatsapp || '-'}</p>
                  )}
                </div>
              </div>

              {/* العنوان */}
              <div>
                <label style={labelStyle}>العنوان</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={inputStyle}
                  />
                ) : (
                  <p style={{ color: C.text, margin: 0 }}>{restaurant.address || '-'}</p>
                )}
              </div>

              {/* الوصف */}
              <div>
                <label style={labelStyle}>الوصف</label>
                {editing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    rows={3}
                  />
                ) : (
                  <p style={{ color: C.text, margin: 0 }}>{restaurant.description || '-'}</p>
                )}
              </div>

              {/* الألوان */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>اللون الأساسي</label>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        style={{ width: 48, height: 40, border: '1px solid ' + C.border, borderRadius: 8, background: C.surf, cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: restaurant.primaryColor, border: '1px solid ' + C.border }} />
                      <span style={{ color: C.text }}>{restaurant.primaryColor}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>اللون الثانوي</label>
                  {editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        style={{ width: 48, height: 40, border: '1px solid ' + C.border, borderRadius: 8, background: C.surf, cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: restaurant.secondaryColor, border: '1px solid ' + C.border }} />
                      <span style={{ color: C.text }}>{restaurant.secondaryColor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* الحالة */}
              <div>
                <label style={labelStyle}>الحالة</label>
                {editing ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ color: C.text }}>مفعل</span>
                  </label>
                ) : (
                  <span style={{ color: restaurant.isActive ? C.accent : C.red }}>
                    {restaurant.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* الجانب الأيسر */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* الخطة */}
            <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 16 }}>الخطة</h2>
              <p style={{ color: C.text, margin: '0 0 8px' }}><span style={{ color: C.muted }}>الخطة:</span> {restaurant.plan?.name || '-'}</p>
              <p style={{ color: C.text, margin: '0 0 8px' }}><span style={{ color: C.muted }}>السعر:</span> {restaurant.plan?.price || 0} ل.س/شهر</p>
              <p style={{ color: C.text, margin: 0 }}><span style={{ color: C.muted }}>تاريخ التسجيل:</span> {new Date(restaurant.createdAt).toLocaleDateString('ar-SA')}</p>
            </div>

            {/* إعادة تعيين كلمة المرور */}
            <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
              <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoKey size={20} />
                إعادة تعيين كلمة المرور
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted }}
                  >
                    {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                  </button>
                </div>
                <Button variant="primary" onClick={handleResetPassword} fullWidth>
                  إعادة تعيين كلمة المرور
                </Button>
              </div>
            </div>

            {/* معلومات المالك */}
            {restaurant.users && restaurant.users.length > 0 && (
              <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
                <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 16 }}>معلومات المالك</h2>
                <p style={{ color: C.text, margin: '0 0 8px' }}><span style={{ color: C.muted }}>الاسم:</span> {restaurant.users[0].name}</p>
                <p style={{ color: C.text, margin: '0 0 8px' }}><span style={{ color: C.muted }}>البريد:</span> {restaurant.users[0].email}</p>
                <p style={{ color: C.text, margin: 0 }}><span style={{ color: C.muted }}>الهاتف:</span> {restaurant.users[0].phone || '-'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRestaurantDetails;
