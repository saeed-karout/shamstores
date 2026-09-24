// frontend/src/pages/auth/UserRegister.tsx — حساب زبونٍ جديد (اختياريّ)

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoPersonOutline, IoCallOutline, IoPersonAddOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsContext } from '@/hooks/SettingsContext';
import useHostBrand from '@/hooks/useHostBrand';
import AuthShell from '@/components/auth/AuthShell';
import { AuthAlert, AuthField, PasswordField, SubmitButton, isPasswordValid } from '@/components/auth/AuthKit';
import { APP_DOMAIN, isStorefrontHost } from '@/utils/subdomain';

const UserRegister: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isMaintenanceMode } = useSettingsContext();
  const { brand } = useHostBrand();
  const platformOrigin = isStorefrontHost() ? `https://${APP_DOMAIN}` : '';

  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    setError('');
  };

  const mismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(formData.password)) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً ورقماً');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    try {
      const response = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        restaurantName: ''
      });
      if (response?.requiresEmailVerification) {
        toast.success('أدخل الرمز المرسل إلى بريدك');
        navigate('/auth/email-verification', { state: { email: formData.email.trim(), accountType: 'user' } });
        return;
      }
      const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo);
    } catch {
      // الخطّاف يعرض رسالة الخادم
    } finally {
      setLoading(false);
    }
  };

  if (isMaintenanceMode) {
    return (
      <AuthShell brand={brand} title="نعود بعد قليل" subtitle="المنصّة تحت الصيانة حالياً. يرجى المحاولة لاحقاً.">
        <span />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      brand={brand}
      title="حساب جديد"
      subtitle="الحساب اختياريّ — يحفظ طلباتك لتتابعها وتقيّمها."
      backLabel={brand ? 'العودة للمتجر' : 'الرئيسية'}
    >
      <div className="ss-seg" role="tablist" aria-label="الحساب" style={{ marginTop: 24 }}>
        <Link to="/user/login" role="tab" aria-selected="false">
          تسجيل الدخول
        </Link>
        <Link to="/user/register" role="tab" aria-selected="true">
          حساب جديد
        </Link>
      </div>

      <form className="ss-auth-form" onSubmit={handleSubmit}>
        {error && <AuthAlert>{error}</AuthAlert>}
        <AuthField
          label="الاسم الكامل"
          required
          autoComplete="name"
          value={formData.name}
          onChange={set('name')}
          placeholder="محمد أحمد"
          icon={<IoPersonOutline size={19} />}
        />
        <AuthField
          label="رقم الهاتف"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          ltr
          value={formData.phone}
          onChange={set('phone')}
          placeholder="09xxxxxxxx"
          icon={<IoCallOutline size={19} />}
          hint="ليتواصل معك المتجر بشأن طلبك."
        />
        <AuthField
          label="البريد الإلكتروني"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          ltr
          value={formData.email}
          onChange={set('email')}
          placeholder="name@example.com"
          icon={<IoMailOutline size={19} />}
        />
        <PasswordField
          label="كلمة المرور"
          required
          autoComplete="new-password"
          value={formData.password}
          onChange={set('password')}
          placeholder="••••••••"
          icon={<IoLockClosedOutline size={19} />}
          showRules
        />
        <PasswordField
          label="تأكيد كلمة المرور"
          required
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={set('confirmPassword')}
          placeholder="••••••••"
          icon={<IoLockClosedOutline size={19} />}
          aria-invalid={mismatch}
          hint={mismatch ? <span style={{ color: '#c9383d', fontWeight: 600 }}>كلمتا المرور غير متطابقتين</span> : undefined}
        />
        <SubmitButton loading={loading} loadingText="جارٍ إنشاء الحساب…" style={{ marginTop: 6 }}>
          <IoPersonAddOutline size={20} /> إنشاء الحساب
        </SubmitButton>
        <p className="ss-field-hint" style={{ textAlign: 'center', margin: 0 }}>
          {/* على نطاق التاجر يعيد `/terms` إلى واجهة المتجر — فالرابط لنطاق المنصّة */}
          بإنشاء الحساب توافق على{' '}
          <a href={`${platformOrigin}/terms`} className="ss-auth-link" target={brand ? '_blank' : undefined} rel="noreferrer">
            الشروط
          </a>{' '}
          و
          <a href={`${platformOrigin}/privacy`} className="ss-auth-link" target={brand ? '_blank' : undefined} rel="noreferrer">
            سياسة الخصوصية
          </a>
          .
        </p>
      </form>
    </AuthShell>
  );
};

export default UserRegister;
