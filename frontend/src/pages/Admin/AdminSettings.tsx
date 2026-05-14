// pages/Admin/AdminSettings.tsx

import React, { useEffect, useState } from 'react';
import { IoSave, IoRefresh } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

interface Setting {
  key: string;
  value: string;
  type: string;
  group: string;
  description: string;
  isPublic: boolean;
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setSettings(response);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (group: string, key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [group]: prev[group].map(setting =>
        setting.key === key ? { ...setting, value } : setting
      )
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const allSettings: Record<string, string> = {};
      Object.values(settings).forEach(group => {
        group.forEach(setting => {
          allSettings[setting.key] = setting.value;
        });
      });
      await api.put('/admin/settings', { settings: allSettings });
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const groups: Record<string, string> = {
    general: 'الإعدادات العامة',
    payment: 'إعدادات الدفع',
    email: 'إعدادات البريد الإلكتروني',
    sms: 'إعدادات الرسائل النصية',
    app: 'إعدادات التطبيق',
    delivery: 'إعدادات التوصيل'
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إعدادات المنصة</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600"
          >
            <IoRefresh size={20} />
            تحديث
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
          >
            <IoSave size={20} />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(settings).map(([group, groupSettings]) => (
          <div key={group} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <h2 className="text-xl font-bold">{groups[group] || group}</h2>
            </div>
            <div className="p-6 space-y-4">
              {groupSettings.map((setting) => (
                <div key={setting.key} className="border-b pb-3 last:border-0">
                  <label className="block text-sm font-medium mb-1">
                    {setting.description || setting.key}
                  </label>
                  {setting.type === 'boolean' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={setting.value === 'true'}
                        onChange={(e) => handleSettingChange(group, setting.key, String(e.target.checked))}
                        className="w-5 h-5"
                      />
                      <span>مفعل</span>
                    </label>
                  ) : setting.type === 'number' ? (
                    <input
                      type="number"
                      value={setting.value}
                      onChange={(e) => handleSettingChange(group, setting.key, e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : setting.type === 'json' ? (
                    <textarea
                      value={setting.value}
                      onChange={(e) => handleSettingChange(group, setting.key, e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={setting.value}
                      onChange={(e) => handleSettingChange(group, setting.key, e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">المفتاح: {setting.key}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSettings;