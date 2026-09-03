// backend/src/config/env.ts
// التحقق من متغيرات البيئة عند الإقلاع — يمنع تشغيل الإنتاج بإعدادات غير آمنة

import dotenv from 'dotenv';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
export const isProduction = NODE_ENV === 'production';
export const isDevelopment = NODE_ENV === 'development';

/** أسرار غير مقبولة إطلاقاً في الإنتاج */
const INSECURE_SECRETS = [
  'your-secret-key-change-this',
  'secret',
  'changeme',
  'jwt-secret',
  'shamstores'
];

const errors: string[] = [];
const warnings: string[] = [];

// ==================== JWT_SECRET ====================
const rawJwtSecret = process.env.JWT_SECRET;

if (!rawJwtSecret) {
  errors.push('JWT_SECRET غير معرّف. يجب ضبطه بقيمة عشوائية طولها 32 حرفاً على الأقل.');
} else if (INSECURE_SECRETS.includes(rawJwtSecret.toLowerCase())) {
  errors.push('JWT_SECRET يستخدم قيمة افتراضية معروفة. غيّرها فوراً.');
} else if (rawJwtSecret.length < 32) {
  if (isProduction) {
    errors.push('JWT_SECRET قصير جداً (أقل من 32 حرفاً) — غير آمن في الإنتاج.');
  } else {
    warnings.push('JWT_SECRET قصير (أقل من 32 حرفاً). استخدم قيمة أطول قبل النشر.');
  }
}

// ==================== DATABASE_URL ====================
if (!process.env.DATABASE_URL) {
  errors.push('DATABASE_URL غير معرّف.');
}

// ==================== إعدادات اختيارية مهمة في الإنتاج ====================
if (isProduction) {
  if (!process.env.CLIENT_URL && !process.env.ALLOWED_ORIGINS) {
    warnings.push('CLIENT_URL / ALLOWED_ORIGINS غير معرّفين — سيتم الاعتماد على قائمة النطاقات الافتراضية فقط.');
  }
  if (!process.env.APP_DOMAIN) {
    warnings.push('APP_DOMAIN غير معرّف — سيتم استخدام shamstores.com كنطاق أساسي.');
  }
}

if (warnings.length) {
  warnings.forEach((w) => console.warn(`⚠️  [env] ${w}`));
}

if (errors.length) {
  errors.forEach((e) => console.error(`❌ [env] ${e}`));
  if (isProduction) {
    // الفشل السريع: لا نشغّل الإنتاج بإعدادات غير آمنة
    throw new Error('إعدادات البيئة غير صالحة. راجع الأخطاء أعلاه.');
  }
  console.error('⚠️  [env] المتابعة في وضع التطوير رغم الأخطاء أعلاه.');
}

export const env = {
  NODE_ENV,
  PORT: Number(process.env.PORT) || 5000,
  /** في التطوير فقط: قيمة احتياطية حتى لا يتوقف العمل المحلي */
  JWT_SECRET: rawJwtSecret || 'dev-only-insecure-secret-do-not-use-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  DATABASE_URL: process.env.DATABASE_URL || '',
  /** النطاق الأساسي للمنصة، يُستخدم للـ subdomains وتعليمات DNS */
  APP_DOMAIN: (process.env.APP_DOMAIN || 'shamstores.com').replace(/^https?:\/\//, '').replace(/\/$/, ''),
  CLIENT_URL: process.env.CLIENT_URL || '',
  /** قائمة نطاقات إضافية مفصولة بفواصل */
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  /** تقديم ملفات الواجهة المبنية من نفس السيرفر (نشر Heroku بتطبيق واحد) */
  SERVE_FRONTEND: process.env.SERVE_FRONTEND !== 'false',
  /** تعطيل حدود المعدل مؤقتاً (للاختبار فقط) */
  DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT === 'true',
  TRUST_PROXY: process.env.TRUST_PROXY || (isProduction ? '1' : 'false')
};

export default env;
