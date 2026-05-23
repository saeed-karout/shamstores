import React, { useEffect, useState } from 'react';
import { IoSave, IoRefresh } from 'react-icons/io5';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  surf:   '#0F3D31',
  accent: '#C8E235',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
};

interface Setting {
  key: string; value: string; type: string; group: string; description: string; isPublic: boolean;
}

const GROUPS: Record<string, string> = {
  general: 'الإعدادات العامة', payment: 'إعدادات الدفع', email: 'إعدادات البريد الإلكتروني',
  sms: 'إعدادات الرسائل النصية', app: 'إعدادات التطبيق', delivery: 'إعدادات التوصيل'
};

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try { setSettings(await api.get('/admin/settings')); }
    catch { toast.error('فشل تحميل الإعدادات'); }
    finally { setLoading(false); }
  };

  const handleSettingChange = (group: string, key: string, value: string) => {
    setSettings(prev => ({ ...prev, [group]: prev[group].map(s => s.key === key ? { ...s, value } : s) }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const allSettings: Record<string, string> = {};
      Object.values(settings).forEach(group => group.forEach(s => { allSettings[s.key] = s.value; }));
      await api.put('/admin/settings', { settings: allSettings });
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch { toast.error('فشل حفظ الإعدادات'); }
    finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

  if (loading) return <Loader fullScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 24, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800 }}>إعدادات المنصة</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchSettings} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: C.surf, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <IoRefresh size={16} /> تحديث
          </button>
          <button onClick={saveSettings} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: C.accent, color: C.bg, border: 'none', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            <IoSave size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(settings).map(([group, groupSettings]) => (
          <div key={group} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: C.surf, padding: '14px 24px', borderBottom: `1px solid ${C.border}` }}>
              <h2 style={{ color: C.accent, fontSize: 15, fontWeight: 700, margin: 0 }}>{GROUPS[group] || group}</h2>
            </div>
            <div style={{ padding: 24 }}>
              {groupSettings.map((setting, idx) => (
                <div key={setting.key} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: idx < groupSettings.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 8 }}>
                    {setting.description || setting.key}
                  </label>
                  {setting.type === 'boolean' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.text, fontSize: 14 }}>
                      <input type="checkbox" checked={setting.value === 'true'} onChange={e => handleSettingChange(group, setting.key, String(e.target.checked))} style={{ width: 18, height: 18, accentColor: C.accent, cursor: 'pointer' }} />
                      مفعل
                    </label>
                  ) : setting.type === 'json' ? (
                    <textarea value={setting.value} onChange={e => handleSettingChange(group, setting.key, e.target.value)} style={{ ...inputStyle, minHeight: 80, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} rows={4} />
                  ) : (
                    <input type={setting.type === 'number' ? 'number' : 'text'} value={setting.value} onChange={e => handleSettingChange(group, setting.key, e.target.value)} style={inputStyle} />
                  )}
                  <p style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>المفتاح: <code style={{ background: C.surf, padding: '1px 5px', borderRadius: 4, color: C.muted }}>{setting.key}</code></p>
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
