// src/pages/Store/StoreSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
import Loader from '@/components/common/Loader';
import toast from 'react-hot-toast';
import {
  IoStorefront,
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
} from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';

const C = {
  bg: '#082E24',
  card: '#112E23',
  prim: '#0D4A3A',
  surf: '#0F3D31',
  surfL: '#164D3E',
  accent: '#C8E235',
  acDk: '#A8C220',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  blue: '#60A5FA',
};

interface DeliverySettings {
  enableDelivery: boolean;
  baseFee: number;
  feePerKm: number;
  minDistance: number;
  maxDistance: number;
  freeDeliveryAbove: number;
  estimatedTime: number;
}

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

const StoreSettingsPage: React.FC = () => {
  const { store, loading, updateStore, uploadLogo, uploadCover } = useStore();
  const { user, isSuperAdmin, isOwner } = useAuth();
  const { plan: currentPlan, loading: planLoading } = useCurrentPlan();
  
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // ✅ التحقق من الميزات حسب الخطة
  const hasCustomDomain = currentPlan?.hasCustomDomain === true || isSuperAdmin;
  const hasOnlinePayment = currentPlan?.hasOnlineOrders === true || isSuperAdmin;

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

  const [domainForm, setDomainForm] = useState({
    subdomain: '',
    customDomain: '',
  });

  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);

  useEffect(() => {
    if (store) {
      console.log('✅ Store data for settings:', store);

      setGeneralForm({
        name: store.name || '',
        email: store.email || '',
        phone: store.phone || '',
        whatsapp: store.whatsapp || '',
        address: store.address || '',
        description: store.description || '',
        instagram: store.instagram || '',
        facebook: store.facebook || '',
        tiktok: store.tiktok || '',
        latitude: store.latitude?.toString() || '',
        longitude: store.longitude?.toString() || '',
      });

      setDesignForm({
        primaryColor: store.primaryColor || '#3B82F6',
        secondaryColor: store.secondaryColor || '#10B981',
        backgroundColor: store.backgroundColor || '#FFFFFF',
        textColor: store.textColor || '#000000',
        fontFamily: store.fontFamily || 'Cairo',
      });

      setDomainForm({
        subdomain: store.subdomain || '',
        customDomain: store.customDomain || '',
      });

      if (store.deliverySettings) {
        try {
          let parsedSettings = store.deliverySettings;
          if (typeof parsedSettings === 'string') {
            parsedSettings = JSON.parse(parsedSettings);
          }
          setDeliverySettings(prev => ({ ...prev, ...parsedSettings }));
        } catch (error) {
          console.error('Error parsing delivery settings:', error);
        }
      }
    }
  }, [store]);

  const handleSaveGeneral = async () => {
    try {
      await updateStore(generalForm);
      toast.success('تم تحديث البيانات العامة');
    } catch (error) {
      toast.error('فشل تحديث البيانات');
    }
  };

  const handleSaveDesign = async () => {
    try {
      await updateStore(designForm);
      toast.success('تم تحديث التصميم');
    } catch (error) {
      toast.error('فشل تحديث التصميم');
    }
  };

  const handleSaveDomain = async () => {
    if (!hasCustomDomain && !isSuperAdmin) {
      toast.error('الدومين المخصص متاح فقط في الخطة الاحترافية');
      return;
    }
    try {
      await updateStore(domainForm);
      toast.success('تم تحديث إعدادات الدومين');
    } catch (error) {
      toast.error('فشل تحديث الدومين');
    }
  };

  const handleSaveDeliverySettings = async () => {
    try {
      await updateStore({ deliverySettings });
      toast.success('تم حفظ إعدادات التوصيل');
    } catch (error) {
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
    } catch (error) {
      toast.error('فشل تحديث الشعار');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadCover(file);
      toast.success('تم تحديث صورة الغلاف');
    } catch (error) {
      toast.error('فشل تحديث صورة الغلاف');
    } finally {
      setUploading(false);
    }
  };

  const calculateExampleFee = () => {
    const distance = 5;
    const extraKm = Math.max(0, distance - deliverySettings.minDistance);
    return deliverySettings.baseFee + (extraKm * deliverySettings.feePerKm);
  };

  const getInput = (id: string) => ({
    ...inputStyle,
    border: focusedInput === id ? `1px solid ${C.accent}` : inputStyle.border,
  });

  const tabs = [
    { id: 'general', label: 'عام', icon: IoStorefront },
    { id: 'design', label: 'التصميم', icon: IoColorPalette },
    { id: 'images', label: 'الصور', icon: IoImage },
    { id: 'delivery', label: 'التوصيل', icon: IoCar },
    { id: 'domain', label: 'الدومين', icon: IoGlobe },
  ];

  if (loading || planLoading) return <Loader fullScreen />;

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0 }}>🛍️ إعدادات المتجر</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة بيانات ومظهر المتجر</p>
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
              <IoStorefront style={{ color: C.accent }} />
              معلومات المتجر
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>اسم المتجر</label>
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
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>الوصف</label>
                <textarea
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                  style={{ ...getInput('description'), minHeight: 100, resize: 'vertical' }}
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
                />
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoMap style={{ color: C.accent }} size={16} />
              موقع المتجر على الخريطة
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>خط العرض (Latitude)</label>
                <input
                  type="text"
                  value={generalForm.latitude}
                  onChange={(e) => setGeneralForm({ ...generalForm, latitude: e.target.value })}
                  style={getInput('lat')}
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
                  placeholder="36.2765"
                />
              </div>
            </div>
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
                      style={{ width: 44, height: 40, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      value={designForm[field]}
                      onChange={(e) => setDesignForm({ ...designForm, [field]: e.target.value })}
                      style={{ ...getInput(field), flex: 1 }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>نوع الخط</label>
                <select
                  value={designForm.fontFamily}
                  onChange={(e) => setDesignForm({ ...designForm, fontFamily: e.target.value })}
                  style={getInput('font')}
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Almarai">Almarai</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ ...sectionCard, backgroundColor: designForm.backgroundColor, color: designForm.textColor, fontFamily: designForm.fontFamily }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: designForm.primaryColor }}>معاينة التصميم</h3>
            <p style={{ fontSize: 14 }}>هذا نص تجريبي لإظهار شكل الخط والألوان</p>
            <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', color: '#fff', background: designForm.secondaryColor }}>
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
              شعار المتجر
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
              {store?.logo && (
                <img
                  src={getImageUrl(store.logo)}
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
            {store?.coverImage && (
              <img
                src={getImageUrl(store.coverImage)}
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
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== التوصيل ==================== */}
      {activeTab === 'delivery' && (
        <div>
          <div style={{ ...sectionCard, background: `rgba(200,226,53,0.07)`, marginBottom: 16 }}>
            <p style={{ color: C.text, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <IoWarning style={{ color: C.accent, flexShrink: 0 }} />
              قم بتعيين أسعار التوصيل حسب المسافة.
            </p>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCar style={{ color: C.accent }} />
              إعدادات خدمة التوصيل
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: C.surf, borderRadius: 10 }}>
              <button
                onClick={() => setDeliverySettings({ ...deliverySettings, enableDelivery: !deliverySettings.enableDelivery })}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: deliverySettings.enableDelivery ? C.accent : 'rgba(255,255,255,0.15)',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  right: deliverySettings.enableDelivery ? 3 : undefined,
                  left: deliverySettings.enableDelivery ? undefined : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                }} />
              </button>
              <span style={{ color: C.text, fontWeight: 600 }}>تفعيل خدمة التوصيل</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={labelStyle}>سعر التوصيل الأساسي (ل.س)</label>
                <input type="number" value={deliverySettings.baseFee} onChange={(e) => setDeliverySettings({ ...deliverySettings, baseFee: Number(e.target.value) })} style={getInput('baseFee')} />
              </div>
              <div>
                <label style={labelStyle}>سعر الكيلومتر الإضافي (ل.س/كم)</label>
                <input type="number" value={deliverySettings.feePerKm} onChange={(e) => setDeliverySettings({ ...deliverySettings, feePerKm: Number(e.target.value) })} style={getInput('feePerKm')} />
              </div>
              <div>
                <label style={labelStyle}>الحد الأدنى للمسافة (كم)</label>
                <input type="number" value={deliverySettings.minDistance} onChange={(e) => setDeliverySettings({ ...deliverySettings, minDistance: Number(e.target.value) })} style={getInput('minDist')} />
              </div>
              <div>
                <label style={labelStyle}>أقصى مسافة للتوصيل (كم)</label>
                <input type="number" value={deliverySettings.maxDistance} onChange={(e) => setDeliverySettings({ ...deliverySettings, maxDistance: Number(e.target.value) })} style={getInput('maxDist')} />
              </div>
              <div>
                <label style={labelStyle}>توصيل مجاني للطلبات فوق (ل.س)</label>
                <input type="number" value={deliverySettings.freeDeliveryAbove} onChange={(e) => setDeliverySettings({ ...deliverySettings, freeDeliveryAbove: Number(e.target.value) })} style={getInput('freeDel')} />
              </div>
              <div>
                <label style={labelStyle}>الوقت التقديري للتوصيل (دقيقة)</label>
                <input type="number" value={deliverySettings.estimatedTime} onChange={(e) => setDeliverySettings({ ...deliverySettings, estimatedTime: Number(e.target.value) })} style={getInput('estTime')} />
              </div>
            </div>
          </div>

          <div style={{ ...sectionCard, background: C.surfL }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCalculator size={16} style={{ color: C.accent }} />
              مثال لحساب سعر التوصيل (لمسافة 5 كم)
            </h3>
            <div style={{ fontSize: 13 }}>
              <p>• السعر الأساسي: <strong>{deliverySettings.baseFee} ل.س</strong></p>
              <p>• المسافة الأساسية: <strong>{deliverySettings.minDistance} كم</strong></p>
              <p>• المسافة الإضافية: <strong>{Math.max(0, 5 - deliverySettings.minDistance)} كم</strong></p>
              <p>• تكلفة المسافة الإضافية: <strong>{Math.max(0, 5 - deliverySettings.minDistance) * deliverySettings.feePerKm} ل.س</strong></p>
              <p style={{ color: C.accent, fontWeight: 700, fontSize: 15, marginTop: 8 }}>الإجمالي: {calculateExampleFee()} ل.س</p>
            </div>
          </div>

          <button style={saveBtn} onClick={handleSaveDeliverySettings}>
            <IoSave size={16} /> حفظ إعدادات التوصيل
          </button>
        </div>
      )}

      {/* ==================== الدومين ==================== */}
      {activeTab === 'domain' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoGlobe style={{ color: C.accent }} />
              إعدادات الدومين
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>الدومين الفرعي</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <input
                  type="text"
                  value={domainForm.subdomain}
                  onChange={(e) => setDomainForm({ ...domainForm, subdomain: e.target.value })}
                  style={{ ...getInput('subdomain'), borderRadius: '10px 0 0 10px', flex: 1 }}
                  placeholder="my-store"
                />
                <span style={{ background: C.surfL, border: `1px solid ${C.border}`, borderRight: 'none', padding: '0 12px', display: 'flex', alignItems: 'center', color: C.muted, borderRadius: '0 10px 10px 0' }}>
                  .shamstores.com
                </span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>الدومين المخصص</label>
              {hasCustomDomain || isSuperAdmin ? (
                <input
                  type="text"
                  value={domainForm.customDomain}
                  onChange={(e) => setDomainForm({ ...domainForm, customDomain: e.target.value })}
                  style={getInput('customDomain')}
                  placeholder="www.my-store.com"
                />
              ) : (
                <div style={{ background: C.surf, padding: 16, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, marginBottom: 12 }}>
                    <IoLockClosed />
                    <span>الدومين المخصص متاح فقط في الخطة الاحترافية</span>
                  </div>
                  <button onClick={() => window.location.href = '/plans'} style={{ ...saveBtn, padding: '8px 16px', fontSize: 13 }}>
                    ترقية الخطة
                  </button>
                </div>
              )}
            </div>
          </div>

          <button style={saveBtn} onClick={handleSaveDomain}>
            <IoSave size={16} /> حفظ إعدادات الدومين
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreSettingsPage;