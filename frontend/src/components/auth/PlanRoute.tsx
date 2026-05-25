import React from 'react';
import { Navigate } from 'react-router-dom';
import Loader from '../common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

type PlanFeature =
  | 'onlineOrders'
  | 'tableQr'
  | 'coupons'
  | 'analytics'
  | 'marketing'
  | 'inventory'
  | 'staff'
  | 'customDomain';

interface PlanRouteProps {
  feature: PlanFeature;
  redirectTo?: string;
  children: React.ReactElement;
}

const isPaidPlan = (plan: any): boolean => {
  if (!plan) return false;
  return (plan.price || 0) > 0 && plan.name !== 'free' && plan.slug !== 'free';
};

const PlanRoute: React.FC<PlanRouteProps> = ({ feature, redirectTo, children }) => {
  const { user } = useAuth();
  const permissions = usePermissions();

  if (permissions.loading) return <Loader fullScreen />;

  if (user?.role === 'super_admin') return children;

  const plan = permissions.currentPlan;
  const paidPlan = isPaidPlan(plan);
  const fallbackRedirect = redirectTo || (user?.storeId ? '/store/plans' : '/plans');

  const featureAllowed = (): boolean => {
    switch (feature) {
      case 'onlineOrders':
        return permissions.canViewOrders;
      case 'tableQr':
        return permissions.canViewTables;
      case 'coupons':
        return permissions.canViewCoupons;
      case 'analytics':
        return permissions.canViewAnalytics;
      case 'marketing':
        return permissions.canViewMarketing;
      case 'staff':
        return permissions.canViewStaff;
      case 'customDomain':
        return permissions.canUseCustomDomain;
      case 'inventory':
        return plan?.hasInventory === true || paidPlan;
      default:
        return false;
    }
  };

  if (!featureAllowed()) {
    return <Navigate to={fallbackRedirect} replace />;
  }

  return children;
};

export default PlanRoute;
