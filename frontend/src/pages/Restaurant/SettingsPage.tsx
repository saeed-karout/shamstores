// pages/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../hooks/useRestaurant';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import {
  IoRestaurant,
  IoColorPalette,
  IoImage,
  IoGlobe,
  IoCall,
  IoLogoInstagram,
  IoLogoFacebook,
  IoTimer,
  IoMap,
  IoLink,
  IoLockClosed,
  IoCar,
  IoLocation,
  IoCash,
  IoTime,
  IoWarning,
  IoCalculator,
  IoLogoWhatsapp,
  IoSave,
  IoCheckmark,
} from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';
import api from '@/services/api';

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

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  sunday: DayHours;
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
}

interface DeliverySettings {
  enableDelivery: boolean;
  baseFee: number;
  feePerKm: number;
  minDistance: number;
  maxDistance: number;
  freeDeliveryAbove: number;
  estimatedTime: number;
}

const defaultHours: DayHours = {
  open: '09:00',
  close: '23:00',
  closed: false
};

const defaultOpeningHours: OpeningHours = {
  sunday: { ...defaultHours },
  monday: { ...defaultHours },
  tuesday: { ...defaultHours },
  wednesday: { ...defaultHours },
  thursday: { ...defaultHours },
  friday: { open: '13:00', close: '00:00', closed: false },
  saturday: { open: '13:00', close: '00:00', closed: false },
};

const defaultDeliverySettings: DeliverySettings = {
  enableDelivery: true,
  baseFee: 5,
  feePerKm: 2,
  minDistance: 1,
  maxDistance: 20,
  freeDeliveryAbove: 100,
  estimatedTime: 45
};

const inputStyle: React.CSSProperties = {
  background: C.surf,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  padding: '10px 14px',
  width: '100%',
  fontFamily: 'Cairo, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  color: C.muted,
  fontSize: 13,
  marginBottom: 6,
  display: 'block',
};

const sectionCard: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
};

const saveBtn: React.CSSProperties = {
  background: C.accent,
  color: C.bg,
  fontWeight: 700,
  borderRadius: 10,
  border: 'none',
  padding: '11px 24px',
  cursor: 'pointer',
  fontFamily: 'Cairo, sans-serif',
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

export const SettingsPage: React.FC = () => {
  const { restaurant, loading, updateRestaurant, uploadLogo, uploadCover } = useRestaurant();
  const permissions = usePermissions();
  const { user, isSuperAdmin, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const [generalForm, setGeneralForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    latitude: '',
    longitude: '',
  });

  const [designForm, setDesignForm] = useState({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontFamily: 'Cairo',
  });

  const [seoForm, setSeoForm] = useState({
    metaTitle: '',
    metaDescription: '',
    subdomain: '',
    customDomain: '',
  });

  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);

  useEffect(() => {
    if (restaurant) {
      console.log('Restaurant data:', restaurant);

      setGeneralForm({
        name: restaurant.name || '',
        email: restaurant.email || '',
        phone: restaurant.phone || '',
        whatsapp: restaurant.whatsapp || '',
        address: restaurant.address || '',
        description: restaurant.description || '',
        instagram: restaurant.instagram || '',
        facebook: restaurant.facebook || '',
        tiktok: restaurant.tiktok || '',
        latitude: restaurant.latitude?.toString() || '',
        longitude: restaurant.longitude?.toString() || '',
      });

      setDesignForm({
        primaryColor: restaurant.primaryColor || '#3B82F6',
        secondaryColor: restaurant.secondaryColor || '#10B981',
        backgroundColor: restaurant.backgroundColor || '#FFFFFF',
        textColor: restaurant.textColor || '#000000',
        fontFamily: restaurant.fontFamily || 'Cairo',
      });

      setSeoForm({
        metaTitle: restaurant.metaTitle || '',
        metaDescription: restaurant.metaDescription || '',
        subdomain: restaurant.subdomain || '',
        customDomain: restaurant.customDomain || '',
      });

      if (restaurant.openingHours) {
        try {
          const parsedHours = typeof restaurant.openingHours === 'string'
            ? JSON.parse(restaurant.openingHours)
            : restaurant.openingHours;
          setOpeningHours(prev => ({ ...prev, ...parsedHours }));
        } catch (error) {
          console.error('Error parsing opening hours:', error);
        }
      }

      if (restaurant.deliverySettings) {
        try {
          let parsedSettings = restaurant.deliverySettings;
          if (typeof parsedSettings === 'string') {
            parsedSettings = JSON.parse(parsedSettings);
          }
          console.log('Loaded delivery settings from restaurant:', parsedSettings);
          setDeliverySettings(prev => ({ ...prev, ...parsedSettings }));
        } catch (error) {
          console.error('Error parsing delivery settings:', error);
        }
      }
    }
  }, [restaurant]);

  const handleSaveGeneral = async () => {
    try {
      await updateRestaurant(generalForm);
      toast.success('تم تحديث البيانات العامة');
    } catch (error) {}
  };

  const handleSaveDesign = async () => {
    try {
      await updateRestaurant(designForm);
      toast.success('تم تحديث التصميم');
    } catch (error) {}
  };

  const handleSaveSeo = async () => {
    try {
      await updateRestaurant(seoForm);
      toast.success('تم تحديث إعدادات SEO والدومين');
    } catch (error) {}
  };

  const handleSaveHours = async () => {
    try {
      const completeHours = days.reduce((acc, { key }) => {
        acc[key] = openingHours[key] || { ...defaultHours };
        return acc;
      }, {} as OpeningHours);
      await updateRestaurant({ openingHours: completeHours });
      toast.success('تم تحديث أوقات العمل');
    } catch (error) {}
  };

  const handleSaveDeliverySettings = async () => {
    try {
      const settingsToSave = {
        enableDelivery: deliverySettings.enableDelivery,
        baseFee: Number(deliverySettings.baseFee),
        feePerKm: Number(deliverySettings.feePerKm),
        minDistance: Number(deliverySettings.minDistance),
        maxDistance: Number(deliverySettings.maxDistance),
        freeDeliveryAbove: Number(deliverySettings.freeDeliveryAbove),
        estimatedTime: Number(deliverySettings.estimatedTime)
      };
      await updateRestaurant({ deliverySettings: settingsToSave });
      toast.success('تم حفظ إعدادات التوصيل');
      const response = await api.get('/restaurants/delivery-settings');
      if (response.success && response.data) {
        setDeliverySettings(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      toast.error('فشل حفظ الإعدادات');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadLogo(file);
      toast.success('تم تحديث الشعار');
    } catch (error) {}
    finally { setUploading(false); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadCover(file);
      toast.success('تم تحديث صورة الغلاف');
    } catch (error) {}
    finally { setUploading(false); }
  };

  const handleDayChange = (key: string, field: keyof DayHours, value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [key]: { ...(prev[key] || defaultHours), [field]: value }
    }));
  };

  if (loading) return <Loader fullScreen />;

  const days = [
    { key: 'sunday', name: 'الأحد' },
    { key: 'monday', name: 'الإثنين' },
    { key: 'tuesday', name: 'الثلاثاء' },
    { key: 'wednesday', name: 'الأربعاء' },
    { key: 'thursday', name: 'الخميس' },
    { key: 'friday', name: 'الجمعة' },
    { key: 'saturday', name: 'السبت' },
  ];

  const calculateExampleFee = () => {
    const distance = 5;
    const extraKm = Math.max(0, distance - deliverySettings.minDistance);
    return deliverySettings.baseFee + (extraKm * deliverySettings.feePerKm);
  };

  const tabs = [
    { id: 'general', label: 'عام', icon: IoRestaurant },
    { id: 'design', label: 'التصميم', icon: IoColorPalette },
    { id: 'images', label: 'الصور', icon: IoImage },
    { id: 'hours', label: 'أوقات العمل', icon: IoTimer },
    { id: 'delivery', label: 'التوصيل', icon: IoCar },
    { id: 'seo', label: 'SEO & الدومين', icon: IoGlobe },
  ];

  const getInput = (id: string) => ({
    ...inputStyle,
    border: focusedInput === id ? `1px solid ${C.accent}` : inputStyle.border,
  });

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0 }}>الإعدادات</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة بيانات ومظهر المطعم</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: activeTab === id ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
              background: activeTab === id ? C.accent : C.surf,
              color: activeTab === id ? C.bg : C.muted,
              fontWeight: activeTab === id ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ==================== عام ==================== */}
      {activeTab === 'general' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoRestaurant style={{ color: C.accent }} />
              معلومات المطعم
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>اسم المطعم</label>
                <input
                  type="text"
                  value={generalForm.name}
                  onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                  style={getInput('name')}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => setFocusedInput(null)}
                />
              </div>
              <div>
                <label style={labelStyle}>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={generalForm.email}
                  onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                  style={getInput('email')}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoCall size={13} /> رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={generalForm.phone}
                  onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                  style={getInput('phone')}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLogoWhatsapp size={13} /> رقم الواتساب
                </label>
                <input
                  type="tel"
                  value={generalForm.whatsapp}
                  onChange={(e) => setGeneralForm({ ...generalForm, whatsapp: e.target.value })}
                  style={getInput('whatsapp')}
                  onFocus={() => setFocusedInput('whatsapp')}
                  onBlur={() => setFocusedInput(null)}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLocation size={13} /> العنوان
                </label>
                <input
                  type="text"
                  value={generalForm.address}
                  onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                  style={getInput('address')}
                  onFocus={() => setFocusedInput('address')}
                  onBlur={() => setFocusedInput(null)}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>الوصف</label>
                <textarea
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                  style={{ ...getInput('description'), minHeight: 100, resize: 'vertical' }}
                  onFocus={() => setFocusedInput('description')}
                  onBlur={() => setFocusedInput(null)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20 }}>وسائل التواصل الاجتماعي</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLogoInstagram size={13} /> انستغرام
                </label>
                <input
                  type="text"
                  value={generalForm.instagram}
                  onChange={(e) => setGeneralForm({ ...generalForm, instagram: e.target.value })}
                  style={getInput('instagram')}
                  onFocus={() => setFocusedInput('instagram')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="username"
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLogoFacebook size={13} /> فيسبوك
                </label>
                <input
                  type="text"
                  value={generalForm.facebook}
                  onChange={(e) => setGeneralForm({ ...generalForm, facebook: e.target.value })}
                  style={getInput('facebook')}
                  onFocus={() => setFocusedInput('facebook')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="pagename"
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLogoWhatsapp size={13} /> تيك توك
                </label>
                <input
                  type="text"
                  value={generalForm.tiktok}
                  onChange={(e) => setGeneralForm({ ...generalForm, tiktok: e.target.value })}
                  style={getInput('tiktok')}
                  onFocus={() => setFocusedInput('tiktok')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="@username"
                />
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoMap style={{ color: C.accent }} size={16} />
              موقع المطعم على الخريطة
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>خط العرض (Latitude)</label>
                <input
                  type="text"
                  value={generalForm.latitude}
                  onChange={(e) => setGeneralForm({ ...generalForm, latitude: e.target.value })}
                  style={getInput('lat')}
                  onFocus={() => setFocusedInput('lat')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="33.5138"
                />
              </div>
              <div>
                <label style={labelStyle}>خط الطول (Longitude)</label>
                <input
                  type="text"
                  value={generalForm.longitude}
                  onChange={(e) => setGeneralForm({ ...generalForm, longitude: e.target.value })}
                  style={getInput('lng')}
                  onFocus={() => setFocusedInput('lng')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="36.2765"
                />
              </div>
            </div>
            <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>يمكنك الحصول على الإحداثيات من خرائط جوجل</p>
          </div>

          <button style={saveBtn} onClick={handleSaveGeneral}>
            <IoSave size={16} /> حفظ التغييرات
          </button>
        </div>
      )}

      {/* ==================== التصميم ==================== */}
      {activeTab === 'design' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoColorPalette style={{ color: C.accent }} />
              تخصيص التصميم
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {([
                ['primaryColor', 'اللون الأساسي'],
                ['secondaryColor', 'اللون الثانوي'],
                ['backgroundColor', 'لون الخلفية'],
                ['textColor', 'لون النص'],
              ] as [keyof typeof designForm, string][]).map(([field, label]) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={designForm[field]}
                      onChange={(e) => setDesignForm({ ...designForm, [field]: e.target.value })}
                      style={{ width: 44, height: 40, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', background: 'none', padding: 2 }}
                    />
                    <input
                      type="text"
                      value={designForm[field]}
                      onChange={(e) => setDesignForm({ ...designForm, [field]: e.target.value })}
                      style={{ ...getInput(field), flex: 1, width: 'auto' }}
                      onFocus={() => setFocusedInput(field)}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>نوع الخط</label>
                <select
                  value={designForm.fontFamily}
                  onChange={(e) => setDesignForm({ ...designForm, fontFamily: e.target.value })}
                  style={{ ...getInput('font') }}
                  onFocus={() => setFocusedInput('font')}
                  onBlur={() => setFocusedInput(null)}
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Almarai">Almarai</option>
                  <option value="Arial">Arial</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ ...sectionCard, backgroundColor: designForm.backgroundColor, color: designForm.textColor, fontFamily: designForm.fontFamily }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: designForm.primaryColor }}>معاينة التصميم</h3>
            <p style={{ fontSize: 14, marginBottom: 12 }}>هذا نص تجريبي لإظهار شكل الخط والألوان التي اخترتها</p>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', background: designForm.secondaryColor }}>
              زر تجريبي
            </button>
          </div>

          <button style={saveBtn} onClick={handleSaveDesign}>
            <IoSave size={16} /> حفظ التصميم
          </button>
        </div>
      )}

      {/* ==================== الصور ==================== */}
      {activeTab === 'images' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoImage style={{ color: C.accent }} />
              شعار المطعم
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
              {restaurant?.logo && (
                <img
                  src={getImageUrl(restaurant.logo)}
                  alt="Logo"
                  style={{ width: 128, height: 128, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}` }}
                />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, background: C.surf, padding: 20, textAlign: 'center' }}>
                  <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>يفضل صورة مربعة بحجم 200×200 بكسل</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    style={{ color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoImage style={{ color: C.accent }} />
              صورة الغلاف
            </h2>
            {restaurant?.coverImage && (
              <img
              
                src={getImageUrl(restaurant.coverImage)}
                alt="Cover"
                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16 }}
              />
            )}
            <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, background: C.surf, padding: 20, textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>يفضل صورة بحجم 1200×400 بكسل</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                disabled={uploading}
                style={{ color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
              />
            </div>
            {uploading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: C.accent }}>
                <div style={{ width: 16, height: 16, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13 }}>جاري رفع الصورة...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== أوقات العمل ==================== */}
      {activeTab === 'hours' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoTimer style={{ color: C.accent }} />
              أوقات العمل
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {days.map(({ key, name }) => {
                const dayData = openingHours[key] || defaultHours;
                const isOpen = !dayData.closed;
                return (
                  <div key={key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.surf, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <span style={{ color: C.text, fontWeight: 600, width: 64, fontSize: 14 }}>{name}</span>

                    {/* Toggle */}
                    <button
                      onClick={() => handleDayChange(key, 'closed', isOpen)}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        background: isOpen ? C.accent : 'rgba(255,255,255,0.15)',
                        position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: 3,
                        right: isOpen ? 3 : undefined,
                        left: isOpen ? undefined : 3,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'all 0.2s',
                      }} />
                    </button>
                    <span style={{ color: isOpen ? C.accent : C.muted, fontSize: 13, minWidth: 40 }}>{isOpen ? 'مفتوح' : 'مغلق'}</span>

                    {isOpen && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="time"
                          value={dayData.open}
                          onChange={(e) => handleDayChange(key, 'open', e.target.value)}
                          style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: 13 }}
                        />
                        <span style={{ color: C.muted, fontSize: 13 }}>إلى</span>
                        <input
                          type="time"
                          value={dayData.close}
                          onChange={(e) => handleDayChange(key, 'close', e.target.value)}
                          style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: 13 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button style={saveBtn} onClick={handleSaveHours}>
            <IoSave size={16} /> حفظ أوقات العمل
          </button>
        </div>
      )}

      {/* ==================== التوصيل ==================== */}
      {activeTab === 'delivery' && (
        <div>
          <div style={{ ...sectionCard, background: `rgba(200,226,53,0.07)`, border: `1px solid rgba(200,226,53,0.25)`, marginBottom: 16 }}>
            <p style={{ color: C.text, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <IoWarning style={{ color: C.accent, flexShrink: 0, marginTop: 1 }} />
              قم بتعيين أسعار التوصيل حسب المسافة. سيتم حساب سعر التوصيل تلقائياً بناءً على موقع العميل.
            </p>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCar style={{ color: C.accent }} />
              إعدادات خدمة التوصيل
            </h2>

            {/* Enable Delivery Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: C.surf, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <button
                onClick={() => setDeliverySettings({ ...deliverySettings, enableDelivery: !deliverySettings.enableDelivery })}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  border: 'none',
                  cursor: 'pointer',
                  background: deliverySettings.enableDelivery ? C.accent : 'rgba(255,255,255,0.15)',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3,
                  right: deliverySettings.enableDelivery ? 3 : undefined,
                  left: deliverySettings.enableDelivery ? undefined : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'all 0.2s',
                }} />
              </button>
              <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>تفعيل خدمة التوصيل</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoCash size={13} /> سعر التوصيل الأساسي (ل.س)
                </label>
                <input
                  type="number"
                  value={deliverySettings.baseFee}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, baseFee: Number(e.target.value) })}
                  style={getInput('baseFee')}
                  onFocus={() => setFocusedInput('baseFee')}
                  onBlur={() => setFocusedInput(null)}
                  min={0} step={0.5}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>السعر الثابت للطلب (دون احتساب المسافة)</p>
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoCar size={13} /> سعر الكيلومتر الإضافي (ل.س/كم)
                </label>
                <input
                  type="number"
                  value={deliverySettings.feePerKm}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, feePerKm: Number(e.target.value) })}
                  style={getInput('feePerKm')}
                  onFocus={() => setFocusedInput('feePerKm')}
                  onBlur={() => setFocusedInput(null)}
                  min={0} step={0.5}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>السعر لكل كيلومتر إضافي بعد المسافة الأساسية</p>
              </div>
              <div>
                <label style={labelStyle}>الحد الأدنى للمسافة (كم)</label>
                <input
                  type="number"
                  value={deliverySettings.minDistance}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, minDistance: Number(e.target.value) })}
                  style={getInput('minDist')}
                  onFocus={() => setFocusedInput('minDist')}
                  onBlur={() => setFocusedInput(null)}
                  min={0} step={0.5}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>المسافة التي يتم احتساب السعر الأساسي خلالها</p>
              </div>
              <div>
                <label style={labelStyle}>أقصى مسافة للتوصيل (كم)</label>
                <input
                  type="number"
                  value={deliverySettings.maxDistance}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, maxDistance: Number(e.target.value) })}
                  style={getInput('maxDist')}
                  onFocus={() => setFocusedInput('maxDist')}
                  onBlur={() => setFocusedInput(null)}
                  min={0} step={0.5}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>أقصى مسافة يمكن التوصيل إليها</p>
              </div>
              <div>
                <label style={labelStyle}>توصيل مجاني للطلبات فوق (ل.س)</label>
                <input
                  type="number"
                  value={deliverySettings.freeDeliveryAbove}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, freeDeliveryAbove: Number(e.target.value) })}
                  style={getInput('freeDel')}
                  onFocus={() => setFocusedInput('freeDel')}
                  onBlur={() => setFocusedInput(null)}
                  min={0}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>إذا كان الطلب أكبر من هذا المبلغ، يصبح التوصيل مجانياً</p>
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoTime size={13} /> الوقت التقديري للتوصيل (دقيقة)
                </label>
                <input
                  type="number"
                  value={deliverySettings.estimatedTime}
                  onChange={(e) => setDeliverySettings({ ...deliverySettings, estimatedTime: Number(e.target.value) })}
                  style={getInput('estTime')}
                  onFocus={() => setFocusedInput('estTime')}
                  onBlur={() => setFocusedInput(null)}
                  min={15} step={5}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>الوقت المتوقع لإيصال الطلب</p>
              </div>
            </div>
          </div>

          {/* Example calculation */}
          <div style={{ ...sectionCard, background: C.surfL }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCalculator size={16} style={{ color: C.accent }} />
              مثال لحساب سعر التوصيل (لمسافة 5 كم)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <p style={{ color: C.muted }}>• السعر الأساسي: <span style={{ color: C.text, fontWeight: 600 }}>{deliverySettings.baseFee} ل.س</span></p>
              <p style={{ color: C.muted }}>• المسافة الأساسية: <span style={{ color: C.text, fontWeight: 600 }}>{deliverySettings.minDistance} كم</span></p>
              <p style={{ color: C.muted }}>• المسافة الإضافية: <span style={{ color: C.text, fontWeight: 600 }}>{Math.max(0, 5 - deliverySettings.minDistance)} كم</span></p>
              <p style={{ color: C.muted }}>• تكلفة المسافة الإضافية: <span style={{ color: C.text, fontWeight: 600 }}>{Math.max(0, 5 - deliverySettings.minDistance) * deliverySettings.feePerKm} ل.س</span></p>
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                <p style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>
                  إجمالي سعر التوصيل: {calculateExampleFee()} ل.س
                </p>
              </div>
            </div>
          </div>

          <button style={saveBtn} onClick={handleSaveDeliverySettings}>
            <IoSave size={16} /> حفظ إعدادات التوصيل
          </button>
        </div>
      )}

      {/* ==================== SEO والدومين ==================== */}
      {activeTab === 'seo' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoGlobe style={{ color: C.accent }} />
              إعدادات SEO والدومين
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>عنوان الصفحة (Meta Title)</label>
                <input
                  type="text"
                  value={seoForm.metaTitle}
                  onChange={(e) => setSeoForm({ ...seoForm, metaTitle: e.target.value })}
                  style={getInput('metaTitle')}
                  onFocus={() => setFocusedInput('metaTitle')}
                  onBlur={() => setFocusedInput(null)}
                  maxLength={60}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{seoForm.metaTitle.length}/60 حرف</p>
              </div>

              <div>
                <label style={labelStyle}>وصف الصفحة (Meta Description)</label>
                <textarea
                  value={seoForm.metaDescription}
                  onChange={(e) => setSeoForm({ ...seoForm, metaDescription: e.target.value })}
                  style={{ ...getInput('metaDesc'), minHeight: 80, resize: 'vertical' }}
                  onFocus={() => setFocusedInput('metaDesc')}
                  onBlur={() => setFocusedInput(null)}
                  rows={3}
                  maxLength={160}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{seoForm.metaDescription.length}/160 حرف</p>
              </div>

              <div>
                <label style={labelStyle}>الدومين الفرعي</label>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <input
                    type="text"
                    value={seoForm.subdomain}
                    onChange={(e) => setSeoForm({ ...seoForm, subdomain: e.target.value })}
                    style={{ ...getInput('subdomain'), borderRadius: '10px 0 0 10px', flex: 1 }}
                    onFocus={() => setFocusedInput('subdomain')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="my-restaurant"
                    disabled={!permissions.checkPermission('customDomain') && !isSuperAdmin}
                  />
                  <span style={{ background: C.surfL, border: `1px solid ${C.border}`, borderRight: 'none', padding: '0 12px', display: 'flex', alignItems: 'center', color: C.muted, fontSize: 13, borderRadius: '0 10px 10px 0' }}>
                    .yourdomain.com
                  </span>
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                  سيكون رابط مطعمك: {seoForm.subdomain || 'my-restaurant'}.yourdomain.com
                </p>
                {!permissions.checkPermission('customDomain') && !isSuperAdmin && (
                  <div style={{ marginTop: 8, background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IoLockClosed style={{ color: '#FFD700' }} />
                    <span style={{ color: '#FFD700', fontSize: 13 }}>الدومين الخاص متاح فقط في الخطة الاحترافية</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IoLink size={13} /> الدومين المخصص
                </label>
                {permissions.checkPermission('customDomain') || isSuperAdmin ? (
                  <input
                    type="text"
                    value={seoForm.customDomain}
                    onChange={(e) => setSeoForm({ ...seoForm, customDomain: e.target.value })}
                    style={getInput('customDomain')}
                    onFocus={() => setFocusedInput('customDomain')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="www.my-restaurant.com"
                  />
                ) : (
                  <div style={{ background: C.surf, padding: 16, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, marginBottom: 12 }}>
                      <IoLockClosed />
                      <span style={{ fontSize: 13 }}>هذه الميزة متاحة فقط في الخطة الاحترافية</span>
                    </div>
                    <button
                      onClick={() => window.location.href = '/plans'}
                      style={{ ...saveBtn, padding: '8px 16px', fontSize: 13 }}
                    >
                      ترقية الخطة
                    </button>
                  </div>
                )}
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                  {permissions.checkPermission('customDomain') || isSuperAdmin
                    ? 'أدخل الدومين الخاص بك (مثال: www.my-restaurant.com)'
                    : 'قم بترقية خطتك لاستخدام دومين خاص'}
                </p>
              </div>
            </div>
          </div>

          {/* Search Preview */}
          <div style={sectionCard}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 12 }}>معاينة في محركات البحث</h3>
            <div style={{ background: '#fff', padding: 16, borderRadius: 10 }}>
              <div style={{ color: '#1a0dab', fontSize: 18, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {seoForm.metaTitle || restaurant?.name || 'اسم المطعم'}
              </div>
              <div style={{ color: '#006621', fontSize: 13 }}>
                {seoForm.customDomain || `${seoForm.subdomain || restaurant?.slug}.yourdomain.com`}
              </div>
              <div style={{ color: '#545454', fontSize: 13, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {seoForm.metaDescription || restaurant?.description || 'وصف المطعم'}
              </div>
            </div>
          </div>

          <button style={saveBtn} onClick={handleSaveSeo}>
            <IoSave size={16} /> حفظ إعدادات SEO والدومين
          </button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
