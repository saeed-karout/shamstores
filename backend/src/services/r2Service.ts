// backend/src/services/r2Service.ts
// طبقة مشتركة للتعامل مع Cloudflare R2 (صور + فيديو).
// الصور الصغيرة ترفع عبر السيرفر، أما الفيديو فيرفع مباشرة من المتصفح إلى R2
// عبر رابط موقّع مسبقاً (presigned) — قرص الدينو على Heroku مؤقت ومهلة الطلب 30 ثانية،
// فتمرير ملف بحجم 100 ميغابايت عبر الدينو وصفة فشل.

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

export type MediaKind = 'image' | 'video';

export interface MediaEntityOptions {
  entity: string;
  entityId: string;
  subType?: string;
}

/** أنواع الفيديو المسموحة. لا نقبل أي نوع خارج القائمة. */
export const ALLOWED_VIDEO_TYPES: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov'
};

const MB = 1024 * 1024;

/** الحد الأقصى لحجم الفيديو (قابل للضبط عبر البيئة). */
export const MAX_VIDEO_BYTES = Number(process.env.R2_MAX_VIDEO_MB || 100) * MB;

/** صلاحية الرابط الموقّع — قصيرة عمداً. */
const PRESIGN_EXPIRES_SECONDS = Number(process.env.R2_PRESIGN_EXPIRES || 900);

let cachedClient: S3Client | null = null;

const trimSlash = (value: string) => value.replace(/\/+$/, '');

/** نقطة نهاية R2؛ تُشتق من معرّف الحساب إذا لم تُضبط صراحة. */
export const getEndpoint = (): string => {
  const explicit = process.env.R2_ENDPOINT?.trim();
  if (explicit) return trimSlash(explicit);
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '';
};

export const getBucketName = (): string => process.env.R2_BUCKET_NAME?.trim() || '';

/** الرابط العام للقراءة (نطاق مخصص أو نطاق r2.dev). */
export const getPublicUrl = (): string => trimSlash(process.env.R2_PUBLIC_URL?.trim() || '');

/** هل إعدادات R2 مكتملة؟ نفحصها قبل أي عملية لنُرجع خطأ واضحاً بدل استثناء غامض. */
export const isR2Configured = (): boolean =>
  Boolean(
    getBucketName() &&
      getPublicUrl() &&
      getEndpoint() &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );

export const getClient = (): S3Client => {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: getEndpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      }
    });
  }
  return cachedClient;
};

/** يحوّل الرابط العام إلى مفتاح الكائن داخل الحاوية. يدعم النطاق المخصص و`*.r2.dev`. */
export const keyFromUrl = (url: string): string | null => {
  if (!url) return null;

  const publicUrl = getPublicUrl();
  if (publicUrl && url.startsWith(publicUrl + '/')) {
    return decodeURIComponent(url.slice(publicUrl.length + 1));
  }

  // روابط قديمة من نطاق r2.dev مختلف (تغيّرت الحاوية أو النطاق العام)
  const legacy = url.split('.r2.dev/');
  if (legacy.length > 1) return decodeURIComponent(legacy[1]);

  // رابط غير مطلق: نفترض أنه المفتاح نفسه
  if (!/^https?:\/\//i.test(url)) return url.replace(/^\/+/, '');

  return null;
};

export const publicUrlForKey = (key: string): string =>
  `${getPublicUrl()}/${key.split('/').map(encodeURIComponent).join('/')}`;

/** اسم ملف آمن: بلا مسارات، بلا محارف تكسر الروابط. */
const safeBaseName = (originalName: string): string =>
  path
    .basename(originalName || 'file', path.extname(originalName || ''))
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';

/**
 * مسار الكائن داخل الحاوية. الفيديو يُعزل في مجلد `videos` تحت الكيان
 * حتى يسهل ضبط قواعد عمر/تكلفة مختلفة له لاحقاً.
 */
export const buildMediaKey = (
  options: MediaEntityOptions & { kind: MediaKind; originalName: string; ext: string }
): string => {
  const { entity, entityId, subType, kind, originalName, ext } = options;
  const folder = kind === 'video' ? `${entity}/${entityId}/videos` : `${entity}/${entityId}`;
  const prefix = subType && subType !== 'gallery' ? `${subType}_` : '';
  return `${folder}/${prefix}${Date.now()}_${safeBaseName(originalName)}${ext}`;
};

/** يتحقق من نوع/حجم الفيديو قبل توقيع أي رابط. يُرجع رسالة الخطأ أو null. */
export const validateVideo = (contentType: string, size?: number): string | null => {
  if (!ALLOWED_VIDEO_TYPES[contentType]) {
    return 'صيغة الفيديو غير مدعومة. الصيغ المسموحة: MP4 أو WEBM أو MOV.';
  }
  if (typeof size === 'number' && size > MAX_VIDEO_BYTES) {
    return `حجم الفيديو كبير جداً. الحد الأقصى ${Math.round(MAX_VIDEO_BYTES / MB)} ميغابايت.`;
  }
  if (typeof size === 'number' && size <= 0) {
    return 'حجم الملف غير صالح.';
  }
  return null;
};

/** رابط PUT موقّع يرفع عبره المتصفح الملف مباشرة إلى R2. */
export const createPresignedUpload = async (params: {
  key: string;
  contentType: string;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string; expiresIn: number }> => {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: params.key,
    ContentType: params.contentType
  });

  const uploadUrl = await getSignedUrl(getClient(), command, {
    expiresIn: PRESIGN_EXPIRES_SECONDS
  });

  return {
    uploadUrl,
    key: params.key,
    publicUrl: publicUrlForKey(params.key),
    expiresIn: PRESIGN_EXPIRES_SECONDS
  };
};

/** رفع محتوى من السيرفر (يُستخدم للفيديوهات الصغيرة وكمسار احتياطي). */
export const putObject = async (params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: 'public, max-age=31536000, immutable'
    })
  );
  return publicUrlForKey(params.key);
};

/** يتحقق أن الكائن وُجد فعلاً بعد الرفع المباشر، ويُرجع حجمه ونوعه. */
export const headObject = async (
  key: string
): Promise<{ size: number; contentType: string } | null> => {
  try {
    const result = await getClient().send(
      new HeadObjectCommand({ Bucket: getBucketName(), Key: key })
    );
    return {
      size: Number(result.ContentLength || 0),
      contentType: result.ContentType || ''
    };
  } catch {
    return null;
  }
};

export const deleteObject = async (key: string): Promise<boolean> => {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
    return false;
  }
};

export default {
  isR2Configured,
  getClient,
  getBucketName,
  getPublicUrl,
  getEndpoint,
  keyFromUrl,
  publicUrlForKey,
  buildMediaKey,
  validateVideo,
  createPresignedUpload,
  putObject,
  headObject,
  deleteObject,
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_BYTES
};
