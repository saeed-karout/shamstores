// frontend/src/components/layout/Sidebar.tsx — Sham Stores dark-green theme

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
  IoPerson,
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
  IoCashOutline,
  IoCardOutline,
  IoPricetags,
  IoCartOutline,
  IoTabletLandscape,
} from 'react-icons/io5';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── design tokens ──────────────────────────────────────────────
const C = {
  bg:      '#0D4A3A',
  darkBg:  '#082E24',
  accent:  '#C8E235',
  text:    '#E8F5E9',
  muted:   '#9DC4AC',
  border:  'rgba(200,226,53,0.15)',
  red:     '#FF6B6B',
  orange:  '#FB923C',
  gold:    '#FBBF24',
  blue:    '#60A5FA',
  purple:  '#A78BFA',
  accentBg:'rgba(200,226,53,0.18)',
  redBg:   'rgba(255,107,107,0.12)',
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    user,
    isSuperAdmin,
    isOwner,
    isRestaurantOwner,
    isStoreOwner,
    isStaff,
    role,
    logout,
  } = useAuth();
  const permissions = usePermissions();
  const { currentPlan, loading: planLoading, isPro, hasFeature } = permissions;

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate('/login');
  };

  // حساب أيام الاشتراك المتبقية
  const getDaysRemaining = () => {
    if (!currentPlan?.expiresAt) return null;
    const end = new Date(currentPlan.expiresAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  // التحقق مما إذا كان المستخدم موظف منصة (وليس موظف مطعم/متجر)
  const isPlatformStaff = isStaff && !user?.restaurantId && !user?.storeId;

  // دالة للحصول على نص تلميح للعناصر المقفولة
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
    const items: { path: string; icon: React.ElementType; label: string; badge?: string }[] = [
      { path: '/admin',                  icon: IoHome,        label: 'الرئيسية' },
      { path: '/admin/restaurants',      icon: IoRestaurant,  label: 'المطاعم' },
      { path: '/admin/stores',           icon: IoStorefront,  label: 'المتاجر' },
      { path: '/admin/features',         icon: IoRocket,      label: 'الميزات',             badge: 'جديد' },
      { path: '/admin/platform-settings',icon: IoSettings,    label: 'إعدادات المنصة',      badge: 'جديد' },
      { path: '/admin/subscriptions',    icon: IoDiamond,     label: 'الاشتراكات',          badge: 'جديد' },
      { path: '/admin/users',            icon: IoPeople,      label: 'المستخدمين' },
      { path: '/admin/staff',            icon: IoKey,         label: 'موظفي المنصة' },
      { path: '/admin/orders',           icon: IoReceipt,     label: 'الطلبات' },
      { path: '/admin/drivers',          icon: IoCar,         label: 'السائقين' },
      { path: '/admin/plans',            icon: IoRocket,      label: 'الخطط والاشتراكات' },
      { path: '/admin/qr-codes',         icon: IoQrCode,      label: 'رموز QR' },
      { path: '/admin/advertisements',   icon: IoMegaphone,   label: 'الإعلانات' },
    ];
    return items;
  };

  // ==================== قائمة موظف المنصة (Platform Staff) ====================
  const getPlatformStaffMenuItems = () => {
    const staffPermissions = user?.permissions || {};
    const items: { path: string; icon: React.ElementType; label: string; badge?: string; locked?: boolean }[] = [
      { path: '/admin', icon: IoHome, label: 'الرئيسية' },
    ];

    // المطاعم
    items.push({
      path: staffPermissions.canManageRestaurants ? '/admin/restaurants' : '#',
      icon: IoRestaurant,
      label: 'المطاعم',
      locked: !staffPermissions.canManageRestaurants
    });
    
    // المتاجر
    items.push({
      path: staffPermissions.canManageStores ? '/admin/stores' : '#',
      icon: IoStorefront,
      label: 'المتاجر',
      locked: !staffPermissions.canManageStores
    });
    
    // المستخدمين
    items.push({
      path: staffPermissions.canManageUsers ? '/admin/users' : '#',
      icon: IoPeople,
      label: 'المستخدمين',
      locked: !staffPermissions.canManageUsers
    });
    
    // السائقين
    items.push({
      path: staffPermissions.canManageDrivers ? '/admin/drivers' : '#',
      icon: IoCar,
      label: 'السائقين',
      locked: !staffPermissions.canManageDrivers
    });
    
    // الخطط
    items.push({
      path: staffPermissions.canManagePlans ? '/admin/plans' : '#',
      icon: IoRocket,
      label: 'الخطط',
      locked: !staffPermissions.canManagePlans
    });
    
    // إعدادات المنصة
    items.push({
      path: staffPermissions.canManageSettings ? '/admin/platform-settings' : '#',
      icon: IoSettings,
      label: 'إعدادات المنصة',
      locked: !staffPermissions.canManageSettings
    });
    
    // التقارير
    items.push({
      path: staffPermissions.canViewReports ? '/admin/reports' : '#',
      icon: IoDocumentText,
      label: 'التقارير',
      locked: !staffPermissions.canViewReports
    });

    // عناصر إضافية متاحة للجميع
    items.push({ path: '/admin/orders', icon: IoReceipt, label: 'الطلبات' });
    items.push({ path: '/admin/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    items.push({ path: '/admin/advertisements', icon: IoMegaphone, label: 'الإعلانات' });

    return items;
  };

  // ==================== قائمة مالك المطعم ====================
  const getRestaurantOwnerMenuItems = () => {
   const hasOnlineOrders = permissions.hasOnlineOrders;
const hasTableQr = permissions.hasTableQr;
const hasCoupons = permissions.hasCoupons;
const hasAnalytics = permissions.hasAnalytics;
const hasDelivery = permissions.hasDelivery;
const hasMarketing = permissions.hasMarketing;
const hasStaff = permissions.hasStaffManagement;
  

    const items: { path: string; icon: React.ElementType; label: string; badge?: string; locked?: boolean; tooltip?: string }[] = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/menu', icon: IoFastFood, label: 'القائمة' },
    ];

    // الطلبات
    items.push({
      path: hasOnlineOrders ? '/orders' : '/plans',
      icon: IoReceipt,
      label: 'الطلبات',
      locked: !hasOnlineOrders,
      tooltip: getLockTooltip('onlineOrders', 'basic')
    });

    // الطاولات
    items.push({
      path: hasTableQr ? '/tables' : '/plans',
      icon: IoRestaurant,
      label: 'الطاولات',
      locked: !hasTableQr,
      tooltip: getLockTooltip('tableQr', 'basic')
    });

    // رموز QR
    items.push({
      path: hasTableQr ? '/qr-codes' : '/plans',
      icon: IoQrCode,
      label: 'رموز QR',
      locked: !hasTableQr,
      tooltip: getLockTooltip('tableQr', 'basic')
    });

    // الكوبونات
    items.push({
      path: hasCoupons ? '/coupons' : '/plans',
      icon: IoPricetag,
      label: 'الكوبونات',
      locked: !hasCoupons,
      tooltip: getLockTooltip('coupons', 'basic')
    });

    // الموظفين
    items.push({
      path: hasStaff ? '/staff' : '/plans',
      icon: IoPeople,
      label: 'موظفي المطعم',
      locked: !hasStaff,
      tooltip: getLockTooltip('staff', 'basic')
    });

    // الإحصائيات
    items.push({
      path: hasAnalytics ? '/analytics' : '/plans',
      icon: IoStatsChart,
      label: 'الإحصائيات',
      locked: !hasAnalytics,
      tooltip: getLockTooltip('analytics', 'pro')
    });

    // طلبات التوصيل
    items.push({
      path: hasDelivery ? '/delivery' : '/plans',
      icon: IoNavigate,
      label: 'طلبات التوصيل',
      locked: !hasDelivery,
      tooltip: getLockTooltip('delivery', 'pro')
    });

    // السائقين
    items.push({
      path: hasDelivery ? '/drivers' : '/plans',
      icon: IoCar,
      label: 'السائقين',
      locked: !hasDelivery,
      tooltip: getLockTooltip('delivery', 'pro')
    });

    // التسويق
    items.push({
      path: hasMarketing ? '/marketing' : '/plans',
      icon: IoMegaphone,
      label: 'التسويق',
      badge: hasMarketing ? 'جديد' : undefined,
      locked: !hasMarketing,
      tooltip: getLockTooltip('marketing', 'pro')
    });

    items.push({ path: '/plans', icon: IoRocket, label: 'خطط الأسعار' });
    items.push({ path: '/settings', icon: IoSettings, label: 'الإعدادات' });

    return items;
  };

  // ==================== قائمة مالك المتجر ====================
  const getStoreOwnerMenuItems = () => {
    const hasInventory = hasFeature('hasInventory') || isPro;
    const hasOnlineOrders = hasFeature('hasOnlineOrders') || isPro;
    const hasCoupons = hasFeature('hasCoupons') || isPro;
    const hasAnalytics = hasFeature('hasAnalytics') || isPro;
    const hasTableQr = hasFeature('hasTableQr') || isPro;
    const hasStaff = permissions.getMaxStaff() > 0 || isPro;
    const hasMarketing = hasFeature('hasMarketing') || isPro;

    const items: { path: string; icon: React.ElementType; label: string; badge?: string; locked?: boolean; tooltip?: string }[] = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/store/products', icon: IoBagOutline, label: 'المنتجات' },
    ];

    // المخزون
    items.push({
      path: hasInventory ? '/store/inventory' : '/store/plans',
      icon: IoStatsChart,
      label: 'المخزون',
      locked: !hasInventory,
      tooltip: getLockTooltip('inventory', 'basic')
    });

    // الطلبات
    items.push({
      path: hasOnlineOrders ? '/store/orders' : '/store/plans',
      icon: IoReceipt,
      label: 'الطلبات',
      locked: !hasOnlineOrders,
      tooltip: getLockTooltip('onlineOrders', 'basic')
    });

    // الكوبونات
    items.push({
      path: hasCoupons ? '/store/coupons' : '/store/plans',
      icon: IoPricetag,
      label: 'الكوبونات',
      locked: !hasCoupons,
      tooltip: getLockTooltip('coupons', 'basic')
    });

    // الموظفين
    items.push({
      path: hasStaff ? '/store/staff' : '/store/plans',
      icon: IoPeople,
      label: 'موظفي المتجر',
      locked: !hasStaff,
      tooltip: getLockTooltip('staff', 'basic')
    });

    // الإحصائيات
    items.push({
      path: hasAnalytics ? '/store/analytics' : '/store/plans',
      icon: IoStatsChart,
      label: 'الإحصائيات',
      locked: !hasAnalytics,
      tooltip: getLockTooltip('analytics', 'pro')
    });

    // طلبات التوصيل
    items.push({
      path: hasOnlineOrders ? '/store/delivery' : '/store/plans',
      icon: IoNavigate,
      label: 'طلبات التوصيل',
      locked: !hasOnlineOrders,
      tooltip: getLockTooltip('onlineOrders', 'basic')
    });

    // السائقين
    items.push({
      path: hasOnlineOrders ? '/store/drivers' : '/store/plans',
      icon: IoCar,
      label: 'السائقين',
      locked: !hasOnlineOrders,
      tooltip: getLockTooltip('onlineOrders', 'basic')
    });

    // رموز QR
    items.push({
      path: hasTableQr ? '/store/qr-codes' : '/store/plans',
      icon: IoQrCode,
      label: 'رموز QR',
      locked: !hasTableQr,
      tooltip: getLockTooltip('tableQr', 'basic')
    });

    // التسويق
    items.push({
      path: hasMarketing ? '/store/marketing' : '/store/plans',
      icon: IoMegaphone,
      label: 'التسويق',
      badge: hasMarketing ? 'جديد' : undefined,
      locked: !hasMarketing,
      tooltip: getLockTooltip('marketing', 'pro')
    });

    items.push({ path: '/store/plans', icon: IoRocket, label: 'خطط الأسعار' });
    items.push({ path: '/store/settings', icon: IoSettings, label: 'الإعدادات' });

    return items;
  };

  // ==================== قائمة موظف مطعم/متجر عادي ====================
 
const getStaffMenuItems = () => {
  const items: { path: string; icon: React.ElementType; label: string; locked?: boolean; tooltip?: string }[] = [
    { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
  ];

  // ✅ استخدام مسار فريد لكل عنصر
  items.push({
    path: permissions.canViewMenu ? '/menu' : '/plans',  // مسار فريد
    icon: IoFastFood,
    label: 'القائمة',
    locked: !permissions.canViewMenu,
    tooltip: !permissions.canViewMenu ? '⛔ غير متاح - لا تملك صلاحية عرض القائمة' : ''
  });

  items.push({
    path: permissions.canViewOrders ? '/orders' : '/plans',  // مسار فريد
    icon: IoReceipt,
    label: 'الطلبات',
    locked: !permissions.canViewOrders,
    tooltip: !permissions.canViewOrders ? '⛔ غير متاح - لا تملك صلاحية عرض الطلبات' : ''
  });

  items.push({
    path: permissions.canViewTables ? '/tables' : '/plans',  // مسار فريد
    icon: IoRestaurant,
    label: 'الطاولات',
    locked: !permissions.canViewTables,
    tooltip: !permissions.canViewTables ? '⛔ غير متاح - لا تملك صلاحية عرض الطاولات' : ''
  });

  items.push({
    path: permissions.canViewDelivery ? '/delivery' : '/plans',  // مسار فريد
    icon: IoNavigate,
    label: 'طلبات التوصيل',
    locked: !permissions.canViewDelivery,
    tooltip: !permissions.canViewDelivery ? '⛔ غير متاح - لا تملك صلاحية إدارة التوصيل' : ''
  });

  return items;
};

  // تحديد القائمة حسب الدور
  const getMenuItems = () => {
    if (isSuperAdmin) return getAdminMenuItems();
    if (isRestaurantOwner) return getRestaurantOwnerMenuItems();
    if (isStoreOwner) return getStoreOwnerMenuItems();
    if (isPlatformStaff) return getPlatformStaffMenuItems();
    if (isStaff) return getStaffMenuItems();
    if (role === 'delivery_driver') return [];
    return [];
  };

  const menuItems = getMenuItems();

  // ── role label ─────────────────────────────────────────────────
  const getRoleLabel = () => {
    if (isSuperAdmin) return 'مدير المنصة';
    if (isRestaurantOwner) return 'مالك مطعم';
    if (isStoreOwner) return 'مالك متجر';
    if (isPlatformStaff) return 'موظف منصة';
    if (role === 'staff') return 'موظف';
    if (role === 'delivery_driver') return 'مندوب توصيل';
    return 'عميل';
  };

  // ── plan name with emoji (للمالكين فقط) ──────────────────────
  const getPlanDisplay = () => {
    if (planLoading) return { name: 'جاري التحميل...', icon: null, color: C.muted };
    if (!currentPlan) return { name: 'لا توجد خطة', icon: null, color: C.muted };
    
    const plans: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
      free:       { name: 'المجانية', icon: <IoTime size={12} />, color: C.muted },
      basic:      { name: 'الأساسية', icon: <IoSparkles size={12} />, color: C.blue },
      pro:        { name: 'الاحترافية', icon: <IoDiamond size={12} />, color: C.accent },
      enterprise: { name: 'المؤسسية', icon: <IoTrendingUp size={12} />, color: C.gold },
    };
    return plans[currentPlan.name] || { name: currentPlan.name, icon: null, color: C.muted };
  };

  const planDisplay = getPlanDisplay();
  const sidebarTransform = isOpen ? 'translateX(0)' : 'translateX(100%)';

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 280,
          height: '100vh',
          background: C.bg,
          borderLeft: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          zIndex: 50,
          transform: sidebarTransform,
          transition: 'transform 0.3s ease-in-out',
          direction: 'rtl',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            padding: '20px 16px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: C.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: C.darkBg, fontWeight: 900, fontSize: 20, lineHeight: 1 }}>S</span>
          </div>
          <div>
            <div style={{ color: C.accent, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
              SHAM STORES
            </div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
              {isStoreOwner ? 'نظام إدارة المتاجر' : 'نظام إدارة المطاعم'}
            </div>
          </div>
        </div>

        {/* User info */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(200,226,53,0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: C.accent, fontWeight: 700, fontSize: 16 }}>
                {(user?.name || 'Z').charAt(0).toUpperCase()}
              </span>
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: C.text,
                  fontWeight: 700,
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name || 'زائر'}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'rgba(200,226,53,0.18)',
                    color: C.accent,
                    fontWeight: 600,
                  }}
                >
                  {getRoleLabel()}
                </span>

                {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !planLoading && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: `${planDisplay.color}20`,
                      color: planDisplay.color,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {planDisplay.icon}
                    {planDisplay.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* تحذير انتهاء الاشتراك (للمالكين فقط) */}
          {(isRestaurantOwner || isStoreOwner) && daysRemaining !== null && daysRemaining <= 14 && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 10px',
                borderRadius: 8,
                background: isExpiringSoon ? `${C.orange}15` : `${C.accent}10`,
                border: `1px solid ${isExpiringSoon ? C.orange : C.accent}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoWarning size={14} color={isExpiringSoon ? C.orange : C.accent} />
                <span style={{ fontSize: 11, color: C.text }}>
                  {isExpiringSoon 
                    ? `⚠️ ينتهي اشتراكك بعد ${daysRemaining} أيام`
                    : `ينتهي اشتراكك بعد ${daysRemaining} يوم`}
                </span>
              </div>
              <NavLink
                to={isStoreOwner ? '/store/plans' : '/plans'}
                style={{
                  display: 'block',
                  marginTop: 6,
                  fontSize: 11,
                  color: isExpiringSoon ? C.orange : C.accent,
                  textDecoration: 'underline',
                }}
              >
                🔄 جدد اشتراكك الآن
              </NavLink>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: '10px 8px',
            overflowY: 'auto',
          }}
        >
          {menuItems.map((item) => {
            const locked = item.locked === true;
            const targetPath = locked && item.path !== '#' ? (isStoreOwner ? '/store/plans' : '/plans') : item.path;
            const isClickable = !locked || (locked && targetPath !== '#');
            
            return (
              <NavLink
              
                key={item.path}
                to={isClickable ? targetPath : '#'}
                onClick={(e) => {
                  if (!isClickable) {
                    e.preventDefault();
                  }
                  onClose();
                }}
                title={item.tooltip || ''}
                style={({ isActive }) => ({
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
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isActive && !locked ? 600 : 400 }}>
                      {item.label}
                    </span>

                    {item.badge === 'جديد' && !locked && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 20,
                          background: C.accent,
                          color: C.darkBg,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        جديد
                      </span>
                    )}

                    {locked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <IoLockClosed size={12} style={{ color: C.muted }} />
                        <span style={{ fontSize: 9, color: C.accent }}>مقفل</span>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Upgrade banner (للمالكين فقط) */}
        {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !planLoading && (
          <div style={{ padding: '12px', flexShrink: 0 }}>
            {!isPro ? (
              <NavLink
                to={isStoreOwner ? '/store/plans' : '/plans'}
                onClick={onClose}
                style={{
                  display: 'block',
                  background: `linear-gradient(135deg, ${C.accent}15, ${C.accent}05)`,
                  border: `1px solid ${C.accent}`,
                  borderRadius: 12,
                  padding: '14px',
                  textDecoration: 'none',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <IoDiamond size={20} color={C.accent} />
                  <span style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>
                    🚀 فعّل الميزات المتقدمة
                  </span>
                </div>
                <p style={{ color: C.muted, fontSize: 12, marginBottom: 10, lineHeight: 1.4 }}>
                  {isRestaurantOwner 
                    ? 'احصل على طلبات أونلاين، رموز QR، تحليلات متقدمة والمزيد'
                    : 'احصل على إدارة المخزون، كوبونات، طلبات أونلاين والمزيد'}
                </p>
                <div
                  style={{
                    background: C.accent,
                    color: C.darkBg,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '8px 0',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}
                >
                  ✨ ترقية الخطة الآن
                </div>
              </NavLink>
            ) : (
              <div
                style={{
                  background: `${C.gold}10`,
                  border: `1px solid ${C.gold}`,
                  borderRadius: 12,
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <IoCheckmarkCircle size={16} color={C.gold} />
                  <span style={{ color: C.gold, fontWeight: 600, fontSize: 12 }}>
                    أنت في الخطة الاحترافية
                  </span>
                </div>
                <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.4 }}>
                  أنت تستمتع بجميع الميزات المتقدمة. إذا كنت بحاجة لدعم إضافي، تواصل معنا.
                </p>
                {daysRemaining !== null && daysRemaining <= 30 && (
                  <NavLink
                    to={isStoreOwner ? '/store/plans' : '/plans'}
                    style={{
                      display: 'block',
                      marginTop: 10,
                      fontSize: 11,
                      color: C.accent,
                      textAlign: 'center',
                    }}
                  >
                    🔄 تجديد الاشتراك
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: '10px 12px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 0',
              background: C.redBg,
              color: C.red,
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <IoLogOut size={17} />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;