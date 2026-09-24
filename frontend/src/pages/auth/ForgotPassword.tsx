// frontend/src/pages/auth/ForgotPassword.tsx — استعادة كلمة المرور
//
// الخادم جاهزٌ منذ زمن (`/auth/forgot-password` ثم `/auth/reset-password`)
// ولم يكن لها صفحة: من نسي كلمة مروره لم يجد طريقاً إلا مراسلة الأدمن.
//
// خطوتان: البريد، ثم الرمز وكلمة المرور الجديدة. والخادم يردّ الردّ نفسه
// لبريدٍ مسجَّل وغير مسجَّل — فلا نقول هنا «لا حساب بهذا البريد» أبداً.

import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { IoMailOutline, IoLockClosedOutline, IoKeyOutline, IoSendOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client';
import useHostBrand from '@/hooks/useHostBrand';
import AuthShell from '@/components/auth/AuthShell';
import { AuthAlert, AuthField, OtpInput, PasswordField, SubmitButton, isPasswordValid } from '@/components/auth/AuthKit';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { brand } = useHostBrand();
  const forUser = params.get('for') === 'user' || !!brand;
  const loginPath = forUser ? '/user/login' : '/login';

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return setError('أدخل بريدك الإلكتروني');
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setStep('reset');
      toast.success('إن كان البريد مسجّلاً فقد أرسلنا إليه رمزاً');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذّر الإرسال، حاول بعد قليل');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError('أدخل الرمز كاملاً — 6 أرقام');
    if (!isPasswordValid(password)) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفاً ورقماً');
    if (password !== confirm) return setError('كلمتا المرور غير متطابقتين');
    setLoading(true);
    setError('');
    try {
      const response: any = await apiClient.post('/auth/reset-password', { email: email.trim(), code, newPassword: password });
      if (response.success === false) {
        setError(response.error || 'تعذّر تعيين كلمة المرور');
        return;
      }
      toast.success('تم تعيين كلمة المرور — سجّل دخولك بها');
      navigate(loginPath);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'الرمز غير صحيح أو انتهت صلاحيته');
    } finally {
      setLoading(false);
    }
  };

  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <AuthShell
      brand={brand}
      title={step === 'email' ? 'نسيت كلمة المرور؟' : 'كلمة مرور جديدة'}
      subtitle={
        step === 'email' ? (
          'أدخل بريدك وسنرسل إليه رمزاً لتعيين كلمة مرور جديدة.'
        ) : (
          <>
            إن كان <bdi dir="ltr" style={{ fontWeight: 800, color: 'var(--ss-ink)' }}>{email.trim()}</bdi> مسجّلاً فقد وصله رمزٌ صالح 15 دقيقة.
          </>
        )
      }
      panelHeadline="نعيدك إلى حسابك خلال دقيقة"
      backTo={loginPath}
      backLabel="تسجيل الدخول"
    >
      {step === 'email' ? (
        <form className="ss-auth-form" onSubmit={requestCode}>
          <AuthField
            label="البريد الإلكتروني"
            type="email"
            required
            ltr
            autoComplete="email"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="name@example.com"
            icon={<IoMailOutline size={19} />}
          />
          {error && <AuthAlert>{error}</AuthAlert>}
          <SubmitButton loading={loading} loadingText="جارٍ الإرسال…">
            <IoSendOutline size={19} /> أرسل الرمز
          </SubmitButton>
        </form>
      ) : (
        <form className="ss-auth-form" onSubmit={resetPassword}>
          <div className="ss-field">
            <span className="ss-field-label">
              <span>الرمز</span>
              <button type="button" className="ss-auth-link" style={{ fontSize: 13 }} onClick={() => requestCode()} disabled={loading}>
                أعد الإرسال
              </button>
            </span>
            <OtpInput value={code} onChange={(v) => { setCode(v); setError(''); }} autoFocus />
          </div>
          <PasswordField
            label="كلمة المرور الجديدة"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="••••••••"
            icon={<IoLockClosedOutline size={19} />}
            showRules
          />
          <PasswordField
            label="تأكيد كلمة المرور"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError('');
            }}
            placeholder="••••••••"
            icon={<IoLockClosedOutline size={19} />}
            aria-invalid={mismatch}
            hint={mismatch ? <span style={{ color: '#c9383d', fontWeight: 600 }}>كلمتا المرور غير متطابقتين</span> : undefined}
          />
          {error && <AuthAlert>{error}</AuthAlert>}
          <SubmitButton loading={loading} loadingText="جارٍ الحفظ…">
            <IoKeyOutline size={19} /> تعيين كلمة المرور
          </SubmitButton>
          <button
            type="button"
            className="ss-auth-link"
            style={{ justifySelf: 'center', fontSize: 14, fontWeight: 700 }}
            onClick={() => {
              setStep('email');
              setCode('');
              setError('');
            }}
          >
            استخدام بريدٍ آخر
          </button>
        </form>
      )}

      <p className="ss-auth-foot">
        تذكّرتها؟{' '}
        <Link to={loginPath} className="ss-auth-link">
          سجّل الدخول
        </Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPassword;
