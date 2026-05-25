// components/common/Loader.tsx

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const sizes = { sm: 24, md: 40, lg: 60 };

const Loader: React.FC<LoaderProps> = ({ size = 'md', fullScreen = false }) => {
  const s = sizes[size];
  const theme = useTheme();
  
  const primaryColor = theme.accentColor || theme.primaryColor || '#C8E235';
  const bgColor = theme.backgroundColor || '#082E24';
  const mutedColor = theme.mutedColor || '#9DC4AC';

  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: s, height: s,
          border: `3px solid ${primaryColor}33`, // 33 = 20% opacity
          borderTopColor: primaryColor,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {fullScreen && (
        <p style={{ color: mutedColor, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>جاري التحميل...</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          background: `${bgColor}D9`, // D9 = 85% opacity
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loader;