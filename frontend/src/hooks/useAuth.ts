// hooks/useAuth.ts

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/auth';
import { User } from '../services/types';
import toast from 'react-hot-toast';
import axios from 'axios';
import settingsService from '../services/settingsService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const loadingUserRef = useRef(false);

  // تحميل الإعدادات
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const isMaintenance = await settingsService.isMaintenanceMode();
        setMaintenanceMode(isMaintenance);
      } catch (error) {
        console.error('Error loading maintenance mode:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // التحقق من صحة التوكن
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        return payload.exp > now;
      }
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    console.log('🔄 useAuth - location changed:', location.pathname);
    const token = authService.getToken();
    console.log('🔑 Token in useAuth:', token ? 'Yes' : 'No');
    
    // إذا كانت المنصة في وضع الصيانة ولم تكن صفحة الصيانة
    if (maintenanceMode && settingsLoaded && location.pathname !== '/maintenance') {
      console.log('🔧 Maintenance mode active, redirecting');
      navigate('/maintenance');
      setLoading(false);
      setInitialized(true);
      return;
    }
    
    if (token) {
      if (!isTokenValid(token)) {
        console.log('⏰ Token expired, clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        setInitialized(true);
        return;
      }
      
      if (!loadingUserRef.current && !user) {
        console.log('🔍 Token exists but no user, loading...');
        loadingUserRef.current = true;
        loadUser();
      } else if (user) {
        console.log('🔍 Token exists, user already loaded');
        setLoading(false);
        setInitialized(true);
      }
    } else {
      console.log('🔍 No token, setting loading false');
      setUser(null);
      setLoading(false);
      setInitialized(true);
    }
  }, [location.pathname, maintenanceMode, settingsLoaded]);

  const loadUser = async () => {
    try {
      console.log('🔍 Loading user...');
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('No user data');
      }
      
      if (!currentUser.role) {
        console.log('⚠️ User has no role, treating as user');
        currentUser.role = 'user';
      }
      
      // ✅ التحقق من تفعيل البريد الإلكتروني
      const requireEmailVerification = await settingsService.requireEmailVerification();
      if (requireEmailVerification && currentUser.isEmailVerified === false) {
        console.log('📧 Email not verified, logging out');
        toast.error('يرجى تفعيل حسابك عبر البريد الإلكتروني أولاً');
        authService.logout();
        setUser(null);
        setLoading(false);
        setInitialized(true);
        loadingUserRef.current = false;
        navigate('/user/login');
        return;
      }
      
      setUser(currentUser);
      console.log('✅ User loaded:', currentUser);
    } catch (error) {
      console.error('❌ Error loading user:', error);
      if (axios.isAxiosError(error) && error.response?.status !== 403) {
        authService.logout();
        setUser(null);
      }
    } finally {
      console.log('🔍 Setting loading false after load');
      setLoading(false);
      setInitialized(true);
      loadingUserRef.current = false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔍 Login - setting loading true');
      
      // ✅ التحقق من وضع الصيانة
      const isMaintenance = await settingsService.isMaintenanceMode();
      if (isMaintenance) {
        toast.error('المنصة تحت الصيانة حالياً. يرجى المحاولة لاحقاً');
        setLoading(false);
        throw new Error('Maintenance mode');
      }
      
      // تنظيف أي بيانات قديمة قبل تسجيل الدخول
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      const response = await authService.login({ email, password });
      
      // ✅ التحقق من تفعيل البريد الإلكتروني
      const requireEmailVerification = await settingsService.requireEmailVerification();
      if (requireEmailVerification && response.user?.isEmailVerified === false) {
        toast.error('يرجى تفعيل حسابك عبر البريد الإلكتروني أولاً');
        setLoading(false);
        throw new Error('Email not verified');
      }
      
      if (response.user && !response.user.role) {
        response.user.role = 'user';
      }
      
      setUser(response.user);
      console.log('✅ Login - user set:', response.user);
      
      const redirectTo = localStorage.getItem('redirectAfterLogin');
      
      if (redirectTo) {
        console.log('🔍 Redirecting to saved path:', redirectTo);
        localStorage.removeItem('redirectAfterLogin');
        setLoading(false);
        navigate(redirectTo, { replace: true });
      } else if (response.user.role === 'super_admin') {
        console.log('🔍 Redirecting to /admin');
        setLoading(false);
        navigate('/admin', { replace: true });
      } else if (response.user.role === 'owner') {
        if (response.user.restaurantId) {
          console.log('🔍 Redirecting to restaurant dashboard');
          setLoading(false);
          navigate('/dashboard', { replace: true });
        } else if (response.user.storeId) {
          console.log('🔍 Redirecting to store dashboard');
          setLoading(false);
          navigate('/dashboard', { replace: true });
        } else {
          console.log('🔍 Redirecting to /');
          setLoading(false);
          navigate('/', { replace: true });
        }
      } else if (response.user.role === 'delivery_driver') {
        console.log('🔍 Redirecting to /driver/dashboard');
        setLoading(false);
        navigate('/driver/dashboard', { replace: true });
      } else {
        console.log('🔍 Redirecting to /');
        setLoading(false);
        navigate('/', { replace: true });
      }
      
      toast.success('✅ تم تسجيل الدخول بنجاح');
      return response;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setLoading(false);
      if (error.message !== 'Maintenance mode' && error.message !== 'Email not verified') {
        toast.error(error.response?.data?.error || 'فشل تسجيل الدخول');
      }
      throw error;
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    restaurantName?: string;
  }) => {
    try {
      setLoading(true);
      
      // ✅ التحقق من وضع الصيانة
      const isMaintenance = await settingsService.isMaintenanceMode();
      if (isMaintenance) {
        toast.error('المنصة تحت الصيانة حالياً. يرجى المحاولة لاحقاً');
        setLoading(false);
        throw new Error('Maintenance mode');
      }
      
      // ✅ التحقق من السماح بالتسجيل
      const isRegistrationAllowed = await settingsService.isRegistrationAllowed();
      if (!isRegistrationAllowed) {
        toast.error('التسجيل مغلق حالياً. يرجى المحاولة لاحقاً');
        setLoading(false);
        throw new Error('Registration closed');
      }
      
      const response = await authService.register(data);
      
      if (response.user && !response.user.role) {
        response.user.role = 'user';
      }
      
      setUser(response.user);
      
      // ✅ رسالة مختلفة إذا كان التفعيل مطلوباً
      const requireEmailVerification = await settingsService.requireEmailVerification();
      if (requireEmailVerification) {
        toast.success('تم إنشاء الحساب. يرجى تفعيل بريدك الإلكتروني');
      } else {
        toast.success('✅ تم إنشاء الحساب بنجاح');
      }
      
      const redirectTo = localStorage.getItem('redirectAfterLogin');
      
      if (redirectTo) {
        console.log('🔍 Redirecting to saved path:', redirectTo);
        localStorage.removeItem('redirectAfterLogin');
        setLoading(false);
        navigate(redirectTo, { replace: true });
      } else if (response.user.role === 'owner') {
        setLoading(false);
        navigate('/dashboard', { replace: true });
      } else {
        setLoading(false);
        navigate('/', { replace: true });
      }
      
      return response;
    } catch (error: any) {
      setLoading(false);
      if (error.message !== 'Maintenance mode' && error.message !== 'Registration closed') {
        toast.error(error.response?.data?.error || 'فشل إنشاء الحساب');
      }
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setLoading(false);
    setInitialized(true);
    navigate('/');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  // تحديد نوع المستخدم
  const isSuperAdmin = user?.role === 'super_admin';
  const isOwner = user?.role === 'owner';
  const isRestaurantOwner = user?.role === 'owner' && !!user?.restaurantId;
  const isStoreOwner = user?.role === 'owner' && !!user?.storeId;
  const isStaff = user?.role === 'staff';
  const isUser = user?.role === 'user';
  const isDeliveryDriver = user?.role === 'delivery_driver';
  const isAdmin = user?.role === 'super_admin';

  return {
    user,
    loading,
    initialized,
    maintenanceMode,
    settingsLoaded,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin,
    isOwner,
    isRestaurantOwner,
    isStoreOwner,
    isStaff,
    isUser,
    isDeliveryDriver,
    isAdmin,
    role: user?.role,
    restaurantId: user?.restaurantId,
    storeId: user?.storeId,
  };
};