// frontend/src/components/store/ProductDepositField.tsx
//
// «عربون» في نموذج المنتج — نسبةٌ من السعر أو مبلغٌ ثابت لكل قطعة.
//
// لمنتجاتٍ تُطلب خصيصاً أو غالية (أثاث، أجهزة، تفصيل): الزبون يدفع جزءاً
// مقدّماً والباقي عند الاستلام. المبلغ يحسبه الخادم عند الطلب — الحقل هنا
// يحفظ القاعدة فقط. ويعمل على الخطط المدفوعة (النموّ فما فوق)؛ على غيرها
// يُحفظ ولا يُطلب من الزبون.

import React from 'react';

export type DepositKind = '' | 'percent' | 'fixed';

interface Palette {
  text: string;
  muted: string;
  border: string;
  accent: string;
}

interface Props {
  type: DepositKind;
  value: string;
  onChange: (next: { depositType: DepositKind; depositValue: string }) => void;
  colors: Palette;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}

const ProductDepositField: React.FC<Props> = ({ type, value, onChange, colors: C, inputStyle, labelStyle }) => {
  const n = Number(value);
  const error =
    type && (!Number.isFinite(n) || n <= 0)
      ? 'أدخل قيمة العربون'
      : type === 'percent' && n > 100
      ? 'النسبة لا تتجاوز 100%'
      : '';

  return (
    <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!type}
          onChange={(e) => onChange({ depositType: e.target.checked ? 'percent' : '', depositValue: e.target.checked ? value || '20' : '' })}
          style={{ width: 16, height: 16, accentColor: C.accent }}
        />
        <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>عربون مقدّم — والباقي عند الاستلام</span>
      </label>
      {type && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>نوع العربون</label>
            <select
              value={type}
              onChange={(e) => onChange({ depositType: e.target.value as DepositKind, depositValue: value })}
              style={inputStyle}
            >
              <option value="percent">نسبة من السعر %</option>
              <option value="fixed">مبلغ لكل قطعة</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{type === 'percent' ? 'النسبة %' : 'المبلغ بالليرة'}</label>
            <input
              type="number"
              min={0}
              max={type === 'percent' ? 100 : undefined}
              value={value}
              onChange={(e) => onChange({ depositType: type, depositValue: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}
      {error && <p style={{ color: '#B42318', fontSize: 12, margin: 0 }}>{error}</p>}
      <p style={{ color: C.muted, fontSize: 11.5, margin: 0, lineHeight: 1.75 }}>
        يرى الزبون العربون المطلوب الآن والباقي في السلّة، وتعلّم أنت «استُلم العربون» من تفاصيل الطلب. ضمن
        خطة «النموّ» فما فوق.
      </p>
    </div>
  );
};

/** حقلا العربون في جسم الحفظ — لا يُرسلان إطلاقاً لمنتجٍ لم يُضبط له عربون قطّ */
export const depositPayload = (type: DepositKind, value: string, hadDeposit: boolean) => {
  if (!type && !hadDeposit) return { depositType: undefined, depositValue: undefined };
  if (!type) return { depositType: null, depositValue: null };
  return { depositType: type, depositValue: Number(value) || 0 };
};

export default ProductDepositField;
