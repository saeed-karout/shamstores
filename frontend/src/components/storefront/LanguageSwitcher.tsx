// frontend/src/components/storefront/LanguageSwitcher.tsx
//
// زرّ تبديل اللغة في واجهة الزبون.
//
// نفس شكل زرّ العملة ونفس قواعده: لا يُعرض بخيارٍ واحد، والمفعّل يُبرَز
// بلون هوية التاجر لا بلون المنصّة — هذه واجهته.
//
// **والاسم بلغته الأمّ:** «العربية» لا «Arabic»، و«English» لا
// «الإنجليزية». من لا يقرأ العربية لن يجد زرّه إن كُتب اسمه بها.

import React from 'react';
import { sf } from '@/utils/storefrontTheme';
import type { LangCode } from '@/hooks/useStorefrontLanguage';

const NATIVE: Record<LangCode, { short: string; full: string }> = {
  ar: { short: 'ع', full: 'العربية' },
  en: { short: 'EN', full: 'English' }
};

interface Props {
  options: LangCode[];
  lang: LangCode;
  onChange: (lang: LangCode) => void;
  variant?: 'compact' | 'full';
}

const LanguageSwitcher: React.FC<Props> = ({ options, lang, onChange, variant = 'compact' }) => {
  if (options.length < 2) return null;

  const compact = variant === 'compact';

  return (
    <div
      role="group"
      aria-label="لغة العرض / Display language"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: sf.surface,
        border: `1px solid ${sf.border}`
      }}
    >
      {options.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={active}
            lang={code}
            title={NATIVE[code].full}
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
              transition: 'background 140ms ease, color 140ms ease'
            }}
          >
            {compact ? NATIVE[code].short : NATIVE[code].full}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
