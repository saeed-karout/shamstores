// frontend/src/utils/currency.ts
//
// مصدر واحد لتنسيق الأسعار. قبل هذا كانت رموز العملة مكتوبة يدوياً
// في كل مكون ("ر.س" هنا و"ل.س" هناك) بغضّ النظر عن عملة التاجر.

export const CURRENCY_SYMBOLS: Record<string, string> = {
  SYP: 'ل.س',
  SAR: 'ر.س',
  USD: '$',
  EUR: '€',
  TRY: '₺',
  AED: 'د.إ',
  EGP: 'ج.م',
  JOD: 'د.أ',
  IQD: 'د.ع',
  KWD: 'د.ك',
  QAR: 'ر.ق',
  BHD: 'د.ب',
  OMR: 'ر.ع',
  LBP: 'ل.ل',
  YER: 'ر.ي',
  LYD: 'د.ل',
  MAD: 'د.م',
  TND: 'د.ت',
  DZD: 'د.ج',
  GBP: '£'
};

export const DEFAULT_CURRENCY = 'SYP';

/** عملة تخزين الأسعار في المنصّة كلها. التحويل عرضٌ لا تخزين. */
export const BASE_CURRENCY = 'SYP';

/**
 * عملة العرض مع سعر صرفها.
 *
 * **لماذا كائنٌ لا نصّ:** كان `formatPrice(50000, 'USD')` يطبع `50,000 $` —
 * يبدّل الرمز ولا يحوّل الرقم. فالتاجر الذي يختار الدولار كانت واجهته تعرض
 * أسعار الليرة بعلامة الدولار: خطأٌ بآلاف الأضعاف يبدو إعداداً ناجحاً.
 *
 * الخادم كان يرسل سعر الصرف (`currencyContext`) منذ البداية ولم تقرأه
 * الواجهة قطّ.
 */
export interface DisplayCurrency {
  code: string;
  /** كم ليرة للدولار الواحد. `null` يعني: لا تحوّل، اعرض بالليرة. */
  usdRate?: number | null;
}

export type CurrencyInput = string | DisplayCurrency | null | undefined;

const asDisplay = (input: CurrencyInput): DisplayCurrency => {
  if (!input) return { code: DEFAULT_CURRENCY };
  if (typeof input === 'string') return { code: input };
  return { code: input.code || DEFAULT_CURRENCY, usdRate: input.usdRate };
};

/**
 * يحوّل مبلغاً مخزَّناً بالليرة إلى عملة العرض.
 *
 * بلا سعر صرف صالح يبقى المبلغ بالليرة ويُعلن ذلك: رقمٌ دولاري بلا سعر صرف
 * ليس تقريباً بل خطأ بمئات الأضعاف.
 */
export const convertFromBase = (
  amount: number,
  target: CurrencyInput
): { amount: number; code: string } => {
  const { code, usdRate } = asDisplay(target);
  const upper = code.toUpperCase();

  if (upper === 'USD' && usdRate && usdRate > 0) {
    return { amount: amount / usdRate, code: 'USD' };
  }

  // عملةٌ أخرى بلا سعر صرف: الرمز يتغيّر والرقم لا — سلوك ما قبل التحويل،
  // ويبقى صحيحاً للتاجر الذي يسعّر فعلاً بتلك العملة
  if (upper === 'USD') return { amount, code: BASE_CURRENCY };
  return { amount, code: upper };
};

/** العملات التي لا تُستخدم فيها الكسور عملياً */
const ZERO_DECIMAL_CURRENCIES = new Set(['SYP', 'IQD', 'LBP', 'YER']);

export const getCurrencySymbol = (currency?: string | null): string => {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};

/** تجميع الأرقام بفواصل الآلاف بأرقام لاتينية (أسهل قراءة في سياق الأسعار) */
const groupNumber = (value: number, maximumFractionDigits: number): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits
    }).format(value);
  } catch {
    return String(value);
  }
};

export interface FormatPriceOptions {
  /** إخفاء رمز العملة (لعرض الرقم فقط) */
  hideSymbol?: boolean;
  /** عدد الخانات العشرية القصوى — يُشتق من العملة إن لم يُحدَّد */
  maximumFractionDigits?: number;
}

/**
 * تنسيق السعر مع رمز عملة التاجر.
 * مثال: formatPrice(1250, 'SYP') -> "1,250 ل.س"
 */
export const formatPrice = (
  amount: number | string | null | undefined,
  currency: CurrencyInput = DEFAULT_CURRENCY,
  options: FormatPriceOptions = {}
): string => {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = Number.isFinite(numeric as number) ? (numeric as number) : 0;

  // التحويل قبل التنسيق. تمرير نصّ يُبقي السلوك القديم حرفياً: لا سعر صرف
  // فلا تحويل — فلا تتأثّر لوحات التاجر والإدارة التي تمرّر رمزاً مجرّداً.
  const converted = convertFromBase(safe, currency);
  const code = converted.code;
  const maxFraction =
    options.maximumFractionDigits ?? (ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2);

  const formatted = groupNumber(converted.amount, maxFraction);

  if (options.hideSymbol) return formatted;
  return `${formatted} ${getCurrencySymbol(code)}`;
};

/** تنسيق مختصر للأرقام الكبيرة (عدد الطلبات مثلاً) */
export const formatCompact = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
};
