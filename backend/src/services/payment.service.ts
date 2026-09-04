// backend/src/services/payment.service.ts
//
// طرق الدفع المتاحة في واجهة الزبون، ويتحكّم بها كل مطعم أو متجر من إعداداته.
//
// الدفع نقداً متاح دائماً ولا يُطفأ: لو أطفأ التاجر كل الطرق لبقي الزبون
// عاجزاً عن إتمام أي طلب.

import { PaymentMethod } from '@prisma/client';

export const CASH_METHOD: PaymentMethod = 'cash';
export const SHAM_CASH_METHOD: PaymentMethod = 'sham_cash';

export interface ShamCashSettings {
  enabled: boolean;
  /** رقم محفظة شام كاش الذي يحوّل إليه الزبون */
  accountNumber: string;
  /** اسم صاحب المحفظة كما يظهر للزبون عند التحويل */
  accountName?: string;
  /** تعليمات إضافية تُعرض في صفحة الدفع */
  note?: string;
}

export interface PaymentSettings {
  shamCash: ShamCashSettings;
}

export const EMPTY_SHAM_CASH: ShamCashSettings = { enabled: false, accountNumber: '' };

const asRecord = (raw: unknown): Record<string, any> => {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
};

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/** يقرأ الحقل المخزَّن ويُرجع بنية مكتملة مهما كان المخزَّن ناقصاً أو تالفاً. */
export const parsePaymentSettings = (raw: unknown): PaymentSettings => {
  const record = asRecord(raw);
  const sham = asRecord(record.shamCash);

  const accountNumber = cleanText(sham.accountNumber, 40);

  return {
    shamCash: {
      // لا نُفعّلها بلا رقم حساب مهما قال المخزَّن: تفعيلها فارغةً يعني
      // زبوناً يختار «شام كاش» ثم لا يجد جهة يحوّل إليها.
      enabled: sham.enabled === true && accountNumber.length > 0,
      accountNumber,
      accountName: cleanText(sham.accountName, 80) || undefined,
      note: cleanText(sham.note, 300) || undefined
    }
  };
};

export type PaymentSettingsResult =
  | { ok: true; value: PaymentSettings }
  | { ok: false; error: string };

/** يتحقق من تعديل التاجر قبل الحفظ، ويُرجع رسالة عربية جاهزة للعرض. */
export const validatePaymentSettings = (input: unknown): PaymentSettingsResult => {
  const record = asRecord(input);
  const sham = asRecord(record.shamCash);
  const wantsEnabled = sham.enabled === true;
  const accountNumber = cleanText(sham.accountNumber, 40);

  if (wantsEnabled && !accountNumber) {
    return { ok: false, error: 'أدخل رقم محفظة شام كاش قبل تفعيلها.' };
  }

  // رقم المحفظة أرقام، وقد يفصلها التاجر بمسافات أو شرطات عند اللصق
  if (accountNumber && !/^[0-9][0-9\s-]{4,}$/.test(accountNumber)) {
    return { ok: false, error: 'رقم محفظة شام كاش غير صالح — يُتوقّع أرقام فقط.' };
  }

  return {
    ok: true,
    value: {
      shamCash: {
        enabled: wantsEnabled && accountNumber.length > 0,
        accountNumber: accountNumber.replace(/[\s-]/g, ''),
        accountName: cleanText(sham.accountName, 80) || undefined,
        note: cleanText(sham.note, 300) || undefined
      }
    }
  };
};

/** الطرق المعروضة للزبون. النقد أولاً لأنه الأكثر استخداماً ولا يُطفأ. */
export const getEnabledPaymentMethods = (raw: unknown): PaymentMethod[] => {
  const settings = parsePaymentSettings(raw);
  const methods: PaymentMethod[] = [CASH_METHOD];
  if (settings.shamCash.enabled) methods.push(SHAM_CASH_METHOD);
  return methods;
};

/** ما يُرسَل إلى واجهة الزبون: بلا ملاحظات داخلية، وبالرقم فقط عند التفعيل. */
export const getPublicPaymentOptions = (raw: unknown) => {
  const { shamCash } = parsePaymentSettings(raw);
  return {
    methods: getEnabledPaymentMethods(raw),
    shamCash: shamCash.enabled
      ? { accountNumber: shamCash.accountNumber, accountName: shamCash.accountName, note: shamCash.note }
      : null
  };
};

/** يمنع طلباً بطريقة دفع لم يفعّلها التاجر — الواجهة تُخفيها، والخادم يرفضها. */
export const isPaymentMethodAllowed = (raw: unknown, method: unknown): boolean =>
  getEnabledPaymentMethods(raw).includes(method as PaymentMethod);

export default {
  CASH_METHOD,
  SHAM_CASH_METHOD,
  EMPTY_SHAM_CASH,
  parsePaymentSettings,
  validatePaymentSettings,
  getEnabledPaymentMethods,
  getPublicPaymentOptions,
  isPaymentMethodAllowed
};
