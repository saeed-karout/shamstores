// frontend/src/pages/auth/Register.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettingsContext } from '../../hooks/SettingsContext';
import Button from '../../components/common/Button';
import {
  IoRestaurant,
  IoMail,
  IoLockClosed,
  IoPerson,
  IoCall,
  IoStorefront,
  IoWarning
} from 'react-icons/io5';
import toast from 'react-hot-toast';
import apiClient from '../../services/api/client';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  surf:   '#0F3D31',
  surfL:  '#164D3E',
  accent: '#C8E235',
  acDk:   '#A8C220',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
  blue:   '#60A5FA',
  yellow: '#F59E0B',
  purple: '#A78BFA',
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const {
    isRegistrationAllowed,
    requireEmailVerification,
    platformName,
    isMaintenanceMode
  } = useSettingsContext();

  const [accountType, setAccountType] = useState<'restaurant' | 'store'>('restaurant');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
  });
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);

  // التحقق من وضع الصيانة
  if (isMaintenanceMode) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} dir="rtl">
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '2rem', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(245,158,11,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <IoWarning style={{ color: C.yellow, fontSize: 28 }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>🔧 وضع الصيانة</h1>
          <p style={{ color: C.muted }}>التسجيل مغلق حالياً بسبب أعمال الصيانة.</p>
          <Link to="/" style={{ marginTop: '1rem', display: 'inline-block', color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // التحقق من أن التسجيل مسموح
  if (!isRegistrationAllowed) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} dir="rtl">
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: '2rem', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,107,107,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <IoWarning style={{ color: C.red, fontSize: 28 }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text, marginBottom: '0.5rem' }}>🔒 التسجيل مغلق</h1>
          <p style={{ color: C.muted }}>عذراً، التسجيل في المنصة مغلق حالياً.</p>
          <Link to="/login" style={{ marginTop: '1rem', display: 'inline-block', color: C.accent, textDecoration: 'none', fontWeight: 600 }}>
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (!formData.businessName.trim()) {
      setError(`يرجى إدخال اسم ${accountType === 'restaurant' ? 'المطعم' : 'المتجر'}`);
      return;
    }

    setRegistering(true);
    setError('');

    try {
      console.log('📝 Register submit:', { accountType, email: formData.email });
      if (accountType === 'restaurant') {
        const response = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          restaurantName: formData.businessName,
        });

        const requiresVerification = response?.requiresEmailVerification ?? requireEmailVerification;
        console.log('📝 Register restaurant response:', { requiresVerification });

        if (requiresVerification) {
          toast.success('تم إنشاء الحساب. يرجى تفعيل بريدك الإلكتروني');
          navigate('/auth/email-verification', { state: { email: formData.email, accountType: 'owner' } });
        } else {
          toast.success('تم إنشاء حساب المطعم بنجاح');
          navigate('/dashboard');
        }
      } else {
        const response = await apiClient.post('/auth/register-store', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          storeName: formData.businessName,
        });

        if (response.success) {
          const responseData = response.data;
          const requiresVerification = responseData?.requiresEmailVerification ?? requireEmailVerification;
          console.log('📝 Register store response:', { requiresVerification, hasToken: !!responseData?.token });

          if (responseData?.token && !requiresVerification) {
            localStorage.setItem('token', responseData.token);
            localStorage.setItem('user', JSON.stringify(responseData.user));
          }

          if (requiresVerification) {
            toast.success('تم إنشاء الحساب. يرجى تفعيل بريدك الإلكتروني');
            navigate('/auth/email-verification', { state: { email: formData.email, accountType: 'owner' } });
          } else {
            toast.success('تم إنشاء حساب المتجر بنجاح');
            navigate('/dashboard');
          }
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'حدث خطأ في إنشاء الحساب');
    } finally {
      setRegistering(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    paddingRight: '2.5rem',
    paddingLeft: '0.75rem',
    paddingTop: '0.625rem',
    paddingBottom: '0.625rem',
    background: C.surf,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: C.muted,
    marginBottom: '0.375rem',
  };

  const iconWrapStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    paddingRight: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem 1rem' }} dir="rtl">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(200,226,53,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}` }}>
            {accountType === 'restaurant' ? (
              <IoRestaurant style={{ fontSize: 32, color: C.accent }} />
            ) : (
              <IoStorefront style={{ fontSize: 32, color: C.accent }} />
            )}
          </div>
        </div>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: C.text, marginBottom: '0.5rem' }}>
          إنشاء حساب {accountType === 'restaurant' ? 'مطعم' : 'متجر'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: C.muted }}>
          منصة {platformName}
        </p>
        {requireEmailVerification && (
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: C.accent }}>
            ⚡ سيتم إرسال رابط تفعيل إلى بريدك الإلكتروني
          </p>
        )}
      </div>

      {/* Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '2rem 1.5rem' }}>

          {/* اختيار نوع الحساب */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>نوع الحساب</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAccountType('restaurant')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: 10,
                  border: accountType === 'restaurant' ? `2px solid ${C.accent}` : `2px solid ${C.border}`,
                  background: accountType === 'restaurant' ? 'rgba(200,226,53,0.1)' : C.surf,
                  color: accountType === 'restaurant' ? C.accent : C.muted,
                  fontWeight: accountType === 'restaurant' ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem',
                }}
              >
                <IoRestaurant style={{ fontSize: 20 }} />
                <span>مطعم</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('store')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: 10,
                  border: accountType === 'store' ? `2px solid ${C.accent}` : `2px solid ${C.border}`,
                  background: accountType === 'store' ? 'rgba(200,226,53,0.1)' : C.surf,
                  color: accountType === 'store' ? C.accent : C.muted,
                  fontWeight: accountType === 'store' ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.9rem',
                }}
              >
                <IoStorefront style={{ fontSize: 20 }} />
                <span>متجر</span>
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.5rem' }}>
              {accountType === 'restaurant'
                ? 'يمكنك إدارة قائمة الطعام، الطاولات، وطلبات التوصيل'
                : 'يمكنك إدارة المنتجات، المخزون، وطلبات التوصيل'}
            </p>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: `1px solid rgba(255,107,107,0.3)`, color: C.red, padding: '0.75rem 1rem', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <IoWarning style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem' }}>{error}</span>
              </div>
            )}

            {/* الاسم الكامل */}
            <div>
              <label htmlFor="name" style={labelStyle}>الاسم الكامل</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapStyle}>
                  <IoPerson style={{ color: C.muted, fontSize: 18 }} />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="محمد أحمد"
                />
              </div>
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label htmlFor="email" style={labelStyle}>البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapStyle}>
                  <IoMail style={{ color: C.muted, fontSize: 18 }} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* رقم الهاتف */}
            <div>
              <label htmlFor="phone" style={labelStyle}>رقم الهاتف</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapStyle}>
                  <IoCall style={{ color: C.muted, fontSize: 18 }} />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            {/* اسم النشاط التجاري */}
            <div>
              <label htmlFor="businessName" style={labelStyle}>
                {accountType === 'restaurant' ? 'اسم المطعم' : 'اسم المتجر'}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapStyle}>
                  {accountType === 'restaurant' ? (
                    <IoRestaurant style={{ color: C.muted, fontSize: 18 }} />
                  ) : (
                    <IoStorefront style={{ color: C.muted, fontSize: 18 }} />
                  )}
                </div>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder={accountType === 'restaurant' ? 'مطعمي المفضل' : 'متجري الإلكتروني'}
                />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label htmlFor="password" style={labelStyle}>كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapStyle}>
                  <IoLockClosed style={{ color: C.muted, fontSize: 18 }} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="********"
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.25rem' }}>كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
            </div>

            {/* تأكيد كلمة المرور */}
            <div>
              <label htmlFor="confirmPassword" style={labelStyle}>تأكيد كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <div style={iconWrapStyle}>
                  <IoLockClosed style={{ color: C.muted, fontSize: 18 }} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="********"
                />
              </div>
            </div>

            {/* زر التسجيل */}
            <div style={{ paddingTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={registering || loading}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  background: registering || loading ? C.acDk : C.accent,
                  color: C.bg,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: 'none',
                  cursor: registering || loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {(registering || loading) && (
                  <span style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: `2px solid rgba(8,46,36,0.3)`,
                    borderTop: `2px solid ${C.bg}`,
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
                إنشاء حساب {accountType === 'restaurant' ? 'مطعم' : 'متجر'}
              </button>
            </div>
          </form>

          {/* رابط تسجيل الدخول */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ position: 'relative', textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: C.border }} />
              <span style={{ position: 'relative', background: C.card, padding: '0 0.75rem', fontSize: '0.875rem', color: C.muted }}>
                لديك حساب بالفعل؟
              </span>
            </div>
            <Link
              to="/login"
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0.625rem 1rem',
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: C.text,
                background: C.surf,
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: ${C.muted}; opacity: 0.7; }
        input:focus { outline: none; border-color: ${C.accent} !important; box-shadow: 0 0 0 3px rgba(200,226,53,0.1); }
      `}</style>
    </div>
  );
};

export default Register;
