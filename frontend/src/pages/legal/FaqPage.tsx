// frontend/src/pages/legal/FaqPage.tsx

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { 
  IoHelpBuoy, 
  IoChevronDown, 
  IoChevronUp,
  IoReturnUpBack,
  IoCard,
  IoGlobe,
  IoLockClosed,
  IoRefresh,
  IoPerson,
  IoTime
} from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const FaqPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const colors = {
    bg: theme.backgroundColor || '#082E24',
    card: theme.cardBgColor || '#112E23',
    surf: theme.surfaceColor || '#0F3D31',
    accent: theme.primaryColor || '#C8E235',
    text: theme.textColor || '#E8F5E9',
    muted: theme.mutedColor || '#9DC4AC',
    border: `rgba(200,226,53,0.15)`,
  };

  const faqs = [
    {
      category: 'الحساب والتسجيل',
      icon: <IoPerson size={20} />,
      questions: [
        {
          q: 'كيف يمكنني إنشاء حساب جديد؟',
          a: 'يمكنك إنشاء حساب جديد بالضغط على زر "تسجيل" في أعلى الصفحة، ثم ملء البيانات المطلوبة مثل الاسم، البريد الإلكتروني، رقم الهاتف، وكلمة المرور.'
        },
        {
          q: 'هل التسجيل مجاني؟',
          a: 'نعم، التسجيل في المنصة مجاني تماماً. يمكنك البدء بخطة مجانية ثم الترقية لاحقاً حسب احتياجاتك.'
        },
        {
          q: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
          a: 'يمكنك إعادة تعيين كلمة المرور من خلال صفحة تسجيل الدخول بالضغط على "نسيت كلمة المرور" واتباع التعليمات.'
        }
      ]
    },
    {
      category: 'الخطط والاشتراكات',
      icon: <IoCard size={20} />,
      questions: [
        {
          q: 'ما هي الخطط المتاحة؟',
          a: 'نقدم 4 خطط: مجانية، أساسية، احترافية، ومؤسسية. تختلف الميزات والحدود حسب كل خطة.'
        },
        {
          q: 'كيف يمكنني ترقية خطتي؟',
          a: 'يمكنك ترقية خطتك من خلال لوحة التحكم → الخطط، اختر الخطة المناسبة ثم اضغط "ترقية".'
        },
        {
          q: 'هل يمكنني إلغاء اشتراكي؟',
          a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت من خلال إعدادات الحساب. لن يتم محاسبتك بعد انتهاء الفترة الحالية.'
        }
      ]
    },
    {
      category: 'الدومين والرابط',
      icon: <IoGlobe size={20} />,
      questions: [
        {
          q: 'كيف أحصل على دومين مخصص لمتجري؟',
          a: 'الدومين المخصص متاح في الخطط الاحترافية والمؤسسية. يمكنك إضافته من خلال إعدادات المتجر ← الدومين.'
        },
        {
          q: 'ما هو الدومين الفرعي؟',
          a: 'الدومين الفرعي هو رابط مثل (your-store.shamstores.com) يمكنك تخصيصه مجاناً مع أي خطة.'
        }
      ]
    },
    {
      category: 'الأمان والخصوصية',
      icon: <IoLockClosed size={20} />,
      questions: [
        {
          q: 'هل بياناتي آمنة؟',
          a: 'نعم، نستخدم أحدث تقنيات التشفير لحماية بياناتك. جميع المدفوعات مشفرة عبر SSL.'
        },
        {
          q: 'من يمكنه الوصول إلى بيانات متجري؟',
          a: 'أنت فقط من يتحكم في بيانات متجرك. يمكنك إضافة موظفين بصلاحيات محددة إذا أردت.'
        }
      ]
    },
    {
      category: 'الدعم الفني',
      icon: <IoTime size={20} />,
      questions: [
        {
          q: 'كيف يمكنني التواصل مع الدعم الفني؟',
          a: 'يمكنك التواصل معنا عبر البريد الإلكتروني support@shamstores.com أو من خلال صفحة اتصل بنا.'
        },
        {
          q: 'ما هي أوقات عمل الدعم الفني؟',
          a: 'فريق الدعم الفني متاح 24 ساعة طوال أيام الأسبوع.'
        }
      ]
    }
  ];

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', fontFamily: 'Cairo, sans-serif' }} dir="rtl">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
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
            <IoHelpBuoy size={40} style={{ color: colors.accent }} />
          </div>
          <h1 style={{ color: colors.text, fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            الأسئلة الشائعة
          </h1>
          <p style={{ color: colors.muted, fontSize: 16 }}>
            إجابات على أكثر الأسئلة شيوعاً حول منصتنا
          </p>
        </div>

        {/* FAQ Categories */}
        {faqs.map((category, catIndex) => (
          <div key={catIndex} style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              paddingBottom: 8,
              borderBottom: `2px solid ${colors.accent}`,
            }}>
              <div style={{ color: colors.accent }}>{category.icon}</div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                {category.category}
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {category.questions.map((item, qIndex) => {
                const globalIndex = catIndex * 10 + qIndex;
                const isOpen = openIndex === globalIndex;

                return (
                  <div
                    key={qIndex}
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 16,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                  >
                    <button
                      onClick={() => toggleQuestion(globalIndex)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: 600,
                        textAlign: 'right',
                      }}
                    >
                      <span>{item.q}</span>
                      {isOpen ? <IoChevronUp size={18} /> : <IoChevronDown size={18} />}
                    </button>
                    
                    {isOpen && (
                      <div
                        style={{
                          padding: '0 20px 20px 20px',
                          color: colors.muted,
                          fontSize: 14,
                          lineHeight: 1.8,
                          borderTop: `1px solid ${colors.border}`,
                        }}
                      >
                        <p style={{ margin: '16px 0 0 0' }}>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* لم تجد إجابتك؟ */}
        <div style={{
          textAlign: 'center',
          background: colors.surf,
          borderRadius: 20,
          padding: 32,
          marginTop: 32,
        }}>
          <h3 style={{ color: colors.text, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            لم تجد إجابتك؟
          </h3>
          <p style={{ color: colors.muted, marginBottom: 20 }}>
            تواصل مع فريق الدعم الفني وسنكون سعداء بمساعدتك
          </p>
          <button
            onClick={() => navigate('/contact')}
            style={{
              background: colors.accent,
              color: colors.bg,
              border: 'none',
              padding: '10px 24px',
              borderRadius: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            اتصل بنا
          </button>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;