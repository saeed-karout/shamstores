// functions/[slug].js
//
// حقن هوية المتجر في HTML على حافّة Cloudflare — قبل أن يصل إلى الزائر.
//
// **المشكلة التي يحلّها، مقيسةً لا مقدَّرة:** التطبيق يُصيَّر في المتصفّح،
// وزاحف جوجل لا ينفّذ الجافاسكربت. فطلبُ `/disneystore` بهوية Googlebot كان
// يُرجع ٦٣ محرفاً من النصّ المرئيّ، كلّها عنوان المنصّة العامّ — أي أن كل
// متاجر المنصّة صفحةٌ واحدة مكرّرة في نظر جوجل.
//
// **ولماذا هذا لا Next.js:** التصيير على الخادم يعني إعادة كتابة التطبيق
// وخادم Node يُدار ويُكلَّف. وهذا الملفّ يعدّل HTML أثناء مروره بـ
// `HTMLRewriter` — بلا تصيير، وبلا خادم، وبلا لمس التطبيق.
//
// **وليس تمويهاً (cloaking):** الحقن واحدٌ للجميع، لا يقرأ `User-Agent`
// ولا يبدّل المحتوى للزاحف. ونفس المنتجات تظهر في التطبيق بعد تحميله.
//
// **والفشل مفتوح دائماً:** أي خطأ يُعيد الصفحة كما هي بلا حقن. صفحةٌ بلا
// وسوم أفضل من صفحةٍ لا تُخدَم.

import { fetchSeo, injectSeo, tag } from './_seo.js';

/**
 * مسارات التطبيق التي ليست متاجر.
 *
 * `[slug]` يعترض **كل** مسارٍ من جزءٍ واحد — بما فيها `/login` و
 * `/dashboard`. وبلا هذه القائمة كان كل فتحٍ للوحة يُطلق نداءً إلى الخادم
 * بلا فائدة.
 */
const RESERVED = new Set([
  'about', 'admin', 'analytics', 'contact', 'coupons', 'dashboard', 'delivery',
  'drivers', 'faq', 'features', 'finance', 'login', 'maintenance', 'marketing',
  'menu', 'orders', 'plans', 'privacy', 'profile', 'qr-codes', 'register',
  'settings', 'staff', 'tables', 'terms', 'favorites', 'my-orders', 'cart',
  'checkout', 'search', 'store', 'restaurant', 'api', 'assets', 'icons'
]);

export async function onRequestGet(context) {
  const { request, params, next, waitUntil, env } = context;

  try {
    const slug = String(params.slug || '').trim();

    // الملفّات لها امتداد، والمسارات المحجوزة ليست متاجر
    if (!slug || slug.includes('.') || RESERVED.has(slug.toLowerCase())) {
      return tag(await next(), 'reserved');
    }

    const response = await next();
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    const data = await fetchSeo(slug, waitUntil, env);
    if (!data) return tag(response, 'nodata');

    const url = new URL(request.url);
    return injectSeo(tag(response, 'hit'), data, `${url.origin}/${slug}`, url.origin);
  } catch (error) {
    // لا تُسقط الصفحة لأجل وسم: الزائر أهمّ من الزاحف
    console.error('SEO rewrite failed:', error);
    return tag(await next(), `error:${String(error).slice(0, 60)}`);
  }
}
