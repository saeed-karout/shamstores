// workers/subdomain-proxy/index.js
//
// يوجّه نطاقات المنصة إلى الواجهة، ويمرّر الـ API إلى Heroku حتى تصبح الواجهة
// والـ API على أصل واحد من منظور المتصفح — فلا CORS ولا preflight ولا رابط
// مطلق مدفون في حزمة الواجهة.
//
// النشر:  npx wrangler deploy --cwd workers/subdomain-proxy

import { fetchSeo, resolveHost, injectSeo, tag } from '../../functions/_seo.js';

const APP_DOMAIN = 'shamstores.com';
const CDN_HOST = `cdn.${APP_DOMAIN}`;
const API_HOST = 'shamstores-5fa37cec9e6e.herokuapp.com';

/** يعيد إرسال نفس الطلب إلى مضيف آخر مع الحفاظ على الطريقة والترويسات والجسم. */
const proxyTo = (request, hostname) => {
  const upstream = new URL(request.url);
  upstream.hostname = hostname;
  upstream.protocol = 'https:';
  upstream.port = '';
  // تمرير الطلب كاملاً — يشمل ترقية WebSocket التي يحتاجها Socket.IO
  return fetch(new Request(upstream.toString(), request));
};

/** نطاقات فرعية للمنصّة نفسها — ليست متاجر */
const PLATFORM_LABELS = new Set(['www', 'api', 'cdn', 'admin', 'app', 'mail', 'static']);

/**
 * صفحات الواجهة التي تستحقّ وسوم المتجر: الجذر، ومنتجٌ، ووجبة، وطاولة.
 * المجموعة الأولى أو الثانية معرّف المنتج/الوجبة إن وُجد.
 */
const STOREFRONT_PATH = /^\/(?:$|product\/([^/]+)\/?$|item\/([^/]+)\/?$|table\/[^/]+\/?$)/;

/**
 * يحقن هوية المتجر في HTML نطاقه الفرعي أو المخصّص.
 *
 * **لماذا هنا لا في وظائف Pages:** الطلب إلى `store.shamstores.com/` يصل
 * Pages بمسار `/` ومضيف المنصّة — فلا تعرف الوظيفة أيّ متجرٍ هو، وتخرج
 * صفحته بعنوان المنصّة وأيقونتها. كان تبويب متجر «ديزني» يحمل اسمه (بعد
 * التحميل) وأيقونة شام ستورز، ومعاينة رابطه في واتساب عنوان المنصّة.
 * الـ Worker وحده يرى المضيف الأصلي.
 *
 * **والفشل مفتوح:** أي خطأ يُعيد الصفحة كما وصلت. صفحةٌ بلا وسوم أفضل من
 * صفحةٍ لا تُخدَم.
 */
const withStorefrontSeo = async (request, response, hostname, ctx, env) => {
  try {
    if (request.method !== 'GET') return response;
    const url = new URL(request.url);
    const match = url.pathname.match(STOREFRONT_PATH);
    if (!match) return response;
    if (!(response.headers.get('content-type') || '').includes('text/html')) return response;

    const waitUntil = ctx && ctx.waitUntil ? ctx.waitUntil.bind(ctx) : undefined;
    let identifier = null;
    if (hostname.endsWith(`.${APP_DOMAIN}`)) {
      identifier = hostname.slice(0, -(APP_DOMAIN.length + 1));
    } else {
      identifier = await resolveHost(hostname, waitUntil, env);
    }
    if (!identifier || identifier.includes('.') || PLATFORM_LABELS.has(identifier)) return response;

    const productId = match[1] || match[2] || null;
    const data = await fetchSeo(identifier, waitUntil, env, productId);
    if (!data) return tag(response, 'nodata');

    const pageUrl = `${url.origin}${url.pathname}`;
    return injectSeo(tag(response, productId ? 'hit-product' : 'hit'), data, pageUrl, url.origin);
  } catch (error) {
    console.error('Storefront SEO failed:', error);
    return response;
  }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { hostname, pathname } = url;

    // نطاق الوسائط مربوط بـ R2 مباشرة — لا يمرّ من هنا إطلاقاً
    if (hostname === CDN_HOST) {
      return fetch(request);
    }

    // 1) الـ API و Socket.IO وفحوص الصحة → Heroku. قبل أي قاعدة أخرى.
    //
    //    /health لا يقلّ أهمية عن /api هنا: بدونه تذهب نقطة المراقبة إلى
    //    الواجهة الثابتة فتُرجع index.html بحالة 200 — فيرى المنبّه أخضر
    //    دائماً حتى لو سقط الخادم بالكامل. مراقبة تكذب أسوأ من غيابها.
    //    و/sitemap.xml كذلك: تُبنى من قاعدة البيانات لأن واجهات التجّار
    //    تتغيّر يومياً. الزواحف تطلبها من جذر النطاق ولا تبحث عنها في
    //    مكان آخر، فلو تُركت للواجهة الثابتة لأعادت index.html بحالة 200
    //    وقرأها الزاحف خريطةً فاسدة.
    if (
      pathname === '/api' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/socket.io/') ||
      pathname === '/health' ||
      pathname.startsWith('/health/') ||
      pathname === '/sitemap.xml'
    ) {
      return proxyTo(request, API_HOST);
    }

    // 2) النطاق الرئيسي و www: كل ما تبقّى إلى الأصل كما هو.
    //
    //    لا نعيد كتابة أي مسار هنا — أي طلب فرعي إلى shamstores.com من داخل
    //    Worker يخدم shamstores.com نفسه هو طلب إلى الذات، ومصدر حلقات.
    if (hostname === APP_DOMAIN || hostname === `www.${APP_DOMAIN}`) {
      return fetch(request);
    }

    // 3) نطاق فرعي لتاجر أو نطاق مخصص → نفس المسار من النطاق الرئيسي.
    //    يشمل /assets/ فتُخدم نسخة واحدة مخزّنة مؤقتاً بدل نسخة لكل نطاق.
    //
    //    المسار يُمرَّر كما هو ولا يُسبَق باسم النطاق الفرعي: عنوان المتصفح لا
    //    يتغيّر بإعادة الكتابة، فـ React Router لا يرى البادئة أصلاً. الواجهة
    //    تتعرّف على المتجر من المضيف عبر getCurrentSubdomain() في
    //    components/PublicRouter.tsx. وهذا يصحّ للنطاقات المخصصة أيضاً، حيث
    //    أول جزء من mystore.com ليس معرّف المتجر.
    const response = await proxyTo(request, APP_DOMAIN);
    return withStorefrontSeo(request, response, hostname, ctx, env);
  }
};
