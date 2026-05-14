// src/components/settings/SettingsTabs.tsx

import React from 'react';
import {
  IoStorefront, IoColorPalette, IoImage, IoCar,
  IoGlobe, IoShareSocial, IoCard, IoNotifications
} from 'react-icons/io5';

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
}

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  isPro?: boolean;
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onTabChange, isPro = false }) => {
  const tabs: TabConfig[] = [
    { id: 'general', label: 'عام', icon: <IoStorefront className="inline ml-1" /> },
    { id: 'design', label: 'التصميم', icon: <IoColorPalette className="inline ml-1" /> },
    { id: 'images', label: 'الصور', icon: <IoImage className="inline ml-1" /> },
    { id: 'delivery', label: 'التوصيل', icon: <IoCar className="inline ml-1" /> },
    { id: 'domain', label: 'الدومين', icon: <IoGlobe className="inline ml-1" />, proOnly: true },  // ✅ Pro only
    { id: 'social', label: 'وسائل التواصل', icon: <IoShareSocial className="inline ml-1" /> },
    { id: 'payment', label: 'الدفع', icon: <IoCard className="inline ml-1" />, proOnly: true },    // ✅ Pro only
    { id: 'notifications', label: 'الإشعارات', icon: <IoNotifications className="inline ml-1" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
      {tabs.map((tab) => {
        const isDisabled = tab.proOnly && !isPro;
        
        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all relative ${
              activeTab === tab.id 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-gray-100 hover:bg-gray-200'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
          >
            {tab.icon}
            {tab.label}
            {tab.proOnly && !isPro && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Pro
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SettingsTabs;
