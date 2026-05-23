// frontend/src/pages/Admin/AdminPlatformSettings.tsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import MaintenanceToggle from '../../components/admin/MaintenanceToggle';
import {
  IoSettings, IoGlobe, IoShield, IoCard, IoCar,
  IoMail, IoChatbubble, IoCloud, IoBusiness, IoTime,
  IoLockClosed, IoImage, IoLink, IoStatsChart,
  IoCheckmark, IoClose, IoRefresh, IoSearch,
  IoCode, IoShare, IoLogoTwitter, IoLogoFacebook
} from 'react-icons/io5';
import toast from 'react-hot-toast';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA', purple: '#A78BFA', orange: '#FB923C',
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
      const response = await api.get('/platform-settings/all');
      console.log('API Response:', response);
      
      // استخراج البيانات من الاستجابة
      let settingsData = response;
      if (response?.data) {
        settingsData = response.data;
      }
      
      console.log('Settings Data:', settingsData);
      
      // التأكد من أن settingsData هو كائن
      if (settingsData && typeof settingsData === 'object') {
        setSettings(settingsData);
        
        // تعيين أول مجموعة نشطة
        const groupKeys = Object.keys(settingsData);
        if (groupKeys.length > 0) {
          setActiveGroup(groupKeys[0]);
        }
      } else {
        console.error('Invalid settings data format:', settingsData);
        setSettings({});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('حدث خطأ في جلب الإعدادات');
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (group: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [group]: prev[group]?.map(s =>
        s.key_name === key ? { ...s, value } : s
      ) || []
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allSettings: Record<string, any> = {};
      Object.values(settings).forEach(group => {
        group?.forEach(setting => {
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

  // تعريف جميع المجموعات
  const allGroups = [
    { id: 'general', name: 'عام', icon: <IoSettings />, description: 'الإعدادات العامة للمنصة' },
    { id: 'auth', name: 'المصادقة', icon: <IoShield />, description: 'إعدادات التسجيل والدخول' },
    { id: 'payment', name: 'الدفع', icon: <IoCard />, description: 'إعدادات الدفع والتحويلات' },
    { id: 'delivery', name: 'التوصيل', icon: <IoCar />, description: 'إعدادات التوصيل العامة' },
    { id: 'security', name: 'الأمان', icon: <IoLockClosed />, description: 'إعدادات الأمان والحماية' },
    { id: 'analytics', name: 'التحليلات', icon: <IoStatsChart />, description: 'إعدادات التتبع والتحليلات' },
    { id: 'seo', name: 'SEO', icon: <IoGlobe />, description: 'إعدادات تحسين محركات البحث' },
    { id: 'business', name: 'الأعمال', icon: <IoBusiness />, description: 'حدود وإعدادات الأعمال' },
    { id: 'subscription', name: 'الاشتراكات', icon: <IoTime />, description: 'إعدادات الاشتراكات والتجربة' },
    { id: 'domain', name: 'الدومينات', icon: <IoLink />, description: 'إعدادات الدومينات' },
    { id: 'storage', name: 'التخزين', icon: <IoCloud />, description: 'إعدادات رفع الملفات' },
    { id: 'notification', name: 'الإشعارات', icon: <IoChatbubble />, description: 'إعدادات الإشعارات' },
  ];

  // الحصول على المجموعات المتاحة (التي تحتوي على بيانات)
  const getAvailableGroups = () => {
    const available: typeof allGroups = [];
    for (const group of allGroups) {
      if (settings[group.id] && settings[group.id].length > 0) {
        available.push(group);
      }
    }
    // إذا لم توجد مجموعات، عرض جميع المجموعات مع رسالة
    if (available.length === 0 && Object.keys(settings).length > 0) {
      // إضافة مجموعات من البيانات الفعلية
      for (const groupId of Object.keys(settings)) {
        const existingGroup = allGroups.find(g => g.id === groupId);
        if (existingGroup) {
          available.push(existingGroup);
        } else {
          available.push({ id: groupId, name: groupId, icon: <IoSettings />, description: '' });
        }
      }
    }
    return available;
  };

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

  const availableGroups = getAvailableGroups();
  const currentGroupSettings = settings[activeGroup] || [];

  // إذا لم تكن هناك بيانات على الإطلاق
  if (Object.keys(settings).length === 0) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
          <IoRefresh size={48} style={{ marginBottom: 16 }} />
          <h3>لا توجد إعدادات</h3>
          <p>حدث خطأ في تحميل الإعدادات. يرجى تحديث الصفحة.</p>
          <Button variant="primary" onClick={fetchSettings}>إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
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

      {/* Maintenance Mode Toggle */}
      <div style={{ marginBottom: 24 }}>
        <MaintenanceToggle />
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Sidebar - قائمة المجموعات */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 24 }}>
            {availableGroups.map((group) => {
              const isActive = activeGroup === group.id;
              const groupData = settings[group.id];
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
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{group.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted, opacity: 0.8 }}>
                      {groupData?.length || 0} إعداد
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content - عرض الإعدادات */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 16, padding: 24 }}>
            <h2 style={{ color: C.text, fontWeight: 700, fontSize: 18, marginTop: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {availableGroups.find(g => g.id === activeGroup)?.icon}
              {availableGroups.find(g => g.id === activeGroup)?.name}
            </h2>
            <p style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>
              {availableGroups.find(g => g.id === activeGroup)?.description || 'إعدادات هذه المجموعة'}
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
                      {setting.key_name === 'allow_registration' ? '🔓 السماح بالتسجيل' :
                       setting.key_name === 'require_email_verification' ? '📧 طلب تفعيل البريد' :
                       setting.key_name === 'max_login_attempts' ? '🔐 الحد الأقصى لمحاولات الدخول' :
                       setting.key_name === 'session_timeout_minutes' ? '⏱️ مدة انتهاء الجلسة (دقائق)' :
                       setting.key_name === 'lockout_duration' ? '🔒 مدة قفل الحساب (دقائق)' :
                       setting.key_name === 'enable_cash_on_delivery' ? '💵 تفعيل الدفع عند الاستلام' :
                       setting.key_name === 'enable_online_payment' ? '💳 تفعيل الدفع الإلكتروني' :
                       setting.key_name === 'enable_2fa' ? '🔑 تفعيل المصادقة الثنائية' :
                       setting.key_name === 'prevent_weak_passwords' ? '🛡️ منع كلمات المرور الضعيفة' :
                       setting.key_name === 'enable_analytics' ? '📊 تفعيل التحليلات' :
                       setting.key_name === 'maintenance_mode' ? '🔧 وضع الصيانة' :
                       setting.key_name === 'default_delivery_fee' ? '🚚 سعر التوصيل الافتراضي' :
                       setting.key_name === 'estimated_delivery_time' ? '⏰ وقت التوصيل المتوقع (دقائق)' :
                       setting.key_name === 'free_delivery_threshold' ? '🎁 الحد الأدنى للتوصيل المجاني' :
                       setting.key_name === 'default_currency' ? '💰 العملة الافتراضية' :
                       setting.key_name === 'currency_symbol' ? '💱 رمز العملة' :
                       setting.key_name === 'site_name' ? '🏷️ اسم المنصة' :
                       setting.key_name === 'site_name_en' ? '🌐 اسم المنصة (إنجليزي)' :
                       setting.key_name === 'primary_color' ? '🎨 اللون الأساسي' :
                       setting.key_name === 'secondary_color' ? '🎨 اللون الثانوي' :
                       setting.key_name === 'contact_email' ? '📧 بريد الدعم' :
                       setting.key_name === 'contact_phone' ? '📞 هاتف الدعم' :
                       setting.key_name === 'contact_whatsapp' ? '💬 واتساب الدعم' :
                       setting.key_name === 'site_logo' ? '🖼️ شعار المنصة' :
                       setting.key_name === 'site_favicon' ? '⭐ أيقونة المنصة' :
                       setting.key_name === 'address' ? '📍 العنوان' :
                       setting.key_name === 'address_en' ? '📍 العنوان (إنجليزي)' :
                       setting.key_name.split('_').map(word =>
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