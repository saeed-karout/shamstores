// frontend/src/components/admin/AuthenticationSettings.tsx

import React, { useState } from 'react';
import { IoToggle, IoMail, IoLogoGoogle, IoEye, IoEyeOff } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';

const C = {
  bg: '#082E24', card: '#112E23', surf: '#0F3D31', accent: '#C8E235',
  text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)',
  red: '#FF6B6B', blue: '#60A5FA',
};

interface AuthSettings {
  require_email_verification: boolean;
  enable_firebase_auth: boolean;
  max_login_attempts: number;
  allow_registration: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  firebase_project_id: string;
  firebase_api_key: string;
}

interface AuthenticationSettingsProps {
  onUpdate?: () => void;
}

const AuthenticationSettings: React.FC<AuthenticationSettingsProps> = ({ onUpdate }) => {
  const [settings, setSettings] = useState<AuthSettings>({
    require_email_verification: false,
    enable_firebase_auth: false,
    max_login_attempts: 5,
    allow_registration: true,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    firebase_project_id: '',
    firebase_api_key: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    smtp_password: false,
    firebase_api_key: false,
  });

  const handleChange = (key: keyof AuthSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settingsToSave = Object.entries(settings).reduce((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>);

      await api.put('/platform-settings/auth', { settings: settingsToSave });
      toast.success('تم حفظ إعدادات المصادقة بنجاح');
      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving auth settings:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ في حفظ الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: C.muted,
    marginBottom: 6,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
    padding: 16,
    background: C.surf,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IoToggle size={20} />
        إعدادات المصادقة
      </h2>

      {/* General Settings */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.accent, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>⚙️ إعدادات عامة</h3>
        
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={settings.allow_registration}
              onChange={(e) => handleChange('allow_registration', e.target.checked)}
              style={{ marginLeft: 8, cursor: 'pointer' }}
            />
            السماح بالتسجيل الجديد
          </label>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>السماح للمستخدمين بإنشاء حسابات جديدة</p>
        </div>

        <div>
          <label style={labelStyle}>الحد الأقصى لمحاولات تسجيل الدخول</label>
          <input
            type="number"
            value={settings.max_login_attempts}
            onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value))}
            min="1"
            max="20"
            style={inputStyle}
          />
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4, margin: 0 }}>عدد المحاولات قبل حظر الحساب مؤقتاً</p>
        </div>
      </div>

      {/* Email Verification */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.accent, fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoMail size={16} />
          التحقق من البريد الإلكتروني
        </h3>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={settings.require_email_verification}
              onChange={(e) => handleChange('require_email_verification', e.target.checked)}
              style={{ marginLeft: 8, cursor: 'pointer' }}
            />
            مطلوب التحقق من البريد الإلكتروني
          </label>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>إرسال رابط تحقق إلى جميع المستخدمين الجدد</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>خادم SMTP</label>
          <input
            type="text"
            value={settings.smtp_host}
            onChange={(e) => handleChange('smtp_host', e.target.value)}
            placeholder="smtp.gmail.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>المنفذ</label>
            <input
              type="number"
              value={settings.smtp_port}
              onChange={(e) => handleChange('smtp_port', parseInt(e.target.value))}
              placeholder="587"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>من البريد</label>
            <input
              type="email"
              value={settings.smtp_from_email}
              onChange={(e) => handleChange('smtp_from_email', e.target.value)}
              placeholder="noreply@example.com"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>اسم المستخدم (البريد الإلكتروني)</label>
          <input
            type="email"
            value={settings.smtp_user}
            onChange={(e) => handleChange('smtp_user', e.target.value)}
            placeholder="your-email@gmail.com"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>كلمة المرور</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword.smtp_password ? 'text' : 'password'}
              value={settings.smtp_password}
              onChange={(e) => handleChange('smtp_password', e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => ({ ...prev, smtp_password: !prev.smtp_password }))}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
              }}
            >
              {showPassword.smtp_password ? <IoEyeOff size={16} /> : <IoEye size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4, margin: 0 }}>
            لـ Gmail استخدم <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noreferrer" style={{ color: C.accent }}>كلمة مرور التطبيق</a>
          </p>
        </div>
      </div>

      {/* Firebase Authentication */}
      <div style={sectionStyle}>
        <h3 style={{ color: C.accent, fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoLogoGoogle size={16} />
          تسجيل الدخول عبر Google Firebase
        </h3>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={settings.enable_firebase_auth}
              onChange={(e) => handleChange('enable_firebase_auth', e.target.checked)}
              style={{ marginLeft: 8, cursor: 'pointer' }}
            />
            تفعيل تسجيل الدخول عبر Google
          </label>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>السماح بتسجيل الدخول والتسجيل عبر حساب Google</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>معرف المشروع (Project ID)</label>
          <input
            type="text"
            value={settings.firebase_project_id}
            onChange={(e) => handleChange('firebase_project_id', e.target.value)}
            placeholder="your-project-id"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>مفتاح API</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword.firebase_api_key ? 'text' : 'password'}
              value={settings.firebase_api_key}
              onChange={(e) => handleChange('firebase_api_key', e.target.value)}
              placeholder="AIzaSy..."
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => ({ ...prev, firebase_api_key: !prev.firebase_api_key }))}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
              }}
            >
              {showPassword.firebase_api_key ? <IoEyeOff size={16} /> : <IoEye size={16} />}
            </button>
          </div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4, margin: 0 }}>
            احصل على مفتاح API من <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Firebase Console</a>
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: loading ? C.muted : C.accent,
          color: C.bg,
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
};

export default AuthenticationSettings;
