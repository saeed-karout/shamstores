// src/components/settings/NotificationSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoNotifications, IoMail, IoLogoWhatsapp, IoChatbubble, IoWarning } from 'react-icons/io5';
import Button from '@/components/common/Button';
import { NotificationSettings } from '@/types/stores/settings.types';

interface NotificationSettingsTabProps {
  initialData: NotificationSettings;
  onSave: (data: NotificationSettings) => Promise<void>;
  saving?: boolean;
}

const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({ initialData, onSave, saving }) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    newOrderEmail: '',
    newOrderPhone: '',
    lowStockAlert: true,
    lowStockThreshold: 5
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoNotifications className="text-green-600" />
        إعدادات الإشعارات
      </h2>

      <div className="bg-blue-50 p-4 rounded-xl mb-4">
        <p className="text-sm text-blue-800 flex items-start gap-2">
          <IoWarning className="mt-0.5 flex-shrink-0" />
          سيتم إرسال الإشعارات عند حدوث الأحداث التالية: طلبات جديدة، تحديثات الطلبات، تنبيهات المخزون.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <IoMail size={18} />
            قنوات الإشعارات
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium">الإشعارات عبر البريد الإلكتروني</span>
                <p className="text-xs text-gray-500">سيتم إرسال إشعارات إلى البريد الإلكتروني للمتجر</p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium">الإشعارات عبر الرسائل النصية (SMS)</span>
                <p className="text-xs text-gray-500">رسوم إضافية حسب مقدم الخدمة</p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.whatsappNotifications}
                onChange={(e) => setSettings({ ...settings, whatsappNotifications: e.target.checked })}
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium flex items-center gap-1">
                  <IoLogoWhatsapp className="text-green-500" />
                  الإشعارات عبر الواتساب
                </span>
                <p className="text-xs text-gray-500">يتطلب رقم واتساب مفعل</p>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">إعدادات الإشعارات الجديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">البريد الإلكتروني للطلبات الجديدة</label>
              <input
                type="email"
                value={settings.newOrderEmail}
                onChange={(e) => setSettings({ ...settings, newOrderEmail: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="orders@store.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رقم الهاتف للطلبات الجديدة</label>
              <input
                type="tel"
                value={settings.newOrderPhone}
                onChange={(e) => setSettings({ ...settings, newOrderPhone: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="+966 5XXXXXXXX"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <IoChatbubble size={18} />
            تنبيهات المخزون
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.lowStockAlert}
                onChange={(e) => setSettings({ ...settings, lowStockAlert: e.target.checked })}
                className="w-4 h-4"
              />
              <span>تفعيل تنبيهات انخفاض المخزون</span>
            </label>
            {settings.lowStockAlert && (
              <div className="mr-8">
                <label className="block text-sm font-medium mb-1">عتبة التنبيه (عدد المنتجات)</label>
                <input
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
                  className="w-32 p-2 border rounded-lg"
                  min={1}
                  max={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  سيتم إرسال تنبيه عندما يصبح عدد المنتجات أقل من {settings.lowStockThreshold}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button type="submit" variant="primary" className="mt-4" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </Button>
    </form>
  );
};

export default NotificationSettingsTab;