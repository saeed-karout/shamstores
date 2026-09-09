// frontend/src/components/storefront/CurrencySwitcher.tsx
//
// زرّ تبديل العملة في واجهة الزبون.
//
// **قرار التصميم:** الرمز لا اسم العملة. زرٌّ عرضه ثلاثون بكسلاً في شريطٍ
// مزدحم لا يتّسع لـ«ليرة سورية»، و`ل.س` و`$` مفهومان بلا شرح. والخيار
// المفعّل يُبرَز بلون هوية التاجر لا بلون المنصّة: هذه واجهته لا واجهتنا.
//
// ولا يُعرض أصلاً حين تكون العملة واحدة — زرٌّ بخيار وحيد يشغل مكاناً
// ويوحي بإمكانٍ لا وجود له.

import React from 'react';
import { sf } from '@/utils/storefrontTheme';
import type { CurrencyOption } from '@/hooks/useDisplayCurrency';
import { useT } from '@/i18n/storefront';

interface Props {
  options: CurrencyOption[];
  code: string;
  onChange: (code: string) => void;
  /** `compact` للشريط العلوي، `full` للسلّة حيث تتوفّر مساحة للاسم */
  variant?: 'compact' | 'full';
}

const CurrencySwitcher: React.FC<Props> = ({ options, code, onChange, variant = 'compact' }) => {
  const { t } = useT();
  if (options.length < 2) return null;

  const compact = variant === 'compact';

  return (
    <div
      role="group"
      aria-label={t('عملة العرض')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: sf.surface,
        border: `1px solid ${sf.border}`,
      }}
    >
      {options.map((option) => {
        const active = option.code === code;
        return (
          <button
            key={option.code}
            type="button"
            onClick={() => onChange(option.code)}
            aria-pressed={active}
            title={`عرض الأسعار بـ${option.label}`}
            style={{
              // ٣٢ بكسلاً حدّ أدنى للمسّ: أصغر منه يُخطئه الإبهام
              minWidth: compact ? 34 : 74,
              minHeight: 30,
              padding: compact ? '5px 9px' : '6px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontFamily: sf.font,
              fontSize: compact ? 12.5 : 13,
              fontWeight: active ? 800 : 600,
              lineHeight: 1.2,
              background: active ? sf.accent : 'transparent',
              color: active ? sf.onAccent : sf.muted,
              transition: 'background 140ms ease, color 140ms ease',
            }}
          >
            {compact ? option.symbol : `${option.symbol} ${option.label}`}
          </button>
        );
      })}
    </div>
  );
};

export default CurrencySwitcher;
