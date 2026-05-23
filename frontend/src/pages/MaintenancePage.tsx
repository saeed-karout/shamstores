import React from 'react';
import { Link } from 'react-router-dom';
import { IoWarning, IoRefresh, IoHome } from 'react-icons/io5';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  surf:   '#0F3D31',
  accent: '#C8E235',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
};

const MaintenancePage: React.FC = () => {
  const handleRefresh = () => { window.location.reload(); };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 40, boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
          <div style={{ width: 88, height: 88, background: 'rgba(200,226,53,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <IoWarning size={40} style={{ color: C.accent }} />
          </div>

          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 800, marginBottom: 12 }}>وضع الصيانة</h1>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
            المنصة تحت الصيانة حالياً. نعمل على تحسين الخدمة لتقديم أفضل تجربة.
            <br />يرجى المحاولة لاحقاً.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleRefresh}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: C.accent, color: C.bg, border: 'none', borderRadius: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              <IoRefresh size={18} /> تحديث الصفحة
            </button>
            <Link
              to="/"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', background: C.surf, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
            >
              <IoHome size={18} /> العودة للرئيسية
            </Link>
          </div>

          <p style={{ color: C.muted, fontSize: 12, marginTop: 24 }}>توقع عودة الخدمة قريباً. شكراً لتفهمك.</p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
