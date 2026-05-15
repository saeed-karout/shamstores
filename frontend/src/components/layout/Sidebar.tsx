
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrentPlan } from '@/hooks/stores/useCurrentPlan';
import {
  IoHome, IoRestaurant, IoFastFood, IoReceipt, IoQrCode, IoPeople,
  IoStatsChart, IoSettings, IoPricetag, IoRocket, IoLockClosed,
  IoCar, IoNavigate, IoStorefront, IoLogOut, IoKey,
  IoBagOutline, IoPricetags, IoMegaphone,
} from 'react-icons/io5';

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  primary:  '#0D4A3A',
  accent:   '#C8E235',
  accentDk: '#A8C220',
  bg:       '#082E24',
  card:     '#112E23',
  text:     '#E8F5E9',
  muted:    '#9DC4AC',
  border:   'rgba(200,226,53,0.15)',
  red:      '#FF6B6B',
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    user, isSuperAdmin, isOwner, isRestaurantOwner,
    isStoreOwner, isStaff, role, logout,
  } = useAuth();
  const permissions = usePermissions();
  const { plan: currentPlan, loading: planLoading, isPro, hasFeature } = useCurrentPlan();

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate('/login');
  };

  // ─── Menu Definitions ─────────────────────────────────────────
  const adminMenu = [
    { path: '/admin',                    icon: IoHome,       label: 'الرئيسية' },
    { path: '/admin/restaurants',        icon: IoRestaurant, label: 'المطاعم' },
    { path: '/admin/stores',             icon: IoStorefront, label: 'المتاجر' },
    { path: '/admin/features',           icon: IoRocket,     label: 'الميزات', badge: 'جديد' },
    { path: '/admin/platform-settings',  icon: IoSettings,   label: 'إعدادات المنصة', badge: 'جديد' },
    { path: '/admin/users',              icon: IoPeople,     label: 'المستخدمين' },
    { path: '/admin/staff',              icon: IoKey,        label: 'موظفي المنصة' },
    { path: '/admin/orders',             icon: IoReceipt,    label: 'الطلبات' },
    { path: '/admin/drivers',            icon: IoCar,        label: 'السائقين' },
    { path: '/admin/plans',              icon: IoPricetags,  label: 'الخطط' },
    { path: '/admin/qr-codes',           icon: IoQrCode,     label: 'رموز QR' },
    { path: '/admin/marketing',          icon: IoMegaphone,  label: 'التسويق' },
  ];

  const restaurantMenu = () => {
    const items: any[] = [
      { path: '/dashboard', icon: IoHome,     label: 'الرئيسية' },
      { path: '/menu',      icon: IoFastFood, label: 'القائمة' },
    ];
    if (permissions.checkPermission('onlineOrders'))
      items.push({ path: '/orders',    icon: IoReceipt,    label: 'الطلبات' });
    if (permissions.checkPermission('tableQr')) {
      items.push({ path: '/tables',    icon: IoRestaurant, label: 'الطاولات' });
      items.push({ path: '/qr-codes',  icon: IoQrCode,     label: 'رموز QR' });
    }
    if (permissions.checkPermission('coupons'))
      items.push({ path: '/coupons',   icon: IoPricetag,   label: 'الكوبونات' });
    if (permissions.getMaxStaff() > 0)
      items.push({ path: '/staff',     icon: IoPeople,     label: 'الموظفين' });
    if (permissions.checkPermission('analytics'))
      items.push({ path: '/analytics', icon: IoStatsChart, label: 'الإحصائيات' });
    if (permissions.checkPermission('delivery')) {
      items.push({ path: '/delivery',  icon: IoNavigate,   label: 'التوصيل' });
      items.push({ path: '/drivers',   icon: IoCar,        label: 'السائقين' });
    }
    if (permissions.checkPermission('marketing'))
      items.push({ path: '/marketing', icon: IoMegaphone,  label: 'التسويق', badge: 'جديد' });
    items.push({ path: '/plans',    icon: IoRocket,    label: 'خطط الأسعار' });
    items.push({ path: '/settings', icon: IoSettings,  label: 'الإعدادات' });
    return items;
  };

  const storeMenu = () => {
    const items: any[] = [
      { path: '/dashboard',     icon: IoHome,       label: 'الرئيسية' },
      { path: '/store/products',icon: IoBagOutline, label: 'المنتجات' },
    ];
    if (hasFeature('hasInventory') || isPro)
      items.push({ path: '/store/inventory', icon: IoStatsChart, label: 'المخزون' });
    if (hasFeature('hasOnlineOrders') || isPro)
      items.push({ path: '/store/orders',    icon: IoReceipt,    label: 'الطلبات' });
    if (hasFeature('hasCoupons') || isPro)
      items.push({ path: '/store/coupons',   icon: IoPricetag,   label: 'الكوبونات' });
    if ((permissions.getMaxStaff?.() || 0) > 0)
      items.push({ path: '/store/staff',     icon: IoPeople,     label: 'الموظفين' });
    if (hasFeature('hasAnalytics') || isPro)
      items.push({ path: '/store/analytics', icon: IoStatsChart, label: 'الإحصائيات' });
    if (hasFeature('hasOnlineOrders') || isPro) {
      items.push({ path: '/store/delivery',  icon: IoNavigate,   label: 'التوصيل' });
      items.push({ path: '/store/drivers',   icon: IoCar,        label: 'السائقين' });
    }
    if (hasFeature('hasTableQr') || isPro)
      items.push({ path: '/store/qr-codes',  icon: IoQrCode,     label: 'رموز QR' });
    if (permissions.checkPermission('marketing'))
      items.push({ path: '/store/marketing', icon: IoMegaphone,  label: 'التسويق', badge: 'جديد' });
    items.push({ path: '/store/plans',    icon: IoRocket,   label: 'خطط الأسعار' });
    items.push({ path: '/store/settings', icon: IoSettings, label: 'الإعدادات' });
    return items;
  };

  const staffMenu = () => {
    const items: any[] = [{ path: '/dashboard', icon: IoHome, label: 'الرئيسية' }];
    if (permissions.checkPermission('viewMenu'))   items.push({ path: '/menu',     icon: IoFastFood,   label: 'القائمة' });
    if (permissions.checkPermission('viewOrders')) items.push({ path: '/orders',   icon: IoReceipt,    label: 'الطلبات' });
    if (permissions.checkPermission('delivery'))   items.push({ path: '/delivery', icon: IoNavigate,   label: 'التوصيل' });
    if (permissions.checkPermission('viewTables')) items.push({ path: '/tables',   icon: IoRestaurant, label: 'الطاولات' });
    return items;
  };

  const menuItems = isSuperAdmin ? adminMenu
    : isRestaurantOwner ? restaurantMenu()
    : isStoreOwner      ? storeMenu()
    : isStaff           ? staffMenu()
    : [];

  const roleBadge = isSuperAdmin   ? 'مدير المنصة'
    : isRestaurantOwner ? 'مالك مطعم'
    : isStoreOwner      ? 'مالك متجر'
    : isStaff           ? 'موظف'
    : role === 'delivery_driver' ? 'مندوب توصيل'
    : 'مستخدم';

  const planLabel = planLoading ? '...'
    : !currentPlan ? ''
    : ({ free: 'مجاني', basic: 'أساسي', pro: 'احترافي', enterprise: 'مؤسسي' } as Record<string,string>)[currentPlan.name] || currentPlan.name;

  const isOwnerRole = isRestaurantOwner || isStoreOwner;
  const plansPath = isStoreOwner ? '/store/plans' : '/plans';

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 40, backdropFilter: 'blur(3px)',
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: 248,
          background: C.primary, zIndex: 50, display: 'flex', flexDirection: 'column',
          borderLeft: `1px solid ${C.border}`, overflowY: 'auto',
          transform: isOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.3s ease',
        }}
        className="lg:translate-x-0 translate-x-full"
      >
        {/* ─── Logo ─── */}
        <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, background: C.accent, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20, color: C.bg, fontWeight: 900 }}>S</span>
            </div>
            <div>
              <div style={{ color: C.accent, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>SHAM STORES</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                {isSuperAdmin ? 'لوحة الإدارة' : isStoreOwner ? 'إدارة المتجر' : 'إدارة المطعم'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── User Info ─── */}
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: `${C.accent}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {(user?.name || 'U')[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.text, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'مستخدم'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                <span style={{ background: `${C.accent}20`, color: C.accent, fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>
                  {roleBadge}
                </span>
                {isOwnerRole && planLabel && (
                  <span style={{ background: 'rgba(100,180,130,0.15)', color: C.muted, fontSize: 10, padding: '1px 7px', borderRadius: 20 }}>
                    {planLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Nav Items ─── */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              end={item.path === '/admin' || item.path === '/dashboard'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none',
                background: isActive ? `${C.accent}18` : 'transparent',
                color: isActive ? C.accent : C.muted,
                fontFamily: 'Cairo, sans-serif', fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
                borderRight: isActive ? `3px solid ${C.accent}` : '3px solid transparent',
              })}
            >
              <item.icon size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ background: C.accent, color: C.bg, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ─── Upgrade Button ─── */}
        {isOwnerRole && !isSuperAdmin && !isPro && !planLoading && (
          <div style={{ padding: '0 12px 10px', flexShrink: 0 }}>
            <NavLink
              to={plansPath}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', borderRadius: 10, textDecoration: 'none',
                background: C.accent, color: C.bg, fontWeight: 700, fontSize: 13,
                transition: 'all 0.2s',
              }}
            >
              <IoRocket size={15} /> ترقية الخطة
            </NavLink>
          </div>
        )}

        {/* ─── Logout ─── */}
        <div style={{ padding: '12px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', borderRadius: 10,
              border: 'none', background: 'rgba(255,107,107,0.12)',
              color: C.red, cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <IoLogOut size={16} /> تسجيل خروج
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

