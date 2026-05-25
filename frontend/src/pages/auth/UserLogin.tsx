import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  IoMail,
  IoLockClosed,
  IoEye,
  IoEyeOff,
  IoStorefront,
  IoWarning,
  IoCall,
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useSettingsContext } from '@/hooks/SettingsContext';

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

const UserLogin: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMaintenanceMode, platformName } = useSettingsContext();

  useEffect(() => {
    const redirectTo = localStorage.getItem('redirectAfterLogin');
    if (redirectTo) {
      console.log('🔍 Found saved redirect path:', redirectTo);
    }
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔍 User already logged in, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        console.log('🔍 Attempting login...');
        await login(email, password);
      } else {
        console.log('🔍 Attempting registration...');
        if (!phone) {
          toast.error('يرجى إدخال رقم الهاتف');
          return;
        }
        await register({
          name,
          email,
          password,
          phone,
          restaurantName: '',
        });
      }
    } catch (error: any) {
      console.error('❌ Auth error:', error);
    }
  };

  const handleContinueAsGuest = () => {
    console.log('🔍 Continuing as guest');
    localStorage.removeItem('redirectAfterLogin');
    navigate('/', { replace: true });
  };

  if (isMaintenanceMode) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(200,226,53,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IoWarning style={{ color: C.accent, fontSize: 28 }} />
          </div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>وضع الصيانة</h1>
          <p style={{ color: C.muted }}>المنصة تحت الصيانة حالياً. يرجى المحاولة لاحقاً.</p>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 44px 12px 16px',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    color: C.text,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    direction: 'rtl',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: C.muted,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .sham-input::placeholder { color: #5a8a6a; }
        .sham-input:focus { border-color: rgba(200,226,53,0.45) !important; box-shadow: 0 0 0 3px rgba(200,226,53,0.08); }
      `}</style>

      {/* Background glow circles */}
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 380, height: 380,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,226,53,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -140, left: -140,
        width: 420, height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,226,53,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 50, height: 50,
            background: C.accent,
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: `0 0 24px rgba(200,226,53,0.35)`,
          }}>
            <span style={{ color: C.bg, fontWeight: 900, fontSize: 24, lineHeight: 1 }}>S</span>
          </div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 20, letterSpacing: 2 }}>SHAM STORES</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>تسجيل الدخول كعميل</div>
        </div>

        {/* Card */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: 28,
        }}>
          {/* Tab switcher */}
          <div style={{ display: 'flex', marginBottom: 24, background: C.surf, borderRadius: 12, padding: 4 }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: isLogin ? C.accent : 'transparent',
                color: isLogin ? C.bg : C.muted,
                fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
              }}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: !isLogin ? C.accent : 'transparent',
                color: !isLogin ? C.bg : C.muted,
                fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
              }}
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!isLogin && (
              <>
                <div>
                  <label style={labelStyle}>الاسم الكامل</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, display: 'flex', pointerEvents: 'none' }}>
                      <IoStorefront size={18} />
                    </span>
                    <input
                      className="sham-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="محمد أحمد"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>رقم الهاتف</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, display: 'flex', pointerEvents: 'none' }}>
                      <IoCall size={18} />
                    </span>
                    <input
                      className="sham-input"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>البريد الإلكتروني أو رقم الهاتف</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, display: 'flex', pointerEvents: 'none' }}>
                  <IoMail size={18} />
                </span>
                <input
                  className="sham-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, display: 'flex', pointerEvents: 'none' }}>
                  <IoLockClosed size={18} />
                </span>
                <input
                  className="sham-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingLeft: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex',
                  }}
                >
                  {showPassword ? <IoEyeOff size={19} /> : <IoEye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 0',
                background: loading ? C.acDk : C.accent,
                color: C.bg,
                border: 'none',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 4,
                transition: 'background 0.2s',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 18, height: 18,
                    border: `2px solid ${C.bg}`, borderTopColor: 'transparent',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                  جاري التحميل...
                </>
              ) : (
                isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.muted, fontSize: 12 }}>أو</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Continue as guest */}
          <button
            type="button"
            onClick={handleContinueAsGuest}
            style={{
              width: '100%', padding: '11px 0',
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              color: C.muted,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            متابعة بدون تسجيل
          </button>

          {/* Footer links */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <Link
              to="/login"
              style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}
            >
              دخول المطاعم والمتاجر
            </Link>
            <Link
              to="/user/register"
              style={{ color: C.accent, fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
            >
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
