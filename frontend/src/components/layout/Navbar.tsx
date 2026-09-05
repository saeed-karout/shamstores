// TopBar — sits above the main content area in the new design
import React from 'react';
import { IoMenu } from 'react-icons/io5';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
  onMenuOpen?: () => void;
  title?: string;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuOpen, title }) => {
  const { user } = useAuth();

  return (
    <header
      style={{
        height: 60,
        background: '#082E24',
        borderBottom: '1px solid rgba(200,226,53,0.15)',
        display: 'flex',
        alignItems: 'center',
        paddingInline: '20px 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Mobile menu toggle */}
      <button
        aria-label="فتح القائمة"
        onClick={onMenuOpen}
        className="lg:hidden"
        style={{ background: 'none', border: 'none', color: '#9DC4AC', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' }}
      >
        <IoMenu size={20} />
      </button>

      {title && (
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: '#E8F5E9', margin: 0 }}>
          {title}
        </h1>
      )}
      {!title && <div style={{ flex: 1 }} />}

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 7, height: 7, background: '#C8E235', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
        <span style={{ color: '#9DC4AC', fontSize: 12 }}>متصل</span>
      </div>

      {/* مركز الإشعارات — في الشريط العلوي فيصل كل مستخدم مسجّل الدخول،
          تاجراً كان أو مشرفاً */}
      <NotificationBell
        colors={{
          card: '#112E23', surf: '#0F3D31', accent: '#C8E235', bg: '#082E24',
          text: '#E8F5E9', muted: '#9DC4AC', border: 'rgba(200,226,53,0.15)'
        }}
      />

      {/* User avatar */}
      <div style={{ width: 32, height: 32, background: 'rgba(200,226,53,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8E235', fontWeight: 700, fontSize: 14 }}>
        {(user?.name || 'U')[0]}
      </div>
    </header>
  );
};

export default Navbar;