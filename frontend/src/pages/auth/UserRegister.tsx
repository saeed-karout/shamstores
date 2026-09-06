import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { IoMail, IoLockClosed, IoPerson, IoCall, IoWarning, IoPersonAdd } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useSettingsContext } from '@/hooks/SettingsContext';
import useHostBrand, { HostBrand } from '@/hooks/useHostBrand';
import { getImageUrl, sizedImage } from '@/utils/imageHelpers';

const PLATFORM_C = {
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

/** ألوان التاجر تحلّ محلّ ألوان المنصّة حين تُفتح الصفحة من نطاقه */
const paletteFor = (brand: HostBrand | null) => {
  if (!brand) return PLATFORM_C;
  const accent = brand.accentColor || PLATFORM_C.accent;
  return {
    bg: brand.backgroundColor || PLATFORM_C.bg,
    card: brand.cardColor || PLATFORM_C.card,
    prim: brand.primaryColor || PLATFORM_C.prim,
    surf: brand.surfaceColor || PLATFORM_C.surf,
    accent,
    acDk: brand.primaryColor || PLATFORM_C.acDk,
    text: brand.textColor || PLATFORM_C.text,
    muted: brand.mutedColor || PLATFORM_C.muted,
    border: `${accent}26`,
    red: PLATFORM_C.red
  };
};

const UserRegister: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { isMaintenanceMode, platformName } = useSettingsContext();
  const { brand } = useHostBrand();
  const C = paletteFor(brand);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }
    setLoading(true);
    try {
      console.log('📝 User register submit:', { email: formData.email });
      const response = await register({ name: formData.name, email: formData.email, password: formData.password, phone: formData.phone, restaurantName: '' });
      if (response?.requiresEmailVerification) {
        console.log('📝 User register requires verification');
        navigate('/auth/email-verification', { state: { email: formData.email, accountType: 'user' } });
        return;
      }
      const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo);
    } catch (error) {
      // error handled in hook
    } finally {
      setLoading(false);
    }
  };

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

  const inputStyle: React.CSSProperties = {
    width: '100%', paddingRight: 38, paddingLeft: 14, paddingTop: 11, paddingBottom: 11,
    background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10,
    color: C.text, fontFamily: 'Cairo, sans-serif', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
  };

  const fields = [
    { id: 'name', label: 'الاسم الكامل', type: 'text', placeholder: 'محمد أحمد', icon: <IoPerson size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} /> },
    { id: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'your@email.com', dir: 'ltr' as const, icon: <IoMail size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} /> },
    { id: 'phone', label: 'رقم الهاتف', type: 'tel', placeholder: '05xxxxxxxx', dir: 'ltr' as const, icon: <IoCall size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} /> },
    { id: 'password', label: 'كلمة المرور', type: 'password', placeholder: '••••••••', icon: <IoLockClosed size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} /> },
    { id: 'confirmPassword', label: 'تأكيد كلمة المرور', type: 'password', placeholder: '••••••••', icon: <IoLockClosed size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 400, height: 400, background: 'rgba(200,226,53,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, background: 'rgba(200,226,53,0.03)', borderRadius: '50%' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* الهوية: هوية التاجر إن فُتحت الصفحة من نطاقه، وإلا هوية المنصّة */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {brand?.logo ? (
            <img
              src={getImageUrl(sizedImage(brand.logo, 'sm'))}
              alt={brand.name}
              style={{
                width: 62, height: 62, borderRadius: 16, objectFit: 'cover',
                margin: '0 auto 12px', display: 'block',
                background: C.surf, border: `1px solid ${C.border}`
              }}
            />
          ) : (
            <div style={{ width: 56, height: 56, background: C.accent, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.bg }}>
                {brand ? brand.name.trim().charAt(0) : 'S'}
              </span>
            </div>
          )}
          <div style={{ color: C.accent, fontWeight: 800, fontSize: brand ? 19 : 20, letterSpacing: brand ? 0 : 1 }}>
            {brand ? brand.name : (platformName || 'SHAM STORES')}
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {brand ? `إنشاء حساب في ${brand.name}` : 'إنشاء حساب عميل جديد'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            {fields.map(f => (
              <div key={f.id} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: C.muted, fontSize: 13, marginBottom: 6 }}>{f.label}</label>
                <div style={{ position: 'relative' }}>
                  {f.icon}
                  <input
                    id={f.id}
                    name={f.id}
                    type={f.type}
                    required
                    value={(formData as any)[f.id]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    dir={f.dir}
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: loading ? C.acDk : C.accent, color: C.bg, fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? (
                  <><div style={{ width: 18, height: 18, border: `2px solid ${C.bg}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> جاري التسجيل...</>
                ) : (
                  <><IoPersonAdd size={16} /> إنشاء حساب</>
                )}
              </button>
            </div>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ color: C.muted, fontSize: 12 }}>لديك حساب بالفعل؟</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <Link to="/user/login" style={{ display: 'block', width: '100%', padding: '11px 0', background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontFamily: 'Cairo, sans-serif', fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
              تسجيل الدخول
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← العودة للرئيسية</Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default UserRegister;
