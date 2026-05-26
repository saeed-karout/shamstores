// frontend/src/pages/legal/AboutPage.tsx

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { 
  IoInformationCircle, 
  IoBulb, 
  IoRocket, 
  IoPeople, 
  IoHeart, 
  IoStar, 
  IoReturnUpBack,
  IoRestaurant,
  IoStorefront,
  IoGlobe,
  IoShield
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const colors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    surf: theme.surfaceColor || '#0F3D31',
    accent: theme.primaryColor || '#C8E235',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
  };

  const features = [
    { icon: <IoRestaurant size={24} />, title: 'للمطاعم', desc: 'قائمة رقمية متكاملة، طلبات أونلاين، إدارة الطاولات' },
    { icon: <IoStorefront size={24} />, title: 'للمتاجر', desc: 'منتجات رقمية، مخزون، طلبات، وإدارة العملاء' },
    { icon: <IoGlobe size={24} />, title: 'دومين مخصص', desc: 'استخدم دومينك الخاص أو دومين فرعي' },
    { icon: <IoShield size={24} />, title: 'آمن وموثوق', desc: 'بياناتك مشفرة ومحمية بأعلى معايير الأمان' },
  ];

  const values = [
    { icon: <IoHeart size={20} />, title: 'الابتكار', desc: 'نسعى دائماً لتقديم حلول مبتكرة' },
    { icon: <IoPeople size={20} />, title: 'العملاء أولاً', desc: 'رضا عملائنا هو هدفنا الأول' },
    { icon: <IoStar size={20} />, title: 'الجودة', desc: 'نقدم أعلى معايير الجودة' },
    { icon: <IoBulb size={20} />, title: 'البساطة', desc: 'تجربة مستخدم بسيطة وسهلة' },
  ];

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
            <IoInformationCircle size={40} style={{ color: colors.accent }} />
          </div>
          <h1 style={{ color: colors.text, fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            من نحن
          </h1>
          <p style={{ color: colors.muted, fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
            شام ستورز هي المنصة الرقمية المتكاملة للمطاعم والمتاجر
          </p>
        </div>

        {/* القصة */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 24,
          padding: 32,
          marginBottom: 32,
          textAlign: 'center',
        }}>
          <IoRocket size={48} style={{ color: colors.accent, marginBottom: 16 }} />
          <h2 style={{ color: colors.text, fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
            قصتنا
          </h2>
          <p style={{ color: colors.muted, fontSize: 15, lineHeight: 1.8, maxWidth: 800, margin: '0 auto' }}>
            انطلقت شام ستورز بهدف تمكين أصحاب المطاعم والمتاجر من التحول الرقمي بسهولة واحترافية.
            نؤمن بأن كل صاحب عمل يستحق منصة رقمية تعكس هويته وتسهل إدارة أعماله،
            ولذلك صممنا شام ستورز لتكون الحل الأمثل لإدارة المطاعم والمتاجر الإلكترونية.
          </p>
        </div>

        {/* المميزات */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ color: colors.text, fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>
            ماذا نقدم؟
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 24,
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  background: colors.card,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 20,
                  padding: 24,
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = colors.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <div style={{
                  width: 56,
                  height: 56,
                  background: `${colors.accent}15`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <span style={{ color: colors.accent }}>{feature.icon}</span>
                </div>
                <h3 style={{ color: colors.text, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {feature.title}
                </h3>
                <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* القيم */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ color: colors.text, fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 32 }}>
            قيمنا
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
          }}>
            {values.map((value, index) => (
              <div
                key={index}
                style={{
                  background: colors.surf,
                  borderRadius: 16,
                  padding: 20,
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  background: `${colors.accent}10`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  <span style={{ color: colors.accent }}>{value.icon}</span>
                </div>
                <h4 style={{ color: colors.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  {value.title}
                </h4>
                <p style={{ color: colors.muted, fontSize: 13 }}>
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* إحصائيات */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 24,
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 24,
          padding: 32,
          marginBottom: 32,
          textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: colors.accent }}>500+</div>
            <div style={{ color: colors.muted, fontSize: 14 }}>مطعم ومتجر</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: colors.accent }}>10K+</div>
            <div style={{ color: colors.muted, fontSize: 14 }}>طلب شهرياً</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: colors.accent }}>99%</div>
            <div style={{ color: colors.muted, fontSize: 14 }}>رضا العملاء</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: colors.accent }}>24/7</div>
            <div style={{ color: colors.muted, fontSize: 14 }}>دعم فني</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;