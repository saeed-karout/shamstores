// frontend/src/pages/legal/TermsPage.tsx

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { IoDocumentText, IoShield, IoCard, IoPerson, IoLockClosed, IoWarning, IoTime, IoRefresh, IoReturnUpBack } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const TermsPage: React.FC = () => {
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
            width: 64,
            height: 64,
            background: `${colors.accent}20`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <IoDocumentText size={32} style={{ color: colors.accent }} />
          </div>
          <h1 style={{ color: colors.text, fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            الشروط والأحكام
          </h1>
          <p style={{ color: colors.muted, fontSize: 14 }}>
            آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>

        {/* المحتوى */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* القسم 1 */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `${colors.accent}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IoShield size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                مقدمة
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8 }}>
              مرحباً بك في منصة شام ستورز. باستخدامك لمنصتنا، فإنك توافق على الالتزام بهذه الشروط والأحكام.
              يرجى قراءتها بعناية قبل استخدام خدماتنا.
            </p>
          </div>

          {/* القسم 2 */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `${colors.accent}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IoPerson size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                الحسابات والاشتراكات
              </h2>
            </div>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>يجب أن تقدم معلومات دقيقة وكاملة عند إنشاء حساب.</li>
              <li style={{ marginBottom: 8 }}>أنت مسؤول عن الحفاظ على سرية كلمة المرور الخاصة بك.</li>
              <li style={{ marginBottom: 8 }}>يحق لنا تعليق أو إنهاء حسابك إذا انتهكت هذه الشروط.</li>
              <li style={{ marginBottom: 8 }}>يمكنك إلغاء اشتراكك في أي وقت من خلال لوحة التحكم.</li>
            </ul>
          </div>

          {/* القسم 3 */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `${colors.accent}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IoCard size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                المدفوعات والاشتراكات
              </h2>
            </div>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>جميع الأسعار المذكورة بالريال السعودي (SAR).</li>
              <li style={{ marginBottom: 8 }}>يتم تجديد الاشتراكات تلقائياً في نهاية كل فترة.</li>
              <li style={{ marginBottom: 8 }}>يمكنك إلغاء التجديد التلقائي من إعدادات حسابك.</li>
              <li style={{ marginBottom: 8 }}>المبالغ المدفوعة غير قابلة للاسترداد إلا في حالات خاصة.</li>
            </ul>
          </div>

          {/* القسم 4 */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `${colors.accent}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IoLockClosed size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                الخصوصية والأمان
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              نحن نأخذ خصوصية بياناتك على محمل الجد. للمزيد من المعلومات، يرجى مراجعة{' '}
              <a href="/privacy" style={{ color: colors.accent, textDecoration: 'none' }}>
                سياسة الخصوصية
              </a>
              .
            </p>
          </div>

          {/* القسم 5 */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `${colors.accent}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IoWarning size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                إخلاء المسؤولية
              </h2>
            </div>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>نحن لا نضمن أن الخدمات ستكون متاحة دون انقطاع.</li>
              <li style={{ marginBottom: 8 }}>لا نتحمل مسؤولية أي أضرار ناتجة عن استخدام المنصة.</li>
              <li style={{ marginBottom: 8 }}>نحن نحتفظ بالحق في تعديل هذه الشروط في أي وقت.</li>
            </ul>
          </div>

          {/* القسم 6 */}
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                background: `${colors.accent}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IoTime size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                تعديلات الشروط
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8 }}>
              نحن نحتفظ بالحق في تحديث أو تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية
              عبر البريد الإلكتروني أو من خلال إشعار على المنصة.
            </p>
          </div>

          {/* تواصل معنا */}
          <div style={{
            background: `${colors.accent}10`,
            border: `1px solid ${colors.accent}30`,
            borderRadius: 20,
            padding: 24,
            textAlign: 'center',
          }}>
            <p style={{ color: colors.text, fontSize: 14, marginBottom: 12 }}>
              إذا كان لديك أي استفسار بخصوص هذه الشروط، يرجى التواصل معنا:
            </p>
            <a
              href="mailto:legal@shamstores.com"
              style={{ color: colors.accent, textDecoration: 'none', fontWeight: 600 }}
            >
              legal@shamstores.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;