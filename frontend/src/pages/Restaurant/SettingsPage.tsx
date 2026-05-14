// pages/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../hooks/useRestaurant';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { 
  IoRestaurant, 
  IoColorPalette, 
  IoText, 
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
  IoLogoWhatsapp
} from 'react-icons/io5';
import { getImageUrl } from '@/utils/imageHelpers';
import api from '@/services/api';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface OpeningHours {
  sunday: DayHours;
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
}

interface DeliverySettings {
  enableDelivery: boolean;
  baseFee: number;
  feePerKm: number;
  minDistance: number;
  maxDistance: number;
  freeDeliveryAbove: number;
  estimatedTime: number;
}

const defaultHours: DayHours = {
  open: '09:00',
  close: '23:00',
  closed: false
};

const defaultOpeningHours: OpeningHours = {
  sunday: { ...defaultHours },
  monday: { ...defaultHours },
  tuesday: { ...defaultHours },
  wednesday: { ...defaultHours },
  thursday: { ...defaultHours },
  friday: { open: '13:00', close: '00:00', closed: false },
  saturday: { open: '13:00', close: '00:00', closed: false },
};

const defaultDeliverySettings: DeliverySettings = {
  enableDelivery: true,
  baseFee: 5,
  feePerKm: 2,
  minDistance: 1,
  maxDistance: 20,
  freeDeliveryAbove: 100,
  estimatedTime: 45
};

export const SettingsPage: React.FC = () => {
  const { restaurant, loading, updateRestaurant, uploadLogo, uploadCover } = useRestaurant();
  const permissions = usePermissions();
  const { user, isSuperAdmin, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);

  // نموذج البيانات العامة
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

  // نموذج التصميم
  const [designForm, setDesignForm] = useState({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontFamily: 'Cairo',
  });

  // نموذج SEO والدومين
  const [seoForm, setSeoForm] = useState({
    metaTitle: '',
    metaDescription: '',
    subdomain: '',
    customDomain: '',
  });

  // أوقات العمل
  const [openingHours, setOpeningHours] = useState<OpeningHours>(defaultOpeningHours);
  
  // إعدادات التوصيل
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(defaultDeliverySettings);

  



useEffect(() => {
  if (restaurant) {
    console.log('Restaurant data:', restaurant);
    
    setGeneralForm({
      name: restaurant.name || '',
      email: restaurant.email || '',
      phone: restaurant.phone || '',
      whatsapp: restaurant.whatsapp || '',
      address: restaurant.address || '',
      description: restaurant.description || '',
      instagram: restaurant.instagram || '',
      facebook: restaurant.facebook || '',
      tiktok: restaurant.tiktok || '',
      latitude: restaurant.latitude?.toString() || '',
      longitude: restaurant.longitude?.toString() || '',
    });

    setDesignForm({
      primaryColor: restaurant.primaryColor || '#3B82F6',
      secondaryColor: restaurant.secondaryColor || '#10B981',
      backgroundColor: restaurant.backgroundColor || '#FFFFFF',
      textColor: restaurant.textColor || '#000000',
      fontFamily: restaurant.fontFamily || 'Cairo',
    });

    setSeoForm({
      metaTitle: restaurant.metaTitle || '',
      metaDescription: restaurant.metaDescription || '',
      subdomain: restaurant.subdomain || '',
      customDomain: restaurant.customDomain || '',
    });

    // معالجة أوقات العمل
    if (restaurant.openingHours) {
      try {
        const parsedHours = typeof restaurant.openingHours === 'string' 
          ? JSON.parse(restaurant.openingHours) 
          : restaurant.openingHours;
        
        setOpeningHours(prev => ({
          ...prev,
          ...parsedHours
        }));
      } catch (error) {
        console.error('Error parsing opening hours:', error);
      }
    }

    // معالجة إعدادات التوصيل
    if (restaurant.deliverySettings) {
      try {
        let parsedSettings = restaurant.deliverySettings;
        if (typeof parsedSettings === 'string') {
          parsedSettings = JSON.parse(parsedSettings);
        }
        console.log('Loaded delivery settings from restaurant:', parsedSettings);
        setDeliverySettings(prev => ({
          ...prev,
          ...parsedSettings
        }));
      } catch (error) {
        console.error('Error parsing delivery settings:', error);
      }
    }
  }
}, [restaurant]);

  const handleSaveGeneral = async () => {
    try {
      await updateRestaurant(generalForm);
      toast.success('تم تحديث البيانات العامة');
    } catch (error) {
      // الخطأ يتم معالجته في الهوك
    }
  };

  const handleSaveDesign = async () => {
    try {
      await updateRestaurant(designForm);
      toast.success('تم تحديث التصميم');
    } catch (error) {
      // الخطأ يتم معالجته في الهوك
    }
  };

  const handleSaveSeo = async () => {
    try {
      await updateRestaurant(seoForm);
      toast.success('تم تحديث إعدادات SEO والدومين');
    } catch (error) {
      // الخطأ يتم معالجته في الهوك
    }
  };

  const handleSaveHours = async () => {
    try {
      const completeHours = days.reduce((acc, { key }) => {
        acc[key] = openingHours[key] || { ...defaultHours };
        return acc;
      }, {} as OpeningHours);

      await updateRestaurant({ openingHours: completeHours });
      toast.success('تم تحديث أوقات العمل');
    } catch (error) {
      // الخطأ يتم معالجته في الهوك
    }
  };

 const handleSaveDeliverySettings = async () => {
  try {
    // التأكد من أن القيم أرقام صحيحة
    const settingsToSave = {
      enableDelivery: deliverySettings.enableDelivery,
      baseFee: Number(deliverySettings.baseFee),
      feePerKm: Number(deliverySettings.feePerKm),
      minDistance: Number(deliverySettings.minDistance),
      maxDistance: Number(deliverySettings.maxDistance),
      freeDeliveryAbove: Number(deliverySettings.freeDeliveryAbove),
      estimatedTime: Number(deliverySettings.estimatedTime)
    };
    
    await updateRestaurant({ deliverySettings: settingsToSave });
    toast.success('تم حفظ إعدادات التوصيل');
    
    // إعادة تحميل الإعدادات للتأكد
    const response = await api.get('/restaurants/delivery-settings');
    if (response.success && response.data) {
      setDeliverySettings(prev => ({
        ...prev,
        ...response.data
      }));
    }
  } catch (error) {
    console.error('Error saving delivery settings:', error);
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
      // الخطأ يتم معالجته في الهوك
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
      // الخطأ يتم معالجته في الهوك
    } finally {
      setUploading(false);
    }
  };

  const handleDayChange = (key: string, field: keyof DayHours, value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || defaultHours),
        [field]: value
      }
    }));
  };

  if (loading) return <Loader fullScreen />;

  const days = [
    { key: 'sunday', name: 'الأحد' },
    { key: 'monday', name: 'الإثنين' },
    { key: 'tuesday', name: 'الثلاثاء' },
    { key: 'wednesday', name: 'الأربعاء' },
    { key: 'thursday', name: 'الخميس' },
    { key: 'friday', name: 'الجمعة' },
    { key: 'saturday', name: 'السبت' },
  ];

  // حساب مثال لسعر التوصيل
  const calculateExampleFee = () => {
    const distance = 5;
    const extraKm = Math.max(0, distance - deliverySettings.minDistance);
    return deliverySettings.baseFee + (extraKm * deliverySettings.feePerKm);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>

      {/* تبويبات الإعدادات */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'general' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoRestaurant className="inline ml-1" />
          عام
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'design' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoColorPalette className="inline ml-1" />
          التصميم
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'images' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoImage className="inline ml-1" />
          الصور
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'hours' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoTimer className="inline ml-1" />
          أوقات العمل
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'delivery' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoCar className="inline ml-1" />
          التوصيل
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'seo' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoGlobe className="inline ml-1" />
          SEO & الدومين
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* ==================== عام ==================== */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IoRestaurant className="text-blue-600" />
              معلومات المطعم
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اسم المطعم</label>
                <input
                  type="text"
                  value={generalForm.name}
                  onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={generalForm.email}
                  onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <IoCall size={14} />
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={generalForm.phone}
                  onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <IoLogoWhatsapp size={14} />
                  رقم الواتساب
                </label>
                <input
                  type="tel"
                  value={generalForm.whatsapp}
                  onChange={(e) => setGeneralForm({ ...generalForm, whatsapp: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <IoLocation size={14} />
                  العنوان
                </label>
                <input
                  type="text"
                  value={generalForm.address}
                  onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">الوصف</label>
                <textarea
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>

              <div className="md:col-span-2">
                <h3 className="font-medium mb-2">وسائل التواصل الاجتماعي</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <IoLogoInstagram size={14} />
                      انستغرام
                    </label>
                    <input
                      type="text"
                      value={generalForm.instagram}
                      onChange={(e) => setGeneralForm({ ...generalForm, instagram: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <IoLogoFacebook size={14} />
                      فيسبوك
                    </label>
                    <input
                      type="text"
                      value={generalForm.facebook}
                      onChange={(e) => setGeneralForm({ ...generalForm, facebook: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="pagename"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <IoLogoWhatsapp size={14} />
                      تيك توك
                    </label>
                    <input
                      type="text"
                      value={generalForm.tiktok}
                      onChange={(e) => setGeneralForm({ ...generalForm, tiktok: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="font-medium mb-2 flex items-center gap-1">
                  <IoMap size={14} />
                  موقع المطعم على الخريطة
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">خط العرض (Latitude)</label>
                    <input
                      type="text"
                      value={generalForm.latitude}
                      onChange={(e) => setGeneralForm({ ...generalForm, latitude: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="33.5138"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">خط الطول (Longitude)</label>
                    <input
                      type="text"
                      value={generalForm.longitude}
                      onChange={(e) => setGeneralForm({ ...generalForm, longitude: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      placeholder="36.2765"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  يمكنك الحصول على الإحداثيات من خرائط جوجل
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveGeneral} className="mt-4">
              حفظ التغييرات
            </Button>
          </div>
        )}

        {/* ==================== التصميم ==================== */}
        {activeTab === 'design' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IoColorPalette className="text-blue-600" />
              تخصيص التصميم
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">اللون الأساسي</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={designForm.primaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={designForm.primaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, primaryColor: e.target.value })}
                    className="flex-1 p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">اللون الثانوي</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={designForm.secondaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, secondaryColor: e.target.value })}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={designForm.secondaryColor}
                    onChange={(e) => setDesignForm({ ...designForm, secondaryColor: e.target.value })}
                    className="flex-1 p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">لون الخلفية</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={designForm.backgroundColor}
                    onChange={(e) => setDesignForm({ ...designForm, backgroundColor: e.target.value })}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={designForm.backgroundColor}
                    onChange={(e) => setDesignForm({ ...designForm, backgroundColor: e.target.value })}
                    className="flex-1 p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">لون النص</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={designForm.textColor}
                    onChange={(e) => setDesignForm({ ...designForm, textColor: e.target.value })}
                    className="w-12 h-10 border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={designForm.textColor}
                    onChange={(e) => setDesignForm({ ...designForm, textColor: e.target.value })}
                    className="flex-1 p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">نوع الخط</label>
                <select
                  value={designForm.fontFamily}
                  onChange={(e) => setDesignForm({ ...designForm, fontFamily: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Almarai">Almarai</option>
                  <option value="Arial">Arial</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>
            </div>

            {/* معاينة */}
            <div className="mt-6 p-4 border rounded-xl" style={{
              backgroundColor: designForm.backgroundColor,
              color: designForm.textColor,
              fontFamily: designForm.fontFamily
            }}>
              <h3 className="font-bold text-lg mb-2" style={{ color: designForm.primaryColor }}>
                معاينة التصميم
              </h3>
              <p className="text-sm mb-3">هذا نص تجريبي لإظهار شكل الخط والألوان التي اخترتها</p>
              <button 
                className="px-4 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: designForm.secondaryColor }}
              >
                زر تجريبي
              </button>
            </div>

            <Button variant="primary" onClick={handleSaveDesign} className="mt-4">
              حفظ التصميم
            </Button>
          </div>
        )}

        {/* ==================== الصور ==================== */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IoImage className="text-blue-600" />
              صور المطعم
            </h2>

            {/* الشعار */}
            <div className="border rounded-xl p-4">
              <label className="block text-sm font-medium mb-2">شعار المطعم</label>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {restaurant?.logo && (
                  <img
                    src={getImageUrl(restaurant.logo)}
                    alt="Logo"
                    className="w-32 h-32 object-cover rounded-xl border shadow-sm"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full p-2 border rounded-lg"
                    disabled={uploading}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    يفضل صورة مربعة بحجم 200×200 بكسل. الصيغ المدعومة: PNG, JPG, SVG
                  </p>
                </div>
              </div>
            </div>

            {/* صورة الغلاف */}
            <div className="border rounded-xl p-4">
              <label className="block text-sm font-medium mb-2">صورة الغلاف</label>
              <div className="space-y-3">
                {restaurant?.coverImage && (
                  <img
                    src={getImageUrl(restaurant.coverImage)}
                    alt="Cover"
                    className="w-full h-48 object-cover rounded-xl border shadow-sm"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="w-full p-2 border rounded-lg"
                  disabled={uploading}
                />
                <p className="text-sm text-gray-500">
                  يفضل صورة بحجم 1200×400 بكسل للحصول على أفضل ظهور
                </p>
              </div>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span>جاري رفع الصورة...</span>
              </div>
            )}
          </div>
        )}

        {/* ==================== أوقات العمل ==================== */}
        {activeTab === 'hours' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IoTimer className="text-blue-600" />
              أوقات العمل
            </h2>

            <div className="space-y-3">
              {days.map(({ key, name }) => {
                const dayData = openingHours[key] || defaultHours;
                
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-20 font-medium">{name}</div>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!dayData.closed}
                        onChange={(e) => handleDayChange(key, 'closed', !e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">مفتوح</span>
                    </label>

                    {!dayData.closed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={dayData.open}
                          onChange={(e) => handleDayChange(key, 'open', e.target.value)}
                          className="p-1 border rounded"
                        />
                        <span>إلى</span>
                        <input
                          type="time"
                          value={dayData.close}
                          onChange={(e) => handleDayChange(key, 'close', e.target.value)}
                          className="p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button variant="primary" onClick={handleSaveHours} className="mt-4">
              حفظ أوقات العمل
            </Button>
          </div>
        )}

        {/* ==================== التوصيل ==================== */}
        {activeTab === 'delivery' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IoCar className="text-blue-600" />
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
                    checked={deliverySettings.enableDelivery}
                    onChange={(e) => setDeliverySettings({...deliverySettings, enableDelivery: e.target.checked})}
                    className="w-5 h-5"
                  />
                  <span className="font-medium">تفعيل خدمة التوصيل</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <IoCash size={14} />
                  سعر التوصيل الأساسي (ل.س)
                </label>
                <input
                  type="number"
                  value={deliverySettings.baseFee}
                  onChange={(e) => setDeliverySettings({...deliverySettings, baseFee: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min={0}
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">السعر الثابت للطلب (دون احتساب المسافة)</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <IoCar size={14} />
                  سعر الكيلومتر الإضافي (ل.س/كم)
                </label>
                <input
                  type="number"
                  value={deliverySettings.feePerKm}
                  onChange={(e) => setDeliverySettings({...deliverySettings, feePerKm: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min={0}
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">السعر لكل كيلومتر إضافي بعد المسافة الأساسية</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">الحد الأدنى للمسافة (كم)</label>
                <input
                  type="number"
                  value={deliverySettings.minDistance}
                  onChange={(e) => setDeliverySettings({...deliverySettings, minDistance: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min={0}
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">المسافة التي يتم احتساب السعر الأساسي خلالها</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">أقصى مسافة للتوصيل (كم)</label>
                <input
                  type="number"
                  value={deliverySettings.maxDistance}
                  onChange={(e) => setDeliverySettings({...deliverySettings, maxDistance: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min={0}
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">أقصى مسافة يمكن التوصيل إليها</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">توصيل مجاني للطلبات فوق (ل.س)</label>
                <input
                  type="number"
                  value={deliverySettings.freeDeliveryAbove}
                  onChange={(e) => setDeliverySettings({...deliverySettings, freeDeliveryAbove: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">إذا كان الطلب أكبر من هذا المبلغ، يصبح التوصيل مجانياً</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <IoTime size={14} />
                  الوقت التقديري للتوصيل (دقيقة)
                </label>
                <input
                  type="number"
                  value={deliverySettings.estimatedTime}
                  onChange={(e) => setDeliverySettings({...deliverySettings, estimatedTime: Number(e.target.value)})}
                  className="w-full p-2 border rounded-lg"
                  min={15}
                  step={5}
                />
                <p className="text-xs text-gray-500 mt-1">الوقت المتوقع لإيصال الطلب</p>
              </div>
            </div>

            {/* مثال للحساب */}
            <div className="bg-gray-50 p-4 rounded-xl mt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <IoCalculator size={16} />
                مثال لحساب سعر التوصيل (لمسافة 5 كم)
              </h3>
              <div className="text-sm space-y-2">
                <p>• السعر الأساسي: <span className="font-medium">{deliverySettings.baseFee} ل.س</span></p>
                <p>• المسافة الأساسية: <span className="font-medium">{deliverySettings.minDistance} كم</span></p>
                <p>• المسافة الإضافية: <span className="font-medium">{Math.max(0, 5 - deliverySettings.minDistance)} كم</span></p>
                <p>• تكلفة المسافة الإضافية: <span className="font-medium">{Math.max(0, 5 - deliverySettings.minDistance) * deliverySettings.feePerKm} ل.س</span></p>
                <div className="pt-2 border-t">
                  <p className="font-bold text-green-600">
                    إجمالي سعر التوصيل: {calculateExampleFee()} ل.س
                  </p>
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveDeliverySettings} className="mt-4">
              حفظ إعدادات التوصيل
            </Button>
          </div>
        )}

        {/* ==================== SEO والدومين ==================== */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <IoGlobe className="text-blue-600" />
              إعدادات SEO والدومين
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1">عنوان الصفحة (Meta Title)</label>
              <input
                type="text"
                value={seoForm.metaTitle}
                onChange={(e) => setSeoForm({ ...seoForm, metaTitle: e.target.value })}
                className="w-full p-2 border rounded-lg"
                maxLength={60}
              />
              <p className="text-sm text-gray-500 mt-1">
                {seoForm.metaTitle.length}/60 حرف
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">وصف الصفحة (Meta Description)</label>
              <textarea
                value={seoForm.metaDescription}
                onChange={(e) => setSeoForm({ ...seoForm, metaDescription: e.target.value })}
                className="w-full p-2 border rounded-lg"
                rows={3}
                maxLength={160}
              />
              <p className="text-sm text-gray-500 mt-1">
                {seoForm.metaDescription.length}/160 حرف
              </p>
            </div>

            {/* الدومين الفرعي */}
            <div>
              <label className="block text-sm font-medium mb-1">الدومين الفرعي</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={seoForm.subdomain}
                  onChange={(e) => setSeoForm({ ...seoForm, subdomain: e.target.value })}
                  className="flex-1 p-2 border rounded-l-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="my-restaurant"
                  disabled={!permissions.checkPermission('customDomain') && !isSuperAdmin}
                />
                <span className="bg-gray-100 p-2 border-t border-b border-r rounded-r-lg text-gray-500">
                  .yourdomain.com
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                سيكون رابط مطعمك: {seoForm.subdomain || 'my-restaurant'}.yourdomain.com
              </p>
              {!permissions.checkPermission('customDomain') && !isSuperAdmin && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                  <IoLockClosed className="text-yellow-500" />
                  <span className="text-sm text-yellow-700">
                    الدومين الخاص متاح فقط في الخطة الاحترافية
                  </span>
                </div>
              )}
            </div>

            {/* الدومين المخصص */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <IoLink size={14} />
                الدومين المخصص
              </label>
              {permissions.checkPermission('customDomain') || isSuperAdmin ? (
                <input
                  type="text"
                  value={seoForm.customDomain}
                  onChange={(e) => setSeoForm({ ...seoForm, customDomain: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="www.my-restaurant.com"
                />
              ) : (
                <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500">
                    <IoLockClosed />
                    <span>هذه الميزة متاحة فقط في الخطة الاحترافية</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.location.href = '/plans'}
                    className="mt-2"
                  >
                    ترقية الخطة
                  </Button>
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {permissions.checkPermission('customDomain') || isSuperAdmin 
                  ? 'أدخل الدومين الخاص بك (مثال: www.my-restaurant.com)'
                  : 'قم بترقية خطتك لاستخدام دومين خاص'}
              </p>
            </div>

            {/* معاينة في محركات البحث */}
            <div className="bg-gray-50 p-4 rounded-xl mt-4">
              <h3 className="font-semibold mb-3">معاينة في محركات البحث</h3>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-blue-600 text-lg font-medium line-clamp-1">
                  {seoForm.metaTitle || restaurant?.name || 'اسم المطعم'}
                </div>
                <div className="text-green-600 text-sm line-clamp-1">
                  {seoForm.customDomain || `${seoForm.subdomain || restaurant?.slug}.yourdomain.com`}
                </div>
                <div className="text-gray-600 text-sm mt-2 line-clamp-2">
                  {seoForm.metaDescription || restaurant?.description || 'وصف المطعم'}
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveSeo} className="mt-4">
              حفظ إعدادات SEO والدومين
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
