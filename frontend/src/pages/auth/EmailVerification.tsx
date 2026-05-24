// frontend/src/pages/auth/EmailVerification.tsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoMail, IoArrowBack } from 'react-icons/io5';
import toast from 'react-hot-toast';
import Button from '@/components/common/Button';
import api from '@/services/api';

const C = {
  bg:     '#082E24',
  card:   '#112E23',
  prim:   '#0D4A3A',
  accent: '#C8E235',
  text:   '#E8F5E9',
  muted:  '#9DC4AC',
  border: 'rgba(200,226,53,0.15)',
  red:    '#FF6B6B',
};

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  if (!email) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 420 }}>
          <p style={{ color: C.text, marginBottom: 20 }}>لم يتم العثور على بريد إلكتروني. يرجى العودة والتسجيل مرة أخرى.</p>
          <Button onClick={() => navigate('/auth/register')} style={{ width: '100%' }}>
            العودة للتسجيل
          </Button>
        </div>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('يرجى إدخال الكود');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-email', { email, code });

      if (response.data.success) {
        toast.success('تم تفعيل البريد الإلكتروني بنجاح!');
        navigate('/auth/login');
      } else {
        toast.error(response.data.error || 'فشل التحقق من الكود');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ في التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const response = await api.post('/auth/resend-verification', { email });

      if (response.data.success) {
        toast.success('تم إرسال كود جديد إلى بريدك الإلكتروني');
        setResendCountdown(60);
        const interval = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(response.data.error || 'فشل في إعادة الإرسال');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} dir="rtl">
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 40, maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 80, height: 80, background: 'rgba(200,226,53,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IoMail size={40} style={{ color: C.accent }} />
          </div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, marginBottom: 10 }}>تحقق من بريدك الإلكتروني</h1>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 5 }}>لقد أرسلنا لك كود التحقق إلى:</p>
          <p style={{ color: C.accent, fontSize: 14, fontWeight: 600 }}>{email}</p>
        </div>

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: C.text, fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              كود التحقق
            </label>
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: C.prim,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                color: C.text,
                fontSize: 18,
                textAlign: 'center',
                letterSpacing: '0.2em',
                fontFamily: 'monospace',
              }}
            />
            <p style={{ color: C.muted, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              ساري لمدة 15 دقيقة
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            onClick={handleVerify}
            style={{ width: '100%', marginBottom: 12 }}
          >
            {loading ? 'جاري التحقق...' : 'تحقق'}
          </Button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 12 }}>
            لم تستقبل الكود؟
          </p>
          <button
            onClick={handleResend}
            disabled={resendLoading || resendCountdown > 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: resendCountdown > 0 ? C.muted : C.accent,
              fontSize: 14,
              fontWeight: 600,
              cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
              opacity: resendCountdown > 0 ? 0.5 : 1,
            }}
          >
            {resendCountdown > 0 ? `إعادة الإرسال بعد ${resendCountdown}s` : 'إعادة الإرسال'}
          </button>
        </div>

        <button
          onClick={() => navigate('/auth/register')}
          style={{
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: C.muted,
            fontSize: 14,
            marginTop: 20,
            cursor: 'pointer',
            justifyContent: 'flex-end',
            width: '100%',
          }}
        >
          <IoArrowBack size={16} />
          العودة للخلف
        </button>
      </div>
    </div>
  );
};

export default EmailVerification;
