import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary:   { background: '#C8E235', color: '#082E24', border: 'none' },
  secondary: { background: '#0F3D31', color: '#9DC4AC', border: '1px solid rgba(200,226,53,0.2)' },
  danger:    { background: 'rgba(255,107,107,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.3)' },
  success:   { background: 'rgba(76,175,125,0.15)', color: '#4CAF7D', border: '1px solid rgba(76,175,125,0.3)' },
  outline:   { background: 'transparent', color: '#C8E235', border: '1.5px solid #C8E235' },
};

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
              border: '2px solid currentColor',
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
