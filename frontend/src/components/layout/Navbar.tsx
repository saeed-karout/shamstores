// frontend/src/components/layout/Navbar.tsx — الشريط العلويّ للوحة
//
// عنوان الشاشة، ورابط «واجهتي» ليرى التاجر ما يراه زبونه بنقرة، والإشعارات
// والحساب. زجاجيٌّ لاصق فيبقى العنوان ظاهراً مع التمرير.

import React from 'react';
import { Link } from 'react-router-dom';
import { IoMenu, IoOpenOutline } from 'react-icons/io5';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '../../hooks/useAuth';
import { useBusinessSummary } from '../../hooks/useBusinessSummary';

interface NavbarProps {
  onMenuOpen?: () => void;
  title?: string;
}

const BELL_COLORS = {
  card: '#FFFFFF',
  surf: '#F1F5F2',
  accent: '#084835',
  bg: '#F4F7F4',
  text: '#10231B',
  muted: '#5F736A',
  border: 'rgba(16,35,27,0.10)'
};

const Navbar: React.FC<NavbarProps> = ({ onMenuOpen, title }) => {
  const { user } = useAuth();
  const { data: business } = useBusinessSummary();

  return (
    <header className="ss-top">
      <button type="button" className="ss-icon-btn ss-top-menu" onClick={onMenuOpen} aria-label="فتح القائمة">
        <IoMenu size={21} />
      </button>

      <h1 className="ss-top-title">{title}</h1>

      {business?.publicUrl && (
        <a href={business.publicUrl} target="_blank" rel="noreferrer" className="ss-top-store" aria-label="فتح واجهتي في نافذة جديدة">
          <IoOpenOutline size={18} aria-hidden="true" />
          <span>{business.type === 'restaurant' ? 'قائمتي' : 'متجري'}</span>
        </a>
      )}

      <NotificationBell colors={BELL_COLORS} />

      <Link to="/profile" className="ss-top-user" aria-label="حسابي" title={user?.name || ''}>
        {(user?.name || 'U').charAt(0).toUpperCase()}
      </Link>
    </header>
  );
};

export default Navbar;
