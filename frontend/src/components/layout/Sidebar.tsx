// frontend/src/components/layout/Sidebar.tsx

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { staffAreas } from '../../utils/staffAccess';
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
  IoCube,
  IoLayers,
  IoNotifications,
  IoCard,
  IoFlash,
  IoClose,
  IoRefresh,
  IoGrid
} from 'react-icons/io5';
import { BrandLogo } from '../marketing/Brand';
import { useBusinessSummary } from '../../hooks/useBusinessSummary';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}


const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpen }) => {
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
  // ما يفتحه الخادم لموظّف المنصّة فعلاً (قراءةٌ فقط). كانت هنا روابط
  // `/admin` (إحصاءات للسوبر أدمن وحده) و`/admin/reports` (بلا مسار أصلاً)
  // والخطط والإعدادات والإعلانات — كلّها ٤٠٣ أو ٤٠٤ لمن يضغطها.
  const PLATFORM_ICONS: Record<string, any> = {
    '/admin/restaurants': IoRestaurant,
    '/admin/stores': IoStorefront,
    '/admin/users': IoPeople,
    '/admin/drivers': IoCar,
    '/admin/orders': IoReceipt,
  };
  const getPlatformStaffMenuItems = () =>
    staffAreas(user).map((area) => ({ path: area.path, icon: PLATFORM_ICONS[area.path] || IoHome, label: area.label }));

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
  // صلاحيات الموظّف كما منحها المالك — لا صلاحيات الخطة كما كان.
  const STAFF_ICONS: Record<string, any> = {
    '/menu': IoFastFood,
    '/orders': IoReceipt,
    '/tables': IoRestaurant,
    '/delivery': IoNavigate,
    '/store/products': IoCube,
    '/store/orders': IoReceipt,
    '/store/inventory': IoLayers,
  };
  const getStaffMenuItems = () => [
    { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
    ...staffAreas(user).map((area) => ({ path: area.path, icon: STAFF_ICONS[area.path] || IoReceipt, label: area.label })),
    { path: '/profile', icon: IoPerson, label: 'حسابي' },
  ];

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
    if (planLoading) return { name: 'جاري التحميل...', icon: null };
    if (!currentPlan) return { name: 'لا توجد خطة', icon: null };
    const plans: Record<string, any> = {
      free: { name: 'المجانية', icon: <IoTime size={12} /> },
      basic: { name: 'الأساسية', icon: <IoSparkles size={12} /> },
      pro: { name: 'الاحترافية', icon: <IoDiamond size={12} /> },
      enterprise: { name: 'المؤسسية', icon: <IoTrendingUp size={12} /> },
    };
    return plans[currentPlan.name] || { name: currentPlan.name, icon: null };
  };

  const planDisplay = getPlanDisplay();
  const isOwner = (isRestaurantOwner || isStoreOwner) && !isSuperAdmin;
  const plansPath = isStoreOwner ? '/store/plans' : '/plans';
  const groups = groupMenu(menuItems, isSuperAdmin);
  const { data: business } = useBusinessSummary();
  const tabItems = TAB_PRIORITY.map((p) => menuItems.find((i: any) => i.path === p))
    .filter(Boolean)
    .slice(0, 4)
    .map((i: any) => ({ ...i, short: TAB_SHORT[i.path] }));
  const displayName = business?.name || user?.name || 'زائر';

  return (
    <>
      {isOpen && <div className="ss-side-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`ss-side ${isOpen ? 'is-open' : ''}`} aria-label="القائمة الرئيسية">
        <div className="ss-side-head">
          <NavLink to={isSuperAdmin ? '/admin' : '/dashboard'} onClick={onClose} aria-label="شام ستورز — الرئيسية">
            <BrandLogo tone="light" size="sm" />
          </NavLink>
          <button type="button" className="ss-side-close" onClick={onClose} aria-label="إغلاق القائمة">
            <IoClose size={20} />
          </button>
        </div>

        {/* النشاط لا الشخص: التاجر يعرّف نفسه باسم متجره */}
        <div className="ss-side-biz">
          <div className="ss-side-avatar" aria-hidden="true">
            {business?.logo ? <img src={business.logo} alt="" /> : displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="ss-side-biz-name">{displayName}</div>
            <div className="ss-side-biz-meta">
              <span>{getRoleLabel()}</span>
              {isOwner && !planLoading && currentPlan && <span className="ss-chip">{planDisplay.icon}{planDisplay.name}</span>}
            </div>
          </div>
        </div>

        <nav className="ss-side-nav">
          {groups.map((group) => (
            <div key={group.title || 'main'} className="ss-side-group">
              {group.title && <div className="ss-side-group-title">{group.title}</div>}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard' || item.path === '/admin'}
                  onClick={onClose}
                  className="ss-side-link"
                >
                  <item.icon size={19} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          {/* الخطة: تذكيرٌ بالتجديد قبل الانتهاء، أو دعوةٌ للترقية — لا الاثنان */}
          {isOwner && !planLoading && daysRemaining !== null && daysRemaining <= 14 ? (
            <NavLink to={plansPath} onClick={onClose} className={`ss-side-plan ${isExpiringSoon ? 'is-warn' : ''}`}>
              <b>ينتهي اشتراكك بعد {daysRemaining} {daysRemaining > 10 ? 'يوماً' : 'أيام'}</b>
              <small>جدّده الآن لتبقى واجهتك وطلباتك تعمل دون انقطاع.</small>
              <span className="ss-side-plan-cta">
                <IoRefresh size={14} /> تجديد الاشتراك
              </span>
            </NavLink>
          ) : isOwner && !planLoading && !isPro ? (
            <NavLink to={plansPath} onClick={onClose} className="ss-side-plan">
              <b>ارفع خطّتك</b>
              <small>{isRestaurantOwner ? 'طلبات أونلاين، QR للطاولات وتحليلات أعمق.' : 'مخزون، كوبونات وطلبات أونلاين وأكثر.'}</small>
              <span className="ss-side-plan-cta">
                <IoDiamond size={14} /> عرض الخطط
              </span>
            </NavLink>
          ) : null}
        </nav>

        <div className="ss-side-foot">
          <button type="button" className="ss-side-logout" onClick={handleLogout}>
            <IoLogOut size={19} aria-hidden="true" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* شريط الجوال: أهمّ أربع شاشات متاحة لهذا الحساب، والبقيّة خلف «المزيد» */}
      <nav className="ss-tabbar" aria-label="التنقّل السريع">
        {tabItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/dashboard' || item.path === '/admin'} className="ss-tab" onClick={onClose}>
            <span className="ss-tab-ico"><item.icon size={21} aria-hidden="true" /></span>
            <span>{item.short || item.label}</span>
          </NavLink>
        ))}
        <button type="button" className={`ss-tab ${isOpen ? 'active' : ''}`} onClick={isOpen ? onClose : onOpen} aria-expanded={isOpen}>
          <span className="ss-tab-ico"><IoGrid size={20} aria-hidden="true" /></span>
          <span>المزيد</span>
        </button>
      </nav>
    </>
  );
};

// الأولويّة في شريط الجوال: ما يفتحه التاجر عشرات المرّات يومياً
const TAB_PRIORITY = ['/dashboard', '/admin', '/orders', '/store/orders', '/menu', '/store/products', '/restaurant/pos', '/store/pos', '/tables', '/store/inventory', '/admin/restaurants', '/admin/stores', '/admin/orders', '/admin/users'];
const TAB_SHORT: Record<string, string> = { '/dashboard': 'الرئيسية', '/admin': 'الرئيسية', '/restaurant/pos': 'الكاشير', '/store/pos': 'الكاشير' };

// ==================== تجميع الروابط ====================
// عشرون رابطاً في عمودٍ واحد لا يُقرأ — التجميع يجعل مكان كلّ شاشةٍ متوقَّعاً.
// الترتيب داخل المجموعة يتبع ترتيب القوائم أعلاه.
const OWNER_GROUPS: Array<{ title: string; paths: string[] }> = [
  { title: '', paths: ['/dashboard'] },
  { title: 'البيع', paths: ['/orders', '/store/orders', '/restaurant/pos', '/store/pos', '/tables', '/qr-codes', '/store/qr-codes', '/delivery', '/store/delivery', '/drivers', '/store/drivers'] },
  { title: 'الكتالوج', paths: ['/menu', '/store/products', '/store/inventory'] },
  { title: 'الزبائن والتسويق', paths: ['/restaurant/customers', '/store/customers', '/coupons', '/store/coupons', '/restaurant/campaigns', '/store/campaigns', '/restaurant/automations', '/store/automations', '/restaurant/affiliates', '/store/affiliates', '/marketing', '/store/marketing'] },
  { title: 'التقارير', paths: ['/analytics', '/store/analytics', '/finance'] },
  { title: 'الإعداد', paths: ['/restaurant/shipping', '/store/shipping', '/staff', '/store/staff', '/features', '/plans', '/store/plans', '/settings', '/store/settings', '/profile'] }
];

const ADMIN_GROUPS: Array<{ title: string; paths: string[] }> = [
  { title: '', paths: ['/admin'] },
  { title: 'الأنشطة', paths: ['/admin/restaurants', '/admin/branches', '/admin/stores', '/admin/orders', '/admin/drivers', '/admin/qr-codes'] },
  { title: 'الحسابات', paths: ['/admin/users', '/admin/staff', '/admin/contact-messages'] },
  { title: 'الاشتراكات', paths: ['/admin/plans', '/admin/subscriptions', '/admin/features'] },
  { title: 'المنصّة', paths: ['/admin/push-notifications', '/admin/advertisements', '/admin/platform-settings'] }
];

function groupMenu<T extends { path: string }>(items: T[], admin: boolean) {
  const spec = admin ? ADMIN_GROUPS : OWNER_GROUPS;
  const used = new Set<string>();
  const groups = spec
    .map((g) => {
      const list = g.paths.map((p) => items.find((i) => i.path === p)).filter((i): i is T => !!i);
      list.forEach((i) => used.add(i.path));
      return { title: g.title, items: list };
    })
    .filter((g) => g.items.length > 0);
  // ما لا مجموعة له (قائمة الموظّف مثلاً) يبقى ظاهراً لا يضيع
  const rest = items.filter((i) => !used.has(i.path));
  if (rest.length) {
    if (groups[0]?.title === '') groups[0].items.push(...rest);
    else groups.unshift({ title: '', items: rest });
  }
  return groups;
}

export default Sidebar;
