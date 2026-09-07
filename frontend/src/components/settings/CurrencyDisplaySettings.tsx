// frontend/src/components/settings/CurrencyDisplaySettings.tsx
//
// طريقة عرض الأسعار في واجهة الزبون.
//
// **الفكرة التي يجب أن تصل للتاجر قبل أي شيء:** هذا **عرضٌ لا تسعير**.
// أسعاره محفوظة بالليرة، والدولار حسابٌ عند القراءة بسعر صرف المنصّة. لولا
// ذلك لظنّ أن تفعيل الدولار يعيد تسعير متجره — فيتردّد، أو يفعّله ثم يفزع.
//
// **ولماذا خياران لا واحد:** تفعيلُ عملة شيء، واختيارُ ما يُعرض أولاً شيء
// آخر. متجرٌ يفعّل الاثنين ويجعل الليرة افتراضاً يخدم جمهوره المحلّي بلا
// أن يحرم من يفكّر بالدولار. الخلط بينهما كان سيجبره على اختيار جمهور.

import React from 'react';
import { IoCash, IoInformationCircle, IoWarningOutline, IoCheckmark } from 'react-icons/io5';
import { formatPrice } from '@/utils/currency';

export interface CurrencySettingsPayload {
  baseCurrency: string;
  defaultCurrency: string;
  enabledCurrencies: string[];
  usdRate: number | null;
  canSwitch: boolean;
  usdUnavailable: boolean;
}

interface Palette {
  card: string;
  surf: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
  warn?: string;
}

interface Props {
  /** ما يرسله الخادم مع بيانات النشاط — يحمل سعر الصرف العام */
  settings?: CurrencySettingsPayload | null;
  /** العملات المفعّلة حالياً في النموذج */
  enabledCurrencies: string[];
  /** الافتراضية حالياً في النموذج */
  defaultCurrency: string;
  onChange: (next: { enabledCurrencies: string[]; defaultCurrency: string }) => void;
  colors: Palette;
  disabled?: boolean;
}

const OPTIONS = [
  { code: 'SYP', label: 'ليرة سورية', symbol: 'ل.س' },
  { code: 'USD', label: 'دولار أمريكي', symbol: '$' },
];

/** مبلغ المعاينة — رقمٌ واقعي يُظهر أثر التحويل بوضوح */
const SAMPLE_SYP = 75000;

const CurrencyDisplaySettings: React.FC<Props> = ({
  settings,
  enabledCurrencies,
  defaultCurrency,
  onChange,
  colors: C,
  disabled,
}) => {
  const usdRate = settings?.usdRate ?? null;
  const rateMissing = !usdRate;

  const toggle = (code: string) => {
    const isOn = enabledCurrencies.includes(code);

    // آخر عملة لا تُطفأ: واجهةٌ بلا عملة لا تعرض سعراً
    if (isOn && enabledCurrencies.length === 1) return;

    const next = isOn
      ? enabledCurrencies.filter((c) => c !== code)
      : [...enabledCurrencies, code];

    // إطفاء الافتراضية ينقلها إلى أوّل المتبقّي بدل أن يترك حالةً مستحيلة
    const nextDefault = next.includes(defaultCurrency) ? defaultCurrency : next[0];

    onChange({ enabledCurrencies: next, defaultCurrency: nextDefault });
  };

  const setDefault = (code: string) => {
    if (!enabledCurrencies.includes(code)) return;
    onChange({ enabledCurrencies, defaultCurrency: code });
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
      <h2 style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 6px',
      }}>
        <IoCash size={17} color={C.accent} />
        عرض الأسعار
      </h2>

      <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.8, margin: '0 0 16px' }}>
        أسعارك محفوظة بالليرة السورية دائماً. تفعيل الدولار <b style={{ color: C.text }}>لا يغيّر
        أسعارك</b> — يعرضها محسوبةً بسعر صرف المنصّة. وإن فعّلت الاثنين ظهر لزبونك
        زرٌّ يبدّل بينهما.
      </p>

      {/* ---- العملات المفعّلة ---- */}
      <div style={{ display: 'grid', gap: 8 }}>
        {OPTIONS.map((option) => {
          const enabled = enabledCurrencies.includes(option.code);
          const isDefault = defaultCurrency === option.code;
          const blocked = option.code === 'USD' && rateMissing;

          return (
            <div
              key={option.code}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: C.surf,
                border: `1px solid ${enabled ? C.accent : 'transparent'}`,
                opacity: blocked && !enabled ? 0.55 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => !disabled && !blocked && toggle(option.code)}
                disabled={disabled || blocked}
                aria-pressed={enabled}
                style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: `1.5px solid ${enabled ? C.accent : C.muted}`,
                  background: enabled ? C.accent : 'transparent',
                  display: 'grid', placeItems: 'center',
                  cursor: disabled || blocked ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
              >
                {enabled && <IoCheckmark size={14} color="#0A2018" />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>
                  {option.label} <span style={{ color: C.muted, fontWeight: 500 }}>({option.symbol})</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                  {blocked
                    ? 'يحتاج سعر صرف من إدارة المنصّة'
                    : `مثال: ${formatPrice(SAMPLE_SYP, { code: option.code, usdRate })}`}
                </div>
              </div>

              {/* الافتراضية: زرٌّ لا مربّع اختيار — واحدةٌ فقط منها */}
              {enabled && (
                <button
                  type="button"
                  onClick={() => !disabled && setDefault(option.code)}
                  disabled={disabled || isDefault}
                  style={{
                    padding: '5px 11px', borderRadius: 20, flexShrink: 0,
                    fontSize: 11.5, fontWeight: 700,
                    border: `1px solid ${isDefault ? C.accent : C.border}`,
                    background: isDefault ? `${C.accent}22` : 'transparent',
                    color: isDefault ? C.accent : C.muted,
                    cursor: disabled || isDefault ? 'default' : 'pointer',
                  }}
                >
                  {isDefault ? 'الافتراضية' : 'اجعلها افتراضية'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- سعر الصرف: حقيقة يملكها غير التاجر ---- */}
      <div style={{
        display: 'flex', gap: 9, alignItems: 'flex-start',
        marginTop: 14, padding: '11px 13px', borderRadius: 12,
        background: rateMissing ? `${C.warn || '#F59E0B'}14` : `${C.accent}10`,
        border: `1px solid ${rateMissing ? `${C.warn || '#F59E0B'}44` : C.border}`,
      }}>
        {rateMissing
          ? <IoWarningOutline size={16} color={C.warn || '#F59E0B'} style={{ flexShrink: 0, marginTop: 2 }} />
          : <IoInformationCircle size={16} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />}
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.75 }}>
          {rateMissing ? (
            <>
              لم تضبط إدارة المنصّة سعر صرف الدولار بعد، فلا يمكن تفعيل العرض به.
              سعر الصرف <b style={{ color: C.text }}>عامٌّ للمنصّة كلها</b> — لو تركناه
              لكل تاجر لظهر المنتج نفسه بسعرين متباعدين.
            </>
          ) : (
            <>
              سعر الصرف الحالي: <b style={{ color: C.text }}>{usdRate!.toLocaleString('en-US')} ل.س</b> للدولار.
              تضبطه إدارة المنصّة ويسري على الجميع، ويتغيّر العرض معه تلقائياً بلا أن
              تعيد تسعير شيء.
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrencyDisplaySettings;
