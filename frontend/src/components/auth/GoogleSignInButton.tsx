// frontend/src/components/auth/GoogleSignInButton.tsx

import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface GoogleSignInButtonProps {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
  text?: string;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  variant = 'secondary',
  fullWidth = false,
  text = 'تسجيل الدخول عبر Google',
}) => {
  const { signInWithGoogle, loading } = useFirebaseAuth();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  const handleClick = async () => {
    const result = await signInWithGoogle();
    if (result) {
      setAuthData(result.token, result.user);
      navigate('/');
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
