// workers/subdomain-proxy/index.js
//
// يوجّه نطاقات المنصة إلى الواجهة على Cloudflare، ويمرّر الـ API إلى Heroku
// حتى تصبح الواجهة والـ API على أصل واحد من منظور المتصفح — فلا CORS ولا
// preflight ولا حاجة لرابط مطلق مدفون في حزمة الواجهة.
//
// النشر:  npx wrangler deploy --cwd workers/subdomain-proxy
//
// ⚠️ يجب أن تغطّي مسارات الـ Worker (Routes) النطاقين معاً:
//      shamstores.com/*
//      *.shamstores.com/*
//    لو غطّت النطاقات الفرعية وحدها، فإن /api على النطاق الرئيسي لن يُمرَّر
//    وستفشل الواجهة كلها.

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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { hostname, pathname } = url;

    // نطاق الوسائط مربوط بـ R2 مباشرة — لا يمرّ من هنا إطلاقاً
    if (hostname === CDN_HOST) {
      return fetch(request);
    }

    // 1) الـ API و Socket.IO → Heroku. قبل أي قاعدة أخرى، ولكل المضيفات.
    if (pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/socket.io/')) {
      return proxyTo(request, API_HOST);
    }

    // 2) الأصول الثابتة دائماً من النطاق الرئيسي — نسخة واحدة مخزّنة مؤقتاً
    //    بدل نسخة لكل نطاق فرعي.
    if (pathname.startsWith('/assets/')) {
      return proxyTo(request, APP_DOMAIN);
    }

    // 3) نطاق فرعي لتاجر أو نطاق مخصص → نفس المسار من النطاق الرئيسي.
    //
    //    المسار يُمرَّر كما هو ولا يُسبَق باسم النطاق الفرعي: عنوان المتصفح لا
    //    يتغيّر بإعادة الكتابة، فـ React Router لا يرى البادئة أصلاً. الواجهة
    //    تتعرّف على المتجر من المضيف عبر getCurrentSubdomain() في
    //    components/PublicRouter.tsx. وهذا يصحّ للنطاقات المخصصة أيضاً، حيث
    //    أول جزء من mystore.com ليس معرّف المتجر.
    if (hostname !== APP_DOMAIN && hostname !== `www.${APP_DOMAIN}`) {
      return proxyTo(request, APP_DOMAIN);
    }

    // 4) النطاق الرئيسي و www: إلى الأصل كما هو
    return fetch(request);
  }
};
