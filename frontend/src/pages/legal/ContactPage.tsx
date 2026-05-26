// frontend/src/pages/legal/ContactPage.tsx

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { 
  IoCall, 
  IoMail, 
  IoLocation, 
  IoTime, 
  IoReturnUpBack,
  IoSend,
  IoLogoFacebook,
  IoLogoInstagram,
  IoLogoWhatsapp,
  IoLogoTwitter
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ContactPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  const colors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    surf: theme.surfaceColor || '#0F3D31',
    accent: theme.primaryColor || '#C8E235',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    setSending(true);
    try {
      await api.post('/public/contact-messages', formData);
      toast.success('تم إرسال رسالتك بنجاح، سنتواصل معك قريباً');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast.error(error.response?.data?.error || 'تعذر إرسال الرسالة حالياً');
    } finally {
      setSending(false);
    }
  };

  const contactInfo = [
    { icon: <IoCall size={20} />, title: 'الهاتف', value: '+966 12 345 6789', link: 'tel:+966123456789' },
    { icon: <IoMail size={20} />, title: 'البريد الإلكتروني', value: 'support@shamstores.com', link: 'mailto:support@shamstores.com' },
    { icon: <IoLocation size={20} />, title: 'العنوان', value: 'الرياض، المملكة العربية السعودية', link: null },
    { icon: <IoTime size={20} />, title: 'ساعات العمل', value: 'السبت - الخميس: 9 صباحاً - 9 مساءً', link: null },
  ];

  const socialLinks = [
    { icon: <IoLogoFacebook size={22} />, url: 'https://facebook.com/shamstores', color: '#1877F2' },
    { icon: <IoLogoInstagram size={22} />, url: 'https://instagram.com/shamstores', color: '#E4405F' },
    { icon: <IoLogoWhatsapp size={22} />, url: 'https://wa.me/966123456789', color: '#25D366' },
    { icon: <IoLogoTwitter size={22} />, url: 'https://twitter.com/shamstores', color: '#1DA1F2' },
  ];

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: colors.surf,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    color: colors.text,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'Cairo, sans-serif',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 6,
    color: colors.muted,
    fontSize: 13,
    fontWeight: 500,
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* زر العودة */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            color: colors.muted,
            cursor: 'pointer',
            marginBottom: 32,
            fontSize: 14,
          }}
        >
          <IoReturnUpBack size={18} /> العودة
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 80,
            height: 80,
            background: `${colors.accent}20`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <IoCall size={40} style={{ color: colors.accent }} />
          </div>
          <h1 style={{ color: colors.text, fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            تواصل معنا
          </h1>
          <p style={{ color: colors.muted, fontSize: 16 }}>
            نسعد بسماع آرائكم واستفساراتكم
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: 40,
        }}>
          {/* معلومات الاتصال */}
          <div>
            <h2 style={{ color: colors.text, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
              معلومات الاتصال
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {contactInfo.map((info, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 16,
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 16,
                  }}
                >
                  <div style={{
                    width: 44,
                    height: 44,
                    background: `${colors.accent}15`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.accent,
                  }}>
                    {info.icon}
                  </div>
                  <div>
                    <h4 style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>{info.title}</h4>
                    {info.link ? (
                      <a href={info.link} style={{ color: colors.text, textDecoration: 'none', fontSize: 14 }}>
                        {info.value}
                      </a>
                    ) : (
                      <p style={{ color: colors.text, fontSize: 14, margin: 0 }}>{info.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* وسائل التواصل الاجتماعي */}
            <div style={{ marginTop: 32 }}>
              <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                تابعنا على
              </h3>
              <div style={{ display: 'flex', gap: 12 }}>
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 44,
                      height: 44,
                      background: `${social.color}20`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: social.color,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = social.color;
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${social.color}20`;
                      e.currentTarget.style.color = social.color;
                    }}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* نموذج الاتصال */}
          <div>
            <h2 style={{ color: colors.text, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
              أرسل لنا رسالة
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>الاسم الكامل *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="أدخل اسمك"
                />
              </div>
              <div>
                <label style={labelStyle}>البريد الإلكتروني *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="example@domain.com"
                />
              </div>
              <div>
                <label style={labelStyle}>رقم الجوال</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="05xxxxxxxx"
                />
              </div>
              <div>
                <label style={labelStyle}>الموضوع</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="موضوع الرسالة"
                />
              </div>
              <div>
                <label style={labelStyle}>الرسالة *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="اكتب رسالتك هنا..."
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: colors.accent,
                  color: colors.bg,
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'جاري الإرسال...' : <><IoSend size={18} /> إرسال الرسالة</>}
              </button>
            </form>
          </div>
        </div>

        {/* الخريطة */}
        <div style={{ marginTop: 48 }}>
          <h3 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            موقعنا
          </h3>
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 16,
            textAlign: 'center',
          }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.678!2d46.675!3d24.713!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e2f03890d489d69%3A0xd2e6b8f9b8f9b8f9!2z2YXYtdmI2YQg2YXYtdmI2LEg2KfZhNix2YrYp9mG2YjYp9mG2Kk!5e0!3m2!1sar!2ssa!4v1700000000000!5m2!1sar!2ssa"
              width="100%"
              height="300"
              style={{ border: 0, borderRadius: 12 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="موقع شام ستورز"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;