// backend/src/config/env.ts
// التحقق من متغيرات البيئة عند الإقلاع — يمنع تشغيل الإنتاج بإعدادات غير آمنة

import dotenv from 'dotenv';

dotenv.config();

// ==================== توافق إضافات Heroku ====================
// JawsDB/ClearDB يوفّران رابط الاتصال باسم مختلف. نُسقطه على DATABASE_URL
// هنا لأن Prisma يقرأ DATABASE_URL من البيئة عند إنشاء العميل.
if (!process.env.DATABASE_URL) {
  const addonUrl =
    process.env.JAWSDB_URL ||
    process.env.JAWSDB_MARIA_URL ||
    process.env.CLEARDB_DATABASE_URL;
  if (addonUrl) {
    process.env.DATABASE_URL = addonUrl;
  }
}

// ==================== حجم تجمّع الاتصالات ====================
// Prisma يفتح افتراضياً (عدد الأنوية × 2 + 1) اتصالاً — على دينو Heroku قد
// يبلغ 17، بينما خطة JawsDB المجانية تسمح بعشرة لكل مستخدم. النتيجة أن
// التطبيق يبتلع الحد كله: تفشل جلسات heroku run وأدوات الإدارة بـ
// "max_user_connections", وتبدأ استعلامات التطبيق نفسها بالفشل تحت الضغط.
//
// نترك هامشاً للعمليات الإدارية. ارفع DB_CONNECTION_LIMIT مع خطة أكبر.
if (process.env.DATABASE_URL && !/[?&]connection_limit=/.test(process.env.DATABASE_URL)) {
  const limit = process.env.DB_CONNECTION_LIMIT || '5';
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}connection_limit=${limit}`;
}

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
  // قرص الدينو على Heroku مؤقت: بلا R2 تختفي كل الوسائط المرفوعة عند إعادة التشغيل.
  const r2Missing = ['R2_BUCKET_NAME', 'R2_PUBLIC_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].filter(
    (key) => !process.env[key]
  );
  if (!process.env.R2_ENDPOINT && !process.env.R2_ACCOUNT_ID) {
    r2Missing.push('R2_ENDPOINT أو R2_ACCOUNT_ID');
  }
  if (r2Missing.length) {
    warnings.push(`تخزين الوسائط غير مهيأ (${r2Missing.join('، ')}) — رفع الصور والفيديو سيفشل.`);
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
  TRUST_PROXY: process.env.TRUST_PROXY || (isProduction ? '1' : 'false'),

  // ==================== Cloudflare for SaaS ====================
  //
  // ربط نطاق التاجر آلياً. بغيابها يبقى ربط النطاقات يدوياً من لوحة
  // Cloudflare — والواجهة تقول ذلك للتاجر بدل أن ترتدّ بخطأ غامض.
  //
  // الرمز يحتاج صلاحية `Zone / SSL and Certificates / Edit` على المنطقة
  // وحدها. راجع docs/deployment/custom-domains.md
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID || '',
  /** الأصل الاحتياطي المضبوط في Custom Hostnames — ما تشير إليه نطاق التجّار */
  CLOUDFLARE_FALLBACK_ORIGIN: (process.env.CLOUDFLARE_FALLBACK_ORIGIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, ''),

  // ==================== تنبيهات التاجر عبر تيليجرام ====================
  //
  // قناةٌ تصل التاجر والهاتف مقفل بلا إذن متصفّح ولا قيد iOS. بغيابها يبقى
  // التنبيه على إشعار المتصفّح وحده — والواجهة تقول ذلك بدل أن تعرض زرّ
  // ربطٍ لا يعمل.
  //
  // الرمز من BotFather، والاسم بلا `@`. راجع docs/deployment/merchant-alerts.md
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_BOT_USERNAME: (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, ''),
  /**
   * سرٌّ يرافق كل نداء webhook من تيليجرام.
   *
   * بدونه يستطيع أي أحد يعرف المسار أن يزعم أنه تيليجرام ويربط محادثته
   * بحساب تاجر. تيليجرام يرسله في ترويسة `X-Telegram-Bot-Api-Secret-Token`.
   */
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || ''
};

export default env;
