// frontend/src/components/layout/Sidebar.tsx — Sham Stores dark-green theme

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
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
  IoCube,
  IoLogOut,
  IoTime,
  IoCash,
  IoKey,
  IoBagOutline,
  IoGrid,
  IoPricetags,
  IoCart,
  IoStorefrontOutline,
  IoMegaphone,
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
  accentBg:'rgba(200,226,53,0.18)',
  accentFaint: 'rgba(200,226,53,0.12)',
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
  const { plan: currentPlan, loading: planLoading, isPro, hasFeature } = useCurrentPlan();

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate('/login');
  };

  // ==================== قائمة السوبر أدمن ====================
  const getAdminMenuItems = () => {
    return [
      { path: '/admin',                  icon: IoHome,      label: 'الرئيسية' },
      { path: '/admin/restaurants',      icon: IoRestaurant, label: 'المطاعم' },
      { path: '/admin/stores',           icon: IoStorefront, label: 'المتاجر' },
      { path: '/admin/features',         icon: IoRocket,    label: 'الميزات',             badge: 'جديد' },
      { path: '/admin/platform-settings',icon: IoSettings,  label: 'إعدادات المنصة',      badge: 'جديد' },
      { path: '/admin/users',            icon: IoPeople,    label: 'المستخدمين' },
      { path: '/admin/staff',            icon: IoKey,       label: 'موظفي المنصة' },
      { path: '/admin/orders',           icon: IoReceipt,   label: 'الطلبات' },
      { path: '/admin/drivers',          icon: IoCar,       label: 'السائقين' },
      { path: '/admin/plans',            icon: IoRocket,    label: 'الخطط والاشتراكات' },
      { path: '/admin/qr-codes',         icon: IoQrCode,    label: 'رموز QR' },
    ];
  };

  // ==================== قائمة مالك المطعم ====================
  const getRestaurantOwnerMenuItems = () => {
    const items: { path: string; icon: React.ElementType; label: string; badge?: string }[] = [
      { path: '/dashboard', icon: IoHome,    label: 'الرئيسية' },
      { path: '/menu',      icon: IoFastFood, label: 'القائمة' },
    ];

    if (permissions.checkPermission('onlineOrders')) {
      items.push({ path: '/orders', icon: IoReceipt, label: 'الطلبات' });
    }

    if (permissions.checkPermission('tableQr')) {
      items.push({ path: '/tables',   icon: IoRestaurant, label: 'الطاولات' });
      items.push({ path: '/qr-codes', icon: IoQrCode,     label: 'رموز QR' });
    }

    if (permissions.checkPermission('coupons')) {
      items.push({ path: '/coupons', icon: IoPricetag, label: 'الكوبونات' });
    }

    if (permissions.getMaxStaff() > 0) {
      items.push({ path: '/staff', icon: IoPeople, label: 'موظفي المطعم' });
    }

    if (permissions.checkPermission('analytics')) {
      items.push({ path: '/analytics', icon: IoStatsChart, label: 'الإحصائيات' });
    }

    if (permissions.checkPermission('delivery')) {
      items.push({ path: '/delivery', icon: IoNavigate, label: 'طلبات التوصيل' });
      items.push({ path: '/drivers',  icon: IoCar,      label: 'السائقين' });
    }

    if (permissions.checkPermission('marketing')) {
      items.push({ path: '/marketing', icon: IoMegaphone, label: 'التسويق', badge: 'جديد' });
    }

    items.push({ path: '/plans',    icon: IoRocket,   label: 'خطط الأسعار' });
    items.push({ path: '/settings', icon: IoSettings, label: 'الإعدادات' });

    return items;
  };

  // ==================== قائمة مالك المتجر ====================
  const getStoreOwnerMenuItems = () => {
    const items: { path: string; icon: React.ElementType; label: string; badge?: string }[] = [
      { path: '/dashboard',      icon: IoHome,      label: 'الرئيسية' },
      { path: '/store/products', icon: IoBagOutline, label: 'المنتجات' },
    ];

    if (hasFeature('hasInventory') || isPro) {
      items.push({ path: '/store/inventory', icon: IoStatsChart, label: 'المخزون' });
    }

    if (hasFeature('hasOnlineOrders') || isPro) {
      items.push({ path: '/store/orders', icon: IoReceipt, label: 'الطلبات' });
    }

    if (hasFeature('hasCoupons') || isPro) {
      items.push({ path: '/store/coupons', icon: IoPricetag, label: 'الكوبونات' });
    }

    const maxStaff = permissions.getMaxStaff?.() || 0;
    if (maxStaff > 0) {
      items.push({ path: '/store/staff', icon: IoPeople, label: 'موظفي المتجر' });
    }

    if (hasFeature('hasAnalytics') || isPro) {
      items.push({ path: '/store/analytics', icon: IoStatsChart, label: 'الإحصائيات' });
    }

    if (hasFeature('hasOnlineOrders') || isPro) {
      items.push({ path: '/store/delivery', icon: IoNavigate, label: 'طلبات التوصيل' });
      items.push({ path: '/store/drivers',  icon: IoCar,      label: 'السائقين' });
    }

    if (hasFeature('hasTableQr') || isPro) {
      items.push({ path: '/store/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    }

    if (permissions.checkPermission('marketing')) {
      items.push({ path: '/store/marketing', icon: IoMegaphone, label: 'التسويق', badge: 'جديد' });
    }

    items.push({ path: '/store/plans',    icon: IoRocket,   label: 'خطط الأسعار' });
    items.push({ path: '/store/settings', icon: IoSettings, label: 'الإعدادات' });

    return items;
  };

  // ==================== قائمة الموظف ====================
  const getStaffMenuItems = () => {
    const items: { path: string; icon: React.ElementType; label: string; badge?: string }[] = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
    ];

    if (permissions.checkPermission('viewMenu')) {
      items.push({ path: '/menu', icon: IoFastFood, label: 'القائمة' });
    }

    if (permissions.checkPermission('viewOrders')) {
      items.push({ path: '/orders', icon: IoReceipt, label: 'الطلبات' });
    }

    if (permissions.checkPermission('delivery')) {
      items.push({ path: '/delivery', icon: IoNavigate, label: 'طلبات التوصيل' });
    }

    if (permissions.checkPermission('viewTables')) {
      items.push({ path: '/tables', icon: IoRestaurant, label: 'الطاولات' });
    }

    return items;
  };

  // تحديد القائمة حسب الدور
  const getMenuItems = () => {
    if (isSuperAdmin)       return getAdminMenuItems();
    if (isRestaurantOwner)  return getRestaurantOwnerMenuItems();
    if (isStoreOwner)       return getStoreOwnerMenuItems();
    if (isStaff)            return getStaffMenuItems();
    if (role === 'delivery_driver') return [];
    return [];
  };

  const menuItems = getMenuItems();

  // ── role label ─────────────────────────────────────────────────
  const getRoleLabel = () => {
    if (isSuperAdmin)        return 'مدير المنصة';
    if (isRestaurantOwner)   return 'مالك مطعم';
    if (isStoreOwner)        return 'مالك متجر';
    if (role === 'staff')    return 'موظف';
    if (role === 'delivery_driver') return 'مندوب توصيل';
    return 'عميل';
  };

  // ── plan name ──────────────────────────────────────────────────
  const getPlanName = () => {
    if (planLoading) return 'جاري التحميل...';
    if (!currentPlan) return 'لا توجد خطة';
    const planNames: Record<string, string> = {
      free:       'الخطة المجانية',
      basic:      'الخطة الأساسية',
      pro:        'الخطة الاحترافية',
      enterprise: 'الخطة المؤسسية',
    };
    return planNames[currentPlan.name] || currentPlan.name;
  };

  // ── lock icon helper ───────────────────────────────────────────
  const showLock = (label: string): boolean => {
    if (isRestaurantOwner) {
      if (label === 'الطلبات' && !permissions.checkPermission('onlineOrders') && !isPro) return true;
      if ((label === 'طلبات التوصيل' || label === 'السائقين') && !permissions.checkPermission('delivery') && !isPro) return true;
    }
    if (isStoreOwner) {
      if (label === 'المخزون'       && !hasFeature('hasInventory')   && !isPro) return true;
      if (label === 'الكوبونات'     && !hasFeature('hasCoupons')     && !isPro) return true;
      if (label === 'الإحصائيات'   && !hasFeature('hasAnalytics')   && !isPro) return true;
      if (label === 'رموز QR'       && !hasFeature('hasTableQr')     && !isPro) return true;
    }
    return false;
  };

  // ── sidebar translate ──────────────────────────────────────────
  const sidebarTransform = isOpen ? 'translateX(0)' : 'translateX(100%)';

  return (
    <>
      {/* Mobile overlay */}
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
          width: 248,
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
        className="lg:translate-x-0"
      >
        {/* ── 1. Logo area ──────────────────────────────────────── */}
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

        {/* ── 2. User info ──────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Avatar */}
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
                {/* Role badge */}
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

                {/* Plan badge – owners only */}
                {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !planLoading && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: `rgba(157,196,172,0.18)`,
                      color: C.muted,
                      fontWeight: 600,
                    }}
                  >
                    {getPlanName()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Nav items ──────────────────────────────────────── */}
        <nav
          style={{
            flex: 1,
            padding: '10px 8px',
            overflowY: 'auto',
          }}
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                marginBottom: 2,
                textDecoration: 'none',
                background: isActive ? C.accentBg : 'transparent',
                color: isActive ? C.accent : C.muted,
                borderRight: `3px solid ${isActive ? C.accent : 'transparent'}`,
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} style={{ flexShrink: 0, color: isActive ? C.accent : C.muted }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </span>

                  {/* "جديد" badge */}
                  {item.badge === 'جديد' && (
                    <span
                      style={{
                        fontSize: 10,
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

                  {/* Lock icon for restricted features */}
                  {showLock(item.label) && (
                    <IoLockClosed size={13} style={{ color: C.muted, opacity: 0.6, flexShrink: 0 }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── 4. Upgrade button ─────────────────────────────────── */}
        {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !isPro && !planLoading && (
          <div style={{ padding: '8px 12px', flexShrink: 0 }}>
            <NavLink
              to={isStoreOwner ? '/store/plans' : '/plans'}
              onClick={onClose}
              style={{
                display: 'block',
                textAlign: 'center',
                background: C.accent,
                color: C.darkBg,
                fontWeight: 700,
                fontSize: 13,
                padding: '10px 0',
                borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              ✨ ترقية الخطة الآن
            </NavLink>
          </div>
        )}

        {/* ── 5. Logout ─────────────────────────────────────────── */}
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
