// frontend/src/components/storefront/VerifiedBadge.tsx
//
// شارة «تاجر موثّق» بجانب اسم المتجر أو المطعم.
//
// **زرٌّ لا أيقونة صامتة:** علامةٌ زرقاء بلا شرح تشبه ما يضعه أيّ أحد في
// صورة ملفه — فلا تُطمئن. الضغط عليها يفتح لوحاً صغيراً يقول بالضبط ما
// تحقّقنا منه وما لا تعنيه، فتصير الشارة وعداً مفهوماً لا زينة.
//
// **الأزرق ثابت لا لون التاجر:** الشارة علامة المنصّة على التاجر، ولو أخذت
// لونه لصارت جزءاً من تصميمه يستطيع أيّ متجرٍ رسمه في غلافه.
//
// `stopPropagation` لأن الاسم يقع أحياناً داخل رابطٍ أو بطاقةٍ قابلة للضغط.

import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { sf } from '@/utils/storefrontTheme';
import { useT } from '@/i18n/storefront';

export const VERIFIED_BLUE = '#1d9bf0';

/** الختم نفسه — مسنّنٌ كختم، لا دائرة عادية، فلا يُخلط بعلامة «تمّ» */
export const VerifiedSeal: React.FC<{ size?: number; ring?: boolean }> = ({ size = 18, ring = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
    <polygon
      points="12.00,1.00 14.41,3.02 17.50,2.47 18.58,5.42 21.53,6.50 20.98,9.59 23.00,12.00 20.98,14.41 21.53,17.50 18.58,18.58 17.50,21.53 14.41,20.98 12.00,23.00 9.59,20.98 6.50,21.53 5.42,18.58 2.47,17.50 3.02,14.41 1.00,12.00 3.02,9.59 2.47,6.50 5.42,5.42 6.50,2.47 9.59,3.02"
      fill={VERIFIED_BLUE}
      stroke={ring ? '#fff' : VERIFIED_BLUE}
      strokeWidth={ring ? 1.6 : 1.2}
      strokeLinejoin="round"
    />
    <path d="M7.6 12.3l3 3 5.8-6.1" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface Props {
  size?: number;
  /** حدٌّ أبيض حول الختم — فوق صورة الغلاف */
  ring?: boolean;
  /** اسم النشاط يظهر في نصّ الشرح */
  businessName?: string;
  style?: React.CSSProperties;
  /** للصفحات التي تقع فوق مزوّد اللغة (صفحة المنتج تبني `t` بنفسها) */
  translate?: (arabic: string) => string;
}

const VerifiedBadge: React.FC<Props> = ({ size = 18, ring = false, businessName, style, translate }) => {
  const ctx = useT();
  const t = translate || ctx.t;
  const [open, setOpen] = useState(false);
  const label = t('تاجر موثّق');

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={label}
        title={t('تاجر موثّق — تحقّقت شام ستورز من هويته')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          margin: 0,
          marginInlineStart: 4,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          verticalAlign: 'middle',
          lineHeight: 0,
          flexShrink: 0,
          ...style
        }}
      >
        <VerifiedSeal size={size} ring={ring} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={label} maxHeight="70dvh">
        <div style={{ display: 'grid', gap: 14, padding: '4px 2px 10px', color: sf.text, fontFamily: sf.font }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <VerifiedSeal size={40} />
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.6 }}>
              {businessName ? `${businessName} — ${label}` : label}
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: sf.text }}>
            {t('تحقّقت شام ستورز من هوية صاحب هذا النشاط عبر وثيقة رسمية (هوية شخصية أو سجلّ تجاري) ورقم هاتف فعّال.')}
          </p>
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6, fontSize: 13.5, lineHeight: 1.8, color: sf.muted }}>
            <li>{t('وراء هذا المتجر شخصٌ أو شركة حقيقية معروفة لدينا.')}</li>
            <li>{t('إن واجهتك مشكلة في طلب، يمكننا الوصول إلى صاحبه.')}</li>
            <li>{t('الشارة لا تعني ضماناً لجودة المنتجات — اقرأ التقييمات واسأل قبل الشراء.')}</li>
          </ul>
        </div>
      </BottomSheet>
    </>
  );
};

export default VerifiedBadge;
