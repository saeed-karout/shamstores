// frontend/src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../common/Loader';
import { staffCanVisit, staffHome } from '../../utils/staffAccess';

type Role = 'super_admin' | 'owner' | 'staff' | 'user' | 'delivery_driver';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

/** بيتُ كلّ دور — حيث يُعاد من دخل مكاناً ليس له. */
export const homeForRole = (user?: { role?: string } | null): string => {
  switch (user?.role) {
    case 'super_admin':
      return '/admin';
    case 'owner':
      return '/dashboard';
    case 'staff':
      return staffHome(user as any);
    case 'delivery_driver':
      return '/driver/dashboard';
    default:
      return '/';
  }
};

/**
 * حارس مسارات اللوحة.
 *
 * **لا استثناء «مسار عام» هنا.** كان الحارس يعامل كلّ مسارٍ ذي مقطعٍ أوّل —
 * `/menu` و`/orders` و`/settings` و`/store/*` و`/finance` وحتى `/profile` —
 * كأنه صفحةٌ عامّة فيمرّره بلا فحص دور ولا صلاحية، إلا ما بدأ بـ `/dashboard`
 * أو `/admin` ونحوها. المسارات العامّة معرَّفةٌ خارج هذا الحارس في `App.tsx`،
 * فكلّ ما يبلغه محميٌّ بلا استثناء.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, redirectTo = '/login' }) => {
  const { user, loading, initialized, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading || !initialized) {
    return <Loader fullScreen variant="dashboard" />;
  }

  if (!user || !isAuthenticated) {
    localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
    return <Navigate to={redirectTo} replace />;
  }

  const home = homeForRole(user);

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as Role)) {
    // لا نُعيده إلى المكان نفسه — تلك حلقةٌ لا تنتهي
    return <Navigate to={home === location.pathname ? '/' : home} replace />;
  }

  // الموظّف — للنشاط أو للمنصّة — يصل إلى شاشاته وحدها، بحسب ما مُنح.
  if (user.role === 'staff' && !staffCanVisit(user, location.pathname)) {
    return <Navigate to={home === location.pathname ? '/profile' : home} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
