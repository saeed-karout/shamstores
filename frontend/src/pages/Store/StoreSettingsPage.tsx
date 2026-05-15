// src/pages/Store/StoreSettingsPage.tsx (الجزء المعدل)

import React, { useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useStoreSettings } from '@/hooks/stores/useStoreSettings';
import Loader from '@/components/common/Loader';
import SettingsTabs, { SettingsTab } from '@/components/settings/settingsStore/SettingsTabs';
import GeneralSettingsTab from '@/components/settings/settingsStore/GeneralSettingsTab';
import DesignSettingsTab from '@/components/settings/settingsStore/DesignSettingsTab';
import ImageSettingsTab from '@/components/settings/settingsStore/ImageSettingsTab';
import DeliverySettingsTab from '@/components/settings/settingsStore/DeliverySettingsTab';
import DomainSettingsTab from '@/components/settings/settingsStore/DomainSettingsTab';
import SocialSettingsTab from '@/components/settings/settingsStore/SocialSettingsTab';
import PaymentSettingsTab from '@/components/settings/settingsStore/PaymentSettingsTab';
import NotificationSettingsTab from '@/components/settings/settingsStore/NotificationSettingsTab';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';

const StoreSettingsPage: React.FC = () => {
  const { store, loading: storeLoading, updateStore, uploadLogo, uploadCover, removeLogo, removeCover } = useStore();
  const { user } = useAuth();
  const { plan: currentPlan, loading: planLoading } = useCurrentPlan(); // ✅ جلب الخطة الحالية
  const { settings, loading: settingsLoading, saving, saveGeneralSettings, saveDesignSettings, saveDeliverySettings, saveSocialSettings, savePaymentSettings, saveNotificationSettings, saveDomainSettings } = useStoreSettings(store?.id);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [uploading, setUploading] = useState(false);

  // ✅ التحقق مما إذا كانت الخطة Pro
  const isPro = currentPlan?.hasCustomDomain === true || currentPlan?.name === 'pro';

  const handleUploadLogo = async (file: File) => {
    setUploading(true);
    try {
      await uploadLogo(file);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    setUploading(true);
    try {
      await uploadCover(file);
    } finally {
      setUploading(false);
    }
  };

  if (storeLoading || settingsLoading || planLoading) {
    return <Loader fullScreen />;
  }

  return (
    <div style={{ background: '#082E24', minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#E8F5E9', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🛍️ إعدادات المتجر</h1>
        <p style={{ color: '#9DC4AC', fontSize: 13, marginTop: 4 }}>قم بتخصيص إعدادات متجرك وجعله فريداً</p>
      </div>

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} isPro={isPro} />

      <div style={{ background: '#112E23', border: '1px solid rgba(200,226,53,0.15)', borderRadius: 20, padding: 24, marginTop: 16 }}>
        {activeTab === 'general' && (
          <GeneralSettingsTab
            initialData={settings?.general || store}
            onSave={saveGeneralSettings}
            saving={saving}
          />
        )}

        {activeTab === 'design' && (
          <DesignSettingsTab
            initialData={settings?.design || store}
            onSave={saveDesignSettings}
            saving={saving}
          />
        )}

        {activeTab === 'images' && (
          <ImageSettingsTab
            logo={store?.logo}
            coverImage={store?.coverImage}
            onUploadLogo={handleUploadLogo}
            onUploadCover={handleUploadCover}
            onRemoveLogo={removeLogo}
            onRemoveCover={removeCover}
            uploading={uploading}
          />
        )}

        {activeTab === 'delivery' && (
          <DeliverySettingsTab
            initialData={settings?.delivery || store?.deliverySettings}
            onSave={saveDeliverySettings}
            saving={saving}
          />
        )}

        {activeTab === 'domain' && (
          <DomainSettingsTab
            initialData={settings?.domain || { subdomain: store?.subdomain, customDomain: '', customDomainVerified: false, customDomainVerificationCode: '', sslEnabled: false } as any}
            onSave={saveDomainSettings as any}
            isPro={isPro}
            currentPlan={currentPlan} // ✅ تمرير الخطة الحالية
          />
        )}

        {activeTab === 'social' && (
          <SocialSettingsTab
            initialData={settings?.social || store}
            onSave={saveSocialSettings}
            saving={saving}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentSettingsTab
            initialData={settings?.payment || {}}
            onSave={savePaymentSettings}
            saving={saving}
            isPro={isPro}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationSettingsTab
            initialData={settings?.notifications || {}}
            onSave={saveNotificationSettings}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

export default StoreSettingsPage;
