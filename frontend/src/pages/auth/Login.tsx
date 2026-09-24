// frontend/src/pages/auth/Login.tsx — دخول التجّار ومدير المنصّة وموظّفيهما
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoLogInOutline } from 'react-icons/io5';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsContext } from '@/hooks/SettingsContext';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import AuthShell from '@/components/auth/AuthShell';
import { AuthAlert, AuthDivider, AuthField, PasswordField, SubmitButton } from '@/components/auth/AuthKit';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const { error: settingsError } = useSettingsContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // الخطأ يُعرض من الخطّاف نفسه برسالة الخادم
    try {
      await login(email.trim(), password);
    } catch {
      /* معروضٌ مسبقاً */
    }
  };

  return (
    <AuthShell title="مرحباً بك مجدداً" subtitle="سجّل دخولك لمتابعة لوحة التحكم">
      {/* تعذّر جلب إعدادات المنصّة لا يمنع الدخول — كانت الصفحة تُستبدل كلّها
          بـ«المنصة غير متاحة» فيُحجب التاجر عن لوحته لخللٍ في إعدادٍ جانبيّ */}
      {settingsError && (
        <div style={{ marginTop: 18 }}>
          <AuthAlert tone="info">تعذّر تحميل بعض إعدادات المنصّة. يمكنك تسجيل الدخول كالمعتاد.</AuthAlert>
        </div>
      )}

      <div className="ss-seg" role="tablist" aria-label="نوع الحساب" style={{ marginTop: 24 }}>
        <Link to="/login" role="tab" aria-selected="true">
          تاجر أو إدارة
        </Link>
        <Link to="/user/login" role="tab" aria-selected="false">
          زبون
        </Link>
      </div>

      <form className="ss-auth-form" onSubmit={handleSubmit} noValidate={false}>
        <AuthField
          label="البريد الإلكتروني"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          ltr
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          icon={<IoMailOutline size={19} />}
        />
        <PasswordField
          label="كلمة المرور"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          icon={<IoLockClosedOutline size={19} />}
          labelAside={
            <Link to="/forgot-password" className="ss-auth-link" style={{ fontSize: 13 }}>
              نسيت كلمة المرور؟
            </Link>
          }
        />
        <SubmitButton loading={loading} loadingText="جارٍ الدخول…" style={{ marginTop: 6 }}>
          <IoLogInOutline size={20} /> تسجيل الدخول
        </SubmitButton>
      </form>

      <AuthDivider />
      <GoogleSignInButton text="المتابعة عبر Google" variant="light" fullWidth />

      <p className="ss-auth-foot">
        ليس لديك حساب؟{' '}
        <Link to="/register" className="ss-auth-link">
          أنشئ متجرك مجاناً
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
