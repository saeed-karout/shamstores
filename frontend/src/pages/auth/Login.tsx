// frontend/src/pages/auth/Login.tsx — Sham Stores dark-green theme
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { IoMail, IoLockClosed, IoWarning, IoEye, IoEyeOff, IoRocket } from 'react-icons/io5';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
};

const Login: React.FC = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const { login, loading } = useAuth();
  const { isMaintenanceMode, platformName, loading: settingsLoading, error: settingsError } = useSettingsContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await login(email, password); } catch {}
  };

  // ── Error state ──────────────────────────────────────────────────
  if (settingsError) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,107,107,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IoWarning size={28} style={{ color: C.red }} />
          </div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>المنصة غير متاحة</h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>عذراً، يرجى المحاولة لاحقاً.</p>
          <Link to="/" style={{ color: C.accent, fontSize: 14 }}>العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  // ── Loading state ────────────────────────────────────────────────
  if (settingsLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="sham-spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: C.muted, fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Cairo, sans-serif' }}
      dir="rtl"
    >
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, background: `${C.accent}06`, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, background: `${C.accent}04`, borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, background: C.accent, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: C.bg }}>S</span>
          </div>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>SHAM STORES</div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>تسجيل الدخول إلى لوحة التحكم</p>
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>

          {/* Role tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: C.prim, padding: 4, borderRadius: 12 }}>
            {[
              { id: 'owner',      label: '🍽️ مالك نشاط' },
              { id: 'admin',      label: '🔑 مدير المنصة' },
              { id: 'delivery',   label: '🚗 سائق' },
            ].map(t => (
              <Link
                key={t.id}
                to={t.id === 'admin' ? '/login' : t.id === 'delivery' ? '/delivery/login' : '/login'}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, textDecoration: 'none',
                  background: t.id === 'owner' ? C.accent : 'transparent',
                  color: t.id === 'owner' ? C.bg : C.muted,
                  fontWeight: t.id === 'owner' ? 700 : 400,
                  fontSize: 11, textAlign: 'center', transition: 'all 0.15s',
                }}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 }}>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <IoMail size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="info@example.com"
                  dir="ltr"
                  style={{
                    width: '100%', paddingRight: 38, paddingLeft: 14, paddingTop: 11, paddingBottom: 11,
                    background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10,
                    color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <IoLockClosed size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: '100%', paddingRight: 38, paddingLeft: 38, paddingTop: 11, paddingBottom: 11,
                    background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10,
                    color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}
                >
                  {showPw ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: loading ? C.acDk : C.accent, color: C.bg,
                fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <><div style={{ width: 18, height: 18, border: `2px solid ${C.bg}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> جاري الدخول...</>
              ) : (
                <><IoRocket size={16} /> تسجيل الدخول</>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/user/login"     style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>دخول العملاء</Link>
            <span style={{ color: C.border, fontSize: 12 }}>|</span>
            <Link to="/delivery/login" style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>دخول السائقين</Link>
            <span style={{ color: C.border, fontSize: 12 }}>|</span>
            <Link to="/register"       style={{ color: C.accent, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>إنشاء حساب</Link>
          </div>
        </div>

        {/* Back to home */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← العودة للرئيسية</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
