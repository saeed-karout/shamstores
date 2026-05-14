// frontend/src/pages/auth/Login.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsContext } from '@/contexts/SettingsContext';
import Button from '@/components/common/Button';
import { IoRestaurant, IoMail, IoLockClosed, IoWarning } from 'react-icons/io5';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const { 
    isMaintenanceMode, 
    platformName, 
    maxLoginAttempts,
    loading: settingsLoading,
    error: settingsError
  } = useSettingsContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      // الخطأ يتم معالجته في الهوك
    }
  };

  // إذا كان هناك خطأ في تحميل الإعدادات، نعرض رسالة عامة
  if (settingsError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoWarning className="text-yellow-500 text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">⚠️ المنصة غير متاحة</h1>
          <p className="text-gray-600">
            عذراً، المنصة غير متاحة حالياً. يرجى المحاولة لاحقاً.
          </p>
          <Link to="/" className="mt-4 inline-block text-blue-500 hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // أثناء تحميل الإعدادات، نعرض شاشة تحميل
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <IoRestaurant className="h-12 w-12 text-blue-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {platformName || 'ديجيتال مينو'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          تسجيل الدخول إلى لوحة التحكم
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="your@email.com"
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="********"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
              >
                تسجيل الدخول
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/user/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              تسجيل دخول المستخدمين
            </Link>
            <span className="mx-2 text-gray-300">|</span>
            <Link
              to="/delivery/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              مندوب توصيل
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;