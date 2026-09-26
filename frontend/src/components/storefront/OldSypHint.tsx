// frontend/src/components/storefront/OldSypHint.tsx
//
// مقابل السعر بالليرة القديمة، بخطٍّ صغير تحت السعر الجديد.
//
// **لماذا:** بعد حذف الصفرين يبقى الناس شهوراً يحسبون بالأرقام القديمة —
// «٥٠٠ ليرة» لوجبةٍ كانت «٥٠ ألفاً» تبدو خطأً أو احتيالاً. المقابل القديم
// يطمئن الزبون أن السعر لم يتغيّر، والعملة وحدها تغيّرت.
//
// لا يظهر إلا في فترة الانتقال التي يحدّدها الخادم، وبالليرة وحدها — راجع
// `formatOldSyp`. خارجها لا يرسم شيئاً، فتركيبه في أي بطاقة آمن.

import React from 'react';
import { sf } from '@/utils/storefrontTheme';
import { formatOldSyp } from '@/utils/currency';
import type { CurrencyInput } from '@/utils/currency';
import { useT } from '@/i18n/storefront';

interface Props {
  amount: number | string | null | undefined;
  currency: CurrencyInput;
  color?: string;
  style?: React.CSSProperties;
}

const OldSypHint: React.FC<Props> = ({ amount, currency, color, style }) => {
  const { t } = useT();
  const old = formatOldSyp(amount, currency);
  if (!old) return null;
  return (
    <div
      title={t('بالليرة القديمة')}
      style={{
        color: color || sf.muted,
        fontSize: 10.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        ...style
      }}
    >
      {old} {t('ل.س قديمة')}
    </div>
  );
};

export default OldSypHint;
