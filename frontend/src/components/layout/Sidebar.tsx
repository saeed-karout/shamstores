// frontend/src/components/layout/Sidebar.tsx

import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  IoMegaphone, // ✅ أضف هذا الاستيراد
} from 'react-icons/io5';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { 
    user, 
    isSuperAdmin, 
    isOwner, 
    isRestaurantOwner, 
    isStoreOwner, 
    isStaff, 
    role, 
    logout 
  } = useAuth();
  const permissions = usePermissions();
  const { plan: currentPlan, loading: planLoading, isPro, hasFeature } = useCurrentPlan();
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [completedDeliveries, setCompletedDeliveries] = useState(0);

  // جلب إحصائيات التوصيل للسائق
  useEffect(() => {
    if (role === 'delivery_driver') {
      fetchDeliveryStats();
    }
  }, [role]);

  const fetchDeliveryStats = async () => {
    try {
      const response = await fetch('/api/delivery/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTodayDeliveries(data.data.todayOrders || 0);
        setCompletedDeliveries(data.data.completedOrders || 0);
      }
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    logout();
    window.location.href = '/';
  };

  // ==================== قائمة السوبر أدمن ====================
  const getAdminMenuItems = () => {
    return [
      { path: '/admin', icon: IoHome, label: 'الرئيسية' },
      { path: '/admin/restaurants', icon: IoRestaurant, label: 'المطاعم' },
      { path: '/admin/stores', icon: IoStorefront, label: 'المتاجر' },
      { path: '/admin/features', icon: IoRocket, label: 'الميزات', badge: 'جديد' },
      { path: '/admin/platform-settings', icon: IoSettings, label: 'إعدادات المنصة', badge: 'جديد' },
      { path: '/admin/users', icon: IoPeople, label: 'المستخدمين' },
      { path: '/admin/staff', icon: IoKey, label: 'موظفي المنصة' },
      { path: '/admin/orders', icon: IoReceipt, label: 'الطلبات' },
      { path: '/admin/drivers', icon: IoCar, label: 'السائقين' },
      { path: '/admin/plans', icon: IoRocket, label: 'الخطط والاشتراكات' },
      { path: '/admin/qr-codes', icon: IoQrCode, label: 'رموز QR' },
    ];
  };

  // ==================== قائمة مالك المطعم ====================
  const getRestaurantOwnerMenuItems = () => {
    const items = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
      { path: '/menu', icon: IoFastFood, label: 'القائمة' },
    ];

    if (permissions.checkPermission('onlineOrders')) {
      items.push({ path: '/orders', icon: IoReceipt, label: 'الطلبات' });
    }

    if (permissions.checkPermission('tableQr')) {
      items.push({ path: '/tables', icon: IoRestaurant, label: 'الطاولات' });
      items.push({ path: '/qr-codes', icon: IoQrCode, label: 'رموز QR' });
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
      items.push({ path: '/drivers', icon: IoCar, label: 'السائقين' });
    }

    // ✅ إضافة التسويق للمالكين (للبانرات والعروض فقط)
    if (permissions.checkPermission('marketing')) {
      items.push({ path: '/marketing', icon: IoMegaphone, label: 'التسويق', badge: 'جديد' });
    }

    items.push({ path: '/plans', icon: IoRocket, label: 'خطط الأسعار' });
    items.push({ path: '/settings', icon: IoSettings, label: 'الإعدادات' });

    return items;
  };

  // ==================== قائمة مالك المتجر ====================
  const getStoreOwnerMenuItems = () => {
    const items = [
      { path: '/dashboard', icon: IoHome, label: 'الرئيسية' },
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
      items.push({ path: '/store/drivers', icon: IoCar, label: 'السائقين' });
    }

    if (hasFeature('hasTableQr') || isPro) {
      items.push({ path: '/store/qr-codes', icon: IoQrCode, label: 'رموز QR' });
    }

    // ✅ إضافة التسويق للمالكين (للبانرات والعروض فقط)
    if (permissions.checkPermission('marketing')) {
      items.push({ path: '/store/marketing', icon: IoMegaphone, label: 'التسويق', badge: 'جديد' });
    }

    items.push({ path: '/store/plans', icon: IoRocket, label: 'خطط الأسعار' });
    items.push({ path: '/store/settings', icon: IoSettings, label: 'الإعدادات' });

    return items;
  };

  // ==================== قائمة الموظف ====================
  const getStaffMenuItems = () => {
    const items = [
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
    if (isSuperAdmin) return getAdminMenuItems();
    if (isRestaurantOwner) return getRestaurantOwnerMenuItems();
    if (isStoreOwner) return getStoreOwnerMenuItems();
    if (isStaff) return getStaffMenuItems();
    if (role === 'delivery_driver') return [];
    return [];
  };

  const menuItems = getMenuItems();

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">مدير المنصة</span>;
    }
    if (isRestaurantOwner) {
      return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">مالك مطعم</span>;
    }
    if (isStoreOwner) {
      return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">مالك متجر</span>;
    }
    if (role === 'staff') {
      return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">موظف</span>;
    }
    if (role === 'delivery_driver') {
      return (
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
          <IoCar size={12} /> مندوب توصيل
        </span>
      );
    }
    return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">عميل</span>;
  };

  const getPlanName = () => {
    if (planLoading) return 'جاري التحميل...';
    if (!currentPlan) return 'لا توجد خطة';
    
    const planNames: Record<string, string> = {
      free: 'الخطة المجانية',
      basic: 'الخطة الأساسية',
      pro: 'الخطة الاحترافية',
      enterprise: 'الخطة المؤسسية'
    };
    
    return planNames[currentPlan.name] || currentPlan.name;
  };

  const getPlanColor = () => {
    if (!currentPlan) return 'bg-gray-100 text-gray-800';
    switch (currentPlan.name) {
      case 'pro': return 'bg-purple-100 text-purple-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-30 lg:translate-x-0 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              {isStoreOwner ? (
                <IoStorefront className="text-white text-xl" />
              ) : (
                <IoRestaurant className="text-white text-xl" />
              )}
            </div>
            <div>
              <h3 className="font-bold">ديجيتال مينو</h3>
              <p className="text-xs opacity-80">
                {isStoreOwner ? 'نظام إدارة المتاجر' : 'نظام إدارة المطاعم'}
              </p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <IoPerson className="text-gray-500" size={20} />
            <h3 className="font-bold text-lg truncate">{user?.name || 'زائر'}</h3>
          </div>
          <p className="text-sm text-gray-500 mb-2 truncate">{user?.email || 'غير مسجل'}</p>
          <div className="mb-2">{getRoleBadge()}</div>
          
          {/* Plan Info - للمالك فقط */}
          {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !planLoading && (
            <div className="mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getPlanColor()}`}>
                {getPlanName()}
              </span>
              {isPro && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mr-2">
                  ⭐ مميز
                </span>
              )}
            </div>
          )}

          {/* Delivery Driver Stats */}
          {role === 'delivery_driver' && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between text-xs text-gray-500">
                <span>طلبات اليوم:</span>
                <span className="font-bold text-blue-600">{todayDeliveries}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>مكتملة:</span>
                <span className="font-bold text-green-600">{completedDeliveries}</span>
              </div>
            </div>
          )}

          {/* Business Info */}
          {isRestaurantOwner && user?.restaurantId && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 truncate">
                <span className="font-medium">رقم المطعم:</span><br />
                {user.restaurantId.substring(0, 8)}...
              </p>
            </div>
          )}
          
          {isStoreOwner && user?.storeId && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 truncate">
                <span className="font-medium">رقم المتجر:</span><br />
                {user.storeId.substring(0, 8)}...
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-5 px-2 pb-32">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center px-2 py-3 text-base font-medium rounded-md mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className={`ml-3 h-5 w-5 ${location.pathname === item.path ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
              <span className="flex-1">{item.label}</span>
              {item.badge === 'جديد' && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">جديد</span>
              )}
              
              {/* قفل للميزات غير المتاحة */}
              {isRestaurantOwner && item.label === 'الطلبات' && !permissions.checkPermission('onlineOrders') && !isPro && (
                <IoLockClosed className="text-gray-400" size={14} />
              )}
              {isRestaurantOwner && (item.label === 'طلبات التوصيل' || item.label === 'السائقين') && !permissions.checkPermission('delivery') && !isPro && (
                <IoLockClosed className="text-gray-400" size={14} />
              )}
              
              {/* قفل للميزات غير المتاحة في المتجر */}
              {isStoreOwner && item.label === 'المخزون' && !hasFeature('hasInventory') && !isPro && (
                <IoLockClosed className="text-gray-400" size={14} />
              )}
              {isStoreOwner && item.label === 'الكوبونات' && !hasFeature('hasCoupons') && !isPro && (
                <IoLockClosed className="text-gray-400" size={14} />
              )}
              {isStoreOwner && item.label === 'الإحصائيات' && !hasFeature('hasAnalytics') && !isPro && (
                <IoLockClosed className="text-gray-400" size={14} />
              )}
              {isStoreOwner && item.label === 'رموز QR' && !hasFeature('hasTableQr') && !isPro && (
                <IoLockClosed className="text-gray-400" size={14} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Upgrade Button for Non-Pro Owners */}
        {(isRestaurantOwner || isStoreOwner) && !isSuperAdmin && !isPro && !planLoading && (
          <div className="absolute bottom-16 left-0 right-0 p-4">
            <NavLink
              to={isStoreOwner ? "/store/plans" : "/plans"}
              onClick={onClose}
              className="block text-center bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
            >
              ✨ ترقية الخطة الآن
            </NavLink>
          </div>
        )}

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
          >
            <IoLogOut size={18} />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;