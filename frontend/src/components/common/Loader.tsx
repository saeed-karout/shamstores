// components/common/Loader.tsx
//
// مؤشّر التحميل العامّ — بلا دائرةٍ دوّارة. قرار المالك: الانتظار يُعرض
// «ظلّاً» للصفحة القادمة (عناوين وبطاقات وصفوف يمرّ عليها بريق)، كما في
// واجهة المتجر. الواجهة العامّة (`size` و`fullScreen`) باقيةٌ كما هي لأنّ
// عشرات الشاشات تستعملها، وأُضيف `variant` لتختار كلّ شاشةٍ ظلّاً بهيئتها.

import React from 'react';
import { PageSkeleton, SkeletonLine, SkeletonScope, SkeletonPreset, type SkeletonVariant } from './Skeleton';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  /** هيئة الظلّ: رئيسيّة، قائمة، نموذج، شبكة، تفاصيل، واجهة متجر — أو «page» العامّة */
  variant?: SkeletonVariant;
  /** ما يسمعه قارئ الشاشة */
  label?: string;
}

/* الظلّ المضمَّن حسب الحجم: أسطرٌ متفاوتة الطول تشبه فقرةً أو بطاقةً صغيرة */
const inlineLines: Record<NonNullable<LoaderProps['size']>, { w: string; h: number }[]> = {
  sm: [
    { w: '70%', h: 10 },
    { w: '45%', h: 10 }
  ],
  md: [
    { w: '55%', h: 14 },
    { w: '90%', h: 11 },
    { w: '75%', h: 11 },
    { w: '40%', h: 11 }
  ],
  lg: [
    { w: '40%', h: 18 },
    { w: '95%', h: 12 },
    { w: '85%', h: 12 },
    { w: '90%', h: 12 },
    { w: '60%', h: 12 }
  ]
};

const Loader: React.FC<LoaderProps> = ({ size = 'md', fullScreen = false, variant, label }) => {
  // الصفحة كلّها: ظلٌّ في مكانها لا طبقةٌ تحجب التطبيق
  if (fullScreen) return <PageSkeleton variant={variant} label={label} />;

  // قسمٌ داخل صفحة وطُلب شكلٌ بعينه: القالب بلا حشوة الصفحة
  if (variant) {
    return (
      <SkeletonScope label={label} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        <SkeletonPreset variant={variant} />
      </SkeletonScope>
    );
  }

  const lines = inlineLines[size];
  return (
    <SkeletonScope
      label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: size === 'sm' ? 6 : 10,
        width: '100%',
        maxWidth: size === 'sm' ? 160 : size === 'md' ? 420 : 640,
        marginInline: 'auto',
        padding: size === 'sm' ? 4 : 12
      }}
    >
      {lines.map((l, i) => (
        <SkeletonLine key={i} w={l.w} h={l.h} />
      ))}
    </SkeletonScope>
  );
};

export default Loader;
