// pages/Admin/AdminRestaurantDetails.tsx - أضف هذا القسم

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  IoArrowBack, IoSave, IoTrash, IoKey, IoEye, IoEyeOff, 
  IoRestaurant, IoLocation, IoCall, IoMail, IoLogoWhatsapp,
  IoColorPalette, IoSettings, IoLink, IoWarning, IoMegaphone,
  IoRefresh
} from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

interface Restaurant {
  id: string;
  name: string;
  slug: string;  // ✅ أضف slug
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  description: string;
  logo: string;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
  plan: { id: string; name: string; price: number };
  users: Array<{ id: string; name: string; email: string; phone: string }>;
  createdAt: string;
}

const AdminRestaurantDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    description: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    isActive: true
  });

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      const response = await api.get(`/admin/restaurants/${id}`);
      setRestaurant(response);
      setFormData({
        name: response.name || '',
        slug: response.slug || '',
        email: response.email || '',
        phone: response.phone || '',
        whatsapp: response.whatsapp || '',
        address: response.address || '',
        description: response.description || '',
        primaryColor: response.primaryColor || '#3B82F6',
        secondaryColor: response.secondaryColor || '#10B981',
        isActive: response.isActive
      });
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      toast.error('فشل تحميل بيانات المطعم');
    } finally {
      setLoading(false);
    }
  };

  // ✅ التحقق من توفر slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === restaurant?.slug) {
      setSlugAvailable(true);
      return;
    }
    
    setCheckingSlug(true);
    try {
      const response = await api.get(`/admin/check-slug?slug=${slug}&type=restaurant&id=${id}`);
      setSlugAvailable(response.available);
      if (!response.available) {
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

  const handleUpdate = async () => {
    // ✅ التحقق من slug قبل الحفظ
    if (!slugAvailable && formData.slug !== restaurant?.slug) {
      toast.error('الرابط غير متاح، يرجى اختيار رابط آخر');
      return;
    }

    try {
      await api.put(`/admin/restaurants/${id}`, formData);
      toast.success('تم تحديث بيانات المطعم بنجاح');
      setEditing(false);
      fetchRestaurant();
    } catch (error) {
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
      await api.post(`/admin/restaurants/${id}/reset-password`, { password: newPassword });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      setNewPassword('');
      setShowPassword(false);
    } catch (error) {
      toast.error('فشل إعادة تعيين كلمة المرور');
    }
  };

  const handleDelete = async () => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${restaurant?.name}"؟ سيتم حذف جميع البيانات المرتبطة به.`)) {
      try {
        await api.delete(`/admin/restaurants/${id}`);
        toast.success('تم حذف المطعم بنجاح');
        navigate('/admin/restaurants');
      } catch (error) {
        toast.error('فشل حذف المطعم');
      }
    }
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

  if (loading) return <Loader fullScreen />;
  if (!restaurant) return <div>المطعم غير موجود</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/restaurants')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <IoArrowBack size={20} />
          العودة
        </button>
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <span className={`px-2 py-1 rounded-full text-xs ${restaurant.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {restaurant.isActive ? 'نشط' : 'غير نشط'}
        </span>
        <div className="flex-1"></div>
        <button
          onClick={() => navigate(`/admin/business/restaurant/${id}/marketing`)}
          className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-200 flex items-center gap-1"
        >
          <IoMegaphone size={16} />
          الإعلانات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* معلومات المطعم */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">معلومات المطعم</h2>
            <div className="flex gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  تعديل
                </button>
              ) : (
                <>
                  <button
                    onClick={handleUpdate}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"
                  >
                    <IoSave size={18} />
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                </>
              )}
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <IoTrash size={18} />
                حذف
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم المطعم</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{restaurant.name}</p>
              )}
            </div>

            {/* ✅ حقل الرابط (slug) */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                <IoLink size={16} />
                الرابط (Slug)
              </label>
              {editing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={handleSlugChange}
                      className={`flex-1 p-2 border rounded-lg ${
                        !slugAvailable && formData.slug !== restaurant.slug
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="my-restaurant"
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
                  {checkingSlug && (
                    <p className="text-sm text-gray-500">جاري التحقق من الرابط...</p>
                  )}
                  {!slugAvailable && formData.slug !== restaurant.slug && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <IoWarning size={14} />
                      هذا الرابط مستخدم بالفعل، يرجى اختيار رابط آخر
                    </p>
                  )}
                  {slugAvailable && formData.slug !== restaurant.slug && formData.slug && (
                    <p className="text-sm text-green-600">✓ هذا الرابط متاح</p>
                  )}
                  <p className="text-xs text-gray-500">
                    الرابط الخاص بمطعمك: {window.location.origin}/{formData.slug || '...'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 font-mono">{restaurant.slug}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    رابط المطعم: {window.location.origin}/{restaurant.slug}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{restaurant.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                ) : (
                  <p className="text-gray-700">{restaurant.phone || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">واتساب</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                ) : (
                  <p className="text-gray-700">{restaurant.whatsapp || '-'}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">العنوان</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              ) : (
                <p className="text-gray-700">{restaurant.address || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              {editing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                />
              ) : (
                <p className="text-gray-700">{restaurant.description || '-'}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: restaurant.primaryColor }} />
                    <span>{restaurant.primaryColor}</span>
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
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: restaurant.secondaryColor }} />
                    <span>{restaurant.secondaryColor}</span>
                  </div>
                )}
              </div>
            </div>

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
                <span className={restaurant.isActive ? 'text-green-600' : 'text-red-600'}>
                  {restaurant.isActive ? 'نشط' : 'غير نشط'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* معلومات إضافية - كما هي */}
        <div className="space-y-6">
          {/* الخطة */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">الخطة</h2>
            <p><span className="text-gray-500">الخطة:</span> {restaurant.plan?.name || '-'}</p>
            <p><span className="text-gray-500">السعر:</span> {restaurant.plan?.price || 0} ل.س/شهر</p>
            <p><span className="text-gray-500">تاريخ التسجيل:</span> {new Date(restaurant.createdAt).toLocaleDateString('ar-SA')}</p>
          </div>

          {/* إعادة تعيين كلمة المرور */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <IoKey size={20} />
              إعادة تعيين كلمة المرور
            </h2>
            <div className="space-y-3">
              <div className="relative">
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
              <Button variant="primary" onClick={handleResetPassword} fullWidth>
                إعادة تعيين كلمة المرور
              </Button>
            </div>
          </div>

          {/* معلومات المالك */}
          {restaurant.users && restaurant.users.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">معلومات المالك</h2>
              <p><span className="text-gray-500">الاسم:</span> {restaurant.users[0].name}</p>
              <p><span className="text-gray-500">البريد:</span> {restaurant.users[0].email}</p>
              <p><span className="text-gray-500">الهاتف:</span> {restaurant.users[0].phone || '-'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRestaurantDetails;
