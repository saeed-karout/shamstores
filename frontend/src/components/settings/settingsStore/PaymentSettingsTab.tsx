// src/components/settings/PaymentSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoCard, IoLockClosed, IoWarning, IoLogoPaypal } from 'react-icons/io5';
import Button from '@/components/common/Button';
import { PaymentSettings } from '@/types/stores/settings.types';

interface PaymentSettingsTabProps {
  initialData: PaymentSettings;
  onSave: (data: PaymentSettings) => Promise<void>;
  saving?: boolean;
  isPro?: boolean;
}

const PaymentSettingsTab: React.FC<PaymentSettingsTabProps> = ({ initialData, onSave, saving, isPro = false }) => {
  const [settings, setSettings] = useState<PaymentSettings>({
    enableCashOnDelivery: true,
    enableOnlinePayment: false,
    enableCardPayment: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    paypalClientId: '',
    paypalSecret: ''
  });

  useEffect(() => {
    if (initialData) {
      setSettings(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  if (!isPro) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IoCard className="text-yellow-500 text-4xl" />
        </div>
        <h3 className="text-xl font-bold mb-2">💳 الدفع الإلكتروني</h3>
        <p className="text-gray-600 mb-4">
          هذه الميزة متاحة فقط في الخطة الاحترافية
        </p>
        <Button variant="primary" onClick={() => window.location.href = '/plans'}>
          ترقية الخطة
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoCard className="text-green-600" />
        إعدادات الدفع
      </h2>

      <div className="bg-yellow-50 p-4 rounded-xl mb-4">
        <p className="text-sm text-yellow-800 flex items-start gap-2">
          <IoWarning className="mt-0.5 flex-shrink-0" />
          تأكد من إدخال المفاتيح الصحيحة من لوحة تحكم مزود خدمة الدفع.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">طرق الدفع المتاحة</h3>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.enableCashOnDelivery}
            onChange={(e) => setSettings({ ...settings, enableCashOnDelivery: e.target.checked })}
            className="w-4 h-4"
          />
          <span>الدفع عند الاستلام (COD)</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.enableCardPayment}
            onChange={(e) => setSettings({ ...settings, enableCardPayment: e.target.checked })}
            className="w-4 h-4"
          />
          <span>الدفع بالبطاقة الائتمانية</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.enableOnlinePayment}
            onChange={(e) => setSettings({ ...settings, enableOnlinePayment: e.target.checked })}
            className="w-4 h-4"
          />
          <span>الدفع الإلكتروني (باي بال / سترايب)</span>
        </label>
      </div>

      {(settings.enableCardPayment || settings.enableOnlinePayment) && (
        <>
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              {/* <IoLogoStrip className="text-purple-600" /> */}
              إعدادات Stripe
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">مفتاح Stripe العام (Publishable Key)</label>
                <input
                  type="text"
                  value={settings.stripePublishableKey}
                  onChange={(e) => setSettings({ ...settings, stripePublishableKey: e.target.value })}
                  className="w-full p-2 border rounded-lg font-mono text-sm"
                  placeholder="pk_live_..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">مفتاح Stripe السري (Secret Key)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={settings.stripeSecretKey}
                    onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono text-sm pr-8"
                    placeholder="sk_live_..."
                  />
                  <IoLockClosed className="absolute left-2 top-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <IoLogoPaypal className="text-blue-600" />
              إعدادات PayPal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input
                  type="text"
                  value={settings.paypalClientId}
                  onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
                  className="w-full p-2 border rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secret</label>
                <div className="relative">
                  <input
                    type="password"
                    value={settings.paypalSecret}
                    onChange={(e) => setSettings({ ...settings, paypalSecret: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono text-sm pr-8"
                  />
                  <IoLockClosed className="absolute left-2 top-3 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <Button type="submit" variant="primary" className="mt-4" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات الدفع'}
      </Button>
    </form>
  );
};

export default PaymentSettingsTab;