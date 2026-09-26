// frontend/src/components/settings/VerificationSettingsCard.tsx
//
// مدخل «تاجر موثّق» في تبويب الإعدادات العامّة — سطر حالة وزرّ.
//
// النموذج نفسه في صفحته (`/verification`) لا هنا: رفع الهوية خطوةٌ لها
// شرحها وطمأنتها، وحشرها بين حقول الألوان والعنوان يجعلها تبدو حقلاً آخر.
// وصفحات الإعدادات مشتركة وكبيرة — هذه البطاقة تُركَّب فيها بسطرٍ واحد.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoChevronBack } from 'react-icons/io5';
import api from '@/services/api';
import { VerifiedSeal } from '@/components/storefront/VerifiedBadge';

interface Summary {
  verified: boolean;
  request: { status: 'pending' | 'approved' | 'rejected' | 'revoked' } | null;
}

const VerificationSettingsCard: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<Summary>('/verification/me')
      .then((res) => alive && setData(res))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return null;

  const status = data.verified ? 'approved' : data.request?.status;
  const text =
    status === 'approved'
      ? 'نشاطك موثّق — تظهر الشارة الزرقاء بجانب اسمك في واجهتك.'
      : status === 'pending'
        ? 'طلب التوثيق قيد المراجعة — سيصلك إشعار فور البتّ فيه.'
        : status === 'rejected' || status === 'revoked'
          ? 'لم يُقبل طلبك السابق — اطّلع على السبب وأرسل طلباً جديداً.'
          : 'وثّق هويتك لتظهر شارة «تاجر موثّق» الزرقاء بجانب اسمك — مجاناً على كل الخطط.';

  return (
    <Link
      to="/verification"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        marginBottom: 16,
        borderRadius: 14,
        border: '1px solid rgba(29, 155, 240, 0.35)',
        background: status === 'approved' ? 'rgba(29, 155, 240, 0.06)' : 'rgba(29, 155, 240, 0.1)',
        color: 'inherit',
        textDecoration: 'none',
        fontFamily: 'Cairo, sans-serif',
        ...style
      }}
    >
      <VerifiedSeal size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>تاجر موثّق</div>
        <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7 }}>{text}</div>
      </div>
      <IoChevronBack size={18} style={{ opacity: 0.6, flexShrink: 0 }} />
    </Link>
  );
};

export default VerificationSettingsCard;
