// backend/src/services/securityPolicy.service.ts
//
// سياسة الأمان المقروءة من إعدادات المنصة.
//
// كانت العتبة والمدّة مكتوبتين في الكود بينما الفحص يقرأ الإعداد، فينشأ
// تناقض خطير: القفل يُضبط عند خمس محاولات دائماً، والفحص يقارن بحدّ المشرف.
// رفع الحدّ إلى عشرة كان **يُعطّل القفل كلياً** — يُضبط عند الخامسة لخمس عشرة
// دقيقة، ولا يمنع الفحص قبل العاشرة، وبحلولها يكون القفل انتهى.
//
// مصدر واحد للقيم يمنع عودة التناقض.

import SettingService from './setting.service';

/** قيم افتراضية عاقلة إن غاب الإعداد أو كان تالفاً */
export const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
export const DEFAULT_LOCKOUT_MINUTES = 15;

/** حدود تمنع إعداداً يُلغي الحماية أو يقفل الحساب للأبد */
const MIN_ATTEMPTS = 3;
const MAX_ATTEMPTS = 20;
const MIN_LOCKOUT_MINUTES = 1;
const MAX_LOCKOUT_MINUTES = 1440;

const clamp = (value: number, min: number, max: number, fallback: number): number =>
  Number.isFinite(value) && value >= min && value <= max ? Math.floor(value) : fallback;

export interface LoginPolicy {
  /** عدد المحاولات الفاشلة قبل القفل */
  maxAttempts: number;
  /** مدّة القفل بالدقائق */
  lockoutMinutes: number;
}

export const getLoginPolicy = async (): Promise<LoginPolicy> => {
  const [rawAttempts, rawMinutes] = await Promise.all([
    SettingService.getNumber('max_login_attempts', DEFAULT_MAX_LOGIN_ATTEMPTS),
    SettingService.getNumber('lockout_duration', DEFAULT_LOCKOUT_MINUTES)
  ]);

  return {
    maxAttempts: clamp(rawAttempts, MIN_ATTEMPTS, MAX_ATTEMPTS, DEFAULT_MAX_LOGIN_ATTEMPTS),
    lockoutMinutes: clamp(rawMinutes, MIN_LOCKOUT_MINUTES, MAX_LOCKOUT_MINUTES, DEFAULT_LOCKOUT_MINUTES)
  };
};

/**
 * هل تُفرض قواعد قوة كلمة المرور الكاملة؟
 *
 * الطول الأدنى يبقى مفروضاً دائماً مهما كان هذا الإعداد — إطفاؤه يُرخي
 * قائمة الشائع واشتراط حرف ورقم، لا يفتح الباب لكلمة مرور من محرف واحد.
 */
export const isStrongPasswordRequired = (): Promise<boolean> =>
  SettingService.getBoolean('prevent_weak_passwords', true);

export default {
  DEFAULT_MAX_LOGIN_ATTEMPTS,
  DEFAULT_LOCKOUT_MINUTES,
  getLoginPolicy,
  isStrongPasswordRequired
};
