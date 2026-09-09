// frontend/src/hooks/useStorefrontLanguage.ts
//
// لغة واجهة الزبون.
//
// **الخادم كان يدعمها والواجهة لا تعرضها.** `language.service.ts` يحسب
// اللغات المفعّلة والافتراضية ويرسلها في `languageSettings` مع كل متجر،
// وحقول `nameEn` و`descriptionEn` موجودة في قاعدة البيانات منذ البداية —
// لكن لا زرّ يبدّل بينها. أي أن التاجر كان يدفع مقابل `multi_language`
// ويملأ الحقول الإنجليزية ولا يراها زبونٌ واحد.
//
// **ما تفعله هذه الوحدة:** تبدّل لغة **المحتوى** — أسماء المتجر والأصناف
// والفئات وأوصافها — واتجاه الصفحة. أمّا نصوص الواجهة نفسها فتُترجَم عبر
// `tr` أينما استُعملت، ولم تُغطَّ كل الشاشات بعد.

import { useCallback, useEffect, useMemo, useState } from 'react';

export type LangCode = 'ar' | 'en';

export interface LanguageSettings {
  defaultLanguage?: string;
  enabledLanguages?: string[];
  multiLanguageEnabled?: boolean;
}

const STORAGE_PREFIX = 'sham_lang:';

const isLang = (value: unknown): value is LangCode => value === 'ar' || value === 'en';

/** الاختيار يُحفظ لكل متجر على حدة: زبونٌ يزور متجرين قد يريد لغةً لكلٍّ */
const readStored = (slug: string): LangCode | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slug);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
};

const LAST_KEY = STORAGE_PREFIX + '~last';

const writeStored = (slug: string, lang: LangCode) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + slug, lang);
    // ونسخةٌ بلا اسم متجر — لصفحاتٍ تُفتح من رابطٍ ولا تعرف من أي متجر
    // جاءت، كصفحة تتبّع الطلب (`/track/:orderId`)
    localStorage.setItem(LAST_KEY, lang);
  } catch {
    /* تصفّح خاصّ — الاختيار يعيش لهذه الجلسة */
  }
};

/**
 * آخر لغةٍ اختارها الزبون في أي متجر.
 *
 * **لصفحةٍ بلا متجرٍ في مسارها.** رابط التتبّع يصل بالرسالة أو الإشعار
 * ولا يحمل اسم المتجر، فكانت الصفحة تُعرض بالعربية دائماً لمن اختار
 * الإنجليزية قبل ثانيةٍ في نفس الجلسة.
 */
export const readLastLang = (): LangCode | null => {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
};

export interface StorefrontLanguage {
  lang: LangCode;
  dir: 'rtl' | 'ltr';
  /** اللغات التي يُسمح بالتبديل بينها — أقلّ من اثنتين يعني لا زرّ */
  options: LangCode[];
  setLang: (lang: LangCode) => void;
  /** نصّ الواجهة: `tr('سلّة', 'Cart')` */
  tr: (ar: string, en: string) => string;
  /**
   * حقل محتوى مع بديله الإنجليزي.
   *
   * **يعود إلى العربية حين يكون البديل فارغاً** — ولا يعرض فراغاً: صنفٌ لم
   * يترجم اسمه يظهر باسمه العربي، وهو أنفع من بطاقةٍ بلا عنوان.
   */
  pick: (row: unknown, field: string) => string;
}

export const useStorefrontLanguage = (
  slug: string | undefined | null,
  settings?: LanguageSettings | null
): StorefrontLanguage => {
  const options = useMemo<LangCode[]>(() => {
    if (!settings?.multiLanguageEnabled) return ['ar'];
    const enabled = (settings.enabledLanguages || []).filter(isLang);
    return enabled.length > 0 ? enabled : ['ar'];
  }, [settings]);

  const fallback: LangCode = isLang(settings?.defaultLanguage)
    ? (settings!.defaultLanguage as LangCode)
    : options[0] || 'ar';

  const [lang, setLangState] = useState<LangCode>(fallback);

  useEffect(() => {
    // اختيار الزبون يغلب افتراضيّ التاجر، لكن **لا يغلب قائمة المتاح**:
    // متجرٌ أوقف الإنجليزية لا يبقى زبونه عالقاً عليها بسبب اختيارٍ قديم
    const stored = slug ? readStored(slug) : null;
    const next = stored && options.includes(stored) ? stored : fallback;
    setLangState(next);
  }, [slug, fallback, options]);

  const setLang = useCallback(
    (next: LangCode) => {
      if (!options.includes(next)) return;
      setLangState(next);
      if (slug) writeStored(slug, next);
    },
    [options, slug]
  );

  const dir: 'rtl' | 'ltr' = lang === 'en' ? 'ltr' : 'rtl';

  const tr = useCallback((ar: string, en: string) => (lang === 'en' ? en : ar), [lang]);

  const pick = useCallback(
    (row: unknown, field: string): string => {
      if (!row || typeof row !== 'object') return '';
      const record = row as Record<string, unknown>;
      const base = String(record[field] ?? '');
      if (lang !== 'en') return base;

      // `nameEn` من `name` — الاصطلاح نفسه في كل الجداول
      const englishKey = `${field}En`;
      const english = String(record[englishKey] ?? '').trim();
      return english || base;
    },
    [lang]
  );

  return { lang, dir, options, setLang, tr, pick };
};

export default useStorefrontLanguage;
