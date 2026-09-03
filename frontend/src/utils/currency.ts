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
  currency: string = DEFAULT_CURRENCY,
  options: FormatPriceOptions = {}
): string => {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = Number.isFinite(numeric as number) ? (numeric as number) : 0;

  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  const maxFraction =
    options.maximumFractionDigits ?? (ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2);

  const formatted = groupNumber(safe, maxFraction);

  if (options.hideSymbol) return formatted;
  return `${formatted} ${getCurrencySymbol(code)}`;
};

/** تنسيق مختصر للأرقام الكبيرة (عدد الطلبات مثلاً) */
export const formatCompact = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
};
