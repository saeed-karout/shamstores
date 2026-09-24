// frontend/src/pages/auth/EmailVerification.tsx — تفعيل البريد برمزٍ من ٦ أرقام

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoMailOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import apiClient from '@/services/api/client';
import useHostBrand from '@/hooks/useHostBrand';
import AuthShell from '@/components/auth/AuthShell';
import { AuthAlert, AuthField, OtpInput, SubmitButton } from '@/components/auth/AuthKit';

const RESEND_SECONDS = 60;

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { brand } = useHostBrand();
  const initialEmail: string = (location.state as any)?.email || '';
  const accountType: string = (location.state as any)?.accountType || 'owner';
  const loginPath = accountType === 'user' ? '/user/login' : '/login';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_SECONDS);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && timer.current) window.clearInterval(timer.current);
        return Math.max(0, prev - 1);
      });
    }, 1000);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return setError('أدخل بريدك الإلكتروني');
    if (code.length !== 6) return setError('أدخل الرمز كاملاً — 6 أرقام');
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/verify-email', { email: email.trim(), code });
      if (response.success) {
        toast.success('تم تفعيل بريدك — سجّل دخولك الآن');
        navigate(loginPath);
      } else {
        setError(response.error || 'الرمز غير صحيح');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'الرمز غير صحيح أو انتهت صلاحيته');
    } finally {
      setLoading(false);
    }
  };

  // إرسالٌ تلقائيّ حين تكتمل الخانات — لا حاجة لزرٍّ بعد آخر رقم
  useEffect(() => {
    if (code.length === 6 && email.trim() && !loading) handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleResend = async () => {
    if (!email.trim()) return setError('أدخل بريدك الإلكتروني أولاً');
    setResending(true);
    setError('');
    try {
      const response = await apiClient.post('/auth/resend-verification', { email: email.trim() });
      if (response.success) {
        toast.success('أرسلنا رمزاً جديداً إلى بريدك');
        startCountdown();
      } else {
        setError(response.error || 'تعذّرت إعادة الإرسال');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'تعذّرت إعادة الإرسال');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      brand={brand}
      title="تحقّق من بريدك"
      subtitle={
        initialEmail ? (
          <>
            أرسلنا رمزاً من 6 أرقام إلى <bdi dir="ltr" style={{ fontWeight: 800, color: 'var(--ss-ink)' }}>{initialEmail}</bdi>
          </>
        ) : (
          'أدخل بريدك والرمز الذي وصلك.'
        )
      }
      panelHeadline="خطوةٌ أخيرة ويصبح حسابك جاهزاً"
      backTo={loginPath}
      backLabel="تسجيل الدخول"
    >
      <form className="ss-auth-form" onSubmit={handleVerify}>
        {!initialEmail && (
          <AuthField
            label="البريد الإلكتروني"
            type="email"
            required
            ltr
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            icon={<IoMailOutline size={19} />}
          />
        )}

        <div className="ss-field">
          <span className="ss-field-label">رمز التحقّق</span>
          <OtpInput value={code} onChange={(v) => { setCode(v); setError(''); }} autoFocus={!!initialEmail} />
          <span className="ss-field-hint" style={{ textAlign: 'center' }}>صالحٌ 15 دقيقة. تحقّق من مجلّد الرسائل غير المرغوبة أيضاً.</span>
        </div>

        {error && <AuthAlert>{error}</AuthAlert>}

        <SubmitButton loading={loading} loadingText="جارٍ التحقّق…" disabled={code.length !== 6}>
          <IoShieldCheckmarkOutline size={20} /> تفعيل الحساب
        </SubmitButton>
      </form>

      <p className="ss-auth-foot">
        لم يصلك الرمز؟{' '}
        <button type="button" className="ss-auth-link" onClick={handleResend} disabled={resending || countdown > 0}>
          {countdown > 0 ? `أعد الإرسال بعد ${countdown} ث` : resending ? 'جارٍ الإرسال…' : 'أعد الإرسال'}
        </button>
      </p>
      {accountType !== 'user' && (
        <p className="ss-auth-foot" style={{ marginTop: 8 }}>
          بريدٌ خاطئ؟{' '}
          <Link to="/register" className="ss-auth-link">
            سجّل من جديد
          </Link>
        </p>
      )}
    </AuthShell>
  );
};

export default EmailVerification;
