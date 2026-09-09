// frontend/src/components/settings/LanguageDisplaySettings.tsx
//
// لغات واجهة الزبون.
//
// **لماذا وُجد هذا المكوّن متأخّراً:** الخادم يحسب اللغات المفعّلة ويتحقّق
// منها منذ البداية (`language.service.ts`)، وحقول `nameEn` موجودة في كل
// الجداول — لكن **لا شاشة تضبط `enabledLanguages`**. فالتاجر يشتري ميزة
// تعدّد اللغات ولا يجد أين يُشعلها، والزرّ لا يظهر لزبائنه أبداً. ميزةٌ
// مدفوعة يستحيل استعمالها.
//
// **وخياران لا واحد:** تفعيلُ لغة شيء، واختيارُ ما يُعرض أوّلاً شيء آخر.
// متجرٌ يفعّل الاثنتين ويجعل العربية افتراضاً يخدم جمهوره المحلّي بلا أن
// يحرم من يقرأ الإنجليزية. الخلط بينهما كان سيجبره على اختيار جمهور.

import React from 'react';
import { IoLanguage, IoInformationCircle, IoCheckmark, IoLockClosed } from 'react-icons/io5';

interface Palette {
  card: string;
  surf: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
}

interface Props {
  enabledLanguages: string[];
  defaultLanguage: string;
  onChange: (next: { enabledLanguages: string[]; defaultLanguage: string }) => void;
  /** هل يملك النشاط ميزة تعدّد اللغات؟ */
  canUseMulti: boolean;
  colors: Palette;
  disabled?: boolean;
}

const OPTIONS = [
  { code: 'ar', label: 'العربية', native: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'الإنجليزية', native: 'English', dir: 'ltr' }
];

const LanguageDisplaySettings: React.FC<Props> = ({
  enabledLanguages,
  defaultLanguage,
  onChange,
  canUseMulti,
  colors: C,
  disabled = false
}) => {
  const enabled = enabledLanguages.length > 0 ? enabledLanguages : ['ar'];

  const toggle = (code: string) => {
    if (disabled) return;

    const isOn = enabled.includes(code);

    // **لا يجوز إطفاء الأخيرة:** واجهةٌ بلا لغة واحدة على الأقلّ لا تُعرض
    // أصلاً، والخادم يرفضها — فالمنع هنا أوضح من خطأٍ بعد الحفظ
    if (isOn && enabled.length === 1) return;

    const next = isOn ? enabled.filter((c) => c !== code) : [...enabled, code];

    // الافتراضية يجب أن تبقى ضمن المفعّلة — وإلا فتح الزبون متجراً بلغةٍ
    // مطفأة
    const nextDefault = next.includes(defaultLanguage) ? defaultLanguage : next[0];
    onChange({ enabledLanguages: next, defaultLanguage: nextDefault });
  };

  const setDefault = (code: string) => {
    if (disabled || !enabled.includes(code)) return;
    onChange({ enabledLanguages: enabled, defaultLanguage: code });
  };

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 16
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <IoLanguage size={18} color={C.accent} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>
          لغات واجهة الزبون
        </h3>
      </div>

      <p style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.9, margin: '0 0 14px' }}>
        اللغة المفعّلة تظهر لزبونك كزرّ تبديل في أعلى متجرك. والمترجَم هو ما
        كتبته في الحقول الإنجليزية — أسماء الأصناف وأوصافها؛ وما تركته فارغاً
        يظهر بالعربية.
      </p>

      {!canUseMulti && (
        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            background: `${C.accent}14`,
            border: `1px solid ${C.accent}3d`,
            borderRadius: 11,
            padding: '11px 13px',
            marginBottom: 14
          }}
        >
          <IoLockClosed size={15} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ color: C.text, fontSize: 12.5, lineHeight: 1.9 }}>
            تعدّد اللغات ميزةٌ إضافية. بدونها يبقى متجرك بالعربية وحدها مهما
            فُعِّل هنا — والخادم يعيده إليها تلقائياً.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 9 }}>
        {OPTIONS.map((option) => {
          const on = enabled.includes(option.code);
          const isDefault = defaultLanguage === option.code;
          const lockedOff = !canUseMulti && option.code !== 'ar';

          return (
            <div
              key={option.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                background: C.surf,
                border: `1px solid ${on ? `${C.accent}55` : C.border}`,
                borderRadius: 11,
                padding: '11px 13px',
                opacity: lockedOff ? 0.55 : 1
              }}
            >
              <button
                type="button"
                onClick={() => !lockedOff && toggle(option.code)}
                disabled={disabled || lockedOff}
                aria-pressed={on}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: `1.5px solid ${on ? C.accent : C.border}`,
                  background: on ? C.accent : 'transparent',
                  cursor: disabled || lockedOff ? 'not-allowed' : 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  padding: 0
                }}
              >
                {on && <IoCheckmark size={14} color="#0A2018" />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 13.5, fontWeight: 600 }}>
                  {option.label}
                  <span
                    lang={option.code}
                    style={{ color: C.muted, fontWeight: 400, marginInlineStart: 7, fontSize: 12.5 }}
                  >
                    {option.native}
                  </span>
                </div>
              </div>

              {/* «الافتراضية» زرٌّ لا شارة: التاجر يحتاج تبديلها لا رؤيتها */}
              <button
                type="button"
                onClick={() => setDefault(option.code)}
                disabled={disabled || !on}
                style={{
                  border: `1px solid ${isDefault ? C.accent : C.border}`,
                  background: isDefault ? `${C.accent}22` : 'transparent',
                  color: isDefault ? C.accent : C.muted,
                  borderRadius: 999,
                  padding: '5px 11px',
                  fontSize: 11.5,
                  fontWeight: isDefault ? 800 : 500,
                  cursor: !on || disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  flexShrink: 0
                }}
              >
                {isDefault ? 'الافتراضية' : 'اجعلها افتراضية'}
              </button>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
          color: C.muted,
          fontSize: 12,
          lineHeight: 1.9,
          marginTop: 12
        }}
      >
        <IoInformationCircle size={14} style={{ flexShrink: 0, marginTop: 3 }} />
        <span>
          زرّ التبديل لا يظهر لزبونك إلا بلغتين مفعّلتين أو أكثر — زرٌّ بخيارٍ
          واحد يشغل مكاناً ويوحي بإمكانٍ لا وجود له.
        </span>
      </div>
    </div>
  );
};

export default LanguageDisplaySettings;
