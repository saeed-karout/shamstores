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

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA',
};

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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: C.surf,
    border: '1px solid ' + C.border,
    borderRadius: 10,
    color: C.text,
    fontFamily: 'Cairo, sans-serif',
    outline: 'none',
  };

  const renderSettingInput = (setting: Setting) => {
    const currentValue = setting.value !== undefined && setting.value !== null ? setting.value : '';

    switch (setting.type) {
      case 'boolean':
        return (
          <button
            onClick={() => updateSetting(activeGroup, setting.key_name, !currentValue)}
            style={{
              padding: '4px 12px',
              borderRadius: 8,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              background: currentValue ? 'rgba(200,226,53,0.12)' : 'rgba(255,107,107,0.12)',
              color: currentValue ? C.accent : C.red,
            }}
          >
            {currentValue
              ? <IoCheckmark style={{ display: 'inline', marginLeft: 4 }} />
              : <IoClose style={{ display: 'inline', marginLeft: 4 }} />}
            {currentValue ? 'مفعل' : 'معطل'}
          </button>
        );
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => updateSetting(activeGroup, setting.key_name, parseFloat(e.target.value))}
            style={inputStyle}
          />
        );
      case 'array': {
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
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
            rows={3}
          />
        );
      }
      case 'json': {
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
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
            rows={4}
          />
        );
      }
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateSetting(activeGroup, setting.key_name, e.target.value)}
            style={inputStyle}
          />
        );
    }
  };

  if (loading) return <Loader fullScreen />;

  const currentGroupSettings = settings[activeGroup] || [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: C.text, fontWeight: 700, fontSize: 22, margin: 0 }}>⚙️ إعدادات المنصة المتقدمة</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>إدارة إعدادات المنصة العامة</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={fetchSettings}>
            <IoRefresh style={{ display: 'inline', marginLeft: 4 }} />
            تحديث
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 24 }}>
            {groups.map((group) => {
              const isActive = activeGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  style={{
                    width: '100%',
                    textAlign: 'right',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: isActive ? 'rgba(200,226,53,0.06)' : 'transparent',
                    border: 'none',
                    borderRight: isActive ? `4px solid ${C.accent}` : '4px solid transparent',
                    cursor: 'pointer',
                    color: isActive ? C.accent : C.muted,
                    fontFamily: 'Cairo, sans-serif',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{group.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{group.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted, opacity: 0.8 }}>{group.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {groups.find(g => g.id === activeGroup)?.icon}
              {groups.find(g => g.id === activeGroup)?.name}
            </h2>
            <p style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>
              {groups.find(g => g.id === activeGroup)?.description}
            </p>

            {currentGroupSettings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>
                لا توجد إعدادات في هذه المجموعة
              </div>
            ) : (
              <div>
                {currentGroupSettings.map((setting, idx) => (
                  <div
                    key={setting.key_name}
                    style={{
                      borderBottom: idx < currentGroupSettings.length - 1 ? '1px solid ' + C.border : 'none',
                      paddingBottom: 16,
                      marginBottom: 16,
                    }}
                  >
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                      {setting.key_name.split('_').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </label>
                    {setting.description && (
                      <p style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{setting.description}</p>
                    )}
                    {renderSettingInput(setting)}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid ' + C.border, display: 'flex', justifyContent: 'flex-end' }}>
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
