// backend/src/services/currency.service.ts
//
// الليرة السورية هي عملة الأساس: كل الأسعار تُخزَّن بها في قاعدة البيانات.
// عرضها بالدولار تحويلٌ عند القراءة لا تخزينٌ مستقل — فتغيير سعر الصرف لا
// يستلزم إعادة كتابة كل سعر في المنصة، ولا يترك أسعاراً قديمة بسعر قديم.
//
// سعر الصرف **عام للمنصة كلها** ويضبطه السوبر أدمن وحده، لا كل تاجر: سعر
// مختلف لكل متجر يجعل نفس المنتج بسعرين متباعدين ويفتح باب التلاعب.

import SettingService from './setting.service';

/** عملة التخزين. لا تتغيّر — تغييرها يعني إعادة تسعير كل شيء. */
export const BASE_CURRENCY = 'SYP';

/** العملات التي يمكن للتاجر عرض واجهته بها */
export const DISPLAY_CURRENCIES = [BASE_CURRENCY, 'USD'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

/** مفتاح سعر الصرف في إعدادات المنصة — يضبطه السوبر أدمن */
export const USD_RATE_SETTING_KEY = 'usd_exchange_rate';

/**
 * حدود عاقلة لسعر الصرف. ليست تحكّماً في السوق بل حاجز خطأ مطبعي:
 * صفر أو رقم سالب يجعل كل الأسعار صفراً أو سالبة، ورقم بخانة زائدة يجعل
 * وجبة بخمسين ألف ليرة تظهر بخمسة دولارات أو بخمسمئة.
 */
export const MIN_USD_RATE = 1;
export const MAX_USD_RATE = 1_000_000;

export const isDisplayCurrency = (code: unknown): code is DisplayCurrency =>
  typeof code === 'string' && (DISPLAY_CURRENCIES as readonly string[]).includes(code.toUpperCase());

/**
 * سعر صرف الدولار الحالي: كم ليرة سورية للدولار الواحد.
 * يُرجع null إن لم يُضبط أو كان خارج الحدود — والمنادي يعود عندها إلى الليرة
 * بدل عرض سعر دولاري خاطئ.
 */
export const getUsdRate = async (): Promise<number | null> => {
  const raw = await SettingService.getNumber(USD_RATE_SETTING_KEY, 0);
  if (!Number.isFinite(raw) || raw < MIN_USD_RATE || raw > MAX_USD_RATE) return null;
  return raw;
};

/**
 * ملاحظة: حقول اختيارية لا اتحاد مميَّز. المشروع يعمل على strict:false،
 * وتضييق الاتحاد بـ `if (!result.ok)` لا يعمل تحته فيرفض المترجم قراءة
 * result.error. لا تُعِده اتحاداً قبل تفعيل strict.
 */
export interface RateUpdateResult {
  ok: boolean;
  rate?: number;
  error?: string;
}

/** يتحقق من مدخل السوبر أدمن قبل حفظه. يُرجع رسالة عربية جاهزة للعرض. */
export const validateUsdRate = (input: unknown): RateUpdateResult => {
  const rate = typeof input === 'string' ? parseFloat(input.trim()) : Number(input);

  if (!Number.isFinite(rate)) {
    return { ok: false, error: 'سعر الصرف يجب أن يكون رقماً.' };
  }
  if (rate < MIN_USD_RATE || rate > MAX_USD_RATE) {
    return {
      ok: false,
      error: `سعر الصرف خارج النطاق المعقول (${MIN_USD_RATE}–${MAX_USD_RATE.toLocaleString('en-US')} ل.س للدولار).`
    };
  }
  return { ok: true, rate };
};

/** يحفظ سعر الصرف العام. الصلاحية تُفحص في طبقة المسار (سوبر أدمن فقط). */
export const setUsdRate = async (input: unknown): Promise<RateUpdateResult> => {
  const result = validateUsdRate(input);
  if (!result.ok) return result;

  await SettingService.setSetting(USD_RATE_SETTING_KEY, result.rate, 'number', 'payment');
  return result;
};

/**
 * يحوّل مبلغاً مخزَّناً بالليرة إلى عملة العرض.
 *
 * يُرجع دائماً العملة التي جرى العرض بها فعلاً: إن طُلب الدولار وسعر الصرف
 * غائب، يعود المبلغ بالليرة ويُعلن ذلك — أفضل من رقم دولاري مختلَق.
 */
export const convertFromBase = (
  amount: number,
  target: string,
  usdRate: number | null
): { amount: number; currency: string } => {
  const safe = Number.isFinite(amount) ? amount : 0;
  const code = typeof target === 'string' ? target.toUpperCase() : BASE_CURRENCY;

  if (code === 'USD' && usdRate && usdRate >= MIN_USD_RATE) {
    // خانتان عشريتان: الدولار عملة كسرية خلافاً لليرة
    return { amount: Math.round((safe / usdRate) * 100) / 100, currency: 'USD' };
  }

  return { amount: safe, currency: BASE_CURRENCY };
};

/** ما تحتاجه الواجهة لتحوّل الأسعار بنفسها بدل تحويل كل سعر على الخادم. */
export const getCurrencyContext = async (displayCurrency?: string | null) => {
  const usdRate = await getUsdRate();
  const requested = isDisplayCurrency(displayCurrency) ? displayCurrency.toUpperCase() : BASE_CURRENCY;
  const effective = requested === 'USD' && !usdRate ? BASE_CURRENCY : requested;

  return {
    baseCurrency: BASE_CURRENCY,
    displayCurrency: effective,
    usdRate,
    /** صحيح حين طُلب الدولار وتعذّر لغياب سعر صرف صالح */
    fellBackToBase: requested === 'USD' && effective === BASE_CURRENCY
  };
};

/**
 * إعدادات عرض العملة لواجهة زبون نشاطٍ بعينه.
 *
 * التاجر يختار **ما يُعرض** لا ما يُخزَّن: قد يعرض بالليرة وحدها، أو
 * بالدولار وحده، أو بالاثنين ويترك الزبون يبدّل. والأخير هو الحاجة الفعلية
 * في سوقٍ يتعامل الناس فيه بالعملتين معاً.
 */
export interface CurrencySettings {
  /** عملة التخزين — ثابتة، وتُعرض للتاجر ليعرف أن التبديل عرضٌ لا إعادة تسعير */
  baseCurrency: string;
  /** ما يراه الزائر قبل أن يبدّل */
  defaultCurrency: string;
  /** ما يمكنه التبديل بينه */
  enabledCurrencies: string[];
  /** كم ليرة للدولار — الواجهة تحوّل به بدل نداء لكل سعر */
  usdRate: number | null;
  /** هل يُعرض زرّ التبديل أصلاً؟ عملةٌ واحدة لا تحتاج زرّاً */
  canSwitch: boolean;
  /**
   * صحيحٌ حين اختار التاجر الدولار وسعر الصرف غير مضبوط.
   *
   * الواجهة عندها تعرض بالليرة: رقمٌ دولاري بلا سعر صرف ليس تقريباً بل
   * خطأ بمئات الأضعاف.
   */
  usdUnavailable: boolean;
}

/** يقرأ قائمة العملات المخزّنة (Json حر) ويُرجع رموزاً مدعومة بلا تكرار */
const parseStoredCurrencies = (raw: unknown): string[] => {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const codes = value
    .filter(isDisplayCurrency)
    .map((code) => String(code).toUpperCase());

  return Array.from(new Set(codes));
};

/**
 * الإعدادات الفعلية المطبَّقة على واجهة الزبون.
 *
 * تُشتق من المخزَّن مقيّداً بالواقع: النشاط الذي فعّل الدولار ثم أُلغي سعر
 * الصرف يعود تلقائياً إلى الليرة — بدل أن تبقى واجهته تعرض أرقاماً خاطئة.
 */
export const resolveCurrencySettings = async (business: {
  currency?: string | null;
  enabledCurrencies?: unknown;
}): Promise<CurrencySettings> => {
  const usdRate = await getUsdRate();

  const stored = parseStoredCurrencies(business.enabledCurrencies);
  // النشاط الذي لم يختر بعد: عملته المفردة القديمة هي إعداده الفعلي
  const fallback = isDisplayCurrency(business.currency)
    ? [String(business.currency).toUpperCase()]
    : [BASE_CURRENCY];

  const requested = stored.length > 0 ? stored : fallback;

  // بلا سعر صرف يسقط الدولار من القائمة كلها — لا يُعرض ولا يُبدَّل إليه
  const enabledCurrencies = usdRate
    ? requested
    : requested.filter((code) => code !== 'USD');

  const effective = enabledCurrencies.length > 0 ? enabledCurrencies : [BASE_CURRENCY];

  const storedDefault = isDisplayCurrency(business.currency)
    ? String(business.currency).toUpperCase()
    : null;

  const defaultCurrency =
    storedDefault && effective.includes(storedDefault) ? storedDefault : effective[0];

  return {
    baseCurrency: BASE_CURRENCY,
    defaultCurrency,
    enabledCurrencies: effective,
    usdRate,
    canSwitch: effective.length > 1,
    usdUnavailable: requested.includes('USD') && !usdRate
  };
};

export interface CurrencyUpdateInput {
  defaultCurrency?: unknown;
  enabledCurrencies?: unknown;
}

/**
 * ملاحظة: حقول اختيارية لا اتحاد مميَّز — نفس سبب `RateUpdateResult` أعلاه.
 */
export interface CurrencyUpdateResult {
  ok: boolean;
  defaultCurrency?: string;
  enabledCurrencies?: string[];
  error?: string;
  /** الرفض لغياب سعر الصرف لا لخطأ التاجر — تعرض الواجهة رسالة مختلفة */
  needsExchangeRate?: boolean;
}

/** يتحقق من تعديل التاجر قبل حفظه. يُرجع رسالة عربية جاهزة للعرض. */
export const validateCurrencyUpdate = async (
  input: CurrencyUpdateInput
): Promise<CurrencyUpdateResult> => {
  const requested =
    input.enabledCurrencies === undefined ? null : parseStoredCurrencies(input.enabledCurrencies);

  if (requested !== null && requested.length === 0) {
    return { ok: false, error: 'يجب تفعيل عملة عرض واحدة على الأقل.' };
  }

  const enabledCurrencies = requested ?? [BASE_CURRENCY];

  const rawDefault = input.defaultCurrency;
  if (rawDefault !== undefined && !isDisplayCurrency(rawDefault)) {
    return { ok: false, error: 'عملة العرض غير مدعومة. المتاح: الليرة السورية أو الدولار.' };
  }

  const defaultCurrency = isDisplayCurrency(rawDefault)
    ? String(rawDefault).toUpperCase()
    : enabledCurrencies[0];

  if (!enabledCurrencies.includes(defaultCurrency)) {
    return { ok: false, error: 'العملة الافتراضية يجب أن تكون ضمن العملات المفعّلة.' };
  }

  // الدولار بلا سعر صرف يُرفض عند الحفظ لا عند العرض: التاجر يستحقّ أن
  // يعرف السبب الآن، لا أن يحفظ ويجد واجهته بالليرة بلا تفسير
  if (enabledCurrencies.includes('USD')) {
    const usdRate = await getUsdRate();
    if (!usdRate) {
      return {
        ok: false,
        error: 'لم يُضبط سعر صرف الدولار على المنصّة بعد. تواصل مع الإدارة لتفعيل العرض بالدولار.',
        needsExchangeRate: true
      };
    }
  }

  return { ok: true, defaultCurrency, enabledCurrencies };
};

export default {
  BASE_CURRENCY,
  DISPLAY_CURRENCIES,
  USD_RATE_SETTING_KEY,
  MIN_USD_RATE,
  MAX_USD_RATE,
  isDisplayCurrency,
  getUsdRate,
  validateUsdRate,
  setUsdRate,
  convertFromBase,
  getCurrencyContext,
  resolveCurrencySettings,
  validateCurrencyUpdate
};
