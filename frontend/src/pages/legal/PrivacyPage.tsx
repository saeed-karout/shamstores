// frontend/src/pages/legal/PrivacyPage.tsx

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { IoLockClosed, IoShield, IoPerson, IoDocumentText, IoGlobe, IoMail, IoTrash, IoRefresh, IoReturnUpBack } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
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
            <IoLockClosed size={32} style={{ color: colors.accent }} />
          </div>
          <h1 style={{ color: colors.text, fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            سياسة الخصوصية
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
                التزامنا بخصوصيتك
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8 }}>
              نحن في شام ستورز نلتزم بحماية خصوصية بياناتك. تشرح هذه السياسة كيفية جمع معلوماتك الشخصية
              واستخدامها وحمايتها عند استخدام منصتنا.
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
                المعلومات التي نجمعها
              </h2>
            </div>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف.</li>
              <li style={{ marginBottom: 8 }}>معلومات الدفع: تفاصيل بطاقة الائتمان (مشفرة ومؤمنة).</li>
              <li style={{ marginBottom: 8 }}>معلومات الاستخدام: الطلبات، المنتجات المفضلة، سجل التصفح.</li>
              <li style={{ marginBottom: 8 }}>معلومات الجهاز: عنوان IP، نوع المتصفح، نظام التشغيل.</li>
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
                <IoGlobe size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                كيفية استخدام معلوماتك
              </h2>
            </div>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>لتقديم وتحسين خدمات منصتنا.</li>
              <li style={{ marginBottom: 8 }}>لمعالجة طلباتك ومدفوعاتك.</li>
              <li style={{ marginBottom: 8 }}>لإرسال إشعارات وتحديثات مهمة.</li>
              <li style={{ marginBottom: 8 }}>لتحليل استخدام المنصة وتحسين تجربة المستخدم.</li>
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
                <IoMail size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                مشاركة المعلومات
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              لا نقوم ببيع أو تأجير معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك في الحالات التالية:
            </p>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>مع مزودي الخدمة الذين يساعدوننا في تشغيل منصتنا.</li>
              <li style={{ marginBottom: 8 }}>عندما نطلب من القانون أو لحماية حقوقنا.</li>
              <li style={{ marginBottom: 8 }}>بموافقتك الصريحة.</li>
            </ul>
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
                <IoLockClosed size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                أمان المعلومات
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8 }}>
              نستخدم إجراءات أمنية متقدمة لحماية معلوماتك من الوصول غير المصرح به أو التعديل أو الإفصاح.
              يتم تشفير جميع المدفوعات باستخدام تقنية SSL. ومع ذلك، لا يوجد نظام أمني غير قابل للاختراق بنسبة 100%.
            </p>
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
                <IoDocumentText size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                حقوقك في الخصوصية
              </h2>
            </div>
            <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingRight: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>الحق في الوصول إلى معلوماتك الشخصية.</li>
              <li style={{ marginBottom: 8 }}>الحق في تصحيح معلوماتك غير الدقيقة.</li>
              <li style={{ marginBottom: 8 }}>الحق في حذف معلوماتك (في ظل ظروف معينة).</li>
              <li style={{ marginBottom: 8 }}>الحق في الاعتراض على معالجة معلوماتك.</li>
            </ul>
          </div>

          {/* القسم 7 */}
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
                <IoTrash size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                حذف الحساب والبيانات
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
              يمكنك حذف حسابك في أي وقت من خلال إعدادات الحساب. سيتم حذف جميع بياناتك المرتبطة بحسابك
              خلال فترة معقولة، باستثناء البيانات التي نحتاج للاحتفاظ بها لأسباب قانونية.
            </p>
          </div>

          {/* القسم 8 */}
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
                <IoRefresh size={20} style={{ color: colors.accent }} />
              </div>
              <h2 style={{ color: colors.text, fontSize: 20, fontWeight: 700, margin: 0 }}>
                تغييرات سياسة الخصوصية
              </h2>
            </div>
            <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8 }}>
              قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني
              أو من خلال إشعار على المنصة. تاريخ آخر تحديث موضح في أعلى هذه الصفحة.
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
              إذا كان لديك أي استفسار بخصوص سياسة الخصوصية، يرجى التواصل معنا:
            </p>
            <a
              href="mailto:privacy@shamstores.com"
              style={{ color: colors.accent, textDecoration: 'none', fontWeight: 600 }}
            >
              privacy@shamstores.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;