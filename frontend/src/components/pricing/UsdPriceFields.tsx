// frontend/src/components/pricing/UsdPriceFields.tsx
//
// حقلا السعر بالدولار في نموذج المنتج/الصنف، مع معاينة الليرة حيّةً.
//
// **لماذا تظهر الليرة تحت كل حقل:** التاجر يسعّر بالدولار لكن زبونه يدفع
// بالليرة. رؤية «= 130,000 ل.س» وهو يكتب «10» تكشف خطأ الخانة قبل الحفظ،
// وتُظهر أثر التقريب الذي اختاره.

import React from 'react';
import { formatPrice } from '@/utils/currency';
import type { UsdPricingConfig } from '@/hooks/useUsdPricing';

interface Palette {
  text: string;
  muted: string;
  accent: string;
}

interface Props {
  config: UsdPricingConfig;
  preview: (usd: number | string | null | undefined) => number | null;
  priceUsd: string;
  originalPriceUsd?: string;
  onChange: (next: { priceUsd?: string; originalPriceUsd?: string }) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  colors: Palette;
  /** نموذج المطعم لا يعرض «السعر قبل الخصم» */
  showOriginal?: boolean;
  required?: boolean;
}

const UsdPriceFields: React.FC<Props> = ({
  config, preview, priceUsd, originalPriceUsd = '', onChange,
  inputStyle, labelStyle, colors: C, showOriginal = true, required = true,
}) => {
  const syp = preview(priceUsd);
  const sypBefore = preview(originalPriceUsd);
  const rateLine = config.effectiveRate
    ? `بسعر ${config.effectiveRate.toLocaleString('en-US')} ل.س للدولار${config.rateSource === 'custom' ? ' (سعرك الخاص)' : ' (سعر المنصّة)'}`
    : '';

  const hint = (value: number | null) => (
    <div style={{ color: value ? C.accent : C.muted, fontSize: 12, marginTop: 5, fontWeight: 700 }}>
      {value ? `= ${formatPrice(value, 'SYP')}` : 'اكتب السعر لترى مقابله بالليرة'}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: showOriginal ? '1fr 1fr' : '1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            السعر بالدولار ($) {required && <span style={{ color: '#EF4444' }}>*</span>}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            value={priceUsd}
            onChange={(e) => onChange({ priceUsd: e.target.value })}
            style={inputStyle}
            placeholder="0.00"
          />
          {hint(syp)}
        </div>
        {showOriginal && (
          <div>
            <label style={labelStyle}>السعر قبل الخصم ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              value={originalPriceUsd}
              onChange={(e) => onChange({ originalPriceUsd: e.target.value })}
              style={inputStyle}
              placeholder="اتركه فارغاً إن لا خصم"
            />
            {originalPriceUsd ? hint(sypBefore) : null}
          </div>
        )}
      </div>
      <div style={{ color: C.muted, fontSize: 11.5, marginTop: 6, lineHeight: 1.7 }}>
        زبونك يرى ويدفع بالليرة، محسوبةً {rateLine}
        {config.roundingStep > 0 ? ` ومقرّبةً لأقرب ${config.roundingStep.toLocaleString('en-US')} ل.س` : ''}.
        يتحدّث السعر تلقائياً حين يتغيّر سعر الصرف.
      </div>
    </div>
  );
};

export default UsdPriceFields;
