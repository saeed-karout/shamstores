// components/auth/ProtectedRoute.tsx

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../common/Loader';

interface ProtectedRouteProps {
  allowedRoles?: Array<'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver'>;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  redirectTo = '/user/login' 
}) => {
  const { user, loading, initialized, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log('🔍 ProtectedRoute - Path:', location.pathname);
  console.log('🔍 ProtectedRoute - User:', user);
  console.log('🔍 ProtectedRoute - isAuthenticated:', isAuthenticated);
  console.log('🔍 ProtectedRoute - loading:', loading);
  console.log('🔍 ProtectedRoute - initialized:', initialized);

  // التحقق من أن المسار الحالي هو صفحة عامة
  const isPublicPath = location.pathname.match(/^\/[^/]+(\/|$)/) && 
                      !location.pathname.startsWith('/user/') &&
                      !location.pathname.startsWith('/dashboard') &&
                      !location.pathname.startsWith('/admin') &&
                      !location.pathname.startsWith('/driver/') &&
                      !location.pathname.startsWith('/login') &&
                      !location.pathname.startsWith('/register');

  if (isPublicPath) {
    console.log('🔍 Public path, allowing access');
    return <Outlet />;
  }

  if (loading || !initialized) {
    console.log('🔍 Loading...');
    return <Loader fullScreen />;
  }

  if (!user || !isAuthenticated) {
    console.log('🔍 Not authenticated, redirecting to:', redirectTo);
    localStorage.setItem('redirectAfterLogin', location.pathname);
    return <Navigate to={redirectTo} replace />;
  }

  // التحقق من الصلاحيات
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log('🔍 Role not allowed:', user.role, 'Allowed:', allowedRoles);
    
    // إعادة التوجيه حسب الدور
    if (user.role === 'super_admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'owner') {
      return <Navigate to="/dashboard" replace />;
    }
    if (user.role === 'delivery_driver') {
      return <Navigate to="/driver/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  console.log('🔍 Access granted');
  return <Outlet />;
};

export default ProtectedRoute;