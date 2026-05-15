import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const sizes = { sm: 24, md: 40, lg: 60 };

const Loader: React.FC<LoaderProps> = ({ size = 'md', fullScreen = false }) => {
  const s = sizes[size];

  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: s, height: s,
          border: '3px solid rgba(200,226,53,0.2)',
          borderTopColor: '#C8E235',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {fullScreen && (
        <p style={{ color: '#9DC4AC', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}>جاري التحميل...</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(8,46,36,0.85)',
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
