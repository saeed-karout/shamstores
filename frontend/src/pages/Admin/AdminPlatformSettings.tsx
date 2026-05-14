// pages/Admin/AdminPlatformSettings.tsx

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import { 
  IoSettings, IoGlobe, IoShield, IoCard, IoCar, 
  IoMail, IoChatbubble, IoCloud, IoBusiness, IoTime,
  IoLockClosed, IoImage, IoLink, IoStatsChart,
  IoCheckmark, IoClose, IoRefresh
} from 'react-icons/io5';
import toast from 'react-hot-toast';

interface Setting {
  id: string;
  key_name: string;
  value: any;
  type: string;
  setting_group: string;
  description: string;
  is_public: boolean;
  is_editable: boolean;
}

const AdminPlatformSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGroup, setActiveGroup] = useState('general');
  const [settings, setSettings] = useState<Record<string, Setting[]>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get('/platform-settings');
      setSettings(data || {});
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (group: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [group]: prev[group].map(s => 
        s.key_name === key ? { ...s, value } : s
      )
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allSettings: Record<string, any> = {};
      Object.values(settings).forEach(group => {
        group.forEach(setting => {
          allSettings[setting.key_name] = setting.value;
        });
      });
      
      await api.put('/platform-settings', { settings: allSettings });
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    { id: 'general', name: 'عام', icon: <IoSettings />, description: 'الإعدادات العامة للمنصة' },
    { id: 'auth', name: 'المصادقة', icon: <IoShield />, description: 'إعدادات التسجيل والدخول' },
    { id: 'business', name: 'الأعمال', icon: <IoBusiness />, description: 'حدود وإعدادات الأعمال' },
    { id: 'subscription', name: 'الاشتراكات', icon: <IoTime />, description: 'إعدادات الاشتراكات والتجربة' },
    { id: 'payment', name: 'الدفع', icon: <IoCard />, description: 'إعدادات الدفع والتحويلات' },
    { id: 'domain', name: 'الدومينات', icon: <IoLink />, description: 'إعدادات الدومينات' },
    { id: 'storage', name: 'التخزين', icon: <IoCloud />, description: 'إعدادات رفع الملفات' },
    { id: 'delivery', name: 'التوصيل', icon: <IoCar />, description: 'إعدادات التوصيل العامة' },
    { id: 'notification', name: 'الإشعارات', icon: <IoChatbubble />, description: 'إعدادات الإشعارات' },
    { id: 'security', name: 'الأمان', icon: <IoLockClosed />, description: 'إعدادات الأمان والحماية' },
    { id: 'analytics', name: 'التحليلات', icon: <IoStatsChart />, description: 'إعدادات التتبع والتحليلات' }
  ];

  const renderSettingInput = (setting: Setting) => {
    const commonClass = "w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500";
    
    // ✅ التحقق من وجود value
    const currentValue = setting.value !== undefined && setting.value !== null ? setting.value : '';
    
    switch (setting.type) {
      case 'boolean':
        return (
          <button
            onClick={() => updateSetting(activeGroup, setting.key_name, !currentValue)}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              currentValue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {currentValue ? <IoCheckmark className="inline ml-1" /> : <IoClose className="inline ml-1" />}
            {currentValue ? 'مفعل' : 'معطل'}
          </button>
        );
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => updateSetting(activeGroup, setting.key_name, parseFloat(e.target.value))}
            className={commonClass}
          />
        );
      case 'array':
        // ✅ معالجة الآراي بأمان
        let arrayDisplay = '';
        if (Array.isArray(currentValue)) {
          arrayDisplay = JSON.stringify(currentValue);
        } else if (typeof currentValue === 'string') {
          arrayDisplay = currentValue;
        } else {
          arrayDisplay = '[]';
        }
        return (
          <textarea
            value={arrayDisplay}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateSetting(activeGroup, setting.key_name, parsed);
              } catch {
                updateSetting(activeGroup, setting.key_name, e.target.value);
              }
            }}
            className={`${commonClass} font-mono text-sm`}
            rows={3}
          />
        );
      case 'json':
        // ✅ معالجة JSON بأمان
        let jsonDisplay = '';
        if (typeof currentValue === 'object') {
          jsonDisplay = JSON.stringify(currentValue, null, 2);
        } else if (typeof currentValue === 'string') {
          jsonDisplay = currentValue;
        } else {
          jsonDisplay = '{}';
        }
        return (
          <textarea
            value={jsonDisplay}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateSetting(activeGroup, setting.key_name, parsed);
              } catch {
                updateSetting(activeGroup, setting.key_name, e.target.value);
              }
            }}
            className={`${commonClass} font-mono text-sm`}
            rows={4}
          />
        );
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateSetting(activeGroup, setting.key_name, e.target.value)}
            className={commonClass}
          />
        );
    }
  };

  if (loading) return <Loader fullScreen />;

  const currentGroupSettings = settings[activeGroup] || [];

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚙️ إعدادات المنصة المتقدمة</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة إعدادات المنصة العامة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings}>
            <IoRefresh className="inline ml-1" />
            تحديث
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-6">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`w-full text-right px-4 py-3 flex items-center gap-3 transition ${
                  activeGroup === group.id
                    ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-500'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-lg">{group.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-gray-400">{group.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {groups.find(g => g.id === activeGroup)?.icon}
              {groups.find(g => g.id === activeGroup)?.name}
            </h2>
            <p className="text-gray-500 mb-6">
              {groups.find(g => g.id === activeGroup)?.description}
            </p>

            {currentGroupSettings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد إعدادات في هذه المجموعة
              </div>
            ) : (
              <div className="space-y-4">
                {currentGroupSettings.map((setting) => (
                  <div key={setting.key_name} className="border-b pb-4 last:border-b-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {setting.key_name.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </label>
                    {setting.description && (
                      <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                    )}
                    {renderSettingInput(setting)}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t flex justify-end">
              <Button variant="primary" onClick={handleSave} loading={saving}>
                حفظ جميع الإعدادات
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPlatformSettings;