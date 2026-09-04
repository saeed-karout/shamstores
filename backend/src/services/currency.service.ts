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
  getCurrencyContext
};
