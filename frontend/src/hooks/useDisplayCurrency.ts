// frontend/src/hooks/useDisplayCurrency.ts
//
// عملة العرض التي يراها الزائر.
//
// **المشكلة التي يحلّها:** التاجر كان يختار عملة واحدة، والزبون لا خيار له.
// وفي سوقٍ يتعامل الناس فيه بالليرة والدولار معاً، الاختيار الواحد يخسر
// نصف الجمهور: من يفكّر بالدولار يقرأ رقماً بالليرة فلا يعرف أرخصٌ هو أم
// غالٍ، والعكس صحيح.
//
// **ولماذا اختيار الزائر يُحفظ:** من بدّل مرّة يريد ذلك في كل زيارة. وقراره
// خاصٌّ بهذا المتجر لا بالمنصّة كلها — متجرٌ يسعّر بالدولار وآخر بالليرة،
// وتوحيد الاختيار بينهما يفرض على أحدهما ما لم يختره.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DisplayCurrency, DEFAULT_CURRENCY, getCurrencySymbol, formatPrice } from '@/utils/currency';

/** ما يرسله الخادم مع بيانات المتجر */
export interface CurrencySettings {
  baseCurrency: string;
  defaultCurrency: string;
  enabledCurrencies: string[];
  usdRate: number | null;
  canSwitch: boolean;
  usdUnavailable: boolean;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

const LABELS: Record<string, string> = {
  SYP: 'ليرة سورية',
  USD: 'دولار أمريكي'
};

const storageKey = (businessKey?: string | null) =>
  `sf-currency:${businessKey || 'default'}`;

const readStored = (businessKey?: string | null): string | null => {
  try {
    return localStorage.getItem(storageKey(businessKey));
  } catch {
    // وضع التصفّح الخاص يرمي عند القراءة — الغياب ليس عطلاً
    return null;
  }
};

export interface UseDisplayCurrency {
  /** يُمرَّر إلى `formatPrice` — يحمل الرمز وسعر الصرف معاً */
  currency: DisplayCurrency;
  code: string;
  setCode: (code: string) => void;
  options: CurrencyOption[];
  canSwitch: boolean;
  /** تنسيقٌ جاهز حين لا يكون تمرير `currency` عملياً */
  format: (amount: number | string | null | undefined) => string;
}

export const useDisplayCurrency = (
  settings: CurrencySettings | null | undefined,
  businessKey?: string | null,
  fallbackCurrency?: string | null
): UseDisplayCurrency => {
  const enabled = useMemo(() => {
    const list = settings?.enabledCurrencies?.filter(Boolean) || [];
    if (list.length > 0) return list.map((c) => c.toUpperCase());
    // نشاطٌ لم يُحدَّث بعد: عملته المفردة هي إعداده الفعلي
    return [(fallbackCurrency || DEFAULT_CURRENCY).toUpperCase()];
  }, [settings, fallbackCurrency]);

  const serverDefault = (settings?.defaultCurrency || fallbackCurrency || DEFAULT_CURRENCY).toUpperCase();

  const [code, setCodeState] = useState<string>(() => {
    const stored = readStored(businessKey);
    // المخزَّن يُحترم ما دام التاجر يفعّله: عملةٌ ألغاها التاجر لا تبقى
    // معروضة لزائرٍ اختارها قبل شهر
    if (stored && enabled.includes(stored)) return stored;
    return enabled.includes(serverDefault) ? serverDefault : enabled[0];
  });

  // الإعدادات تصل بعد أوّل بناء (النداء غير متزامن) — والاختيار يُعاد ضبطه
  // عندها، وإلا عُرضت العملة الافتراضية للمنصّة لا للمتجر
  useEffect(() => {
    setCodeState((current) => {
      if (enabled.includes(current)) return current;
      const stored = readStored(businessKey);
      if (stored && enabled.includes(stored)) return stored;
      return enabled.includes(serverDefault) ? serverDefault : enabled[0];
    });
  }, [enabled, serverDefault, businessKey]);

  const setCode = useCallback((next: string) => {
    const upper = next.toUpperCase();
    setCodeState(upper);
    try {
      localStorage.setItem(storageKey(businessKey), upper);
    } catch {
      // الحفظ تحسينٌ لا شرط: الاختيار يعمل في هذه الجلسة على أي حال
    }
  }, [businessKey]);

  const currency: DisplayCurrency = useMemo(
    () => ({ code, usdRate: settings?.usdRate ?? null }),
    [code, settings?.usdRate]
  );

  const options: CurrencyOption[] = useMemo(
    () => enabled.map((c) => ({
      code: c,
      symbol: getCurrencySymbol(c),
      label: LABELS[c] || c
    })),
    [enabled]
  );

  const format = useCallback(
    (amount: number | string | null | undefined) => formatPrice(amount, currency),
    [currency]
  );

  return {
    currency,
    code,
    setCode,
    options,
    canSwitch: enabled.length > 1,
    format
  };
};

export default useDisplayCurrency;
