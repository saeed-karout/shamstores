// src/pages/Store/StoreSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useStoreSettings } from '@/hooks/stores/useStoreSettings';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
import { usePermissions } from '@/hooks/usePermissions';
import Loader from '@/components/common/Loader';
import SettingsTabs, { SettingsTab } from '@/components/settings/settingsStore//SettingsTabs';
import GeneralSettingsTab from '@/components/settings/settingsStore//GeneralSettingsTab';
import DesignSettingsTab from '@/components/settings/settingsStore//DesignSettingsTab';
import ImageSettingsTab from '@/components/settings/settingsStore//ImageSettingsTab';
import DeliverySettingsTab from '@/components/settings/settingsStore//DeliverySettingsTab';
import DomainSettingsTab from '@/components/settings/settingsStore/DomainSettingsTab';
import SocialSettingsTab from '@/components/settings/settingsStore//SocialSettingsTab';
import PaymentSettingsTab from '@/components/settings/settingsStore//PaymentSettingsTab';
import NotificationSettingsTab from '@/components/settings/settingsStore//NotificationSettingsTab';
import toast from 'react-hot-toast';

// ==================== ثوابت التصميم ====================
const C = {
  bg: '#082E24',
  card: '#112E23',
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

const StoreSettingsPage: React.FC = () => {
  // ==================== Hooks ====================
  const { 
    store, 
    loading: storeLoading, 
    updateStore, 
    uploadLogo, 
    uploadCover, 
    removeLogo, 
    removeCover 
  } = useStore();
  
  const { user, isSuperAdmin, isOwner } = useAuth();
  const permissions = usePermissions();
  const { plan: currentPlan, loading: planLoading } = useCurrentPlan();
  const { 
    settings, 
    loading: settingsLoading, 
    saving, 
    saveGeneralSettings, 
    saveDesignSettings, 
    saveDeliverySettings, 
    saveSocialSettings, 
    savePaymentSettings, 
    saveNotificationSettings, 
    saveDomainSettings 
  } = useStoreSettings(store?.id);

  // ==================== State ====================
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [uploading, setUploading] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

  // ==================== التحقق من الصلاحيات والميزات ====================
  const canEdit = isSuperAdmin || isOwner;
  const isStoreOwner = isSuperAdmin || isOwner;
  
  // ✅ التحقق من الخطة Pro
  const isPro = currentPlan?.hasCustomDomain === true || 
                currentPlan?.hasOnlineOrders === true || 
                currentPlan?.name === 'pro' || 
                currentPlan?.name === 'enterprise' ||
                isSuperAdmin;
  
  // ✅ التحقق من ميزة الدومين المخصص
  const hasCustomDomainFeature = currentPlan?.hasCustomDomain === true || 
                                  currentPlan?.name === 'pro' || 
                                  currentPlan?.name === 'enterprise' || 
                                  isSuperAdmin;
  
  // ✅ التحقق من ميزة الدفع الإلكتروني
  const hasOnlinePayment = currentPlan?.hasOnlineOrders === true || 
                           currentPlan?.name === 'pro' || 
                           currentPlan?.name === 'enterprise';

  // ==================== دوال رفع الصور ====================
  const handleUploadLogo = async (file: File) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتغيير الشعار');
      return;
    }
    setUploading(true);
    try {
      await uploadLogo(file);
      toast.success('تم تحديث الشعار بنجاح');
    } catch (error: any) {
      toast.error(error?.message || 'فشل تحديث الشعار');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتغيير صورة الغلاف');
      return;
    }
    setUploading(true);
    try {
      await uploadCover(file);
      toast.success('تم تحديث صورة الغلاف بنجاح');
    } catch (error: any) {
      toast.error(error?.message || 'فشل تحديث صورة الغلاف');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لإزالة الشعار');
      return;
    }
    try {
      await removeLogo();
      toast.success('تم إزالة الشعار');
    } catch (error: any) {
      toast.error(error?.message || 'فشل إزالة الشعار');
    }
  };

  const handleRemoveCover = async () => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لإزالة صورة الغلاف');
      return;
    }
    try {
      await removeCover();
      toast.success('تم إزالة صورة الغلاف');
    } catch (error: any) {
      toast.error(error?.message || 'فشل إزالة صورة الغلاف');
    }
  };

  // ==================== دوال حفظ الإعدادات ====================
  const handleSaveGeneral = async (data: any) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتغيير الإعدادات العامة');
      return;
    }
    await saveGeneralSettings(data);
  };

  const handleSaveDesign = async (data: any) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتغيير التصميم');
      return;
    }
    await saveDesignSettings(data);
  };

  const handleSaveDelivery = async (data: any) => {
    if (!permissions.checkPermission('canManageDelivery') && !isSuperAdmin && !isOwner) {
      toast.error('ليس لديك صلاحية لتغيير إعدادات التوصيل');
      return;
    }
    await saveDeliverySettings(data);
  };

  const handleSaveSocial = async (data: any) => {
    if (!permissions.checkPermission('canManageSocial') && !isSuperAdmin && !isOwner) {
      toast.error('ليس لديك صلاحية لتغيير إعدادات وسائل التواصل');
      return;
    }
    await saveSocialSettings(data);
  };

  const handleSavePayment = async (data: any) => {
    if (!hasOnlinePayment) {
      toast.error('الدفع الإلكتروني متاح فقط في الخطة الاحترافية');
      return;
    }
    if (!permissions.checkPermission('canManagePayment') && !isSuperAdmin && !isOwner) {
      toast.error('ليس لديك صلاحية لتغيير إعدادات الدفع');
      return;
    }
    await savePaymentSettings(data);
  };

  const handleSaveNotifications = async (data: any) => {
    if (!permissions.checkPermission('canManageNotifications') && !isSuperAdmin && !isOwner) {
      toast.error('ليس لديك صلاحية لتغيير إعدادات الإشعارات');
      return;
    }
    await saveNotificationSettings(data);
  };

  const handleSaveDomain = async (data: any) => {
    if (!hasCustomDomainFeature) {
      toast.error('الدومين المخصص متاح فقط في الخطة الاحترافية');
      return;
    }
    setSavingDomain(true);
    try {
      await saveDomainSettings(data);
    } finally {
      setSavingDomain(false);
    }
  };

  // ==================== تجهيز بيانات المتجر ====================
  const storeData = {
    id: store?.id,
    name: store?.name || '',
    slug: store?.slug || '',
    subdomain: store?.subdomain || '',
    email: store?.email || '',
    phone: store?.phone || '',
    whatsapp: store?.whatsapp || '',
    address: store?.address || '',
    description: store?.description || '',
    logo: store?.logo,
    coverImage: store?.coverImage,
    primaryColor: store?.primaryColor || '#3B82F6',
    secondaryColor: store?.secondaryColor || '#10B981',
    backgroundColor: store?.backgroundColor || '#FFFFFF',
    textColor: store?.textColor || '#000000',
    fontFamily: store?.fontFamily || 'Cairo',
    latitude: store?.latitude,
    longitude: store?.longitude,
    isActive: store?.isActive ?? true,
    planId: store?.planId,
    customDomain: store?.customDomain,
    customDomainVerified: store?.customDomainVerified ?? false,
    createdAt: store?.createdAt,
    timezone: store?.timezone || 'Asia/Riyadh',
    currency: store?.currency || 'SAR',
    language: store?.language || 'ar',
    deliverySettings: store?.deliverySettings,
    paymentSettings: store?.paymentSettings,
    notificationSettings: store?.notificationSettings,
    socialLinks: store?.socialLinks,
  };

  // ==================== حالة التحميل ====================
  if (storeLoading || settingsLoading || planLoading) {
    return <Loader fullScreen />;
  }

  // ==================== إذا لم يوجد متجر ====================
  if (!store && !isSuperAdmin) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', background: C.card, borderRadius: 20, padding: 40, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛍️</div>
          <h2 style={{ color: C.text, fontSize: 20, marginBottom: 12 }}>لا يوجد متجر</h2>
          <p style={{ color: C.muted, marginBottom: 24 }}>لم تقم بإنشاء متجر بعد. يرجى إنشاء متجر أولاً.</p>
          <button 
            onClick={() => window.location.href = '/store/create'}
            style={{ background: C.accent, color: C.bg, border: 'none', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
          >
            إنشاء متجر
          </button>
        </div>
      </div>
    );
  }

  // ==================== العرض الرئيسي ====================
  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              🛍️ إعدادات المتجر
              {storeData.name && (
                <span style={{ 
                  fontSize: 14, fontWeight: 400, color: C.accent, 
                  background: 'rgba(200,226,53,0.1)', padding: '4px 12px', borderRadius: 20 
                }}>
                  {storeData.name}
                </span>
              )}
            </h1>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
              قم بتخصيص إعدادات متجرك وجعله فريداً
            </p>
          </div>
          
          {/* خطة المتجر */}
          {currentPlan && (
            <div style={{ 
              background: 'rgba(200,226,53,0.1)', 
              border: `1px solid ${C.border}`, 
              borderRadius: 12, 
              padding: '8px 16px' 
            }}>
              <span style={{ color: C.muted, fontSize: 12 }}>الخطة الحالية</span>
              <div style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>
                {currentPlan.name === 'free' ? 'مجانية' : 
                 currentPlan.name === 'basic' ? 'أساسية' : 
                 currentPlan.name === 'pro' ? 'احترافية' : 'مؤسسية'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <SettingsTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isPro={isPro}
        isStoreOwner={isStoreOwner}
      />

      {/* Tab Content */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, marginTop: 16 }}>
        
        {/* تبويب عام */}
        {activeTab === 'general' && (
          <GeneralSettingsTab
            initialData={storeData}
            onSave={handleSaveGeneral}
            saving={saving}
          />
        )}

        {/* تبويب التصميم */}
        {activeTab === 'design' && (
          <DesignSettingsTab
            initialData={{
              primaryColor: storeData.primaryColor,
              secondaryColor: storeData.secondaryColor,
              backgroundColor: storeData.backgroundColor,
              textColor: storeData.textColor,
              fontFamily: storeData.fontFamily,
            }}
            onSave={handleSaveDesign}
            saving={saving}
          />
        )}

        {/* تبويب الصور */}
        {activeTab === 'images' && (
          <ImageSettingsTab
            logo={storeData.logo}
            coverImage={storeData.coverImage}
            onUploadLogo={handleUploadLogo}
            onUploadCover={handleUploadCover}
            onRemoveLogo={handleRemoveLogo}
            onRemoveCover={handleRemoveCover}
            uploading={uploading}
          />
        )}

        {/* تبويب التوصيل */}
        {activeTab === 'delivery' && (
          <DeliverySettingsTab
            initialData={storeData.deliverySettings || {
              enableDelivery: true,
              baseFee: 5,
              feePerKm: 2,
              minDistance: 1,
              maxDistance: 20,
              freeDeliveryAbove: 100,
              estimatedTime: 45,
              cashOnDelivery: true,
              onlinePayment: false
            }}
            onSave={handleSaveDelivery}
            saving={saving}
          />
        )}

        {/* تبويب الدومين */}
        {activeTab === 'domain' && (
          <DomainSettingsTab
            initialData={{
              subdomain: storeData.subdomain,
              customDomain: storeData.customDomain || '',
              customDomainVerified: storeData.customDomainVerified,
            }}
            onSave={handleSaveDomain}
            isPro={hasCustomDomainFeature}
            currentPlan={currentPlan}
          />
        )}

        {/* تبويب وسائل التواصل */}
        {activeTab === 'social' && (
          <SocialSettingsTab
            initialData={storeData.socialLinks || {}}
            onSave={handleSaveSocial}
            saving={saving}
          />
        )}

        {/* تبويب الدفع */}
        {activeTab === 'payment' && (
          <PaymentSettingsTab
            initialData={storeData.paymentSettings || {}}
            onSave={handleSavePayment}
            saving={saving}
            isPro={hasOnlinePayment}
          />
        )}

        {/* تبويب الإشعارات */}
        {activeTab === 'notifications' && (
          <NotificationSettingsTab
            initialData={storeData.notificationSettings || {}}
            onSave={handleSaveNotifications}
            saving={saving}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ color: C.muted, fontSize: 12 }}>
          آخر تحديث: {storeData.createdAt ? new Date(storeData.createdAt).toLocaleDateString('ar-SA') : 'غير معروف'}
        </p>
        {!canEdit && (
          <p style={{ color: C.red, fontSize: 12, marginTop: 8 }}>
            ⚠️ ليس لديك صلاحية التعديل. يمكنك فقط عرض الإعدادات.
          </p>
        )}
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