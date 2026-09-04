// backend/src/services/backup.service.ts
//
// نسخ احتياطي لقاعدة البيانات إلى Cloudflare R2.
//
// ⚠️ **الحاوية يجب أن تكون خاصة، لا حاوية الوسائط.**
//
// حاوية الوسائط `shamstores-images` عامة — تخدم cdn.shamstores.com. والنسخة
// الاحتياطية تحوي بريد كل مستخدم وهاتفه وبصمات كلمات المرور وكل الطلبات.
// وضعها هناك يعني تسليمها لأي زائر يخمّن اسم الملف. لذلك يرفض هذا الملف
// العمل ما لم تُضبط حاوية منفصلة، ويرفضه صراحةً لو ساوت حاوية الوسائط.
//
// لماذا JSON لا mysqldump: بناء Node على Heroku لا يتضمّن أدوات عميل MySQL،
// فلا وجود لـ mysqldump على الدينو أصلاً. تصدير عبر Prisma يعمل في كل بيئة
// ويبقى مقروءاً بلا أدوات خاصة.

import { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'zlib';
import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { getClient, getBucketName, isR2Configured } from './r2Service';

/** بادئة مفاتيح النسخ داخل الحاوية */
const BACKUP_PREFIX = 'db-backups/';

/** كم يوماً نحتفظ بالنسخ قبل حذفها */
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 14);

/**
 * سقف حجم النسخة في الذاكرة. الدينو الأساسي بذاكرة محدودة، وتصدير يتجاوز
 * هذا الحد يُسقط التطبيق بدل أن يحفظ نسخة — وهو أسوأ من تخطّي نسخة واحدة.
 */
const MAX_BACKUP_BYTES = Number(process.env.BACKUP_MAX_MB || 200) * 1024 * 1024;

export interface BackupResult {
  ok: boolean;
  key?: string;
  bytes?: number;
  tables?: number;
  rows?: number;
  error?: string;
}

/** اسم حاوية النسخ. منفصلة عمداً عن حاوية الوسائط العامة. */
export const getBackupBucket = (): string => (process.env.R2_BACKUP_BUCKET || '').trim();

/**
 * يتحقق أن الوجهة آمنة قبل كتابة أي بايت.
 * يُرجع رسالة الخطأ، أو null إن كانت الإعدادات سليمة.
 */
export const checkBackupTarget = (): string | null => {
  if (!isR2Configured()) {
    return 'إعدادات R2 ناقصة — لا يمكن رفع نسخة احتياطية.';
  }

  const bucket = getBackupBucket();
  if (!bucket) {
    return 'R2_BACKUP_BUCKET غير مضبوط. النسخ الاحتياطي معطّل عمداً: حاوية الوسائط عامة، ووضع النسخة فيها يكشف بيانات كل المستخدمين.';
  }

  if (bucket === getBucketName()) {
    return 'R2_BACKUP_BUCKET يساوي حاوية الوسائط العامة. استخدم حاوية خاصة منفصلة.';
  }

  return null;
};

/**
 * أسماء نماذج Prisma تُقرأ من المخطط لا من قائمة مكتوبة يدوياً: نموذج جديد
 * يُضاف إلى المخطط ولا يُضاف إلى قائمة يدوية ينتج نسخة ناقصة صامتة — وهي
 * أخطر من غياب النسخة، لأنك تكتشف النقص يوم الاستعادة.
 */
export const getModelNames = (): string[] =>
  Prisma.dmmf.datamodel.models.map((model) => {
    const name = model.name;
    return name.charAt(0).toLowerCase() + name.slice(1);
  });

/**
 * ينشئ نسخة احتياطية ويرفعها.
 *
 * القراءة **متسلسلة** لا متوازية: خطة قاعدة البيانات المجانية تسمح بعشرة
 * اتصالات فقط ويستهلك التطبيق أكثرها، فقراءة اثنين وثلاثين جدولاً دفعةً
 * واحدة تُفشل النسخة وتُفشل معها طلبات التجّار في الوقت نفسه.
 */
export const createBackup = async (): Promise<BackupResult> => {
  const configError = checkBackupTarget();
  if (configError) return { ok: false, error: configError };

  const models = getModelNames();
  const data: Record<string, unknown[]> = {};
  let rows = 0;

  try {
    for (const model of models) {
      const delegate = (prisma as any)[model];
      if (!delegate?.findMany) continue;

      const records = await delegate.findMany();
      data[model] = records;
      rows += records.length;
    }
  } catch (error: any) {
    return { ok: false, error: `فشل قراءة الجداول: ${error?.message || error}` };
  }

  const payload = JSON.stringify(
    {
      takenAt: new Date().toISOString(),
      schemaModels: models.length,
      totalRows: rows,
      data
    },
    // Date وBigInt لا يمرّان في JSON بلا تحويل صريح
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value)
  );

  if (Buffer.byteLength(payload) > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      error: `حجم النسخة تجاوز ${Math.round(MAX_BACKUP_BYTES / 1024 / 1024)} ميغابايت — ارفع BACKUP_MAX_MB أو انقل إلى تصدير متدفّق.`
    };
  }

  const body = gzipSync(Buffer.from(payload, 'utf8'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const key = `${BACKUP_PREFIX}${stamp}.json.gz`;

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: getBackupBucket(),
        Key: key,
        Body: body,
        ContentType: 'application/gzip',
        ContentEncoding: 'gzip'
      })
    );
  } catch (error: any) {
    return { ok: false, error: `فشل رفع النسخة: ${error?.message || error}` };
  }

  return { ok: true, key, bytes: body.length, tables: Object.keys(data).length, rows };
};

export interface BackupEntry {
  key: string;
  size: number;
  lastModified?: Date;
}

export const listBackups = async (): Promise<BackupEntry[]> => {
  const configError = checkBackupTarget();
  if (configError) throw new Error(configError);

  const response = await getClient().send(
    new ListObjectsV2Command({ Bucket: getBackupBucket(), Prefix: BACKUP_PREFIX })
  );

  return (response.Contents || [])
    .map((item) => ({ key: item.Key || '', size: item.Size || 0, lastModified: item.LastModified }))
    .filter((item) => item.key)
    .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0));
};

/**
 * يحذف النسخ الأقدم من مدة الاحتفاظ.
 * يُبقي دائماً أحدث نسخة مهما كان عمرها — حذف آخر ما لديك لأنه قديم يترك
 * النظام بلا نسخة إطلاقاً، وهو ما يفترض أن نحميك منه.
 */
export const pruneOldBackups = async (): Promise<number> => {
  const backups = await listBackups();
  if (backups.length <= 1) return 0;

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const stale = backups.slice(1).filter((b) => (b.lastModified?.getTime() || 0) < cutoff);

  for (const item of stale) {
    await getClient().send(new DeleteObjectCommand({ Bucket: getBackupBucket(), Key: item.key }));
  }

  return stale.length;
};

export default {
  BACKUP_PREFIX,
  RETENTION_DAYS,
  getBackupBucket,
  checkBackupTarget,
  getModelNames,
  createBackup,
  listBackups,
  pruneOldBackups
};
