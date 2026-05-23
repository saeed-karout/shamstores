// src/components/settings/SettingsTabs.tsx

import React from 'react';
import {
  IoStorefront, IoColorPalette, IoImage, IoCar,
  IoGlobe, IoShareSocial, IoCard, IoNotifications, IoLockClosed
} from 'react-icons/io5';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

export type SettingsTab = 
  | 'general' 
  | 'design' 
  | 'images' 
  | 'delivery' 
  | 'domain' 
  | 'social' 
  | 'payment' 
  | 'notifications';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  proOnly?: boolean;
  requiredPermission?: string;  // ✅ صلاحية مطلوبة
  requiredRole?: string[];      // ✅ أدوار مسموحة
}

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  isPro?: boolean;
  isStoreOwner?: boolean;  // ✅ هل هو مالك المتجر
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  isPro = false,
  isStoreOwner = true 
}) => {
  const { user, isSuperAdmin, isOwner } = useAuth();
  const permissions = usePermissions();

  // ✅ تحديد الصلاحيات لكل تبويب
  const tabs: TabConfig[] = [
    { 
      id: 'general', 
      label: 'عام', 
      icon: <IoStorefront className="inline ml-1" />,
      requiredRole: ['super_admin', 'owner', 'staff']
    },
    { 
      id: 'design', 
      label: 'التصميم', 
      icon: <IoColorPalette className="inline ml-1" />,
      requiredRole: ['super_admin', 'owner']
    },
    { 
      id: 'images', 
      label: 'الصور', 
      icon: <IoImage className="inline ml-1" />,
      requiredRole: ['super_admin', 'owner']
    },
    { 
      id: 'delivery', 
      label: 'التوصيل', 
      icon: <IoCar className="inline ml-1" />,
      requiredRole: ['super_admin', 'owner'],
      requiredPermission: 'canManageDelivery'
    },
    { 
      id: 'domain', 
      label: 'الدومين', 
      icon: <IoGlobe className="inline ml-1" />, 
      proOnly: true,
      requiredRole: ['super_admin', 'owner']
    },
    { 
      id: 'social', 
      label: 'وسائل التواصل', 
      icon: <IoShareSocial className="inline ml-1" />,
      requiredRole: ['super_admin', 'owner', 'staff'],
      requiredPermission: 'canManageSocial'
    },
    { 
      id: 'payment', 
      label: 'الدفع', 
      icon: <IoCard className="inline ml-1" />, 
      proOnly: true,
      requiredRole: ['super_admin', 'owner'],
      requiredPermission: 'canManagePayment'
    },
    { 
      id: 'notifications', 
      label: 'الإشعارات', 
      icon: <IoNotifications className="inline ml-1" />,
      requiredRole: ['super_admin', 'owner'],
      requiredPermission: 'canManageNotifications'
    },
  ];

  // ✅ التحقق من صلاحية المستخدم لرؤية التبويب
  const hasAccess = (tab: TabConfig): boolean => {
    // السوبر أدمن يرى كل شيء
    if (isSuperAdmin) return true;

    // إذا كان المستخدم ليس مالك المتجر والتبويب يتطلب مالك
    if (!isStoreOwner && tab.requiredRole?.includes('owner') && !tab.requiredRole?.includes('staff')) {
      return false;
    }

    // التحقق من الدور
    if (tab.requiredRole && !tab.requiredRole.includes(user?.role || '')) {
      return false;
    }

    // التحقق من الصلاحية المحددة
    if (tab.requiredPermission) {
      const hasPermission = permissions.checkPermission(tab.requiredPermission);
      if (!hasPermission) return false;
    }

    return true;
  };

  // ✅ الحصول على سبب التعطيل (للـ tooltip)
  const getDisabledReason = (tab: TabConfig): string => {
    if (tab.proOnly && !isPro) {
      return 'هذه الميزة متاحة فقط في الخطة الاحترافية';
    }
    if (tab.requiredPermission && !permissions.checkPermission(tab.requiredPermission)) {
      return 'ليس لديك صلاحية للوصول إلى هذه الإعدادات';
    }
    if (tab.requiredRole && !tab.requiredRole.includes(user?.role || '')) {
      return 'ليس لديك صلاحية للوصول إلى هذه الإعدادات';
    }
    return '';
  };

  // ✅ تصفية التبويبات حسب الصلاحيات
  const visibleTabs = tabs.filter(tab => hasAccess(tab));

  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b pb-2" dir="rtl">
      {visibleTabs.map((tab) => {
        const isDisabled = (tab.proOnly && !isPro) || getDisabledReason(tab) !== '';
        const disabledReason = getDisabledReason(tab);
        
        return (
          <div key={tab.id} className="relative group">
            <button
              onClick={() => !isDisabled && onTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all relative flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-green-500 text-white shadow-md' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isDisabled}
              title={disabledReason}
            >
              {tab.icon}
              {tab.label}
              {tab.proOnly && !isPro && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Pro
                </span>
              )}
              {!tab.proOnly && isDisabled && (
                <IoLockClosed size={12} className="ml-1" />
              )}
            </button>
            
            {/* Tooltip للميزات المقفلة */}
            {isDisabled && disabledReason && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10 hidden group-hover:block">
                {disabledReason}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SettingsTabs;