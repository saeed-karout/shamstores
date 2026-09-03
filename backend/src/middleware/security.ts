// backend/src/middleware/security.ts
// حدود المعدل (Rate Limiting) وطبقات الحماية المشتركة

import rateLimit, { ipKeyGenerator, Options } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import env from '../config/env';

const disabled = env.DISABLE_RATE_LIMIT;

/** يتخطى الحد عند تعطيله صراحة (اختبارات محلية) */
const skipWhenDisabled = () => disabled;

const jsonLimitHandler = (message: string) => (req: Request, res: Response) => {
  res.status(429).json({ success: false, error: message, retryAfter: true });
};

const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipWhenDisabled
};

/**
 * الحد العام لكل الـ API — يمنع الإغراق دون إزعاج الاستخدام الطبيعي.
 */
export const generalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 300,
  handler: jsonLimitHandler('عدد كبير من الطلبات. يرجى المحاولة بعد قليل.')
} as Options);

/**
 * حد صارم لمسارات المصادقة — الدفاع الأول ضد التخمين وحشو بيانات الاعتماد.
 * المفتاح = IP + البريد الإلكتروني حتى لا يقفل مهاجم واحد كل المستخدمين خلف نفس الـ NAT.
 */
export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${ipKeyGenerator(req.ip || '')}:${email}`;
  },
  handler: jsonLimitHandler('محاولات دخول كثيرة جداً. يرجى المحاولة بعد 15 دقيقة.')
} as Options);

/**
 * حد لإنشاء الحسابات — يمنع إنشاء حسابات آلية بالجملة.
 */
export const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 8,
  handler: jsonLimitHandler('تم إنشاء عدد كبير من الحسابات من هذا العنوان. يرجى المحاولة لاحقاً.')
} as Options);

/**
 * حد لإنشاء الطلبات العامة (طلب الزبون بدون تسجيل دخول) — يمنع إغراق المطعم بطلبات وهمية.
 */
export const publicOrderLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 20,
  handler: jsonLimitHandler('عدد كبير من الطلبات من هذا الجهاز. يرجى المحاولة بعد قليل.')
} as Options);

/**
 * حد لرفع الملفات — الرفع مكلف (Sharp + شبكة).
 */
export const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 60,
  handler: jsonLimitHandler('عدد كبير من عمليات الرفع. يرجى المحاولة بعد قليل.')
} as Options);

/**
 * حد للعمليات التي تستدعي DNS/شبكة خارجية (التحقق من الدومين المخصص).
 */
export const dnsLookupLimiter = rateLimit({
  ...baseOptions,
  windowMs: 10 * 60 * 1000,
  limit: 15,
  handler: jsonLimitHandler('محاولات تحقق كثيرة. يرجى الانتظار قبل إعادة المحاولة.')
} as Options);

/**
 * حد لإرسال البريد (كود التحقق / إعادة تعيين كلمة المرور).
 */
export const emailLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 6,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    return `${ipKeyGenerator(req.ip || '')}:${email}`;
  },
  handler: jsonLimitHandler('تم إرسال عدد كبير من الرسائل. يرجى المحاولة بعد ساعة.')
} as Options);

/**
 * يمنع تسريب تفاصيل الأخطاء للعميل في الإنتاج.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err?.status || err?.statusCode || 500;

  // أخطاء CORS تُرجع 403 واضحة بدل 500
  if (err?.message === 'CORS_NOT_ALLOWED') {
    res.status(403).json({ success: false, error: 'النطاق غير مسموح به' });
    return;
  }

  // JSON غير صالح في جسم الطلب
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'صيغة البيانات المرسلة غير صالحة' });
    return;
  }

  if (err?.type === 'entity.too.large') {
    res.status(413).json({ success: false, error: 'حجم البيانات المرسلة كبير جداً' });
    return;
  }

  console.error('❌ Server error:', {
    method: req.method,
    path: req.originalUrl,
    status,
    message: err?.message,
    stack: env.NODE_ENV === 'production' ? undefined : err?.stack
  });

  res.status(status >= 400 && status < 600 ? status : 500).json({
    success: false,
    error: status < 500 && err?.message ? err.message : 'حدث خطأ في الخادم'
  });
};

/** معالج 404 لمسارات الـ API غير الموجودة */
export const apiNotFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `المسار غير موجود: ${req.method} ${req.originalUrl}` });
};
