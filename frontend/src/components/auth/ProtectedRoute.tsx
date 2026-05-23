// frontend/src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../common/Loader';

interface ProtectedRouteProps {
  allowedRoles?: Array<'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver'>;
  requiredPermissions?: string[];
  redirectTo?: string;
}

// تعريف الصلاحيات المطلوبة لكل مسار
const pathPermissionsMap: Record<string, string[]> = {
  '/menu': ['viewMenu', 'viewProducts'],
  '/orders': ['viewOrders'],
  '/tables': ['viewTables'],
  '/staff': ['viewStaff', 'updateStaff'],
  '/analytics': ['viewAnalytics'],
  '/settings': ['updateSettings'],
  '/delivery': ['viewDelivery'],
  '/drivers': ['viewDrivers'],
  '/coupons': ['viewCoupons'],
  '/marketing': ['viewMarketing'],
  '/inventory': ['viewInventory'],
  '/qr-codes': ['viewQrCodes'],
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  requiredPermissions = [],
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

  // ✅ دالة للتحقق من صلاحيات المستخدم
  const hasRequiredPermissions = (): boolean => {
    // السوبر أدمن يصل إلى كل شيء
    if (user.role === 'super_admin') return true;
    
    // المالك يصل إلى كل شيء في متجره/مطعمه
    if (user.role === 'owner') return true;
    
    // إذا لم تكن هناك صلاحيات مطلوبة، نسمح بالوصول
    if (requiredPermissions.length === 0) return true;
    
    // الحصول على صلاحيات المستخدم من الـ permissions
    const userPermissions = user.permissions || {};
    
    // التحقق من وجود جميع الصلاحيات المطلوبة
    return requiredPermissions.every(perm => userPermissions[perm] === true);
  };

  // ✅ دالة للتحقق من صلاحيات المسار الحالي
  const hasPathPermissions = (): boolean => {
    // السوبر أدمن والمالك يصلون إلى كل شيء
    if (user.role === 'super_admin' || user.role === 'owner') return true;
    
    // للموظفين فقط
    if (user.role !== 'staff') return false;
    
    // البحث عن الصلاحيات المطلوبة للمسار الحالي
    for (const [pathPattern, permissions] of Object.entries(pathPermissionsMap)) {
      if (location.pathname.startsWith(pathPattern)) {
        const userPermissions = user.permissions || {};
        return permissions.some(perm => userPermissions[perm] === true);
      }
    }
    
    // إذا لم يتم العثور على مسار محدد، نسمح بالوصول (أو نمنع حسب الحاجة)
    return true;
  };

  // ✅ التحقق من الأدوار
  const hasRequiredRole = (): boolean => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  // التحقق من الصلاحيات والأدوار
  const hasRoleAccess = hasRequiredRole();
  const hasPermissionAccess = hasRequiredPermissions();
  const hasPathAccess = hasPathPermissions();

  console.log('🔍 Role check:', hasRoleAccess);
  console.log('🔍 Permission check:', hasPermissionAccess);
  console.log('🔍 Path permission check:', hasPathAccess);

  // إذا كان الدور غير مسموح
  if (!hasRoleAccess) {
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
    if (user.role === 'staff') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // إذا كانت الصلاحيات غير كافية
  if (!hasPermissionAccess || !hasPathAccess) {
    console.log('🔍 Insufficient permissions for path:', location.pathname);
    
    // إعادة التوجيه إلى لوحة التحكم المناسبة حسب الدور
    if (user.role === 'super_admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'owner' || user.role === 'staff') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  console.log('🔍 Access granted');
  return <Outlet />;
};

export default ProtectedRoute;