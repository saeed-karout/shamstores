// src/components/settings/GeneralSettingsTab.tsx

import React, { useState, useEffect } from 'react';
import { IoStorefront, IoCall, IoLogoWhatsapp, IoLocation, IoMap, IoTime, IoCash, IoLanguage, IoLocate, IoRefresh } from 'react-icons/io5';
import Button from '@/components/common/Button';
import toast from 'react-hot-toast';

interface GeneralSettingsTabProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  saving?: boolean;
}

const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ initialData, onSave, saving }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
    latitude: '',
    longitude: '',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    language: 'ar'
  });
  
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        whatsapp: initialData.whatsapp || '',
        address: initialData.address || '',
        description: initialData.description || '',
        latitude: initialData.latitude?.toString() || '',
        longitude: initialData.longitude?.toString() || '',
        timezone: initialData.timezone || getTimeZoneFromLocation(),
        currency: initialData.currency || 'SAR',
        language: initialData.language || 'ar'
      });
    }
  }, [initialData]);

  // الحصول على المنطقة الزمنية من المتصفح
  const getTimeZoneFromLocation = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      return 'Asia/Riyadh';
    }
  };

  // الحصول على الموقع الحالي عبر GPS
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم خاصية تحديد الموقع');
      return;
    }

    setLocationLoading(true);
    toast.loading('جاري تحديد موقعك...', { id: 'location' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(7),
          longitude: longitude.toFixed(7)
        }));
        
        toast.success('تم تحديد الموقع بنجاح', { id: 'location' });
        
        // محاولة الحصول على العنوان من الإحداثيات (Reverse Geocoding)
        await getAddressFromCoordinates(latitude, longitude);
        setLocationLoading(false);
      },
      (error) => {
        console.error('Location error:', error);
        setLocationLoading(false);
        toast.dismiss('location');
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('الرجاء السماح بتحديد الموقع');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('معلومات الموقع غير متوفرة');
            break;
          case error.TIMEOUT:
            toast.error('انتهى وقت محاولة تحديد الموقع');
            break;
          default:
            toast.error('فشل تحديد الموقع');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // الحصول على العنوان من الإحداثيات (Reverse Geocoding)
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    setAddressLoading(true);
    
    try {
      // استخدام OpenStreetMap Nominatim API (مجاني)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          setFormData(prev => ({
            ...prev,
            address: data.display_name
          }));
          toast.success('تم تحديث العنوان تلقائياً');
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // لا نعرض خطأ للمستخدم لأن هذه ميزة إضافية
    } finally {
      setAddressLoading(false);
    }
  };

  // البحث عن موقع باستخدام عنوان (Geocoding)
  const searchAddress = async () => {
    if (!formData.address || formData.address.trim() === '') {
      toast.error('الرجاء إدخال عنوان للبحث');
      return;
    }

    setAddressLoading(true);
    toast.loading('جاري البحث عن العنوان...', { id: 'search' });

    try {
      const encodedAddress = encodeURIComponent(formData.address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&accept-language=ar`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setFormData(prev => ({
            ...prev,
            latitude: parseFloat(lat).toFixed(7),
            longitude: parseFloat(lon).toFixed(7)
          }));
          toast.success('تم العثور على الموقع', { id: 'search' });
        } else {
          toast.error('لم يتم العثور على العنوان', { id: 'search' });
        }
      } else {
        toast.error('فشل البحث عن العنوان', { id: 'search' });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('حدث خطأ في البحث', { id: 'search' });
    } finally {
      setAddressLoading(false);
    }
  };

  // فتح الخريطة في خرائط جوجل
  const openInGoogleMaps = () => {
    if (formData.latitude && formData.longitude) {
      const url = `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;
      window.open(url, '_blank');
    } else if (formData.address) {
      const url = `https://www.google.com/maps?q=${encodeURIComponent(formData.address)}`;
      window.open(url, '_blank');
    } else {
      toast.error('لا يوجد موقع محدد');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const timezones = [
    { value: 'Asia/Syria', label: 'سوريا (Syria)' },
    { value: 'Asia/Riyadh', label: 'السعودية (Riyadh)' },
    { value: 'Asia/Dubai', label: 'الإمارات (Dubai)' },
    { value: 'Asia/Qatar', label: 'قطر (Qatar)' },
    { value: 'Asia/Kuwait', label: 'الكويت (Kuwait)' },
    { value: 'Asia/Bahrain', label: 'البحرين (Bahrain)' },
    { value: 'Asia/Amman', label: 'الأردن (Amman)' },
    { value: 'Asia/Beirut', label: 'لبنان (Beirut)' },
    { value: 'Africa/Cairo', label: 'مصر (Cairo)' }
  ];

  const currencies = [
    { value: 'SY', label: 'ليرة سورية (SYP)' },
    { value: 'SAR', label: 'ريال سعودي (SAR)' },
    { value: 'AED', label: 'درهم إماراتي (AED)' },
    { value: 'QAR', label: 'ريال قطري (QAR)' },
    { value: 'KWD', label: 'دينار كويتي (KWD)' },
    { value: 'BHD', label: 'دينار بحريني (BHD)' },
    { value: 'JOD', label: 'دينار أردني (JOD)' },
    { value: 'EGP', label: 'جنيه مصري (EGP)' },
    { value: 'USD', label: 'دولار أمريكي (USD)' }
  ];

  const languages = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'English' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <IoStorefront className="text-green-600" />
        معلومات المتجر
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">اسم المتجر *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="أدخل اسم المتجر"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">البريد الإلكتروني *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="info@store.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoCall size={14} />
            رقم الهاتف
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="+966 5XXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoLogoWhatsapp size={14} />
            رقم الواتساب
          </label>
          <input
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="+966 5XXXXXXXX"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoLocation size={14} />
            العنوان
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="العنوان الكامل"
            />
            <button
              type="button"
              onClick={searchAddress}
              disabled={addressLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              title="البحث عن الإحداثيات من العنوان"
            >
              {addressLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <IoRefresh size={18} />
              )}
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">الوصف</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            rows={4}
            placeholder="وصف المتجر"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium flex items-center gap-1">
              <IoMap size={14} />
              موقع المتجر على الخريطة
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              >
                {locationLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <IoLocate size={14} />
                )}
                <span>تحديد موقعي الحالي</span>
              </button>
              {(formData.latitude || formData.longitude) && (
                <button
                  type="button"
                  onClick={openInGoogleMaps}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                >
                  <IoLocation size={14} />
                  <span>فتح في الخريطة</span>
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">خط العرض (Latitude)</label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full p-2 border rounded-lg font-mono"
                placeholder="33.5138"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">خط الطول (Longitude)</label>
              <input
                type="text"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full p-2 border rounded-lg font-mono"
                placeholder="36.2765"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            💡 يمكنك تحديد موقعك تلقائياً باستخدام GPS، أو إدخال الإحداثيات يدوياً، أو البحث عن عنوان
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoTime size={14} />
            المنطقة الزمنية
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            {timezones.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoCash size={14} />
            العملة
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            {currencies.map(cur => (
              <option key={cur.value} value={cur.value}>{cur.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-1">
            <IoLanguage size={14} />
            اللغة
          </label>
          <select
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" variant="primary" className="mt-4" disabled={saving}>
        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
      </Button>
    </form>
  );
};

export default GeneralSettingsTab;