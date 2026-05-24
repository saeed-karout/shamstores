// frontend/src/components/layout/Sidebar.tsx

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  IoHome,
  IoRestaurant,
  IoFastFood,
  IoReceipt,
  IoQrCode,
  IoPeople,
  IoStatsChart,
  IoSettings,
  IoPricetag,
  IoRocket,
  IoLockClosed,
  IoCar,
  IoNavigate,
  IoStorefront,
  IoLogOut,
  IoTime,
  IoKey,
  IoBagOutline,
  IoMegaphone,
  IoSparkles,
  IoDiamond,
  IoTrendingUp,
  IoCheckmarkCircle,
  IoWarning,
  IoDocumentText,
} from 'react-icons/io5';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const C = {
  bg: '#0D4A3A',
  darkBg: '#082E24',
  accent: '#C8E235',
  text: '#E8F5E9',
  muted: '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B',
  orange: '#FB923C',
  gold: '#FBBF24',
  blue: '#60A5FA',
  accentBg: 'rgba(200,226,53,0.18)',
  redBg: 'rgba(255,107,107,0.12)',
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, isRestaurantOwner, isStoreOwner, isStaff, role, logout } = useAuth();
  const permissions = usePermissions();
  const { currentPlan, loading: planLoading, isPro, hasFeature } = permissions;

  // حساب الميزات المتاحة (للمالكين)
  const hasOnlineOrders = isPro || hasFeature('hasOnlineOrders');
  const hasTableQr = isPro || hasFeature('hasTableQr');
  const hasCoupons = isPro || hasFeature('hasCoupons');
  const hasAnalytics = isPro || hasFeature('hasAnalytics');
  const hasDelivery = isPro || hasFeature('hasDelivery');
  const hasMarketing = isPro || hasFeature('hasMarketing');
  const hasInventory = isPro || hasFeature('hasInventory');
  const hasStaff = isPro || permissions.getMaxStaff() > 0;

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate('/login');
  };

  const getDaysRemaining = () => {
    if (!currentPlan?.expiresAt) return null;
    const end = new Date(currentPlan.expiresAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isPlatformStaff = isStaff && !user?.restaurantId && !user?.storeId;

  const getLockTooltip = (feature: string, requiredPlan?: string): string => {
    const featureNames: Record<string, string> = {
      onlineOrders: 'طلبات أونلاين',
      tableQr: 'رموز QR للطاولات',
      coupons: 'كوبونات الخصم',
      analytics: 'تحليلات متقدمة',
      delivery: 'خدمة التوصيل',
      marketing: 'التسويق',
      inventory: 'إدارة المخزون',
      staff: 'إدارة الموظفين',
    };
    const planNames: Record<string, string> = {
      basic: 'الخطة الأساسية',
      pro: 'الخطة الاحترافية',
      enterprise: 'الخطة المؤسسية',
    };
    const featureName = featureNames[feature] || feature;
    const planName = requiredPlan ? planNames[requiredPlan] || requiredPlan : 'الخطة المدفوعة';
    return `🔒 هذه الميزة (${featureName}) غير متاحة في خطتك الحالية. قم بترقية اشتراكك إلى ${planName} للاستفادة منها.`;
  };

  // ==================== قائمة السوبر أدمن ====================
  const getAdminMenuItems = () => {
    return [
      { path: '/admin', icon: IoHome, label: 'الرئيسية' },
      { path: '/admin/restaurants', icon: IoRestaurant, label: 'المطاعم' },
      { path: '/admin/stores', icon: IoStorefront, label: 'المتاجر' },
      { path: '/admin/features', icon: IoRocket, label: 'الميزات', badge: 'جديد' },
      { path: '/admin/platform-settings', icon: IoSettings, label: 'إعدادات المنصة', badge: 'جديد' },
      { path: '/admin/subscriptions', icon: IoDiamond, label: 'الاشتراكات', badge: 'جديد' },
      { path: '/admin/users', icon: IoPeople, label: 'المستخدمين' },
      { path: '/admin/staff', icon: IoKey, label: 'موظفي المنصة' },
      { path: '/admin/orders', icon: IoReceipt, label: 'الطلبات' },
      { path: '/admin/drivers', icon: IoCar, label: 'السائقين' },
      { path: '/admin/plans', icon: IoRocket, label: 'الخطط والاشتراكات' },
      { path: '/admin/qr-codes', icon: IoQrCode, label: 'رموز QR' },
      { path: '/admin/advertisements', icon: IoMegaphone, label: 'الإعلانات' },
    ];
  };

  // ==================== قائمة موظف المنصة ====================
  const getPlatformStaffMenuItems = () => {
    const sp = user?.permissions || {};
    const items: any[] = [{ path: '/admin', icon: IoHome, label: 'الرئيسية' }];
    
    items.push({ path: sp.canManageRestaurants ? '/admin/restaurants' : '#', icon: IoRestaurant, label: 'المطاعم', locked: !sp.canManageRestaurants });
    items.push({ path: sp.canManageStores ? '/admin/stores' : '#', icon: IoStorefront, label: 'المتاجر', locked: !sp.canManageStores });
    items.push({ path: sp.canManageUsers ? '/admin/users' : '#', icon: IoPeople, label: 'المستخدمين', locked: !sp.canManageUsers });
    items.push({ path: sp.canManageDrivers ? '/admin/drivers' : '#', icon: IoCar, label: 'السائقين', locked: !sp.canManageDrivers });
    items.push({ path: sp.canManagePlans ? '/admin/plans' : '#', icon: IoRocket, label: 'الخطط', locked: !sp.canManagePlans });
    items.push({ path: sp.canManageSettings ? '/admin/platform-settings' : '#', icon: IoSettings, label: 'إعدادات المنصة', locked: !sp.canManageSettings });
    items.push({ path: sp.canViewReports ? '/admin/reports' : '#', icon: IoDocumentText, label: 'التقارير', locked: !sp.canViewReports });
    items.push({ path: '/admin/orders', icon: IoReceipt, label: 'الطلبات' });
    items.push({ path: '/admin/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    items.push({ path: '/admin/advertisements', icon: IoMegaphone, label: 'الإعلانات' });
    
    return items;  // ✅ return مرة واحدة فقط في النهاية
  };

  // ==================== قائمة مالك المطعم ====================
  const getRestaurantOwnerMenuItems = () => {
    return [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/menu', icon: IoFastFood, label: 'القائمة' },
      { path: hasOnlineOrders ? '/orders' : '/plans', icon: IoReceipt, label: 'الطلبات', locked: !hasOnlineOrders, tooltip: getLockTooltip('onlineOrders', 'basic') },
      { path: hasTableQr ? '/tables' : '/plans', icon: IoRestaurant, label: 'الطاولات', locked: !hasTableQr, tooltip: getLockTooltip('tableQr', 'basic') },
      { path: hasTableQr ? '/qr-codes' : '/plans', icon: IoQrCode, label: 'رموز QR', locked: !hasTableQr, tooltip: getLockTooltip('tableQr', 'basic') },
      { path: hasCoupons ? '/coupons' : '/plans', icon: IoPricetag, label: 'الكوبونات', locked: !hasCoupons, tooltip: getLockTooltip('coupons', 'basic') },
      { path: hasStaff ? '/staff' : '/plans', icon: IoPeople, label: 'موظفي المطعم', locked: !hasStaff, tooltip: getLockTooltip('staff', 'basic') },
      { path: hasAnalytics ? '/analytics' : '/plans', icon: IoStatsChart, label: 'الإحصائيات', locked: !hasAnalytics, tooltip: getLockTooltip('analytics', 'pro') },
      { path: hasDelivery ? '/delivery' : '/plans', icon: IoNavigate, label: 'طلبات التوصيل', locked: !hasDelivery, tooltip: getLockTooltip('delivery', 'pro') },
      { path: hasDelivery ? '/drivers' : '/plans', icon: IoCar, label: 'السائقين', locked: !hasDelivery, tooltip: getLockTooltip('delivery', 'pro') },
      { path: hasMarketing ? '/marketing' : '/plans', icon: IoMegaphone, label: 'التسويق', badge: hasMarketing ? 'جديد' : undefined, locked: !hasMarketing, tooltip: getLockTooltip('marketing', 'pro') },
      { path: '/plans', icon: IoRocket, label: 'خطط الأسعار' },
      { path: '/settings', icon: IoSettings, label: 'الإعدادات' },
    ];
  };

  // ==================== قائمة مالك المتجر ====================
  const getStoreOwnerMenuItems = () => {
    return [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/store/products', icon: IoBagOutline, label: 'المنتجات' },
      { path: hasInventory ? '/store/inventory' : '/store/plans', icon: IoStatsChart, label: 'المخزون', locked: !hasInventory, tooltip: getLockTooltip('inventory', 'basic') },
      { path: hasOnlineOrders ? '/store/orders' : '/store/plans', icon: IoReceipt, label: 'الطلبات', locked: !hasOnlineOrders, tooltip: getLockTooltip('onlineOrders', 'basic') },
      { path: hasCoupons ? '/store/coupons' : '/store/plans', icon: IoPricetag, label: 'الكوبونات', locked: !hasCoupons, tooltip: getLockTooltip('coupons', 'basic') },
      { path: hasStaff ? '/store/staff' : '/store/plans', icon: IoPeople, label: 'موظفي المتجر', locked: !hasStaff, tooltip: getLockTooltip('staff', 'basic') },
      { path: hasAnalytics ? '/store/analytics' : '/store/plans', icon: IoStatsChart, label: 'الإحصائيات', locked: !hasAnalytics, tooltip: getLockTooltip('analytics', 'pro') },
      { path: hasOnlineOrders ? '/store/delivery' : '/store/plans', icon: IoNavigate, label: 'طلبات التوصيل', locked: !hasOnlineOrders, tooltip: getLockTooltip('onlineOrders', 'basic') },
      { path: hasOnlineOrders ? '/store/drivers' : '/store/plans', icon: IoCar, label: 'السائقين', locked: !hasOnlineOrders, tooltip: getLockTooltip('onlineOrders', 'basic') },
      { path: hasTableQr ? '/store/qr-codes' : '/store/plans', icon: IoQrCode, label: 'رموز QR', locked: !hasTableQr, tooltip: getLockTooltip('tableQr', 'basic') },
      { path: hasMarketing ? '/store/marketing' : '/store/plans', icon: IoMegaphone, label: 'التسويق', badge: hasMarketing ? 'جديد' : undefined, locked: !hasMarketing, tooltip: getLockTooltip('marketing', 'pro') },
      { path: '/store/plans', icon: IoRocket, label: 'خطط الأسعار' },
      { path: '/store/settings', icon: IoSettings, label: 'الإعدادات' },
    ];
  };

  // ==================== قائمة موظف مطعم/متجر ====================
  const getStaffMenuItems = () => {
    return [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: permissions.canViewMenu ? '/menu' : '/plans', icon: IoFastFood, label: 'القائمة', locked: !permissions.canViewMenu },
      { path: permissions.canViewOrders ? '/orders' : '/plans', icon: IoReceipt, label: 'الطلبات', locked: !permissions.canViewOrders },
      { path: permissions.canViewTables ? '/tables' : '/plans', icon: IoRestaurant, label: 'الطاولات', locked: !permissions.canViewTables },
      { path: permissions.canViewDelivery ? '/delivery' : '/plans', icon: IoNavigate, label: 'طلبات التوصيل', locked: !permissions.canViewDelivery },
    ];
  };

  // تحديد القائمة حسب الدور
  const getMenuItems = () => {
    if (isSuperAdmin) return getAdminMenuItems();
    if (isRestaurantOwner) return getRestaurantOwnerMenuItems();
    if (isStoreOwner) return getStoreOwnerMenuItems();
    if (isPlatformStaff) return getPlatformStaffMenuItems();
    if (isStaff) return getStaffMenuItems();
    return [];
  };

  const menuItems = getMenuItems();

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'مدير المنصة';
    if (isRestaurantOwner) return 'مالك مطعم';
    if (isStoreOwner) return 'مالك متجر';
    if (isPlatformStaff) return 'موظف منصة';
    if (role === 'staff') return 'موظف';
    if (role === 'delivery_driver') return 'مندوب توصيل';
    return 'عميل';
  };

  const getPlanDisplay = () => {
    if (planLoading) return { name: 'جاري التحميل...', icon: null, color: C.muted };
    if (!currentPlan) return { name: 'لا توجد خطة', icon: null, color: C.muted };
    const plans: Record<string, any> = {
      free: { name: 'المجانية', icon: <IoTime size={12} />, color: C.muted },
      basic: { name: 'الأساسية', icon: <IoSparkles size={12} />, color: C.blue },
      pro: { name: 'الاحترافية', icon: <IoDiamond size={12} />, color: C.accent },
      enterprise: { name: 'المؤسسية', icon: <IoTrendingUp size={12} />, color: C.gold },
    };
    return plans[currentPlan.name] || { name: currentPlan.name, icon: null, color: C.muted };
  };

  const planDisplay = getPlanDisplay();
  const sidebarTransform = isOpen ? 'translateX(0)' : 'translateX(100%)';

  return (
    <>
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />}
      <aside style={{
        position: 'fixed', top: 0, right: 0, width: 280, height: '100vh', background: C.bg,
        borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto',
        zIndex: 50, transform: sidebarTransform, transition: 'transform 0.3s ease-in-out', direction: 'rtl',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: C.darkBg, fontWeight: 900, fontSize: 20 }}>S</span>
          </div>
          <div>
            <div style={{ color: C.accent, fontWeight: 700, fontSize: 15 }}>SHAM STORES</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{isStoreOwner ? 'نظام إدارة المتاجر' : 'نظام إدارة المطاعم'}</div>
          </div>
        </div>

        {/* User info */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(200,226,53,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>{(user?.name || 'Z').charAt(0).toUpperCase()}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'زائر'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(200,226,53,0.18)', color: C.accent, fontWeight: 600 }}>{getRoleLabel()}</span>
                {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !planLoading && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${planDisplay.color}20`, color: planDisplay.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {planDisplay.icon}{planDisplay.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          {(isRestaurantOwner || isStoreOwner) && daysRemaining !== null && daysRemaining <= 14 && (
            <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8, background: isExpiringSoon ? `${C.orange}15` : `${C.accent}10`, border: `1px solid ${isExpiringSoon ? C.orange : C.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoWarning size={14} color={isExpiringSoon ? C.orange : C.accent} />
                <span style={{ fontSize: 11, color: C.text }}>{isExpiringSoon ? `⚠️ ينتهي اشتراكك بعد ${daysRemaining} أيام` : `ينتهي اشتراكك بعد ${daysRemaining} يوم`}</span>
              </div>
              <NavLink to={isStoreOwner ? '/store/plans' : '/plans'} style={{ display: 'block', marginTop: 6, fontSize: 11, color: isExpiringSoon ? C.orange : C.accent, textDecoration: 'underline' }}>🔄 جدد اشتراكك الآن</NavLink>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {menuItems.map((item) => {
            const locked = item.locked === true;
            const targetPath = locked && item.path !== '#' ? (isStoreOwner ? '/store/plans' : '/plans') : item.path;
            const isClickable = !locked || (locked && targetPath !== '#');
            return (
              <NavLink
                key={item.path}
                to={isClickable ? targetPath : '#'}
                onClick={(e) => {
                  if (!isClickable) e.preventDefault();
                  onClose();
                }}
                title={item.tooltip || ''}
              >
                {({ isActive }) => (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 8,
                    marginBottom: 2,
                    textDecoration: 'none',
                    background: !locked && isActive ? C.accentBg : 'transparent',
                    color: locked ? C.muted : (isActive ? C.accent : C.muted),
                    borderRight: `3px solid ${!locked && isActive ? C.accent : 'transparent'}`,
                    opacity: locked ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box',
                    cursor: isClickable ? 'pointer' : 'not-allowed',
                  }}>
                    <item.icon size={18} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isActive && !locked ? 600 : 400 }}>
                      {item.label}
                    </span>
                    {item.badge === 'جديد' && !locked && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: C.accent, color: C.darkBg, fontWeight: 700, flexShrink: 0 }}>جديد</span>
                    )}
                    {locked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <IoLockClosed size={12} style={{ color: C.muted }} />
                        <span style={{ fontSize: 9, color: C.accent }}>مقفل</span>
                      </div>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Upgrade Banner */}
        {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !planLoading && (
          <div style={{ padding: '12px', flexShrink: 0 }}>
            {!isPro ? (
              <NavLink to={isStoreOwner ? '/store/plans' : '/plans'} onClick={onClose} style={{ display: 'block', background: `linear-gradient(135deg, ${C.accent}15, ${C.accent}05)`, border: `1px solid ${C.accent}`, borderRadius: 12, padding: '14px', textDecoration: 'none', transition: 'transform 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><IoDiamond size={20} color={C.accent} /><span style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>🚀 فعّل الميزات المتقدمة</span></div>
                <p style={{ color: C.muted, fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>{isRestaurantOwner ? 'احصل على طلبات أونلاين، رموز QR، تحليلات متقدمة والمزيد' : 'احصل على إدارة المخزون، كوبونات، طلبات أونلاين والمزيد'}</p>
                <div style={{ background: C.accent, color: C.darkBg, fontWeight: 700, fontSize: 13, padding: '8px 0', borderRadius: 8, textAlign: 'center' }}>✨ ترقية الخطة الآن</div>
              </NavLink>
            ) : (
              <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}`, borderRadius: 12, padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><IoCheckmarkCircle size={16} color={C.gold} /><span style={{ color: C.gold, fontWeight: 600, fontSize: 12 }}>أنت في الخطة الاحترافية</span></div>
                <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.4 }}>أنت تستمتع بجميع الميزات المتقدمة.</p>
                {daysRemaining !== null && daysRemaining <= 30 && <NavLink to={isStoreOwner ? '/store/plans' : '/plans'} style={{ display: 'block', marginTop: 10, fontSize: 11, color: C.accent, textAlign: 'center' }}>🔄 تجديد الاشتراك</NavLink>}
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px', flexShrink: 0 }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', background: C.redBg, color: C.red, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><IoLogOut size={17} /><span>تسجيل خروج</span></button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;