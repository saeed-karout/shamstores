// frontend/src/pages/auth/UserLogin.tsx — دخول الزبون
//
// بهوية التاجر حين تُفتح من نطاقه (`useHostBrand`)، وبهوية المنصّة وإلا.
//
// كان في الصفحة نموذج تسجيلٍ ثانٍ مكرَّر داخلها بجانب صفحة `/user/register`،
// بحقولٍ وقواعدَ مختلفة. المبدّل هنا ينقل إليها فتبقى نسخةٌ واحدة.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoLogInOutline } from 'react-icons/io5';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsContext } from '@/hooks/SettingsContext';
import useHostBrand from '@/hooks/useHostBrand';
import AuthShell from '@/components/auth/AuthShell';
import { AuthDivider, AuthField, PasswordField, SubmitButton } from '@/components/auth/AuthKit';

const UserLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { isMaintenanceMode } = useSettingsContext();
  const { brand } = useHostBrand();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email.trim(), password);
    } catch {
      /* الخطّاف يعرض رسالة الخادم */
    }
  };

  const handleContinueAsGuest = () => {
    localStorage.removeItem('redirectAfterLogin');
    navigate('/', { replace: true });
  };

  if (isMaintenanceMode) {
    return (
      <AuthShell brand={brand} title="نعود بعد قليل" subtitle="المنصّة تحت الصيانة حالياً. يرجى المحاولة لاحقاً." backLabel={brand ? 'المتجر' : 'الرئيسية'}>
        <span />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      brand={brand}
      title="تسجيل الدخول"
      subtitle={brand ? `تابع طلباتك من ${brand.name}.` : 'تابع طلباتك وقيّم مشترياتك.'}
      backLabel={brand ? 'العودة للمتجر' : 'الرئيسية'}
    >
      <div className="ss-seg" role="tablist" aria-label="الحساب" style={{ marginTop: 24 }}>
        <Link to="/user/login" role="tab" aria-selected="true">
          تسجيل الدخول
        </Link>
        <Link to="/user/register" role="tab" aria-selected="false">
          حساب جديد
        </Link>
      </div>

      <form className="ss-auth-form" onSubmit={handleSubmit}>
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
            <Link to="/forgot-password?for=user" className="ss-auth-link" style={{ fontSize: 13 }}>
              نسيت كلمة المرور؟
            </Link>
          }
        />
        <SubmitButton loading={loading} loadingText="جارٍ الدخول…" style={{ marginTop: 6 }}>
          <IoLogInOutline size={20} /> تسجيل الدخول
        </SubmitButton>
      </form>

      {/* الحساب اختياريّ — الطلب يتمّ بلا تسجيل، فلا نحبس الزبون هنا */}
      <AuthDivider>أو</AuthDivider>
      <button type="button" className="ss-auth-secondary" onClick={handleContinueAsGuest}>
        المتابعة بلا حساب
      </button>

      {!brand && (
        <p className="ss-auth-foot">
          صاحب مطعم أو متجر؟{' '}
          <Link to="/login" className="ss-auth-link">
            دخول التجّار
          </Link>
        </p>
      )}
    </AuthShell>
  );
};

export default UserLogin;
