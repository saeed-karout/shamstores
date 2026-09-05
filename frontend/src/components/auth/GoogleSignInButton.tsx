// frontend/src/components/auth/GoogleSignInButton.tsx

import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface GoogleSignInButtonProps {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  text?: string;
  /**
   * نيّة التسجيل حين يُعرض الزر في صفحة إنشاء حساب تجاري.
   *
   * بدونها ينشئ الخادم حساب زبون عادي: صاحب متجر يسجّل بغوغل فيبقى بلا
   * متجر ودوره `user`. تُمرَّر للحسابات الجديدة وحدها.
   */
  accountType?: 'restaurant' | 'store';
  businessName?: string;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  variant = 'secondary',
  fullWidth = false,
  text = 'تسجيل الدخول عبر Google',
  accountType,
  businessName,
}) => {
  const { signInWithGoogle, loading } = useFirebaseAuth();
  const navigate = useNavigate();
  const { setAuthData, login } = useAuth(); // ✅ تأكد من وجود setAuthData

  const handleClick = async () => {
    // اسم النشاط مطلوب قبل الضغط: غوغل يعطينا بريداً واسماً شخصياً لا اسم
    // متجر، ومتابعة بلا اسم تُنشئ حساب زبون — نفس العطل الذي نصلحه.
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
      
      if (result && result.token) {
        console.log('✅ Google sign-in successful, storing token');
        
        // تخزين التوكن مباشرة
        localStorage.setItem('token', result.token);
        
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        
        // ✅ التحقق من وجود setAuthData قبل استدعائها
        if (setAuthData && typeof setAuthData === 'function') {
          setAuthData(result.token, result.user);
        } else if (login && typeof login === 'function') {
          // إذا كان هناك دالة login بديلة
          login(result.token, result.user);
        } else {
          console.warn('⚠️ No setAuthData or login function found');
        }
        
        toast.success('تم تسجيل الدخول بنجاح');
        
        // توجيه المستخدم بناءً على دوره
        if (result.user?.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else if (result.user?.role === 'owner') {
          navigate('/dashboard');
        } else if (result.user?.role === 'delivery_driver') {
          navigate('/delivery/dashboard');
        } else {
          navigate('/');
        }
      } else {
        throw new Error('No token received from Google sign-in');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error(error.message || 'فشل تسجيل الدخول بواسطة Google');
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
  );
};

export default GoogleSignInButton;