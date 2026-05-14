// src/components/settings/DesignSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoColorPalette, IoText, IoApps, IoGrid } from 'react-icons/io5';
import Button from '@/components/common/Button';
import { DesignSettings } from '@/types/stores/settings.types';

interface DesignSettingsTabProps {
  initialData: DesignSettings;
  onSave: (data: DesignSettings) => Promise<void>;
  saving?: boolean;
}

const DesignSettingsTab: React.FC<DesignSettingsTabProps> = ({ initialData, onSave, saving }) => {
  const [design, setDesign] = useState<DesignSettings>({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontFamily: 'Cairo',
    buttonStyle: 'rounded',
    cardStyle: 'shadow'
  });

  useEffect(() => {
    if (initialData) {
      setDesign(initialData);
    }
  }, [initialData]);

  const fontOptions = [
    { value: 'Cairo', label: 'Cairo (عربي)' },
    { value: 'Tajawal', label: 'Tajawal (عربي)' },
    { value: 'Almarai', label: 'Almarai (عربي)' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Poppins', label: 'Poppins' }
  ];

  const buttonStyles = [
    { value: 'rounded', label: 'مدور', class: 'rounded-lg' },
    { value: 'pill', label: 'بيضاوي', class: 'rounded-full' },
    { value: 'square', label: 'مربع', class: 'rounded-none' }
  ];

  const cardStyles = [
    { value: 'shadow', label: 'ظل', class: 'shadow-lg' },
    { value: 'flat', label: 'مسطح', class: 'shadow-none' },
    { value: 'border', label: 'حدود', class: 'border' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(design);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoColorPalette className="text-green-600" />
        تخصيص التصميم
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">اللون الأساسي</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.primaryColor}
              onChange={(e) => setDesign({ ...design, primaryColor: e.target.value })}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={design.primaryColor}
              onChange={(e) => setDesign({ ...design, primaryColor: e.target.value })}
              className="flex-1 p-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">اللون الثانوي</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.secondaryColor}
              onChange={(e) => setDesign({ ...design, secondaryColor: e.target.value })}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={design.secondaryColor}
              onChange={(e) => setDesign({ ...design, secondaryColor: e.target.value })}
              className="flex-1 p-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">لون الخلفية</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.backgroundColor}
              onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={design.backgroundColor}
              onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })}
              className="flex-1 p-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">لون النص</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={design.textColor}
              onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
              className="w-12 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={design.textColor}
              onChange={(e) => setDesign({ ...design, textColor: e.target.value })}
              className="flex-1 p-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoText size={14} />
            نوع الخط
          </label>
          <select
            value={design.fontFamily}
            onChange={(e) => setDesign({ ...design, fontFamily: e.target.value })}
            className="w-full p-2 border rounded-lg"
            style={{ fontFamily: design.fontFamily }}
          >
            {fontOptions.map(font => (
              <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoApps size={14} />
            شكل الأزرار
          </label>
          <div className="flex gap-2">
            {buttonStyles.map(style => (
              <button
                key={style.value}
                type="button"
                onClick={() => setDesign({ ...design, buttonStyle: style.value as any })}
                className={`px-4 py-2 transition-all ${
                  design.buttonStyle === style.value 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100'
                } ${style.class}`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoGrid size={14} />
            شكل البطاقات
          </label>
          <div className="flex gap-2">
            {cardStyles.map(style => (
              <button
                key={style.value}
                type="button"
                onClick={() => setDesign({ ...design, cardStyle: style.value as any })}
                className={`px-4 py-2 transition-all ${
                  design.cardStyle === style.value 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* معاينة */}
      <div className="mt-6 p-6 bg-gray-50 rounded-xl">
        <h3 className="font-bold text-lg mb-3" style={{ color: design.primaryColor, fontFamily: design.fontFamily }}>
          معاينة التصميم
        </h3>
        <div className="space-y-3">
          <div 
            className={`p-4 ${design.cardStyle === 'shadow' ? 'shadow-lg' : design.cardStyle === 'border' ? 'border' : ''}`}
            style={{ backgroundColor: design.backgroundColor, color: design.textColor }}
          >
            <p className="text-sm mb-3">هذا نص تجريبي لإظهار شكل الألوان التي اخترتها</p>
            <button 
              className={`px-4 py-2 text-white transition-all ${
                design.buttonStyle === 'rounded' ? 'rounded-lg' : 
                design.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-none'
              }`}
              style={{ backgroundColor: design.secondaryColor }}
            >
              زر تجريبي
            </button>
          </div>
        </div>
      </div>

      <Button type="submit" variant="primary" className="mt-4" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ التصميم'}
      </Button>
    </form>
  );
};

export default DesignSettingsTab;