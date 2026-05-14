// frontend/src/pages/auth/Register.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsContext } from '../../contexts/SettingsContext';
import Button from '../../components/common/Button';
import { 
  IoRestaurant, 
  IoMail, 
  IoLockClosed, 
  IoPerson, 
  IoCall, 
  IoStorefront,
  IoWarning
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const { 
    isRegistrationAllowed, 
    requireEmailVerification, 
    platformName,
    isMaintenanceMode 
  } = useSettingsContext();
  
  const [accountType, setAccountType] = useState<'restaurant' | 'store'>('restaurant');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
  });
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);

  // التحقق من وضع الصيانة
  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoWarning className="text-yellow-500 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🔧 وضع الصيانة</h1>
          <p className="text-gray-600">التسجيل مغلق حالياً بسبب أعمال الصيانة.</p>
          <Link to="/" className="mt-4 inline-block text-blue-500 hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // التحقق من أن التسجيل مسموح
  if (!isRegistrationAllowed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoWarning className="text-red-500 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🔒 التسجيل مغلق</h1>
          <p className="text-gray-600">عذراً، التسجيل في المنصة مغلق حالياً.</p>
          <Link to="/login" className="mt-4 inline-block text-blue-500 hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (!formData.businessName.trim()) {
      setError(`يرجى إدخال اسم ${accountType === 'restaurant' ? 'المطعم' : 'المتجر'}`);
      return;
    }

    setRegistering(true);
    setError('');

    try {
      if (accountType === 'restaurant') {
        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          restaurantName: formData.businessName,
        });
        
        const message = requireEmailVerification 
          ? 'تم إنشاء الحساب. يرجى تفعيل بريدك الإلكتروني'
          : 'تم إنشاء حساب المطعم بنجاح';
        toast.success(message);
      } else {
        const response = await api.post('/auth/register-store', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          storeName: formData.businessName,
        });
        
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          const message = requireEmailVerification 
            ? 'تم إنشاء الحساب. يرجى تفعيل بريدك الإلكتروني'
            : 'تم إنشاء حساب المتجر بنجاح';
          toast.success(message);
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'حدث خطأ في إنشاء الحساب');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {accountType === 'restaurant' ? (
            <IoRestaurant className="h-12 w-12 text-blue-500" />
          ) : (
            <IoStorefront className="h-12 w-12 text-green-500" />
          )}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          إنشاء حساب {accountType === 'restaurant' ? 'مطعم' : 'متجر'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          منصة {platformName}
        </p>
        {requireEmailVerification && (
          <p className="mt-1 text-center text-xs text-blue-600">
            ⚡ سيتم إرسال رابط تفعيل إلى بريدك الإلكتروني
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* اختيار نوع الحساب */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نوع الحساب
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType('restaurant')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  accountType === 'restaurant'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <IoRestaurant className={`text-xl ${accountType === 'restaurant' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span>مطعم</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('store')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  accountType === 'store'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <IoStorefront className={`text-xl ${accountType === 'store' ? 'text-green-500' : 'text-gray-400'}`} />
                <span>متجر</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {accountType === 'restaurant' 
                ? 'يمكنك إدارة قائمة الطعام، الطاولات، وطلبات التوصيل' 
                : 'يمكنك إدارة المنتجات، المخزون، وطلبات التوصيل'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2">
                <IoWarning className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                الاسم الكامل
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <IoPerson className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="محمد أحمد"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <IoMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                رقم الهاتف
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <IoCall className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                {accountType === 'restaurant' ? 'اسم المطعم' : 'اسم المتجر'}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {accountType === 'restaurant' ? (
                    <IoRestaurant className="h-5 w-5 text-gray-400" />
                  ) : (
                    <IoStorefront className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={accountType === 'restaurant' ? "مطعمي المفضل" : "متجري الإلكتروني"}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <IoLockClosed className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="********"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                تأكيد كلمة المرور
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <IoLockClosed className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="********"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={registering || loading}
              >
                إنشاء حساب {accountType === 'restaurant' ? 'مطعم' : 'متجر'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  لديك حساب بالفعل؟
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;