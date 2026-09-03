// src/pages/Store/StoreSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
import { useTheme } from '@/context/ThemeContext';
import { usePermissions } from '@/hooks/usePermissions';
import Loader from '@/components/common/Loader';
import api from '@/services/api';
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
  IoAdd,
  IoCopy,
  IoCheckmarkCircle,
  IoCloseCircle,
} from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';
import DomainManager from '@/components/settings/DomainManager';

// ==================== ثوابت التصميم الأساسية ====================
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

interface Branch {
  id: string;
  name: string;
  linkLabel: string;
  isActive: boolean;
  slug?: string;
  subdomain?: string;
  customDomain?: string;
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
  const { store, loading, updateStore, uploadLogo, uploadCover, fetchStore } = useStore();
  const { user, isSuperAdmin, isOwner } = useAuth();
  const { plan: currentPlan, loading: planLoading } = useCurrentPlan();
  const { setThemeColors } = useTheme();
  const permissions = usePermissions();
  
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState<any[]>([]);
  const [showAllProductsModal, setShowAllProductsModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  // ✅ بيانات الفرع الجديد
  const [branchForm, setBranchForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  // ✅ إعدادات التوصيل
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);

  // ✅ التحقق من صلاحية التعديل
  const canEdit = isSuperAdmin || isOwner;
  const canUpdateSettings = canEdit || permissions.canUpdateSettings;
  const hasCustomDomain = permissions.canUseCustomDomain || isSuperAdmin;

  // ✅ الفروع المرتبطة
  const linkedBranches: Branch[] = store?.linkedBranches || [];

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

  // ✅ حفظ التصميم
  const handleSaveDesign = async () => {
    if (!canUpdateSettings) {
      toast.error('ليس لديك صلاحية لتحديث التصميم');
      return;
    }
    try {
      await updateStore(designForm);
      
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

  // ✅ إنشاء فرع جديد
  const handleCreateBranch = async () => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لإنشاء فرع جديد');
      return;
    }

    if (!branchForm.name.trim()) {
      toast.error('اسم الفرع مطلوب');
      return;
    }

    if (!branchForm.email.trim()) {
      toast.error('البريد الإلكتروني للفرع مطلوب');
      return;
    }

    if (!branchForm.password.trim()) {
      toast.error('كلمة المرور للفرع مطلوبة');
      return;
    }

    if (branchForm.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      setCreatingBranch(true);
      await api.post('/store/branches', {
        name: branchForm.name.trim(),
        email: branchForm.email.trim(),
        password: branchForm.password,
        phone: branchForm.phone || undefined,
      });
      toast.success('تم إنشاء الفرع بنجاح');
      setBranchForm({ name: '', email: '', password: '', phone: '' });
      await fetchStore();
    } catch (error: any) {
      console.error('Error creating branch:', error);
      const errorMsg = error.response?.data?.error || 'فشل إنشاء الفرع';
      toast.error(errorMsg);
      
      if (error.response?.data?.requiresUpgrade) {
        toast.error('يمكنك ترقية خطتك لإضافة المزيد من الفروع', { duration: 5000 });
      }
    } finally {
      setCreatingBranch(false);
    }
  };

  // ✅ نسخ الرابط
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الرابط');
  };

  // ✅ جلب جميع منتجات الفروع
  const fetchAllBranchesProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await api.get(`/store/branches/all-products`);
      const products = response?.data?.products || response?.products || [];
      setShowAllProducts(products);
      setShowAllProductsModal(true);
      toast.success(`تم العثور على ${products.length} منتج من جميع الفروع`);
    } catch (error) {
      console.error('Error fetching all products:', error);
      toast.error('فشل جلب المنتجات من الفروع');
    } finally {
      setLoadingProducts(false);
    }
  };

  // ✅ تفعيل/تعطيل عرض جميع المنتجات
  const toggleShowAllProducts = async (checked: boolean) => {
    try {
      await api.patch(`/store/branches/show-all-products`, { showAllBranchesProducts: checked });
      await fetchStore();
      toast.success(checked ? 'تم تفعيل عرض منتجات جميع الفروع' : 'تم تعطيل عرض منتجات جميع الفروع');
    } catch (error) {
      console.error('Error toggling show all products:', error);
      toast.error('فشل تحديث الإعداد');
    }
  };

  // ✅ حساب مثال للتوصيل
  const calculateExampleFee = () => {
    const distance = 5;
    const extraKm = Math.max(0, distance - deliverySettings.minDistance);
    return deliverySettings.baseFee + (extraKm * deliverySettings.feePerKm);
  };

  // ✅ ستايل الحقول
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
    { id: 'branches', label: 'الفروع', icon: IoGitBranch },
  ];

  if (loading || planLoading) return <Loader fullScreen />;

  const previewColors = {
    bg: designForm.backgroundColor,
    card: designForm.cardColor,
    surf: designForm.surfaceColor,
    primary: designForm.primaryColor,
    secondary: designForm.secondaryColor,
    text: designForm.textColor,
    muted: designForm.mutedColor,
    accent: designForm.accentColor,
  };

  return (
    <div dir="rtl" style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0 }}>🎨 إعدادات المتجر</h1>
        <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة بيانات ومظهر المتجر وتخصيص الألوان والفروع</p>
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
              </div>

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
              </div>

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
              </div>

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
              </div>

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
              </div>

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
              </div>

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
              </div>

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
              </div>

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

          <div style={{ 
            ...sectionCard, 
            background: previewColors.bg, 
            color: previewColors.text, 
            fontFamily: designForm.fontFamily,
            border: `1px solid ${previewColors.accent}40`
          }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: previewColors.primary }}>معاينة التصميم</h3>
            <p style={{ fontSize: 14, color: previewColors.muted, marginBottom: 16 }}>هذا نص تجريبي لإظهار شكل الخط والألوان التي اخترتها</p>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: previewColors.primary, color: previewColors.bg, cursor: 'pointer', fontWeight: 600 }}>زر رئيسي</button>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${previewColors.secondary}`, background: 'transparent', color: previewColors.secondary, cursor: 'pointer' }}>زر ثانوي</button>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: previewColors.accent, color: previewColors.bg, cursor: 'pointer', fontWeight: 600 }}>زر أكسن</button>
            </div>
            
            <div style={{ marginTop: 16, padding: 16, background: previewColors.card, borderRadius: 12, border: `1px solid ${previewColors.border || C.border}` }}>
              <p style={{ color: previewColors.text, margin: 0 }}>✨ هذا مثال لبطاقة بهذا اللون</p>
              <p style={{ color: previewColors.muted, fontSize: 12, marginTop: 8 }}>نص ثانوي داخل البطاقة</p>
            </div>

            <div style={{ marginTop: 12, padding: 12, background: previewColors.surf, borderRadius: 10 }}>
              <input type="text" placeholder="مثال لحقل إدخال" style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${previewColors.accent}40`, background: previewColors.bg, color: previewColors.text }} readOnly />
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
              <IoImage style={{ color: C.accent }} /> شعار المتجر
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16 }}>
              {store?.logo && (
                <img src={getImageUrl(store.logo)} alt="Logo" style={{ width: 128, height: 128, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}` }} />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, background: C.surf, padding: 20, textAlign: 'center' }}>
                  <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>يفضل صورة مربعة بحجم 200×200 بكسل</p>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading || !canUpdateSettings} style={{ color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13 }} />
                </div>
              </div>
            </div>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoImage style={{ color: C.accent }} /> صورة الغلاف
            </h2>
            {store?.coverImage && (
              <img src={getImageUrl(store.coverImage)} alt="Cover" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16 }} />
            )}
            <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, background: C.surf, padding: 20, textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>يفضل صورة بحجم 1200×400 بكسل</p>
              <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploading || !canUpdateSettings} style={{ color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 13 }} />
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
              <IoWarning style={{ color: C.accent, flexShrink: 0 }} /> قم بتعيين أسعار التوصيل حسب المسافة. سيتم حساب سعر التوصيل تلقائياً بناءً على موقع العميل.
            </p>
          </div>

          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCar style={{ color: C.accent }} /> إعدادات خدمة التوصيل
            </h2>

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
                <span style={{ position: 'absolute', top: 3, right: deliverySettings.enableDelivery ? 3 : undefined, left: deliverySettings.enableDelivery ? undefined : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
              </button>
              <span style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>تفعيل خدمة التوصيل</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}><IoCash size={13} /> سعر التوصيل الأساسي (ل.س)</label>
                <input type="number" value={deliverySettings.baseFee} onChange={(e) => setDeliverySettings({ ...deliverySettings, baseFee: Number(e.target.value) })} style={getInput('baseFee')} min={0} step={0.5} disabled={!canUpdateSettings} />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}><IoCar size={13} /> سعر الكيلومتر الإضافي (ل.س/كم)</label>
                <input type="number" value={deliverySettings.feePerKm} onChange={(e) => setDeliverySettings({ ...deliverySettings, feePerKm: Number(e.target.value) })} style={getInput('feePerKm')} min={0} step={0.5} disabled={!canUpdateSettings} />
              </div>
              <div>
                <label style={labelStyle}>الحد الأدنى للمسافة (كم)</label>
                <input type="number" value={deliverySettings.minDistance} onChange={(e) => setDeliverySettings({ ...deliverySettings, minDistance: Number(e.target.value) })} style={getInput('minDist')} min={0} step={0.5} disabled={!canUpdateSettings} />
              </div>
              <div>
                <label style={labelStyle}>أقصى مسافة للتوصيل (كم)</label>
                <input type="number" value={deliverySettings.maxDistance} onChange={(e) => setDeliverySettings({ ...deliverySettings, maxDistance: Number(e.target.value) })} style={getInput('maxDist')} min={0} step={0.5} disabled={!canUpdateSettings} />
              </div>
              <div>
                <label style={labelStyle}>توصيل مجاني للطلبات فوق (ل.س)</label>
                <input type="number" value={deliverySettings.freeDeliveryAbove} onChange={(e) => setDeliverySettings({ ...deliverySettings, freeDeliveryAbove: Number(e.target.value) })} style={getInput('freeDel')} min={0} disabled={!canUpdateSettings} />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}><IoTime size={13} /> الوقت التقديري للتوصيل (دقيقة)</label>
                <input type="number" value={deliverySettings.estimatedTime} onChange={(e) => setDeliverySettings({ ...deliverySettings, estimatedTime: Number(e.target.value) })} style={getInput('estTime')} min={15} step={5} disabled={!canUpdateSettings} />
              </div>
            </div>
          </div>

          <div style={{ ...sectionCard, background: C.surfL }}>
            <h3 style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoCalculator size={16} style={{ color: C.accent }} /> مثال لحساب سعر التوصيل (لمسافة 5 كم)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <p style={{ color: C.muted }}>• السعر الأساسي: <span style={{ color: C.text, fontWeight: 600 }}>{deliverySettings.baseFee} ل.س</span></p>
              <p style={{ color: C.muted }}>• المسافة الأساسية: <span style={{ color: C.text, fontWeight: 600 }}>{deliverySettings.minDistance} كم</span></p>
              <p style={{ color: C.muted }}>• المسافة الإضافية: <span style={{ color: C.text, fontWeight: 600 }}>{Math.max(0, 5 - deliverySettings.minDistance)} كم</span></p>
              <p style={{ color: C.muted }}>• تكلفة المسافة الإضافية: <span style={{ color: C.text, fontWeight: 600 }}>{Math.max(0, 5 - deliverySettings.minDistance) * deliverySettings.feePerKm} ل.س</span></p>
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, marginTop: 4 }}>
                <p style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>إجمالي سعر التوصيل: {calculateExampleFee()} ل.س</p>
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
        <DomainManager
          hasCustomDomainFeature={hasCustomDomain || isSuperAdmin}
          canEdit={canUpdateSettings}
          onChanged={() => window.location.reload()}
        />
      )}

      {/* ==================== تبويب الفروع ==================== */}
      {activeTab === 'branches' && (
        <div>
          {/* معلومات الفرع الحالي */}
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoStorefront style={{ color: C.accent }} /> الفرع الحالي (الرئيسي)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ color: C.muted, fontSize: 12 }}>اسم الفرع</div>
                <div style={{ color: C.text, fontWeight: 700, marginTop: 6 }}>{store?.name || '-'}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{store?.branchLabel || store?.subdomain || store?.slug || '-'}</div>
              </div>
              <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ color: C.muted, fontSize: 12 }}>نوع الرابط</div>
                <div style={{ color: C.text, fontWeight: 700, marginTop: 6 }}>
                  {store?.branchLinkType === 'custom_domain' ? '🌐 دومين مخصص' : store?.branchLinkType === 'subdomain' ? '🔗 دومين فرعي' : '📁 رابط افتراضي'}
                </div>
              </div>
              <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ color: C.muted, fontSize: 12 }}>الفروع المرتبطة</div>
                <div style={{ color: C.text, fontWeight: 700, marginTop: 6 }}>{linkedBranches.length}</div>
              </div>
            </div>
          </div>

          {/* قائمة الفروع المرتبطة */}
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoGitBranch style={{ color: C.accent }} /> الفروع المرتبطة بحسابك
            </h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>يمكنك إنشاء فروع إضافية لنفس المتجر. كل فرع سيكون له دومين فرعي مستقل (مثل: فرعك.shamstores.com)</p>

            {linkedBranches.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {linkedBranches.map((branch) => (
                  <div key={branch.id} style={{ background: C.surf, border: `1px solid ${branch.isActive ? C.accent : C.border}`, borderRadius: 16, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>{branch.name}</h3>
                        <code style={{ color: C.accent, fontSize: 12, display: 'block', marginTop: 4 }}>{branch.linkLabel}</code>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: branch.isActive ? `${C.accent}20` : `${C.red}20`, color: branch.isActive ? C.accent : C.red }}>
                        {branch.isActive ? '✅ نشط' : '⛔ غير نشط'}
                      </span>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
                      <button onClick={() => copyToClipboard(branch.linkLabel)} style={{ background: 'none', border: 'none', color: C.accent, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IoCopy size={12} /> نسخ الرابط
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', background: C.surf, borderRadius: 16 }}>
                <p style={{ color: C.muted }}>لا توجد فروع إضافية. يمكنك إنشاء فرع جديد أدناه.</p>
              </div>
            )}
          </div>

          {/* إنشاء فرع جديد */}
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoAdd style={{ color: C.accent }} /> إضافة فرع جديد
            </h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>سيتم إنشاء حساب دخول مستقل للفرع الجديد.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>اسم الفرع *</label>
                <input type="text" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} style={inputStyle} placeholder="مثال: فرع الرياض" disabled={!canEdit} />
              </div>
              <div>
                <label style={labelStyle}>البريد الإلكتروني *</label>
                <input type="email" value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })} style={inputStyle} placeholder="branch@example.com" disabled={!canEdit} />
              </div>
              <div>
                <label style={labelStyle}>كلمة المرور *</label>
                <input type="password" value={branchForm.password} onChange={(e) => setBranchForm({ ...branchForm, password: e.target.value })} style={inputStyle} placeholder="********" disabled={!canEdit} />
              </div>
              <div>
                <label style={labelStyle}>رقم الهاتف</label>
                <input type="tel" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} style={inputStyle} placeholder="05XXXXXXXX" disabled={!canEdit} />
              </div>
            </div>

            <div style={{ background: `${C.accent}10`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <p style={{ color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoWarning size={16} style={{ color: C.accent }} />
                سيتم إنشاء حساب دخول لهذا الفرع باستخدام البريد الإلكتروني وكلمة المرور التي تدخلها هنا. سيكون للفرع دومين فرعي خاص به: <strong style={{ color: C.accent }}>اسم-الفرع.shamstores.com</strong>
              </p>
            </div>

            <button
              onClick={handleCreateBranch}
              disabled={creatingBranch || !canEdit}
              style={{ ...saveBtn, width: '100%', justifyContent: 'center', opacity: creatingBranch || !canEdit ? 0.7 : 1, cursor: creatingBranch || !canEdit ? 'not-allowed' : 'pointer' }}
            >
              {creatingBranch ? <><div className="animate-spin" style={{ width: 16, height: 16, border: `2px solid ${C.bg}`, borderTopColor: 'transparent', borderRadius: '50%' }} /> جاري إنشاء الفرع...</> : <><IoAdd size={18} /> إنشاء فرع جديد</>}
            </button>
          </div>

          {/* إعدادات عرض منتجات جميع الفروع */}
          <div style={sectionCard}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoGlobe style={{ color: C.accent }} /> عرض منتجات جميع الفروع
            </h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>عند تفعيل هذا الخيار، سيتم عرض منتجات جميع فروعك في الصفحة الرئيسية للمتجر (الفرع الرئيسي).</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <span style={{ color: C.text }}>تفعيل عرض جميع المنتجات</span>
                <div style={{ position: 'relative' }}>
                  <input
                    type="checkbox"
                    checked={store?.showAllBranchesProducts || false}
                    onChange={(e) => toggleShowAllProducts(e.target.checked)}
                    style={{ width: 44, height: 22, appearance: 'none', background: store?.showAllBranchesProducts ? C.accent : C.muted, borderRadius: 22, cursor: 'pointer', transition: '0.2s' }}
                  />
                  <span style={{ position: 'absolute', top: 2, right: store?.showAllBranchesProducts ? 24 : 2, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: '0.2s' }} />
                </div>
              </label>

              {store?.showAllBranchesProducts && linkedBranches.length > 0 && (
                <button onClick={fetchAllBranchesProducts} style={{ padding: '8px 16px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>معاينة المنتجات</button>
              )}
            </div>

            {linkedBranches.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: C.surf, borderRadius: 12 }}>
                <p style={{ color: C.muted, fontSize: 12 }}>📌 ملاحظة: عند تفعيل هذا الخيار، سيتم عرض منتجات الفروع التالية في صفحة الفرع الرئيسي:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {linkedBranches.map(branch => (<span key={branch.id} style={{ fontSize: 12, background: `${C.accent}15`, padding: '2px 8px', borderRadius: 20 }}>{branch.name}</span>))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== مودال عرض جميع المنتجات ==================== */}
      {showAllProductsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 20, maxWidth: 1000, width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: C.text, margin: 0 }}>📦 منتجات جميع الفروع</h3>
              <button onClick={() => setShowAllProductsModal(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 24 }}>×</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {loadingProducts ? <Loader /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {showAllProducts.map((product, idx) => (
                    <div key={idx} style={{ background: C.surf, borderRadius: 10, padding: 12 }}>
                      {product.imageUrl && <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                      <h4 style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{product.name}</h4>
                      <p style={{ color: C.accent, fontSize: 12, fontWeight: 700 }}>{product.price} ر.س</p>
                      <p style={{ color: C.muted, fontSize: 10 }}>الفرع: {product.branchName || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', padding: '16px 0' }}>
        <p style={{ color: C.muted, fontSize: 12 }}>آخر تحديث: {store?.updatedAt ? new Date(store.updatedAt).toLocaleDateString('ar-SA') : 'غير معروف'}</p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
};

export default StoreSettingsPage;