// backend/src/utils/validation.ts
// تحققات إدخال مشتركة — تُطبَّق على الخادم لأن تحقق الواجهة يمكن تجاوزه دائماً

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const isValidEmail = (email: unknown): boolean =>
  typeof email === 'string' && email.length <= 254 && EMAIL_REGEX.test(email.trim());

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** أشهر كلمات المرور المستخدمة — نرفضها مهما كان طولها */
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
  'qwerty123', 'qwertyui', 'iloveyou', 'admin123', '11111111', '00000000',
  'abc12345', 'letmein1', 'welcome1', 'shamstores', 'p@ssw0rd'
]);

/**
 * فحص كلمة المرور.
 *
 * `strict` يعكس إعداد prevent_weak_passwords — وكان الإعداد بلا أثر إطلاقاً:
 * القواعد تُفرض دائماً، فالمشرف يُطفئه ولا يتغيّر شيء.
 *
 * **الطول الأدنى مفروض في الحالتين**: إطفاء الإعداد يُرخي قائمة الشائع
 * واشتراط حرف ورقم، ولا يفتح الباب لكلمة مرور من محرف واحد.
 */
export const validatePassword = (password: unknown, strict: boolean = true): ValidationResult => {
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, error: 'كلمة المرور مطلوبة' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'كلمة المرور طويلة جداً' };
  }
  if (strict) {
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      return { valid: false, error: 'كلمة المرور شائعة جداً، اختر كلمة مرور أقوى' };
    }
    // على الأقل حرف ورقم — توازن بين الأمان وسهولة الاستخدام
    if (!/[a-zA-Z؀-ۿ]/.test(password) || !/[0-9]/.test(password)) {
      return { valid: false, error: 'كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل' };
    }
  }
  return { valid: true };
};

export const validateRegistration = (body: any): ValidationResult => {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 100) {
    return { valid: false, error: 'الاسم يجب أن يكون بين حرفين و100 حرف' };
  }
  if (!isValidEmail(body?.email)) {
    return { valid: false, error: 'البريد الإلكتروني غير صالح' };
  }
  const passwordResult = validatePassword(body?.password);
  if (!passwordResult.valid) return passwordResult;

  if (body?.phone !== undefined && body?.phone !== null && body?.phone !== '') {
    const phone = String(body.phone).trim();
    if (!/^[+0-9\s()-]{6,20}$/.test(phone)) {
      return { valid: false, error: 'رقم الهاتف غير صالح' };
    }
  }

  return { valid: true };
};

/** محارف التحكم والمحارف صفرية العرض — تُستخدم في الانتحال وإخفاء المحتوى */
const CONTROL_CHARS = new RegExp(
  '[' +
    '\\u0000-\\u001F\\u007F' + // محارف التحكم
    '\\u200B-\\u200F' +                 // محارف صفرية العرض
    '\\u202A-\\u202E' +                 // تجاوز اتجاه النص (انتحال)
    '\\uFEFF' +                                  // علامة ترتيب البايت
  ']',
  'g'
);

/** تنظيف نص حر قبل تخزينه/عرضه (اسم متجر، ملاحظة طلب...) */
export const sanitizeText = (input: unknown, maxLength = 500): string => {
  if (typeof input !== 'string') return '';
  return input.replace(CONTROL_CHARS, '').trim().slice(0, maxLength);
};
