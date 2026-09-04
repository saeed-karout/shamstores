// backend/src/services/language.service.ts
//
// قواعد لغات واجهة الزبون.
//
// العربية هي اللغة الأساس ومتاحة لكل نشاط بلا مقابل. أي لغة أخرى تحتاج ميزة
// `multi_language` — سواء جاءت ضمن الخطة أو أُسندت كإضافة مدفوعة.
//
// النشاط الذي يملك الميزة حرّ في اختيار اللغات المفعّلة ولغته الافتراضية،
// بما في ذلك **إخفاء العربية** إن كان جمهوره غير عربي. القيد الوحيد أن تبقى
// لغة واحدة على الأقل مفعّلة، وأن تكون الافتراضية من بينها.

import { businessHasEntitlement, BusinessType } from './entitlement.service';

export const BASE_LANGUAGE = 'ar';
export const MULTI_LANGUAGE_FEATURE = 'multi_language';

/** اللغات المدعومة في الواجهة. التوسعة هنا وحدها. */
export const SUPPORTED_LANGUAGES: Record<string, { name: string; nativeName: string; dir: 'rtl' | 'ltr' }> = {
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  en: { name: 'English', nativeName: 'English', dir: 'ltr' }
};

export interface LanguageSettings {
  /** اللغة التي تُعرض للزائر أولاً */
  defaultLanguage: string;
  /** اللغات التي يمكن للزائر التبديل بينها */
  enabledLanguages: string[];
  /** هل يملك النشاط ميزة تعدّد اللغات؟ تستخدمه الواجهة لعرض حالة الترقية */
  multiLanguageEnabled: boolean;
}

export const isSupportedLanguage = (code: unknown): code is string =>
  typeof code === 'string' && Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, code);

export const getLanguageDirection = (code: string): 'rtl' | 'ltr' =>
  SUPPORTED_LANGUAGES[code]?.dir ?? 'rtl';

/** يقرأ قائمة اللغات المخزّنة (Json حر) ويُرجع رموزاً مدعومة بلا تكرار. */
const parseStoredLanguages = (raw: unknown): string[] => {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isSupportedLanguage)));
};

/**
 * الإعدادات الفعلية التي تُطبَّق على واجهة الزبون.
 *
 * تُشتق من المخزَّن مقيّداً بالاستحقاق: النشاط الذي فقد الميزة (انتهى اشتراكه
 * أو نزلت خطته) يعود تلقائياً إلى العربية وحدها بدل أن تبقى واجهته بلغة
 * لم يعد يدفع مقابلها.
 */
export const resolveLanguageSettings = async (
  business: { id: string; language?: string | null; enabledLanguages?: unknown },
  businessType: BusinessType
): Promise<LanguageSettings> => {
  const multiLanguageEnabled = await businessHasEntitlement(
    business.id,
    businessType,
    MULTI_LANGUAGE_FEATURE
  );

  if (!multiLanguageEnabled) {
    return { defaultLanguage: BASE_LANGUAGE, enabledLanguages: [BASE_LANGUAGE], multiLanguageEnabled: false };
  }

  const stored = parseStoredLanguages(business.enabledLanguages);
  const enabledLanguages = stored.length > 0 ? stored : [BASE_LANGUAGE];

  const storedDefault = business.language;
  const defaultLanguage =
    isSupportedLanguage(storedDefault) && enabledLanguages.includes(storedDefault)
      ? storedDefault
      : enabledLanguages[0];

  return { defaultLanguage, enabledLanguages, multiLanguageEnabled: true };
};

export interface LanguageUpdateInput {
  defaultLanguage?: unknown;
  enabledLanguages?: unknown;
}

/**
 * ملاحظة: حقول اختيارية لا اتحاد مميَّز. المشروع يعمل على strict:false،
 * وتضييق الاتحاد بـ `if (!result.ok)` لا يعمل تحته فيرفض المترجم قراءة
 * result.error. لا تُعِده اتحاداً قبل تفعيل strict.
 */
export interface LanguageUpdateResult {
  ok: boolean;
  defaultLanguage?: string;
  enabledLanguages?: string[];
  error?: string;
  /** الرفض بسبب غياب الميزة لا بسبب مدخل خاطئ — تعرض الواجهة دعوة ترقية */
  requiresUpgrade?: boolean;
}

/**
 * يتحقق من تعديل التاجر لإعدادات اللغة قبل حفظه.
 *
 * يُرجع رسالة عربية جاهزة للعرض، و`requiresUpgrade` حين يكون الرفض بسبب
 * غياب الميزة لا بسبب مدخل خاطئ — لتعرض الواجهة دعوة ترقية لا رسالة خطأ.
 */
export const validateLanguageUpdate = async (
  businessId: string,
  businessType: BusinessType,
  input: LanguageUpdateInput
): Promise<LanguageUpdateResult> => {
  const requestedEnabled =
    input.enabledLanguages === undefined ? null : parseStoredLanguages(input.enabledLanguages);

  if (requestedEnabled !== null && requestedEnabled.length === 0) {
    return { ok: false, error: 'يجب تفعيل لغة واحدة على الأقل.' };
  }

  const enabledLanguages = requestedEnabled ?? [BASE_LANGUAGE];

  const requestedDefault = input.defaultLanguage;
  if (requestedDefault !== undefined && !isSupportedLanguage(requestedDefault)) {
    return { ok: false, error: 'اللغة المطلوبة غير مدعومة.' };
  }

  const defaultLanguage = isSupportedLanguage(requestedDefault) ? requestedDefault : enabledLanguages[0];

  if (!enabledLanguages.includes(defaultLanguage)) {
    return { ok: false, error: 'اللغة الافتراضية يجب أن تكون ضمن اللغات المفعّلة.' };
  }

  const needsFeature = enabledLanguages.some((code) => code !== BASE_LANGUAGE);
  if (needsFeature) {
    const allowed = await businessHasEntitlement(businessId, businessType, MULTI_LANGUAGE_FEATURE);
    if (!allowed) {
      return {
        ok: false,
        error: 'تعدّد اللغات ميزة إضافية. رقِّ خطتك أو فعّلها من المتجر لإضافة لغة غير العربية.',
        requiresUpgrade: true
      };
    }
  }

  return { ok: true, defaultLanguage, enabledLanguages };
};

export default {
  BASE_LANGUAGE,
  MULTI_LANGUAGE_FEATURE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  getLanguageDirection,
  resolveLanguageSettings,
  validateLanguageUpdate
};
