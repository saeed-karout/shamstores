import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { IoCar, IoMail, IoLockClosed, IoEye, IoEyeOff, IoWarning } from 'react-icons/io5';
import toast from 'react-hot-toast';
import api from '@/services/api';
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

const DeliveryLogin: React.FC = () => {
  const navigate = useNavigate();
  const { isMaintenanceMode, platformName, maxLoginAttempts } = useSettingsContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isMaintenanceMode) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,107,107,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IoWarning size={28} style={{ color: C.red }} />
          </div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>المنصة تحت الصيانة</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>يرجى المحاولة لاحقاً.</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.user?.role === 'delivery_driver') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('userRole', 'delivery_driver');
        toast.success(`مرحباً ${response.user.name}`);
        navigate('/driver/dashboard');
      } else {
        toast.error('هذا الحساب ليس لمندوب توصيل');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'فشل تسجيل الدخول';
      if (typeof errorMessage === 'string' && errorMessage.includes('تفعيل حسابك عبر البريد الإلكتروني')) {
        toast.error('يرجى تفعيل حسابك عبر البريد الإلكتروني أولاً');
        navigate('/auth/email-verification', { state: { email, accountType: 'delivery' } });
        return;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', paddingRight: 38, paddingLeft: 14, paddingTop: 11, paddingBottom: 11,
    background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10,
    color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, background: 'rgba(200,226,53,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, background: 'rgba(200,226,53,0.03)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(200,226,53,0.12)', border: `1px solid ${C.border}`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <IoCar size={30} style={{ color: C.accent }} />
          </div>
          <div style={{ color: C.accent, fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>{platformName || 'SHAM STORES'}</div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>بوابة مندوبي التوصيل</p>
          {maxLoginAttempts && (
            <p style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>الحد الأقصى للمحاولات: {maxLoginAttempts}</p>
          )}
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
          <form onSubmit={handleLogin}>
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
                  placeholder="example@domain.com"
                  dir="ltr"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 }}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <IoLockClosed size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingLeft: 38 }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 0 }}>
                  {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? C.acDk : C.accent, color: C.bg, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <><div style={{ width: 18, height: 18, border: `2px solid ${C.bg}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> جاري الدخول...</>
              ) : (
                <><IoCar size={16} /> تسجيل الدخول</>
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 12 }}>
              ليس لديك حساب؟ تواصل مع إدارة المنصة
            </p>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Link to="/login" style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>دخول المطاعم والمتاجر</Link>
              <span style={{ color: C.border }}>|</span>
              <Link to="/user/login" style={{ color: C.muted, fontSize: 12, textDecoration: 'none' }}>دخول العملاء</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DeliveryLogin;
