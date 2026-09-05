// frontend/src/components/auth/GoogleSignInButton.tsx

import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import AccountTypeDialog, { ChosenAccount } from './AccountTypeDialog';

interface GoogleSignInButtonProps {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  text?: string;
  /**
   * نيّة التسجيل حين يُعرض الزر في صفحة إنشاء حساب تجاري.
   *
   * حين تُمرَّر يُنشأ الحساب مباشرةً بلا سؤال. وحين لا تُمرَّر — زر في
   * صفحة الدخول أو الرئيسية — يسأل الخادمُ الواجهةَ عن النوع بدل أن يخمّن.
   */
  accountType?: 'restaurant' | 'store';
  businessName?: string;
}

/** ما يُنتظر جواب المستخدم عليه: الرمز محفوظ لئلا تُفتح نافذة غوغل ثانيةً */
interface PendingChoice {
  idToken: string;
  email: string | null;
  name: string | null;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  variant = 'secondary',
  fullWidth = false,
  text = 'تسجيل الدخول عبر Google',
  accountType,
  businessName,
}) => {
  const { signInWithGoogle, exchangeIdToken, loading } = useFirebaseAuth();
  const navigate = useNavigate();
  const { setAuthData, login } = useAuth();

  const [pending, setPending] = useState<PendingChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** يُثبّت الجلسة ويوجّه حسب الدور — نقطة واحدة للمسارين */
  const finishSession = (token: string, user: any) => {
    localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));

    if (setAuthData && typeof setAuthData === 'function') {
      setAuthData(token, user);
    } else if (login && typeof login === 'function') {
      login(token, user);
    } else {
      console.warn('⚠️ No setAuthData or login function found');
    }

    toast.success('تم تسجيل الدخول بنجاح');

    if (user?.role === 'super_admin') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'owner') {
      navigate('/dashboard');
    } else if (user?.role === 'delivery_driver') {
      navigate('/delivery/dashboard');
    } else {
      navigate('/');
    }
  };

  const handleClick = async () => {
    // اسم النشاط مطلوب قبل الضغط في صفحة التسجيل: غوغل يعطينا اسماً شخصياً
    // لا اسم متجر، ومتابعة بلا اسم تُنتج حساباً ناقصاً.
    const trimmedName = businessName?.trim() || '';
    if (accountType && !trimmedName) {
      toast.error(
        accountType === 'restaurant'
          ? 'أدخل اسم المطعم أولاً ثم تابع عبر Google'
          : 'أدخل اسم المتجر أولاً ثم تابع عبر Google'
      );
      return;
    }

    try {
      const result = await signInWithGoogle(
        accountType ? { accountType, businessName: trimmedName } : undefined
      );

      // null = تراجُع أو خطأ عُرض بالفعل — لا رسالة ثانية
      if (!result) return;

      if (result.needsAccountType || !result.token) {
        setPending({
          idToken: result.idToken || '',
          email: result.email ?? null,
          name: result.name ?? null
        });
        return;
      }

      finishSession(result.token, result.user);
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error?.message || 'فشل تسجيل الدخول بواسطة Google');
    }
  };

  const handleChoice = async (choice: ChosenAccount) => {
    if (!pending) return;
    setSubmitting(true);
    try {
      // الرمز نفسه يُعاد إرساله مع النيّة — الخادم ينشئ الحساب الآن فقط
      const result = await exchangeIdToken(pending.idToken, choice);

      if (result.needsAccountType || !result.token) {
        // لا ينبغي أن يحدث: أرسلنا النوع. رسالة صريحة خير من حلقة صامتة.
        toast.error('تعذّر تحديد نوع الحساب — أعد المحاولة');
        return;
      }

      setPending(null);
      finishSession(result.token, result.user);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message;
      // الرمز صالح دقائق معدودة؛ انتهاؤه يحتاج نافذة غوغل من جديد
      toast.error(message || 'تعذّر إنشاء الحساب — أعد تسجيل الدخول عبر Google');
    } finally {
      setSubmitting(false);
    }
  };

  const colors = {
    primary: {
      bg: '#0D4A3A',
      border: 'rgba(200,226,53,0.2)',
      text: '#E8F5E9',
      hover: '#164D3E',
    },
    secondary: {
      bg: 'rgba(200,226,53,0.1)',
      border: 'rgba(200,226,53,0.3)',
      text: '#C8E235',
      hover: 'rgba(200,226,53,0.15)',
    },
  };

  const style = colors[variant];

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: fullWidth ? '100%' : 'auto',
          padding: '12px 24px',
          background: style.bg,
          border: `1px solid ${style.border}`,
          borderRadius: 12,
          color: style.text,
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.target as HTMLElement).style.background = style.hover;
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = style.bg;
        }}
      >
        {loading ? (
          <>
            <span style={{ fontSize: 16 }}>⏳</span>
            جاري التحميل...
          </>
        ) : (
          <>
            <FcGoogle size={20} />
            {text}
          </>
        )}
      </button>

      <AccountTypeDialog
        open={!!pending}
        email={pending?.email ?? null}
        suggestedName={pending?.name ?? null}
        submitting={submitting}
        onCancel={() => setPending(null)}
        onChoose={handleChoice}
      />
    </>
  );
};

export default GoogleSignInButton;
