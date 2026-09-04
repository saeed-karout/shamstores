// backend/src/services/health.service.ts
//
// فحوص الصحة.
//
// `/health` القديم كان يُرجع ok دائماً — يقيس أن العملية حيّة لا أن التطبيق
// يعمل. مراقب خارجي يفحصه يرى أخضر بينما قاعدة البيانات ساقطة وكل تاجر
// عاجز عن استقبال طلب. وهذا أسوأ من غياب المراقبة، لأنه يمنحك ثقة كاذبة.
//
// ثلاثة مستويات بثلاثة جماهير:
//   /health         — مسبار إقلاع Heroku. سطحي عمداً وسريع.
//   /health/ready   — للمراقب الخارجي. يفحص فعلاً ويردّ 200 أو 503، وبلا
//                     تفاصيل: نقطة مفتوحة للعالم لا تكشف بنيتك الداخلية.
//   /health/detail  — للسوبر أدمن. الصورة كاملة.

import prisma from './prisma';
import { isR2Configured } from './r2Service';
import { checkBackupTarget, listBackups } from './backup.service';
import emailService from './emailService';
import { getUsdRate } from './currency.service';

export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  detail: string;
}

/** أخطر حالة تُغلّب: فشل واحد يجعل النظام غير جاهز مهما نجح غيره. */
const worst = (checks: HealthCheck[]): CheckStatus =>
  checks.some((c) => c.status === 'fail') ? 'fail'
    : checks.some((c) => c.status === 'warn') ? 'warn'
    : 'ok';

/**
 * فحص قاعدة البيانات — الفحص الوحيد الذي يقرّر الجاهزية.
 *
 * استعلام حقيقي لا مجرد وجود اتصال: التجمّع قد يبدو حياً بينما الخادم يرفض
 * الاستعلامات (تجاوز حدّ الاتصالات مثلاً — وقد حدث فعلاً على الخطة المجانية).
 */
export const checkDatabase = async (): Promise<HealthCheck> => {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - started;
    return {
      name: 'database',
      status: ms > 3000 ? 'warn' : 'ok',
      detail: ms > 3000 ? `بطيئة (${ms}ms)` : `${ms}ms`
    };
  } catch (error: any) {
    return { name: 'database', status: 'fail', detail: error?.message?.slice(0, 120) || 'غير متاحة' };
  }
};

/** آخر نسخة احتياطية — تحذير لا فشل: النظام يعمل بلا نسخة، لكنه هشّ. */
export const checkBackup = async (): Promise<HealthCheck> => {
  const configError = checkBackupTarget();
  if (configError) {
    return { name: 'backup', status: 'warn', detail: 'معطّل — لا حاوية نسخ مضبوطة' };
  }

  try {
    const backups = await listBackups();
    if (backups.length === 0) {
      return { name: 'backup', status: 'warn', detail: 'لا نسخ بعد' };
    }

    const newest = backups[0].lastModified?.getTime() || 0;
    const hours = Math.round((Date.now() - newest) / 3600000);

    return {
      name: 'backup',
      // ٣٠ ساعة تعطي هامشاً ليوم كامل زائد ست ساعات — تأخّر أطول يعني جدولة متوقفة
      status: hours > 30 ? 'warn' : 'ok',
      detail: hours > 30 ? `أحدث نسخة عمرها ${hours} ساعة — الجدولة متوقفة؟` : `آخر نسخة قبل ${hours} ساعة`
    };
  } catch (error: any) {
    return { name: 'backup', status: 'warn', detail: `تعذّر الفحص: ${error?.message?.slice(0, 80)}` };
  }
};

export const checkEmail = (): HealthCheck =>
  emailService.isOperational()
    ? { name: 'email', status: 'ok', detail: 'المصادقة ناجحة' }
    : { name: 'email', status: 'warn', detail: 'لا يعمل — لن تصل رسائل التفعيل ولا استعادة كلمة المرور' };

export const checkMedia = (): HealthCheck =>
  isR2Configured()
    ? { name: 'media', status: 'ok', detail: 'R2 مضبوط' }
    : { name: 'media', status: 'warn', detail: 'R2 غير مضبوط — رفع الصور سيفشل' };

export const checkExchangeRate = async (): Promise<HealthCheck> => {
  const rate = await getUsdRate();
  return rate
    ? { name: 'exchangeRate', status: 'ok', detail: `${rate.toLocaleString('en-US')} ل.س للدولار` }
    : { name: 'exchangeRate', status: 'warn', detail: 'غير مضبوط — العرض بالدولار معطّل على المنصة' };
};

/**
 * الجاهزية: قاعدة البيانات وحدها.
 *
 * لا نُسقط الجاهزية لأن البريد معطّل أو النسخ متوقف — المتجر يستقبل الطلبات
 * في الحالتين. مراقب يرنّ لكل عطل جانبي يُدرَّب صاحبه على تجاهله، فيفوته
 * العطل الحقيقي حين يقع.
 */
export const getReadiness = async (): Promise<{ ready: boolean; check: HealthCheck }> => {
  const check = await checkDatabase();
  return { ready: check.status !== 'fail', check };
};

/** الصورة الكاملة — للسوبر أدمن وحده */
export const getFullHealth = async () => {
  const [database, backup, exchangeRate] = await Promise.all([
    checkDatabase(),
    checkBackup(),
    checkExchangeRate()
  ]);

  const checks = [database, checkEmail(), checkMedia(), backup, exchangeRate];

  return {
    status: worst(checks),
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    nodeVersion: process.version,
    checks
  };
};

export default { checkDatabase, checkBackup, checkEmail, checkMedia, checkExchangeRate, getReadiness, getFullHealth };
