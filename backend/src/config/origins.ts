// backend/src/config/origins.ts
//
// مصدر واحد لقواعد الأصول المسموح بها.
//
// كانت القاعدة مكتوبة مرتين — مرة لـ CORS الخاص بالـ HTTP في server.ts ومرة
// لـ Socket.IO في realtime/socket.ts — وتباعدتا: نسخة السوكِت كانت قائمة
// حرفية (CLIENT_URL والنطاق الرئيسي وwww) بلا مطابقة النطاقات الفرعية ولا
// النطاقات المخصصة الموثّقة. النتيجة أن اتصال لوحة تاجر من نطاقه كان يُرفض
// في نقل polling (مصافحة XHR تخضع لـ CORS) بينما يمرّ في نقل websocket
// (لا يخضع لـ CORS في المتصفح) — سلوك متناقض يصعب تشخيصه.
//
// أي قاعدة جديدة تُضاف هنا وحدها فتسري على الاثنين معاً.

import env, { isProduction } from './env';
import { isVerifiedCustomDomain } from '../services/domain.service';

/** أصول ثابتة معروفة وقت الإقلاع */
const STATIC_ALLOWED_ORIGINS = new Set(
  [
    env.CLIENT_URL,
    'https://' + env.APP_DOMAIN,
    'https://www.' + env.APP_DOMAIN,
    ...env.ALLOWED_ORIGINS
  ].filter(Boolean)
);

const appDomainEscaped = env.APP_DOMAIN.replace(/\./g, '\\.');

/** أي نطاق فرعي من نطاق المنصة: `متجر.shamstores.com` */
export const isPlatformSubdomain = new RegExp(
  '^https://[a-z0-9-]+(\\.[a-z0-9-]+)*\\.' + appDomainEscaped + '$',
  'i'
);

const isLocalOrigin = /^https?:\/\/(([a-z0-9-]+\.)*localhost|127\.0\.0\.1)(:\d+)?$/i;

/**
 * هل يُسمح لهذا الأصل بالوصول؟
 *
 * غياب `origin` مسموح عمداً: طلب same-origin أو تطبيق أصلي أو أداة سطر أوامر.
 * لا نُرجع `*` إطلاقاً — مع `credentials: true` يعني ذلك السماح لأي موقع
 * بفتح اتصال باسم المستخدم.
 */
export const isAllowedOrigin = async (origin?: string | null): Promise<boolean> => {
  if (!origin) return true;

  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  if (isPlatformSubdomain.test(origin)) return true;

  // localhost في التطوير فقط
  if (!isProduction && isLocalOrigin.test(origin)) return true;

  // النطاقات المخصصة الموثّقة فقط — فحص فعلي في قاعدة البيانات
  try {
    const host = new URL(origin).hostname;
    if (await isVerifiedCustomDomain(host)) return true;
  } catch {
    /* origin غير صالح */
  }

  return false;
};

export default isAllowedOrigin;
