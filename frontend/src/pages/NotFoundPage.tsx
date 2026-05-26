import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { IoWarning, IoHome } from 'react-icons/io5';

const NotFoundPage: React.FC = () => {
  const theme = useTheme();
  
  const colors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    accent: theme.primaryColor || '#C8E235',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif',
      padding: '24px'
    }}>
      <div style={{ 
        background: colors.card, 
        borderRadius: 24, 
        padding: 48, 
        textAlign: 'center',
        maxWidth: 500
      }}>
        <IoWarning size={64} style={{ color: colors.accent, marginBottom: 16 }} />
        <h1 style={{ color: colors.text, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          404
        </h1>
        <h2 style={{ color: colors.muted, fontSize: 18, marginBottom: 16 }}>
          الصفحة غير موجودة
        </h2>
        <p style={{ color: colors.muted, marginBottom: 24 }}>
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <Link 
          to="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: colors.accent,
            color: colors.bg,
            padding: '12px 24px',
            borderRadius: 12,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <IoHome size={18} /> العودة للرئيسية
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;