// src/components/settings/DeliverySettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoCar, IoCash, IoTime, IoWarning, IoCalculator, IoLocation, IoBicycle } from 'react-icons/io5';
import Button from '@/components/common/Button';
import { DeliverySettings } from '@/types/stores/settings.types';

interface DeliverySettingsTabProps {
  initialData: DeliverySettings;
  onSave: (data: DeliverySettings) => Promise<void>;
  saving?: boolean;
}

const DeliverySettingsTab: React.FC<DeliverySettingsTabProps> = ({ initialData, onSave, saving }) => {
  const [settings, setSettings] = useState<DeliverySettings>({
    enableDelivery: true,
    baseFee: 5,
    feePerKm: 2,
    minDistance: 1,
    maxDistance: 20,
    freeDeliveryAbove: 100,
    estimatedTime: 45,
    cashOnDelivery: true,
    onlinePayment: false
  });

  useEffect(() => {
    if (initialData) {
      setSettings(initialData);
    }
  }, [initialData]);

  const calculateFeeForDistance = (distance: number) => {
    const extraKm = Math.max(0, distance - settings.minDistance);
    return settings.baseFee + (extraKm * settings.feePerKm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoCar className="text-green-600" />
        إعدادات خدمة التوصيل
      </h2>

      <div className="bg-blue-50 p-4 rounded-xl mb-4">
        <p className="text-sm text-blue-800 flex items-start gap-2">
          <IoWarning className="mt-0.5 flex-shrink-0" />
          قم بتعيين أسعار التوصيل حسب المسافة. سيتم حساب سعر التوصيل تلقائياً بناءً على موقع العميل.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableDelivery}
              onChange={(e) => setSettings({ ...settings, enableDelivery: e.target.checked })}
              className="w-5 h-5"
            />
            <span className="font-medium">تفعيل خدمة التوصيل</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoCash size={14} />
            سعر التوصيل الأساسي (ر.س)
          </label>
          <input
            type="number"
            value={settings.baseFee}
            onChange={(e) => setSettings({ ...settings, baseFee: Number(e.target.value) })}
            className="w-full p-2 border rounded-lg"
            min={0}
            step={0.5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoCar size={14} />
            سعر الكيلومتر الإضافي (ر.س/كم)
          </label>
          <input
            type="number"
            value={settings.feePerKm}
            onChange={(e) => setSettings({ ...settings, feePerKm: Number(e.target.value) })}
            className="w-full p-2 border rounded-lg"
            min={0}
            step={0.5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoLocation size={14} />
            الحد الأدنى للمسافة (كم)
          </label>
          <input
            type="number"
            value={settings.minDistance}
            onChange={(e) => setSettings({ ...settings, minDistance: Number(e.target.value) })}
            className="w-full p-2 border rounded-lg"
            min={0}
            step={0.5}
          />
          <p className="text-xs text-gray-500">أول {settings.minDistance} كم مجانية</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoBicycle size={14} />
            أقصى مسافة للتوصيل (كم)
          </label>
          <input
            type="number"
            value={settings.maxDistance}
            onChange={(e) => setSettings({ ...settings, maxDistance: Number(e.target.value) })}
            className="w-full p-2 border rounded-lg"
            min={0}
            step={0.5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">توصيل مجاني للطلبات فوق (ر.س)</label>
          <input
            type="number"
            value={settings.freeDeliveryAbove}
            onChange={(e) => setSettings({ ...settings, freeDeliveryAbove: Number(e.target.value) })}
            className="w-full p-2 border rounded-lg"
            min={0}
          />
          <p className="text-xs text-gray-500">0 = لا يوجد توصيل مجاني</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoTime size={14} />
            الوقت التقديري للتوصيل (دقيقة)
          </label>
          <input
            type="number"
            value={settings.estimatedTime}
            onChange={(e) => setSettings({ ...settings, estimatedTime: Number(e.target.value) })}
            className="w-full p-2 border rounded-lg"
            min={15}
            step={5}
          />
        </div>

        <div className="md:col-span-2">
          <h3 className="font-medium mb-2">طرق الدفع المدعومة للتوصيل</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.cashOnDelivery}
                onChange={(e) => setSettings({ ...settings, cashOnDelivery: e.target.checked })}
              />
              <span>الدفع عند الاستلام</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.onlinePayment}
                onChange={(e) => setSettings({ ...settings, onlinePayment: e.target.checked })}
              />
              <span>الدفع الإلكتروني</span>
            </label>
          </div>
        </div>
      </div>

      {/* جدول أسعار التوصيل */}
      <div className="bg-gray-50 p-4 rounded-xl mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <IoCalculator size={16} />
          جدول أسعار التوصيل
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-right py-2">المسافة</th>
                <th className="text-right py-2">سعر التوصيل</th>
              </tr>
            </thead>
            <tbody>
              {[1, 3, 5, 7, 10, 15, 20].map(distance => {
                if (distance <= settings.maxDistance) {
                  return (
                    <tr key={distance} className="border-b">
                      <td className="py-2">{distance} كم</td>
                      <td className="py-2">
                        {distance <= settings.minDistance ? '0' : calculateFeeForDistance(distance)} ر.س
                      </td>
                    </tr>
                  );
                }
                return null;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Button type="submit" variant="primary" className="mt-4" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ إعدادات التوصيل'}
      </Button>
    </form>
  );
};

export default DeliverySettingsTab;