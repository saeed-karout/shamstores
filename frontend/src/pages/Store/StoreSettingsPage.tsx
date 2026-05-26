// src/pages/Store/StoreSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
import { useTheme } from '@/context/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
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
  IoPricetag,
  IoBrush,
  IoText,
  IoAlbums,
  IoGitBranch,
} from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';

// ==================== ثوابت التصميم الأساسية (للخلفية فقط) ====================
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
  purple: '#A78BFA',
  orange: '#FB923C',
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
  const { setThemeColors } = useTheme();
  const permissions = usePermissions();
  
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // ✅ التحقق من صلاحية التعديل
  const canEdit = isSuperAdmin || isOwner;
  
  // ✅ التحقق من صلاحية تحديث الإعدادات (للموظفين)
  const canUpdateSettings = canEdit || permissions.canUpdateSettings;
  
  // ✅ التحقق من صلاحية الدومين المخصص (من الخطة)
  const hasCustomDomain = permissions.canUseCustomDomain || isSuperAdmin;
  const hasOnlinePayment = permissions.hasOnlineOrders || isSuperAdmin;

  // ✅ بيانات النموذج العام
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

  // ✅ بيانات التصميم - جميع الألوان
  const [designForm, setDesignForm] = useState({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundColor: '#082E24',
    cardColor: '#112E23',
    surfaceColor: '#0F3D31',
    textColor: '#E8F5E9',
    mutedColor: '#9DC4AC',
    accentColor: '#C8E235',
    fontFamily: 'Cairo',
  });

  // ✅ بيانات الدومين
  const [domainForm, setDomainForm] = useState({
    subdomain: '',
    customDomain: '',
  });

  // ✅ إعدادات التوصيل
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);

  // ✅ تحميل بيانات المتجر
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

      // ✅ تحميل جميع ألوان المتجر
      setDesignForm({
        primaryColor: store.primaryColor || '#3B82F6',
        secondaryColor: store.secondaryColor || '#10B981',
        backgroundColor: store.backgroundColor || '#082E24',
        cardColor: store.cardColor || '#112E23',
        surfaceColor: store.surfaceColor || '#0F3D31',
        textColor: store.textColor || '#E8F5E9',
        mutedColor: store.mutedColor || '#9DC4AC',
        accentColor: store.accentColor || '#C8E235',
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

  // ✅ حفظ البيانات العامة
  const handleSaveGeneral = async () => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتحديث الإعدادات العامة');
      return;
    }
    try {
      await updateStore(generalForm);
      toast.success('تم تحديث البيانات العامة');
    } catch (error) {
      toast.error('فشل تحديث البيانات');
    }
  };

  // ✅ حفظ التصميم (جميع الألوان) مع تحديث ThemeProvider
  const handleSaveDesign = async () => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتحديث التصميم');
      return;
    }
    try {
      await updateStore(designForm);
      
      // ✅ تحديث ألوان ThemeProvider فوراً بعد الحفظ
      const updatedColors = {
        primaryColor: designForm.primaryColor,
        secondaryColor: designForm.secondaryColor,
        backgroundColor: designForm.backgroundColor,
        cardBgColor: designForm.cardColor,
        surfaceColor: designForm.surfaceColor,
        textColor: designForm.textColor,
        mutedColor: designForm.mutedColor,
        accentColor: designForm.accentColor,
        fontFamily: designForm.fontFamily,
      };
      
      setThemeColors(updatedColors);
      toast.success('تم تحديث التصميم والألوان');
    } catch (error) {
      toast.error('فشل تحديث التصميم');
    }
  };

  // ✅ حفظ إعدادات الدومين
  const handleSaveDomain = async () => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتحديث إعدادات الدومين');
      return;
    }
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

  // ✅ حفظ إعدادات التوصيل
  const handleSaveDeliverySettings = async () => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتحديث إعدادات التوصيل');
      return;
    }
    try {
      await updateStore({ deliverySettings });
      toast.success('تم حفظ إعدادات التوصيل');
    } catch (error) {
      toast.error('فشل حفظ الإعدادات');
    }
  };

  // ✅ رفع الشعار
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتغيير الشعار');
      return;
    }
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

  // ✅ رفع صورة الغلاف
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتغيير صورة الغلاف');
      return;
    }
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

  // ✅ حساب مثال للتوصيل
  const calculateExampleFee = () => {
    const distance = 5;
    const extraKm = Math.max(0, distance - deliverySettings.minDistance);
    return deliverySettings.baseFee + (extraKm * deliverySettings.feePerKm);
  };

  // ✅ ستايل الحقول مع تأثير التركيز
  const getInput = (id: string) => ({
    ...inputStyle,
    border: focusedInput === id ? `1px solid ${C.accent}` : inputStyle.border,
  });

  // ✅ التبويبات
  const tabs = [
    { id: 'general', label: 'عام', icon: IoStorefront },
    { id: 'design', label: 'التصميم والألوان', icon: IoColorPalette },
    { id: 'images', label: 'الصور', icon: IoImage },
    { id: 'delivery', label: 'التوصيل', icon: IoCar },
    { id: 'domain', label: 'الدومين', icon: IoGlobe },
  ];

  if (loading || planLoading) return <Loader fullScreen />;

  // ✅ معاينة الألوان الديناميكية
  const previewColors = {
    bg: designForm.backgroundColor,
    card: designForm.cardColor,
    surf: designForm.surfaceColor,
    primary: designForm.primaryColor,
    secondary: designForm.secondaryColor,
    text: designForm.textColor,
    muted: designForm.mutedColor,
    accent: designForm.accentColor,
    border: C.border,
  };

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0 }}>🎨 إعدادات المتجر</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة بيانات ومظهر المتجر وتخصيص الألوان</p>
        {!canUpdateSettings && (
          <p style={{ color: C.red, fontSize: 12, marginTop: 8 }}>
            ⚠️ ليس لديك صلاحية التعديل. يمكنك فقط عرض الإعدادات.
          </p>
        )}
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

      {/* ==================== تبويب عام ==================== */}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
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
                  onFocus={() => setFocusedInput('lat')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="33.5138"
                  disabled={!canUpdateSettings}
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
                  disabled={!canUpdateSettings}
                />
              </div>
            </div>
            <p style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>يمكنك الحصول على الإحداثيات من خرائط جوجل</p>
          </div>

          <button style={saveBtn} onClick={handleSaveGeneral} disabled={!canUpdateSettings}>
            <IoSave size={16} /> حفظ التغييرات
          </button>
        </div>
      )}

      {/* ==================== تبويب التصميم والألوان ==================== */}
      {activeTab === 'design' && (
        <div>
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoColorPalette style={{ color: C.accent }} />
              تخصيص ألوان المتجر
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              
              {/* اللون الأساسي */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoPricetag size={14} /> اللون الأساسي
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.primaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.primaryColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.primaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#3B82F6"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>يستخدم للأزرار الرئيسية والعناوين البارزة</p>
              </div>

              {/* اللون الثانوي */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoBrush size={14} /> اللون الثانوي
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.secondaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, secondaryColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.secondaryColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.secondaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, secondaryColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#10B981"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>يستخدم للعناصر الثانوية والتفاصيل</p>
              </div>

              {/* لون الخلفية */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoAlbums size={14} /> لون خلفية الصفحة
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.backgroundColor}
                    onChange={(e) => setDesignForm({ ...designForm, backgroundColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.backgroundColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.backgroundColor}
                    onChange={(e) => setDesignForm({ ...designForm, backgroundColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#082E24"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>لون خلفية الصفحة الرئيسية للمتجر</p>
              </div>

              {/* لون البطاقات */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoAlbums size={14} /> لون البطاقات والقوائم
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.cardColor}
                    onChange={(e) => setDesignForm({ ...designForm, cardColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.cardColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.cardColor}
                    onChange={(e) => setDesignForm({ ...designForm, cardColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#112E23"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>لون خلفية البطاقات والقوائم الجانبية</p>
              </div>

              {/* لون الأسطح */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoAlbums size={14} /> لون الأسطح والحقول
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.surfaceColor}
                    onChange={(e) => setDesignForm({ ...designForm, surfaceColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.surfaceColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.surfaceColor}
                    onChange={(e) => setDesignForm({ ...designForm, surfaceColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#0F3D31"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>لون خلفية الحقول والنماذج</p>
              </div>

              {/* لون النص الرئيسي */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoText size={14} /> لون النص الرئيسي
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.textColor}
                    onChange={(e) => setDesignForm({ ...designForm, textColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.textColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.textColor}
                    onChange={(e) => setDesignForm({ ...designForm, textColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#E8F5E9"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>لون النصوص الرئيسية والعناوين</p>
              </div>

              {/* لون النص الثانوي */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoText size={14} /> لون النص الثانوي
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.mutedColor}
                    onChange={(e) => setDesignForm({ ...designForm, mutedColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.mutedColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.mutedColor}
                    onChange={(e) => setDesignForm({ ...designForm, mutedColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#9DC4AC"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>لون النصوص الثانوية والوصف</p>
              </div>

              {/* لون الأكسن */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoBrush size={14} /> لون الأكسن
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={designForm.accentColor}
                    onChange={(e) => setDesignForm({ ...designForm, accentColor: e.target.value })}
                    style={{ width: 60, height: 50, borderRadius: 10, cursor: 'pointer', background: designForm.accentColor, border: `1px solid ${C.border}` }}
                    disabled={!canUpdateSettings}
                  />
                  <input
                    type="text"
                    value={designForm.accentColor}
                    onChange={(e) => setDesignForm({ ...designForm, accentColor: e.target.value })}
                    style={{ flex: 1, ...inputStyle }}
                    placeholder="#C8E235"
                    disabled={!canUpdateSettings}
                  />
                </div>
                <p style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>لون الإشعارات والتنبيهات والعناصر البارزة</p>
              </div>

              {/* نوع الخط */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IoText size={14} /> نوع الخط
                </label>
                <select
                  value={designForm.fontFamily}
                  onChange={(e) => setDesignForm({ ...designForm, fontFamily: e.target.value })}
                  style={getInput('fontFamily')}
                  onFocus={() => setFocusedInput('fontFamily')}
                  onBlur={() => setFocusedInput(null)}
                  disabled={!canUpdateSettings}
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Almarai">Almarai</option>
                  <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
                  <option value="Arial">Arial</option>
                </select>
              </div>
            </div>
          </div>

          {/* معاينة التصميم */}
          <div style={{ 
            ...sectionCard, 
            background: previewColors.bg, 
            color: previewColors.text, 
            fontFamily: designForm.fontFamily,
            border: `1px solid ${previewColors.accent}40`
          }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: previewColors.primary }}>
              معاينة التصميم
            </h3>
            <p style={{ fontSize: 14, color: previewColors.muted, marginBottom: 16 }}>
              هذا نص تجريبي لإظهار شكل الخط والألوان التي اخترتها
            </p>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: previewColors.primary, color: previewColors.bg, cursor: 'pointer', fontWeight: 600 }}>
                زر رئيسي
              </button>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${previewColors.secondary}`, background: 'transparent', color: previewColors.secondary, cursor: 'pointer' }}>
                زر ثانوي
              </button>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: previewColors.accent, color: previewColors.bg, cursor: 'pointer', fontWeight: 600 }}>
                زر أكسن
              </button>
            </div>
            
            <div style={{ marginTop: 16, padding: 16, background: previewColors.card, borderRadius: 12, border: `1px solid ${previewColors.border || C.border}` }}>
              <p style={{ color: previewColors.text, margin: 0 }}>✨ هذا مثال لبطاقة بهذا اللون</p>
              <p style={{ color: previewColors.muted, fontSize: 12, marginTop: 8 }}>نص ثانوي داخل البطاقة</p>
            </div>

            <div style={{ marginTop: 12, padding: 12, background: previewColors.surf, borderRadius: 10 }}>
              <input
                type="text"
                placeholder="مثال لحقل إدخال"
                style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${previewColors.accent}40`, background: previewColors.bg, color: previewColors.text }}
                readOnly
              />
            </div>
          </div>

          <button style={saveBtn} onClick={handleSaveDesign} disabled={!canUpdateSettings}>
            <IoSave size={16} /> حفظ التصميم والألوان
          </button>
        </div>
      )}

      {/* ==================== تبويب الصور ==================== */}
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
                    disabled={uploading || !canUpdateSettings}
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
                disabled={uploading || !canUpdateSettings}
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

      {/* ==================== تبويب التوصيل ==================== */}
      {activeTab === 'delivery' && (
        <div>
          <div style={{ ...sectionCard, background: `rgba(200,226,53,0.07)`, marginBottom: 16 }}>
            <p style={{ color: C.text, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <IoWarning style={{ color: C.accent, flexShrink: 0 }} />
              قم بتعيين أسعار التوصيل حسب المسافة. سيتم حساب سعر التوصيل تلقائياً بناءً على موقع العميل.
            </p>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCar style={{ color: C.accent }} />
              إعدادات خدمة التوصيل
            </h2>

            {/* تفعيل التوصيل */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: C.surf, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <button
                onClick={() => setDeliverySettings({ ...deliverySettings, enableDelivery: !deliverySettings.enableDelivery })}
                disabled={!canUpdateSettings}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: canUpdateSettings ? 'pointer' : 'not-allowed',
                  background: deliverySettings.enableDelivery ? C.accent : 'rgba(255,255,255,0.15)',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  opacity: canUpdateSettings ? 1 : 0.6
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  right: deliverySettings.enableDelivery ? 3 : undefined,
                  left: deliverySettings.enableDelivery ? undefined : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s',
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
                  min={0} step={0.5}
                  disabled={!canUpdateSettings}
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
                  min={0} step={0.5}
                  disabled={!canUpdateSettings}
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
                  min={0} step={0.5}
                  disabled={!canUpdateSettings}
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
                  min={0} step={0.5}
                  disabled={!canUpdateSettings}
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
                  min={0}
                  disabled={!canUpdateSettings}
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
                  min={15} step={5}
                  disabled={!canUpdateSettings}
                />
                <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>الوقت المتوقع لإيصال الطلب</p>
              </div>
            </div>
          </div>

          {/* مثال حساب سعر التوصيل */}
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

          <button style={saveBtn} onClick={handleSaveDeliverySettings} disabled={!canUpdateSettings}>
            <IoSave size={16} /> حفظ إعدادات التوصيل
          </button>
        </div>
      )}

      {/* ==================== تبويب الدومين ==================== */}
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
                  disabled={!canUpdateSettings}
                />
                <span style={{ background: C.surfL, border: `1px solid ${C.border}`, borderRight: 'none', padding: '0 12px', display: 'flex', alignItems: 'center', color: C.muted, fontSize: 13, borderRadius: '0 10px 10px 0' }}>
                  .shamstores.com
                </span>
              </div>
              <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                سيكون رابط متجرك: {domainForm.subdomain || 'my-store'}.shamstores.com
              </p>
            </div>

            <div>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IoLink size={13} /> الدومين المخصص
              </label>
              {hasCustomDomain || isSuperAdmin ? (
                <input
                  type="text"
                  value={domainForm.customDomain}
                  onChange={(e) => setDomainForm({ ...domainForm, customDomain: e.target.value })}
                  style={getInput('customDomain')}
                  placeholder="www.my-store.com"
                  disabled={!canUpdateSettings}
                />
              ) : (
                <div style={{ background: C.surf, padding: 16, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, marginBottom: 12 }}>
                    <IoLockClosed />
                    <span style={{ fontSize: 13 }}>الدومين المخصص متاح فقط في الخطة الاحترافية</span>
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
                {hasCustomDomain || isSuperAdmin
                  ? 'أدخل الدومين الخاص بك (مثال: www.my-store.com)'
                  : 'قم بترقية خطتك لاستخدام دومين خاص'}
              </p>
            </div>
          </div>

          <button style={saveBtn} onClick={handleSaveDomain} disabled={!canUpdateSettings}>
            <IoSave size={16} /> حفظ إعدادات الدومين
          </button>
        </div>
      )}

      <div style={sectionCard}>
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoGitBranch style={{ color: C.accent }} />
          معلومات الفرع
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: C.muted, fontSize: 12 }}>اسم الفرع الحالي</div>
            <div style={{ color: C.text, fontWeight: 700, marginTop: 6 }}>{store?.name || '-'}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{store?.branchLabel || store?.subdomain || store?.slug || '-'}</div>
          </div>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: C.muted, fontSize: 12 }}>نوع الرابط</div>
            <div style={{ color: C.text, fontWeight: 700, marginTop: 6 }}>
              {store?.branchLinkType === 'custom_domain'
                ? 'دومين مخصص'
                : store?.branchLinkType === 'subdomain'
                  ? 'دومين فرعي'
                  : 'رابط افتراضي'}
            </div>
          </div>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ color: C.muted, fontSize: 12 }}>الفروع المرتبطة</div>
            <div style={{ color: C.text, fontWeight: 700, marginTop: 6 }}>{store?.linkedBranches?.length || 0}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {(store?.linkedBranches || []).map((branch) => (
            <div key={branch.id} style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ color: C.text, fontWeight: 700 }}>{branch.name}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{branch.linkLabel}</div>
              <div style={{ color: branch.isActive ? C.accent : C.red, fontSize: 12, marginTop: 8 }}>{branch.isActive ? 'نشط' : 'غير نشط'}</div>
            </div>
          ))}
          {(store?.linkedBranches || []).length === 0 && (
            <div style={{ color: C.muted, fontSize: 13 }}>لا توجد فروع إضافية مرتبطة بهذا الحساب.</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', padding: '16px 0' }}>
        <p style={{ color: C.muted, fontSize: 12 }}>
          آخر تحديث: {store?.updatedAt ? new Date(store.updatedAt).toLocaleDateString('ar-SA') : 'غير معروف'}
        </p>
      </div>

      {/* أنماط CSS إضافية */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default StoreSettingsPage;