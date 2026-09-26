// backend/src/services/privateDocs.service.ts
//
// تخزين الوثائق الخاصة (هوية التاجر، سجلّه التجاري، صورة محلّه).
//
// **لماذا لا نرفعها كصور المنتجات:** كل ما في حاوية R2 العامّة يُقرأ برابطه
// من أيّ أحد، ومسارات الصور الحالية قابلة للتخمين (`stores/<id>/logo`). وصورة
// هوية تتسرّب مرّة لا تُستردّ. فهنا ثلاث قواعد:
//   1. المفتاح عشوائيّ ١٢٨ بت — لا يُخمَّن ولا يُشتقّ من معرّف المتجر.
//   2. لا يُعاد رابطٌ عامّ إطلاقاً؛ المشرف يقرأ الملف عبر مسارٍ محروس يمرّ
//      بالخادم (`GET /api/verification/admin/requests/:id/document`).
//   3. حاويةٌ خاصّة إن ضُبطت `R2_PRIVATE_BUCKET_NAME` (بلا نطاق عامّ) — وهي
//      الموصى بها في الإنتاج. وبدونها نستعمل الحاوية العامة بمفتاحٍ عشوائيّ
//      تحت `private/`، وهو «سرّيّ بالغموض» فقط: لا يُفهرَس ولا يُخمَّن، لكنه
//      ليس محجوباً لو تسرّب المفتاح نفسه.
//
// **وفي التطوير المحلي قرصٌ لا سحابة:** كي لا تمرّ وثائق تجريبية إلى حاوية
// الإنتاج. `PRIVATE_DOCS_DRIVER` يفرض السائق صراحةً (disk | r2).
//
// المفتاح المخزَّن يحمل سائقه بادئةً (`disk:` / `r2:` / `r2p:`) فيُقرأ الملف من
// حيث كُتب حتى لو تغيّر الإعداد بعدها.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import r2Service from './r2Service';

/** الأنواع المقبولة — والامتداد يُشتقّ من النوع لا من اسم الملف الذي أرسله العميل */
export const PRIVATE_DOC_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

export const MAX_PRIVATE_DOC_BYTES = 8 * 1024 * 1024;

const DISK_ROOT = path.join(process.cwd(), 'private-uploads');

type Driver = 'disk' | 'r2' | 'r2p';

const privateBucket = (): string => process.env.R2_PRIVATE_BUCKET_NAME?.trim() || '';

const pickDriver = (): Driver => {
  const forced = process.env.PRIVATE_DOCS_DRIVER?.trim().toLowerCase();
  if (forced === 'disk') return 'disk';
  const r2Ready = r2Service.isR2Configured();
  if (r2Ready && privateBucket()) return 'r2p';
  if (forced === 'r2' && r2Ready) return 'r2';
  // الإنتاج على Heroku: القرص مؤقّت يُمسح مع كل إعادة تشغيل — فلا خيار إلا R2
  if (process.env.NODE_ENV === 'production' && r2Ready) return 'r2';
  return 'disk';
};

/**
 * يتحقّق من «البصمة» الأولى للملف لا من نوعه المعلن وحده.
 *
 * `mimetype` يرسله المتصفّح ويمكن تزويره؛ ملف HTML يدّعي أنه PDF ثم يُفتح
 * في تبويب المشرف هو بالضبط ما نحتاط منه.
 */
export const sniffMatches = (buffer: Buffer, mime: string): boolean => {
  if (!buffer || buffer.length < 12) return false;
  switch (mime) {
    case 'application/pdf':
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/webp':
      return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    default:
      return false;
  }
};

/** يحفظ الملف ويُرجع مفتاحه المخزَّن (مع بادئة السائق) */
export const savePrivateDoc = async (params: {
  buffer: Buffer;
  mime: string;
  folder: string;
}): Promise<string> => {
  const ext = PRIVATE_DOC_TYPES[params.mime];
  if (!ext) throw new Error('نوع الملف غير مدعوم');

  const safeFolder = params.folder.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60) || 'misc';
  const objectKey = `private/${safeFolder}/${crypto.randomBytes(16).toString('hex')}${ext}`;
  const driver = pickDriver();

  if (driver === 'disk') {
    const full = path.join(DISK_ROOT, objectKey);
    await fs.promises.mkdir(path.dirname(full), { recursive: true });
    await fs.promises.writeFile(full, params.buffer);
    return `disk:${objectKey}`;
  }

  await r2Service.getClient().send(
    new PutObjectCommand({
      Bucket: driver === 'r2p' ? privateBucket() : r2Service.getBucketName(),
      Key: objectKey,
      Body: params.buffer,
      ContentType: params.mime,
      // لا تخزين وسيط: لو مرّ الرابط عبر CDN عامّ لا نريد نسخةً عالقة فيه
      CacheControl: 'private, no-store'
    })
  );
  return `${driver}:${objectKey}`;
};

const splitKey = (stored: string): { driver: Driver; key: string } | null => {
  const m = /^(disk|r2|r2p):(private\/[a-zA-Z0-9_\-/]+\.[a-z]+)$/.exec(stored || '');
  if (!m || m[2].includes('..')) return null;
  return { driver: m[1] as Driver, key: m[2] };
};

/** يقرأ الملف كاملاً — الوثائق صغيرة (٨ ميغابايت كحدّ أقصى) */
export const readPrivateDoc = async (stored: string): Promise<Buffer | null> => {
  const parsed = splitKey(stored);
  if (!parsed) return null;

  try {
    if (parsed.driver === 'disk') {
      return await fs.promises.readFile(path.join(DISK_ROOT, parsed.key));
    }
    const result = await r2Service.getClient().send(
      new GetObjectCommand({
        Bucket: parsed.driver === 'r2p' ? privateBucket() : r2Service.getBucketName(),
        Key: parsed.key
      })
    );
    const bytes = await (result.Body as any)?.transformToByteArray?.();
    return bytes ? Buffer.from(bytes) : null;
  } catch (error) {
    console.error('تعذّرت قراءة وثيقة خاصة:', error instanceof Error ? error.message : error);
    return null;
  }
};

export const deletePrivateDoc = async (stored: string | null | undefined): Promise<void> => {
  const parsed = stored ? splitKey(stored) : null;
  if (!parsed) return;
  try {
    if (parsed.driver === 'disk') {
      await fs.promises.unlink(path.join(DISK_ROOT, parsed.key));
      return;
    }
    await r2Service.getClient().send(
      new DeleteObjectCommand({
        Bucket: parsed.driver === 'r2p' ? privateBucket() : r2Service.getBucketName(),
        Key: parsed.key
      })
    );
  } catch (error) {
    console.error('تعذّر حذف وثيقة خاصة:', error instanceof Error ? error.message : error);
  }
};

export default { savePrivateDoc, readPrivateDoc, deletePrivateDoc, sniffMatches, PRIVATE_DOC_TYPES, MAX_PRIVATE_DOC_BYTES };
