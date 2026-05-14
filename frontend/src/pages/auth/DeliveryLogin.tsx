// frontend/src/pages/auth/DeliveryLogin.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCar, IoMail, IoLockClosed, IoEye, IoEyeOff, IoWarning } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useSettingsContext } from '@/contexts/SettingsContext';

const DeliveryLogin: React.FC = () => {
  const navigate = useNavigate();
  const { isMaintenanceMode, platformName, maxLoginAttempts } = useSettingsContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // عرض وضع الصيانة
  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoWarning className="text-yellow-500 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🔧 وضع الصيانة</h1>
          <p className="text-gray-600">المنصة تحت الصيانة حالياً.</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.user?.role === 'delivery_driver') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('userRole', 'delivery_driver');
        
        toast.success(`مرحباً ${response.user.name}`);
        navigate('/driver/dashboard');
      } else {
        toast.error('هذا الحساب ليس لمندوب توصيل');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <IoCar className="text-white text-4xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">{platformName}</h1>
          <p className="text-white/70 mt-2">تطبيق مندوب التوصيل</p>
          <p className="text-white/50 text-xs mt-1">
            الحد الأقصى للمحاولات: {maxLoginAttempts}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <IoMail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="example@domain.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <IoLockClosed className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ليس لديك حساب؟ تواصل مع إدارة {platformName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryLogin;