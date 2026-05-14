// pages/Admin/AdminStoreDetails.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  IoArrowBack, IoSave, IoTrash, IoKey, IoEye, IoEyeOff, 
  IoStorefront, IoLocation, IoCall, IoMail, IoLogoWhatsapp,
  IoColorPalette, IoSettings, IoLink, IoWarning, IoRefresh, IoMegaphone
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { getImageUrl } from '@/utils/imageHelpers';

interface StoreOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  maxProducts: number;
  maxOrdersPerMonth: number;
}

interface Stats {
  productsCount: number;
  ordersCount: number;
  totalSales: number;
}

interface Store {
  id: string;
  userId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logo: string;
  coverImage: string | null;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  planId: string;
  settings: any;
  createdAt: string;
  updatedAt: string;
  storeOwner?: StoreOwner;
  plan?: Plan;
  stats?: Stats;
}

const AdminStoreDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'settings'>('info');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);
  const { user, isSuperAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
    latitude: '',
    longitude: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    isActive: true,
    settings: {
      enableDelivery: true,
      deliveryFee: 5,
      freeDeliveryAbove: 100,
      estimatedTime: 45
    }
  });

  useEffect(() => {
    fetchStore();
  }, [id]);

  const fetchStore = async () => {
    try {
      const response = await api.get(`/admin/stores/${id}`);
      // ✅ التعامل مع الـ response بشكل صحيح
      const storeData = response.data || response;
      
      console.log('✅ Store data received:', storeData);
      
      setStore(storeData);
      
      // معالجة الإعدادات (قد تكون string أو object)
      let parsedSettings = {
        enableDelivery: true,
        deliveryFee: 5,
        freeDeliveryAbove: 100,
        estimatedTime: 45
      };
      
      if (storeData.settings) {
        try {
          if (typeof storeData.settings === 'string') {
            // تنظيف الـ string من الأقواس الزائدة
            let cleanSettings = storeData.settings;
            if (cleanSettings.includes('"0":"{"')) {
              // استخراج الجزء الصحيح من JSON
              const match = cleanSettings.match(/(\{.*\})/);
              if (match) {
                cleanSettings = match[1];
              }
            }
            parsedSettings = JSON.parse(cleanSettings);
          } else {
            parsedSettings = storeData.settings;
          }
        } catch (error) {
          console.error('Error parsing settings:', error);
        }
      }
      
      setFormData({
        name: storeData.name || '',
        slug: storeData.slug || '',
        email: storeData.email || '',
        phone: storeData.phone || '',
        whatsapp: storeData.whatsapp || '',
        address: storeData.address || '',
        description: storeData.description || '',
        latitude: storeData.latitude?.toString() || '',
        longitude: storeData.longitude?.toString() || '',
        primaryColor: storeData.primaryColor || '#3B82F6',
        secondaryColor: storeData.secondaryColor || '#10B981',
        isActive: storeData.isActive,
        settings: parsedSettings
      });
    } catch (error) {
      console.error('Error fetching store:', error);
      toast.error('فشل تحميل بيانات المتجر');
    } finally {
      setLoading(false);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === store?.slug) {
      setSlugAvailable(true);
      return;
    }
    
    setCheckingSlug(true);
    try {
      const response = await api.get(`/admin/check-slug?slug=${slug}&type=store&id=${id}`);
      // ✅ التعامل مع الـ response
      const data = response.data || response;
      setSlugAvailable(data.available !== false);
      if (!data.available) {
        toast.error('هذا الرابط مستخدم بالفعل');
      } else {
        toast.success('هذا الرابط متاح');
      }
    } catch (error) {
      console.error('Error checking slug:', error);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, slug: newSlug });
    checkSlugAvailability(newSlug);
  };

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData({ ...formData, slug });
    checkSlugAvailability(slug);
  };

  const handleUpdate = async () => {
    if (!slugAvailable && formData.slug !== store?.slug) {
      toast.error('الرابط غير متاح، يرجى اختيار رابط آخر');
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        slug: formData.slug,
        email: formData.email,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        address: formData.address,
        description: formData.description,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        isActive: formData.isActive,
        settings: formData.settings
      };
      
      await api.put(`/admin/stores/${id}`, updateData);
      toast.success('تم تحديث بيانات المتجر بنجاح');
      setEditing(false);
      fetchStore();
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error('فشل تحديث البيانات');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast.error('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    try {
      await api.post(`/admin/stores/${id}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('فشل إعادة تعيين كلمة المرور');
    }
  };

  const handleToggleStatus = async () => {
    try {
      await api.patch(`/admin/stores/${id}/toggle-status`);
      toast.success(`تم ${store?.isActive ? 'تعطيل' : 'تفعيل'} المتجر بنجاح`);
      fetchStore();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('فشل تغيير حالة المتجر');
    }
  };

  const handleDelete = async () => {
    if (confirm('هل أنت متأكد من حذف هذا المتجر؟ سيتم حذف جميع البيانات المرتبطة به.')) {
      try {
        await api.delete(`/admin/stores/${id}`);
        toast.success('تم حذف المتجر بنجاح');
        navigate('/admin/stores');
      } catch (error) {
        console.error('Error deleting store:', error);
        toast.error('فشل حذف المتجر');
      }
    }
  };

  const getStatusBadge = () => {
    if (!store) return null;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {store.isActive ? 'نشط' : 'غير نشط'}
      </span>
    );
  };

  if (loading) return <Loader fullScreen />;
  if (!store) return <div className="p-6 text-center">المتجر غير موجود</div>;

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate('/admin/stores')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <div className="flex items-center gap-3">
          {store.logo ? (
            <img 
              src={getImageUrl(store.logo)} 
              alt={store.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <IoStorefront className="text-white text-xl" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{store.name}</h1>
            <p className="text-sm text-gray-500">متجر رقمي • {store.slug}</p>
          </div>
        </div>
        {getStatusBadge()}
        <div className="flex-1"></div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/admin/business/store/${id}/marketing`)}
            className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-200 flex items-center gap-1"
          >
            <IoMegaphone size={16} />
            الإعلانات
          </button>
          <button
            onClick={handleToggleStatus}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              store.isActive 
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {store.isActive ? 'تعطيل' : 'تفعيل'}
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 flex items-center gap-1"
          >
            <IoTrash size={16} />
            حذف
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">المنتجات</p>
          <p className="text-2xl font-bold text-purple-600">{store.stats?.productsCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">الطلبات</p>
          <p className="text-2xl font-bold text-blue-600">{store.stats?.ordersCount || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">إجمالي المبيعات</p>
          <p className="text-2xl font-bold text-green-600">{store.stats?.totalSales || 0} ل.س</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'info' ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoStorefront className="inline ml-1" size={16} />
          معلومات المتجر
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'settings' ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <IoSettings className="inline ml-1" size={16} />
          الإعدادات
        </button>
      </div>

      {/* تبويب معلومات المتجر */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">معلومات المتجر</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <IoSave size={16} />
                تعديل
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <IoSave size={16} />
                  حفظ
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* اسم المتجر */}
            <div>
              <label className="block text-sm font-medium mb-1">اسم المتجر</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{store.name}</p>
              )}
            </div>

            {/* الرابط */}
             {/* حقل الرابط (slug) - يظهر فقط للسوبر أدمن */}
      {isSuperAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1 flex items-center gap-2">
            <IoLink size={16} />
            الرابط (Slug) - للتعديل من قبل الأدمن فقط
          </label>
          {editing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  className={`flex-1 p-2 border rounded-lg ${
                    !slugAvailable && formData.slug !== store.slug
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="my-store"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-3 bg-gray-200 rounded-lg hover:bg-gray-300"
                  title="توليد رابط تلقائي"
                >
                  <IoRefresh size={18} />
                </button>
              </div>
              {checkingSlug && <p className="text-sm text-gray-500">جاري التحقق...</p>}
              {!slugAvailable && formData.slug !== store.slug && (
                <p className="text-sm text-red-600">⚠ هذا الرابط مستخدم بالفعل</p>
              )}
              <p className="text-xs text-gray-500">
                الرابط: {window.location.origin}/{formData.slug}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 font-mono">{store.slug}</p>
              <p className="text-xs text-gray-500 mt-1">
                {window.location.origin}/{store.slug}
              </p>
            </div>
          )}
        </div>
      )}

            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <IoMail size={14} /> البريد الإلكتروني
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{store.email}</p>
              )}
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <IoCall size={14} /> رقم الهاتف
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{store.phone || '-'}</p>
              )}
            </div>

            {/* الواتساب */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <IoLogoWhatsapp size={14} /> واتساب
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{store.whatsapp || '-'}</p>
              )}
            </div>

            {/* العنوان */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                <IoLocation size={14} /> العنوان
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{store.address || '-'}</p>
              )}
            </div>

            {/* الوصف */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">الوصف</label>
              {editing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700">{store.description || '-'}</p>
              )}
            </div>

            {/* الألوان */}
            <div>
              <label className="block text-sm font-medium mb-1">اللون الأساسي</label>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-10 border rounded"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1 p-2 border rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: store.primaryColor }} />
                  <span>{store.primaryColor}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">اللون الثانوي</label>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-12 h-10 border rounded"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="flex-1 p-2 border rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: store.secondaryColor }} />
                  <span>{store.secondaryColor}</span>
                </div>
              )}
            </div>

            {/* الإحداثيات */}
            <div>
              <label className="block text-sm font-medium mb-1">خط العرض</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="33.5138"
                />
              ) : (
                <p className="text-gray-700">{store.latitude || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">خط الطول</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="36.2765"
              />
              ) : (
                <p className="text-gray-700">{store.longitude || '-'}</p>
              )}
            </div>

            {/* الخطة */}
            <div>
              <label className="block text-sm font-medium mb-1">الخطة</label>
              <p className="text-gray-700">
                {store.plan?.name || 'مجاني'} - {store.plan?.price || 0} ل.س/شهر
              </p>
              <p className="text-xs text-gray-500">
                الحد الأقصى للمنتجات: {store.plan?.maxProducts || 0}
              </p>
            </div>

            {/* الحالة */}
            <div>
              <label className="block text-sm font-medium mb-1">الحالة</label>
              {editing ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span>مفعل</span>
                </label>
              ) : (
                <span className={store.isActive ? 'text-green-600' : 'text-red-600'}>
                  {store.isActive ? 'نشط' : 'غير نشط'}
                </span>
              )}
            </div>
          </div>

          {/* معلومات المالك */}
          <div className="mt-6 p-4 bg-purple-50 rounded-xl">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <IoKey size={18} />
              معلومات المالك
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-gray-500">الاسم:</span> {store.storeOwner?.name || '-'}
              </div>
              <div>
                <span className="text-gray-500">البريد:</span> {store.storeOwner?.email || '-'}
              </div>
              <div>
                <span className="text-gray-500">الهاتف:</span> {store.storeOwner?.phone || '-'}
              </div>
            </div>
          </div>

          {/* إعادة تعيين كلمة المرور */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-xl">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <IoKey size={18} />
              إعادة تعيين كلمة المرور
            </h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="w-full p-2 border rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <IoEyeOff size={18} /> : <IoEye size={18} />}
                </button>
              </div>
              <Button variant="primary" onClick={handleResetPassword}>
                إعادة تعيين
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* تبويب الإعدادات */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <IoSettings size={20} />
            إعدادات المتجر
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.settings.enableDelivery}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, enableDelivery: e.target.checked }
                  })}
                  disabled={!editing}
                  className="w-5 h-5"
                />
                <span>تفعيل خدمة التوصيل</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">سعر التوصيل الأساسي (ل.س)</label>
              <input
                type="number"
                value={formData.settings.deliveryFee}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, deliveryFee: Number(e.target.value) }
                })}
                disabled={!editing}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">توصيل مجاني للطلبات فوق (ل.س)</label>
              <input
                type="number"
                value={formData.settings.freeDeliveryAbove}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, freeDeliveryAbove: Number(e.target.value) }
                })}
                disabled={!editing}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">الوقت التقديري للتوصيل (دقيقة)</label>
              <input
                type="number"
                value={formData.settings.estimatedTime}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, estimatedTime: Number(e.target.value) }
                })}
                disabled={!editing}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            {editing && (
              <Button variant="primary" onClick={handleUpdate}>
                حفظ الإعدادات
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStoreDetails;
