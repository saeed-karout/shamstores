// components/common/Button.tsx

import React from 'react';
import { useTheme } from '@/context/ThemeContext'; // ✅ استخدم useTheme فقط

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const sizePadding = { sm: '6px 14px', md: '10px 18px', lg: '13px 24px' };
const sizeFontSize = { sm: 12, md: 14, lg: 15 };

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  style,
  disabled,
  ...props
}) => {
  const theme = useTheme(); // ✅ استخدم useTheme مباشرة
  const primaryColor = theme.primaryColor || '#084835';
  const secondaryColor = theme.secondaryColor || '#10B981';
  const bgColor = theme.backgroundColor || '#F4F7F4';
  const textColor = theme.textColor || '#10231B';
  const mutedColor = theme.mutedColor || '#5F736A';
  const surfaceColor = theme.surfaceColor || '#F1F5F2';

  const variantStyles: Record<string, React.CSSProperties> = {
    primary:   { background: primaryColor, color: bgColor, border: 'none' },
    secondary: { background: surfaceColor, color: mutedColor, border: `1px solid ${primaryColor}20` },
    danger:    { background: 'rgba(214,69,69,0.15)', color: '#D64545', border: '1px solid rgba(214,69,69,0.3)' },
    success:   { background: 'rgba(76,175,125,0.15)', color: '#4CAF7D', border: '1px solid rgba(76,175,125,0.3)' },
    outline:   { background: 'transparent', color: primaryColor, border: `1.5px solid ${primaryColor}` },
  };

  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        ...variantStyles[variant],
        padding: sizePadding[size],
        fontSize: sizeFontSize[size],
        fontFamily: 'Cairo, sans-serif',
        fontWeight: 700,
        borderRadius: 10,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.2s',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <>
          <div
            style={{
              width: 16, height: 16,
              border: `2px solid ${variant === 'primary' ? bgColor : primaryColor}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              opacity: 0.8,
            }}
          />
          <span>جاري التحميل...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      ) : children}
    </button>
  );
};

export default Button;