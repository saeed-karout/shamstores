// pages/Admin/AdminStoreDetails.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IoArrowBack, IoSave, IoTrash, IoKey, IoEye, IoEyeOff,
  IoStorefront, IoLocation, IoCall, IoMail, IoLogoWhatsapp,
  IoColorPalette, IoSettings, IoLink, IoWarning, IoRefresh, IoMegaphone
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { getImageUrl } from '@/utils/imageHelpers';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

interface StoreOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
}

interface Stats {
  productsCount: number;
  ordersCount: number;
  totalSales: number;
}

interface Store {
  id: string;
  userId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logo: string;
  coverImage: string | null;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  planId: string;
  settings: any;
  createdAt: string;
  updatedAt: string;
  storeOwner?: StoreOwner;
  plan?: Plan;
  stats?: Stats;
}

const AdminStoreDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'settings'>('info');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);
  const { user, isSuperAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
    latitude: '',
    longitude: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    isActive: true,
    settings: {
      enableDelivery: true,
      deliveryFee: 5,
      freeDeliveryAbove: 100,
      estimatedTime: 45
    }
  });

  useEffect(() => {
    fetchStore();
  }, [id]);

  const fetchStore = async () => {
    try {
      const response = await api.get(`/admin/stores/${id}`);
      const storeData = response.data || response;

      console.log('✅ Store data received:', storeData);

      setStore(storeData);

      let parsedSettings = {
        enableDelivery: true,
        deliveryFee: 5,
        freeDeliveryAbove: 100,
        estimatedTime: 45
      };

      if (storeData.settings) {
        try {
          if (typeof storeData.settings === 'string') {
            let cleanSettings = storeData.settings;
            if (cleanSettings.includes('"0":"{"')) {
              const match = cleanSettings.match(/(\{.*\})/);
              if (match) {
                cleanSettings = match[1];
              }
            }
            parsedSettings = JSON.parse(cleanSettings);
          } else {
            parsedSettings = storeData.settings;
          }
        } catch (error) {
          console.error('Error parsing settings:', error);
        }
      }

      setFormData({
        name: storeData.name || '',
        slug: storeData.slug || '',
        email: storeData.email || '',
        phone: storeData.phone || '',
        whatsapp: storeData.whatsapp || '',
        address: storeData.address || '',
        description: storeData.description || '',
        latitude: storeData.latitude?.toString() || '',
        longitude: storeData.longitude?.toString() || '',
        primaryColor: storeData.primaryColor || '#3B82F6',
        secondaryColor: storeData.secondaryColor || '#10B981',
        isActive: storeData.isActive,
        settings: parsedSettings
      });
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('فشل تحميل بيانات المتجر');
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === store?.slug) {
      setSlugAvailable(true);
      return;
    }

    setCheckingSlug(true);
    try {
      const response = await api.get(`/admin/check-slug?slug=${slug}&type=store&id=${id}`);
      const data = response.data || response;
      setSlugAvailable(data.available !== false);
      if (!data.available) {
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

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, slug });
    checkSlugAvailability(slug);
  };

  const handleUpdate = async () => {
    if (!slugAvailable && formData.slug !== store?.slug) {
      toast.error('الرابط غير متاح، يرجى اختيار رابط آخر');
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        slug: formData.slug,
        email: formData.email,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        address: formData.address,
        description: formData.description,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        isActive: formData.isActive,
        settings: formData.settings
      };

      await api.put(`/admin/stores/${id}`, updateData);
      toast.success('تم تحديث بيانات المتجر بنجاح');
      setEditing(false);
      fetchStore();
    } catch (error) {
      console.error('Error updating store:', error);
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
      await api.post(`/admin/stores/${id}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('فشل إعادة تعيين كلمة المرور');
    }
  };

  const handleToggleStatus = async () => {
    try {
      await api.patch(`/admin/stores/${id}/toggle-status`);
      toast.success(`تم ${store?.isActive ? 'تعطيل' : 'تفعيل'} المتجر بنجاح`);
      fetchStore();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('فشل تغيير حالة المتجر');
    }
  };

  const handleDelete = async () => {
    if (confirm('هل أنت متأكد من حذف هذا المتجر؟ سيتم حذف جميع البيانات المرتبطة به.')) {
      try {
        await api.delete(`/admin/stores/${id}`);
        toast.success('تم حذف المتجر بنجاح');
        navigate('/admin/stores');
      } catch (error) {
        console.error('Error deleting store:', error);
        toast.error('فشل حذف المتجر');
      }
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!store) return <div style={{ color: C.text, padding: 24, textAlign: 'center' }}>المتجر غير موجود</div>;

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
          onClick={() => navigate('/admin/stores')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {store.logo ? (
            <img
              src={getImageUrl(store.logo)}
              alt={store.name}
              style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 48, height: 48,
              background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <IoStorefront style={{ color: '#fff', fontSize: 20 }} />
            </div>
          )}
          <div>
            <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>{store.name}</h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>متجر رقمي • {store.slug}</p>
          </div>
        </div>
        <span style={{
          padding: '2px 12px', borderRadius: 999, fontSize: 12,
          background: store.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)',
          color: store.isActive ? C.accent : C.red,
        }}>
          {store.isActive ? 'نشط' : 'غير نشط'}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate(`/admin/business/store/${id}/marketing`)}
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
          <button
            onClick={handleToggleStatus}
            style={{
              padding: '6px 14px', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
              background: store.isActive ? 'rgba(200,226,53,0.12)' : 'rgba(200,226,53,0.12)',
              color: store.isActive ? C.muted : C.accent,
            }}
          >
            {store.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button
            onClick={handleDelete}
            style={{
              background: C.red, color: '#fff',
              padding: '6px 14px', borderRadius: 10, fontSize: 13,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'Cairo, sans-serif'
            }}
          >
            <IoTrash size={16} />
            حذف
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>المنتجات</p>
          <p style={{ color: C.purple, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{store.stats?.productsCount || 0}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>الطلبات</p>
          <p style={{ color: C.blue, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{store.stats?.ordersCount || 0}</p>
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 16 }}>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>إجمالي المبيعات</p>
          <p style={{ color: C.accent, fontSize: 26, fontWeight: 700, margin: '4px 0 0' }}>{store.stats?.totalSales || 0} ل.س</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid ' + C.border, paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif', fontSize: 14,
            background: activeTab === 'info' ? C.accent : C.surf,
            color: activeTab === 'info' ? C.bg : C.muted,
            fontWeight: activeTab === 'info' ? 700 : 400,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <IoStorefront style={{ display: 'inline', marginLeft: 4 }} size={16} />
          معلومات المتجر
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif', fontSize: 14,
            background: activeTab === 'settings' ? C.accent : C.surf,
            color: activeTab === 'settings' ? C.bg : C.muted,
            fontWeight: activeTab === 'settings' ? 700 : 400,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <IoSettings style={{ display: 'inline', marginLeft: 4 }} size={16} />
          الإعدادات
        </button>
      </div>

      {/* تبويب معلومات المتجر */}
      {activeTab === 'info' && (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, margin: 0 }}>معلومات المتجر</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                style={{ background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <IoSave size={16} />
                تعديل
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleUpdate}
                  style={{ background: C.accent, color: C.bg, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <IoSave size={16} />
                  حفظ
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ background: C.surf, color: C.muted, padding: '8px 16px', borderRadius: 10, border: '1px solid ' + C.border, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {/* اسم المتجر */}
            <div>
              <label style={labelStyle}>اسم المتجر</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.name}</p>
              )}
            </div>

            {/* الرابط - للسوبر أدمن فقط */}
            {isSuperAdmin && (
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IoLink size={16} />
                  الرابط (Slug) - للتعديل من قبل الأدمن فقط
                </label>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={handleSlugChange}
                        style={{
                          ...inputStyle, flex: 1,
                          border: `1px solid ${!slugAvailable && formData.slug !== store.slug ? C.red : C.border}`,
                          background: !slugAvailable && formData.slug !== store.slug ? 'rgba(255,107,107,0.08)' : C.surf,
                        }}
                        placeholder="my-store"
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
                    {checkingSlug && <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>جاري التحقق...</p>}
                    {!slugAvailable && formData.slug !== store.slug && (
                      <p style={{ color: C.red, fontSize: 12, margin: 0 }}>⚠ هذا الرابط مستخدم بالفعل</p>
                    )}
                    <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>
                      الرابط: {window.location.origin}/{formData.slug}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: C.accent, fontFamily: 'monospace', margin: 0 }}>{store.slug}</p>
                    <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                      {window.location.origin}/{store.slug}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* البريد الإلكتروني */}
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IoMail size={14} /> البريد الإلكتروني
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.email}</p>
              )}
            </div>

            {/* رقم الهاتف */}
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IoCall size={14} /> رقم الهاتف
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.phone || '-'}</p>
              )}
            </div>

            {/* واتساب */}
            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IoLogoWhatsapp size={14} /> واتساب
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.whatsapp || '-'}</p>
              )}
            </div>

            {/* العنوان */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IoLocation size={14} /> العنوان
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={inputStyle}
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.address || '-'}</p>
              )}
            </div>

            {/* الوصف */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>الوصف</label>
              {editing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.description || '-'}</p>
              )}
            </div>

            {/* اللون الأساسي */}
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
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: store.primaryColor, border: '1px solid ' + C.border }} />
                  <span style={{ color: C.text }}>{store.primaryColor}</span>
                </div>
              )}
            </div>

            {/* اللون الثانوي */}
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
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: store.secondaryColor, border: '1px solid ' + C.border }} />
                  <span style={{ color: C.text }}>{store.secondaryColor}</span>
                </div>
              )}
            </div>

            {/* خط العرض */}
            <div>
              <label style={labelStyle}>خط العرض</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  style={inputStyle}
                  placeholder="33.5138"
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.latitude || '-'}</p>
              )}
            </div>

            {/* خط الطول */}
            <div>
              <label style={labelStyle}>خط الطول</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  style={inputStyle}
                  placeholder="36.2765"
                />
              ) : (
                <p style={{ color: C.text, margin: 0 }}>{store.longitude || '-'}</p>
              )}
            </div>

            {/* الخطة */}
            <div>
              <label style={labelStyle}>الخطة</label>
              <p style={{ color: C.text, margin: 0 }}>
                {store.plan?.name || 'مجاني'} - {store.plan?.price || 0} ل.س/شهر
              </p>
              <p style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                الحد الأقصى للمنتجات: {store.plan?.maxProducts || 0}
              </p>
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
                <span style={{ color: store.isActive ? C.accent : C.red }}>
                  {store.isActive ? 'نشط' : 'غير نشط'}
                </span>
              )}
            </div>
          </div>

          {/* معلومات المالك */}
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 12 }}>
            <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoKey size={18} style={{ color: C.purple }} />
              معلومات المالك
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div><span style={{ color: C.muted }}>الاسم:</span> <span style={{ color: C.text }}>{store.storeOwner?.name || '-'}</span></div>
              <div><span style={{ color: C.muted }}>البريد:</span> <span style={{ color: C.text }}>{store.storeOwner?.email || '-'}</span></div>
              <div><span style={{ color: C.muted }}>الهاتف:</span> <span style={{ color: C.text }}>{store.storeOwner?.phone || '-'}</span></div>
            </div>
          </div>

          {/* إعادة تعيين كلمة المرور */}
          <div style={{ marginTop: 24, padding: 16, background: 'rgba(200,226,53,0.06)', border: '1px solid ' + C.border, borderRadius: 12 }}>
            <h3 style={{ color: C.text, fontWeight: 700, marginBottom: 12, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoKey size={18} style={{ color: C.accent }} />
              إعادة تعيين كلمة المرور
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
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
              <Button variant="primary" onClick={handleResetPassword}>
                إعادة تعيين
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* تبويب الإعدادات */}
      {activeTab === 'settings' && (
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
          <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IoSettings size={20} />
            إعدادات المتجر
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: editing ? 'pointer' : 'default' }}>
                <input
                  type="checkbox"
                  checked={formData.settings.enableDelivery}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, enableDelivery: e.target.checked }
                  })}
                  disabled={!editing}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ color: C.text }}>تفعيل خدمة التوصيل</span>
              </label>
            </div>

            <div>
              <label style={labelStyle}>سعر التوصيل الأساسي (ل.س)</label>
              <input
                type="number"
                value={formData.settings.deliveryFee}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, deliveryFee: Number(e.target.value) }
                })}
                disabled={!editing}
                style={{ ...inputStyle, opacity: editing ? 1 : 0.6 }}
              />
            </div>

            <div>
              <label style={labelStyle}>توصيل مجاني للطلبات فوق (ل.س)</label>
              <input
                type="number"
                value={formData.settings.freeDeliveryAbove}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, freeDeliveryAbove: Number(e.target.value) }
                })}
                disabled={!editing}
                style={{ ...inputStyle, opacity: editing ? 1 : 0.6 }}
              />
            </div>

            <div>
              <label style={labelStyle}>الوقت التقديري للتوصيل (دقيقة)</label>
              <input
                type="number"
                value={formData.settings.estimatedTime}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, estimatedTime: Number(e.target.value) }
                })}
                disabled={!editing}
                style={{ ...inputStyle, opacity: editing ? 1 : 0.6 }}
              />
            </div>

            {editing && (
              <Button variant="primary" onClick={handleUpdate}>
                حفظ الإعدادات
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoreDetails;
