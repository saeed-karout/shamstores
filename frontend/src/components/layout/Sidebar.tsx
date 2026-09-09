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
  IoPerson,
  IoStatsChart,
  IoWallet,
  IoSettings,
  IoPricetag,
  IoRocket,
  IoCar,
  IoNavigate,
  IoStorefront,
  IoLogOut,
  IoTime,
  IoKey,
  IoBagOutline,
  IoMegaphone,
  IoGitBranch,
  IoChatbubbleEllipses,
  IoSparkles,
  IoDiamond,
  IoTrendingUp,
  IoCheckmarkCircle,
  IoWarning,
  IoDocumentText,
  IoNotifications,
  IoCard,
  IoFlash
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
  const { currentPlan, loading: planLoading, isPro } = permissions;

  // حساب الميزات المتاحة (للمالكين)
  const hasOnlineOrders = permissions.canViewOrders;
  const hasTableQr = permissions.canViewTables;
  const hasCoupons = permissions.canViewCoupons;
  const hasAnalytics = permissions.canViewAnalytics;
  const hasDelivery = permissions.canViewDelivery;
  const hasMarketing = permissions.canViewMarketing;
  const isPaidPlan = (currentPlan?.price || 0) > 0 && currentPlan?.name !== 'free' && currentPlan?.slug !== 'free';
  const hasInventory = permissions.checkPermission('inventory') || isPaidPlan;
  const hasStaff = permissions.canViewStaff;

  const handleLogout = () => {
    localStorage.clear();
    logout();
    navigate('/login');
  };

  const getDaysRemaining = () => {
    const planWithExpiry = currentPlan as any;
    if (!planWithExpiry?.expiresAt) return null;
    const end = new Date(planWithExpiry.expiresAt);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isPlatformStaff = isStaff && !(user as any)?.restaurantId && !(user as any)?.storeId;


  // ==================== قائمة السوبر أدمن ====================
  const getAdminMenuItems = () => {
    return [
      { path: '/admin', icon: IoHome, label: 'الرئيسية' },
      { path: '/admin/restaurants', icon: IoRestaurant, label: 'المطاعم' },
      { path: '/admin/branches', icon: IoGitBranch, label: 'الفروع' },
      { path: '/admin/stores', icon: IoStorefront, label: 'المتاجر' },
      { path: '/admin/contact-messages', icon: IoChatbubbleEllipses, label: 'رسائل التواصل' },
      { path: '/admin/features', icon: IoRocket, label: 'الميزات', badge: 'جديد' },
      { path: '/admin/platform-settings', icon: IoSettings, label: 'إعدادات المنصة', badge: 'جديد' },
      { path: '/admin/subscriptions', icon: IoDiamond, label: 'الاشتراكات', badge: 'جديد' },
      { path: '/admin/users', icon: IoPeople, label: 'المستخدمين' },
      { path: '/admin/staff', icon: IoKey, label: 'موظفي المنصة' },
      { path: '/admin/orders', icon: IoReceipt, label: 'الطلبات' },
      { path: '/admin/drivers', icon: IoCar, label: 'السائقين' },
      { path: '/admin/push-notifications', icon: IoNotifications, label: 'بثّ الإشعارات', badge: 'جديد' },
      { path: '/admin/plans', icon: IoRocket, label: 'الخطط والاشتراكات' },
      { path: '/admin/qr-codes', icon: IoQrCode, label: 'رموز QR' },
      { path: '/admin/advertisements', icon: IoMegaphone, label: 'الإعلانات' },
    ];
  };

  // ==================== قائمة موظف المنصة ====================
  const getPlatformStaffMenuItems = () => {
    const sp = (user as any)?.permissions || {};
    const items: any[] = [{ path: '/admin', icon: IoHome, label: 'الرئيسية' }];
    
    if (sp.canManageRestaurants) items.push({ path: '/admin/restaurants', icon: IoRestaurant, label: 'المطاعم' });
    if (sp.canManageStores) items.push({ path: '/admin/stores', icon: IoStorefront, label: 'المتاجر' });
    if (sp.canManageUsers) items.push({ path: '/admin/users', icon: IoPeople, label: 'المستخدمين' });
    if (sp.canManageDrivers) items.push({ path: '/admin/drivers', icon: IoCar, label: 'السائقين' });
    if (sp.canManagePlans) items.push({ path: '/admin/plans', icon: IoRocket, label: 'الخطط' });
    if (sp.canManageSettings) items.push({ path: '/admin/platform-settings', icon: IoSettings, label: 'إعدادات المنصة' });
    if (sp.canViewReports) items.push({ path: '/admin/reports', icon: IoDocumentText, label: 'التقارير' });
    items.push({ path: '/admin/orders', icon: IoReceipt, label: 'الطلبات' });
    items.push({ path: '/admin/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    items.push({ path: '/admin/advertisements', icon: IoMegaphone, label: 'الإعلانات' });
    
    return items;
  };

  // ==================== قائمة مالك المطعم ====================
  const getRestaurantOwnerMenuItems = () => {
    const items: any[] = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/menu', icon: IoFastFood, label: 'القائمة' },
    ];
    if (hasOnlineOrders) items.push({ path: '/orders', icon: IoReceipt, label: 'الطلبات' });
    if (hasTableQr) items.push({ path: '/tables', icon: IoRestaurant, label: 'الطاولات' });
    if (hasTableQr) items.push({ path: '/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    if (hasCoupons) items.push({ path: '/coupons', icon: IoPricetag, label: 'الكوبونات' });
    if (hasStaff) items.push({ path: '/staff', icon: IoPeople, label: 'موظفي المطعم' });
    if (hasAnalytics) items.push({ path: '/analytics', icon: IoStatsChart, label: 'الإحصائيات' });
    items.push({ path: '/restaurant/customers', icon: IoPeople, label: 'الزبائن', badge: 'جديد' });
    items.push({ path: '/restaurant/campaigns', icon: IoMegaphone, label: 'حملات الزبائن', badge: 'جديد' });
    items.push({ path: '/restaurant/automations', icon: IoFlash, label: 'رسائل تلقائية', badge: 'جديد' });
    items.push({ path: '/restaurant/shipping', icon: IoNavigate, label: 'مناطق التوصيل', badge: 'جديد' });
    items.push({ path: '/restaurant/pos', icon: IoCard, label: 'الكاشير', badge: 'جديد' });
    items.push({ path: '/restaurant/affiliates', icon: IoTrendingUp, label: 'المسوّقون', badge: 'جديد' });
    items.push({ path: '/finance', icon: IoWallet, label: 'القسم المالي', badge: 'جديد' });
    if (hasDelivery) items.push({ path: '/delivery', icon: IoNavigate, label: 'طلبات التوصيل' });
    if (hasDelivery) items.push({ path: '/drivers', icon: IoCar, label: 'السائقين' });
    if (hasMarketing) items.push({ path: '/marketing', icon: IoMegaphone, label: 'التسويق', badge: 'جديد' });
    // الميزات تظهر لكل الخطط بما فيها المجانية.
    //
    // بقية المداخل مشروطة بالاستحقاق فتختفي كلياً عمّن لا يملكها — فلا يعرف
    // صاحب الخطة المجانية أن الكوبونات موجودة أصلاً. وميزة مخفيّة لا تُباع:
    // إخفاؤها يحمي الواجهة من الفوضى ويكلّف كل فرصة ترقية.
    items.push({ path: '/features', icon: IoSparkles, label: 'الميزات', badge: 'جديد' });
    items.push({ path: '/plans', icon: IoRocket, label: 'الخطط' });
    items.push({ path: '/profile', icon: IoPerson, label: 'حسابي' });
    items.push({ path: '/settings', icon: IoSettings, label: 'الإعدادات' });
    return items;
  };

  // ==================== قائمة مالك المتجر ====================
  const getStoreOwnerMenuItems = () => {
    const items: any[] = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/store/products', icon: IoBagOutline, label: 'المنتجات' },
    ];
    if (hasInventory) items.push({ path: '/store/inventory', icon: IoStatsChart, label: 'المخزون' });
    if (hasOnlineOrders) items.push({ path: '/store/orders', icon: IoReceipt, label: 'الطلبات' });
    if (hasCoupons) items.push({ path: '/store/coupons', icon: IoPricetag, label: 'الكوبونات' });
    if (hasStaff) items.push({ path: '/store/staff', icon: IoPeople, label: 'موظفي المتجر' });
    if (hasAnalytics) items.push({ path: '/store/analytics', icon: IoStatsChart, label: 'الإحصائيات' });
    items.push({ path: '/store/customers', icon: IoPeople, label: 'الزبائن', badge: 'جديد' });
    items.push({ path: '/store/campaigns', icon: IoMegaphone, label: 'حملات الزبائن', badge: 'جديد' });
    items.push({ path: '/store/automations', icon: IoFlash, label: 'رسائل تلقائية', badge: 'جديد' });
    items.push({ path: '/store/shipping', icon: IoNavigate, label: 'مناطق التوصيل', badge: 'جديد' });
    items.push({ path: '/store/pos', icon: IoCard, label: 'الكاشير', badge: 'جديد' });
    items.push({ path: '/store/affiliates', icon: IoTrendingUp, label: 'المسوّقون', badge: 'جديد' });
    items.push({ path: '/finance', icon: IoWallet, label: 'القسم المالي', badge: 'جديد' });
    if (hasOnlineOrders) items.push({ path: '/store/delivery', icon: IoNavigate, label: 'طلبات التوصيل' });
    if (hasOnlineOrders) items.push({ path: '/store/drivers', icon: IoCar, label: 'السائقين' });
    if (hasTableQr) items.push({ path: '/store/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    if (hasMarketing) items.push({ path: '/store/marketing', icon: IoMegaphone, label: 'التسويق', badge: 'جديد' });
    items.push({ path: '/features', icon: IoSparkles, label: 'الميزات', badge: 'جديد' });
    items.push({ path: '/store/plans', icon: IoRocket, label: 'الخطط' });
    items.push({ path: '/profile', icon: IoPerson, label: 'حسابي' });
    items.push({ path: '/store/settings', icon: IoSettings, label: 'الإعدادات' });
    return items;
  };

  // ==================== قائمة موظف مطعم/متجر ====================
  const getStaffMenuItems = () => {
    const items: any[] = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
    ];
    if (permissions.canViewMenu) items.push({ path: '/menu', icon: IoFastFood, label: 'القائمة' });
    if (permissions.canViewOrders) items.push({ path: '/orders', icon: IoReceipt, label: 'الطلبات' });
    if (permissions.canViewTables) items.push({ path: '/tables', icon: IoRestaurant, label: 'الطاولات' });
    if (permissions.canViewDelivery) items.push({ path: '/delivery', icon: IoNavigate, label: 'طلبات التوصيل' });
    return items;
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
      {/* ⚠️ `bottom: 0` لا `height: 100vh`.
          على متصفحات الموبايل تشمل 100vh المساحة الواقعة خلف شريط العنوان
          وشريط الأدوات السفلي، فيمتدّ العمود تحت حافة الشاشة المرئية —
          ومحتواه يملؤه تماماً فلا يتمرّج. النتيجة أن آخر عنصر فيه، وهو زر
          تسجيل الخروج، لا يُرى ولا يُنقر. */}
      <aside style={{
        position: 'fixed', top: 0, bottom: 0, right: 0, width: 280, background: C.bg,
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
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
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
                  background: isActive ? C.accentBg : 'transparent',
                  color: isActive ? C.accent : C.muted,
                  borderRight: `3px solid ${isActive ? C.accent : 'transparent'}`,
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}>
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400 }}>
                    {item.label}
                  </span>
                  {item.badge === 'جديد' && (
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: C.accent, color: C.darkBg, fontWeight: 700, flexShrink: 0 }}>جديد</span>
                  )}
                </div>
              )}
            </NavLink>
          ))}
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
        {/* الحشوة السفلية تُبعد الزر عن شريط الإيماءات في آيفون */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', flexShrink: 0 }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', minHeight: 44, background: C.redBg, color: C.red, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><IoLogOut size={17} /><span>تسجيل خروج</span></button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
