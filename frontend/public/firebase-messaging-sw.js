/* frontend/public/firebase-messaging-sw.js
 *
 * عامل الخدمة الذي يستقبل إشعارات الطلبات والمتصفّح مغلق.
 *
 * **لماذا ملفّ منفصل بلا حزم:** عامل الخدمة يعمل خارج التطبيق تماماً — لا
 * يرى وحداته ولا متغيّرات البناء. لذلك يُحمَّل Firebase من CDN بنسخة
 * `compat`.
 *
 * **والإعداد يصله في رابط التسجيل** لا مكتوباً هنا: نسخُ المفاتيح إلى ملفٍّ
 * ثانٍ يعني مصدرَي حقيقة يفترقان بصمت عند تغيير المشروع — والعطل الناتج
 * صامت تماماً: كل شيء يبدو مسجَّلاً ولا يصل إشعار. الصفحة تسجّله هكذا:
 *   navigator.serviceWorker.register('/firebase-messaging-sw.js?apiKey=…')
 *
 * ⚠️ يجب أن يبقى في `public/` باسمه هذا: المتصفّح يطلبه من جذر النطاق
 * (`/firebase-messaging-sw.js`) ولا يقبله من مسار آخر.
 */

importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

const config = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

// بلا مشروع لا يُهيَّأ شيء: `initializeApp` بقيمٍ فارغة ترمي، والرمية في
// عامل الخدمة تُسقطه كلّه فلا يعمل حتى بعد ضبط الإعداد
if (config.projectId && config.messagingSenderId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'طلب جديد';
    const body = (payload.notification && payload.notification.body) || '';
    const link = (payload.data && payload.data.link) || '/';

    self.registration.showNotification(title, {
      body,
      icon: '/logo.svg',
      badge: '/logo.svg',
      dir: 'rtl',
      lang: 'ar',
      // يبقى معروضاً حتى يتفاعل التاجر: إشعارُ طلبٍ يختفي بعد ثوانٍ يفوت
      requireInteraction: true,
      // وسمٌ لكل طلب: طلبان مختلفان إشعاران، وإعادةُ إرسال الطلب نفسه
      // تستبدل إشعاره لا تكدّسه
      tag: (payload.data && payload.data.orderNumber) || undefined,
      data: { link },
    });
  });
}

/**
 * النقر يفتح تبويباً مفتوحاً على المنصّة إن وُجد بدل فتح ثالث.
 *
 * التاجر الذي يبقي اللوحة مفتوحة لا يريد نسخةً ثانية منها في كل نقرة.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    })
  );
});

/**
 * معالج `fetch` — العمل على إنترنتٍ ضعيف وكهرباءٍ تنقطع.
 *
 * **كان لا يخزّن شيئاً عمداً** خوفاً من نسخةٍ قديمة يعلق عليها الزبون بعد
 * النشر. والخوف في محلّه، لكن الحلّ ليس ترك الزبون أمام صفحة خطأ كلّما
 * انقطع الخطّ. فالتخزين هنا **مقسومٌ بحسب ما يصحّ أن يتقادم**:
 *
 *   - **HTML: الشبكة أوّلاً دائماً.** هو ما يسمّي حزم JS الحاليّة، فنسخةٌ
 *     مخزّنة منه تعني نشراً لا يصل. تُخدم المخزّنة فقط حين تفشل الشبكة أو
 *     تتجاوز مهلةً طويلة — أي حين البديل صفحة خطأ.
 *   - **حزم `/assets/`: المخزّن أوّلاً.** أسماؤها مبصومة بتجزئة محتواها،
 *     فالاسم نفسه لا يحمل محتوًى آخر أبداً — لا تتقادم بطبيعتها.
 *   - **كتالوج المتجر العامّ: الشبكة أوّلاً** ثم آخر نسخة، مع إخبار الصفحة
 *     أنها قديمة كي تعرض «الأسعار قد تكون قديمة».
 *   - **الصور: المخزّن أوّلاً** بسقف عدد — صورة المنتج لا تتغيّر برابطها.
 *   - **الكتابة (POST/PUT/…) لا تُلمس أبداً،** ولا أي طلبٍ يحمل رمز دخول:
 *     ردٌّ خاصّ بمستخدمٍ في مخزنٍ مشترك تسريبٌ ينتظر جهازاً مشتركاً.
 *
 * كروم يشترط أيضاً أن يستجيب الموقع وهو غير متّصل ليعدّه تطبيقاً قابلاً
 * للتثبيت — وصفحة «لا اتصال» أدناه تبقى الملاذ الأخير لمن لم يزر قبلاً.
 *
 * **ولماذا في هذا الملفّ لا في عاملٍ ثانٍ:** المتصفّح يقبل عاملاً واحداً
 * لكل نطاق (`scope: '/'`)، وتسجيل عاملٍ آخر على الجذر كان سيستبدل هذا
 * ويقطع إشعارات الطلبات بصمت.
 */
const OFFLINE_PAGE = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>لا اتصال</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;
    background:#082E24;color:#E8F5E9;
    font-family:system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center;padding:24px}
  .c{max-width:320px}
  h1{font-size:19px;margin:0 0 10px}
  p{font-size:14px;line-height:1.9;color:#9DC4AC;margin:0 0 22px}
  button{background:#C8E235;color:#0A2018;border:0;border-radius:12px;
    padding:13px 26px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit}
</style></head>
<body><div class="c">
  <h1>لا يوجد اتصال بالإنترنت</h1>
  <p>تحقّق من اتصالك ثمّ أعد المحاولة — بياناتك وسلّتك محفوظة.</p>
  <button onclick="location.reload()">إعادة المحاولة</button>
</div></body></html>`;

// رقمٌ يتغيّر فقط حين يتغيّر **شكل** التخزين هنا (لا مع كل نشر): تغييره
// يمحو المخازن القديمة عند التفعيل. النشر العاديّ لا يحتاجه — راجع أعلاه.
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `sham-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `sham-assets-${CACHE_VERSION}`;
const CATALOG_CACHE = `sham-catalog-${CACHE_VERSION}`;
const IMAGE_CACHE = `sham-images-${CACHE_VERSION}`;
const KNOWN_CACHES = [SHELL_CACHE, ASSET_CACHE, CATALOG_CACHE, IMAGE_CACHE];

// مفتاحٌ واحد للصفحة: التطبيق صفحةٌ واحدة (`/* → /index.html`)، فكل مسارٍ
// يعيد HTML نفسه. تخزينه لكل مسار كان سيملأ المخزن بنسخٍ متطابقة
const SHELL_KEY = '/__sham-shell';

// مهلة HTML طويلة عمداً: على شبكةٍ بطيئة لكن حيّة نفضّل الانتظار على
// نسخةٍ قديمة. بعدها فقط تُخدم المخزّنة — وإلا بقي الزبون أمام شاشةٍ بيضاء
const NAV_TIMEOUT_MS = 10000;
const CATALOG_TIMEOUT_MS = 8000;

// `ignoreVary`: سكربتات الوحدات تُطلب بترويسة `Origin` (وسم `crossorigin`)
// والتسخين يطلبها بدونها، وخادمٌ يرسل `Vary: Origin` يجعل النسخة المخزّنة
// «غير مطابقة» فيفشل الفتح دون اتصال والملفّ في المخزن. المفتاح هنا الرابط
// وحده — ومحتوى الرابط المبصوم لا يتغيّر بترويسة
const MATCH = { ignoreVary: true };

const MAX_ASSETS = 160;
const MAX_CATALOGS = 12;
const MAX_IMAGES = 150;

const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });

/** يحذف الأقدم حتى السقف — `keys()` تعيد ترتيب الإدخال */
const trimCache = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
};

const isHtml = (response) =>
  !!response && response.ok && (response.headers.get('content-type') || '').includes('text/html');

/** يخبر الصفحة أن ما تعرضه نسخةٌ محفوظة أو حيّة — يقرّر شريط «غير متصل» */
const tell = async (clientId, type) => {
  if (!clientId) return;
  const client = await self.clients.get(clientId);
  if (client) client.postMessage({ type });
};

// حزم Vite المبصومة، والخطوط والأيقونات الثابتة
const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/Fonts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.svg');

/**
 * بيانات المتجر العامّة التي تكفي لعرضه: الكتالوج بالمعرّف، والمنتج،
 * وتحليل النطاق الذي تسأله النطاقات المخصّصة قبل أي شيء.
 *
 * بالمسار لا بالأصل: في التطوير الخادم على منفذٍ آخر، وقد يُضبط
 * `VITE_API_URL` على نطاقٍ منفصل في الإنتاج.
 */
const CATALOG_RE = /\/api\/public\/(?:product\/[^/]+|resolve-host|brand|(?!addons$)[^/]+)$/;
const isCatalog = (url) => CATALOG_RE.test(url.pathname);

const offlinePage = () =>
  new Response(OFFLINE_PAGE, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });

const handleNavigate = async (event) => {
  const cache = await caches.open(SHELL_CACHE);
  const network = fetch(event.request).then((response) => {
    if (isHtml(response)) cache.put(SHELL_KEY, response.clone());
    return response;
  });

  try {
    return await withTimeout(network, NAV_TIMEOUT_MS);
  } catch (error) {
    const cached = await cache.match(SHELL_KEY, MATCH);
    if (cached) return cached;
    // مهلةٌ انقضت ولا نسخة: الانتظار أفضل من صفحة «لا اتصال» والشبكة حيّة
    if (error && error.message === 'timeout') return network.catch(() => offlinePage());
    return offlinePage();
  }
};

const handleAsset = async (request) => {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  // الناجح وحده: 404 لحزمةٍ حذفها النشر لا يُحفظ فيعلق للأبد
  if (response.ok) {
    await cache.put(request, response.clone());
    trimCache(ASSET_CACHE, MAX_ASSETS);
  }
  return response;
};

const handleCatalog = async (event) => {
  const request = event.request;
  const cache = await caches.open(CATALOG_CACHE);
  const network = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
      trimCache(CATALOG_CACHE, MAX_CATALOGS);
    }
    return response;
  });

  try {
    const response = await withTimeout(network, CATALOG_TIMEOUT_MS);
    tell(event.clientId, 'sham-sw:fresh');
    return response;
  } catch (error) {
    const cached = await cache.match(request, MATCH);
    if (cached) {
      tell(event.clientId, 'sham-sw:stale');
      return cached;
    }
    if (error && error.message === 'timeout') return network;
    throw error;
  }
};

const handleImage = async (request) => {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request, MATCH);
  if (cached) return cached;
  const response = await fetch(request);
  // صور حاوية R2 بلا CORS تصل «معتمة» (status 0) — تُحفظ كما هي وتُعرض
  // في `<img>` بلا مشكلة
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    trimCache(IMAGE_CACHE, MAX_IMAGES);
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // الكتابة لا تُخزَّن ولا تُعترض: طلبٌ يُعاد من مخزنٍ أو يُبتلع صامتاً
  // أخطر من طلبٍ يفشل بوضوح
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(event));
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  // ردودٌ خاصّة بمستخدم لا تدخل مخزناً مشتركاً
  if (request.headers.get('Authorization')) return;

  if (isStaticAsset(url)) {
    event.respondWith(handleAsset(request));
    return;
  }

  if (isCatalog(url)) {
    event.respondWith(handleCatalog(event));
    return;
  }

  if (request.destination === 'image' && url.protocol.startsWith('http') && !url.pathname.startsWith('/api/')) {
    event.respondWith(handleImage(request));
  }
});

/**
 * تسخين المخزن من الصفحة نفسها.
 *
 * أوّل زيارة تحمّل حزمها **قبل** أن يتحكّم العامل بالصفحة، فلا تمرّ به
 * ولا تُخزَّن — ومن فتح المتجر مرّةً واحدة ثم انقطع الخطّ كان سيجد صفحة
 * «لا اتصال». الصفحة ترسل هنا ما حمّلته فعلاً فيُخزَّن الآن.
 */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'sham-sw:warm') return;

  event.waitUntil(
    (async () => {
      const assets = (Array.isArray(data.assets) ? data.assets : []).slice(0, 80);
      const cache = await caches.open(ASSET_CACHE);
      await Promise.all(
        assets.map(async (href) => {
          try {
            const url = new URL(href, self.location.origin);
            if (!isStaticAsset(url)) return;
            if (await cache.match(url.href, MATCH)) return;
            const response = await fetch(url.href);
            if (response.ok) await cache.put(url.href, response);
          } catch (e) {
            /* حزمةٌ واحدة فاشلة لا توقف البقيّة */
          }
        })
      );

      if (typeof data.shell === 'string') {
        try {
          const url = new URL(data.shell, self.location.origin);
          const shell = await caches.open(SHELL_CACHE);
          if (url.origin === self.location.origin && !(await shell.match(SHELL_KEY, MATCH))) {
            const response = await fetch(url.href, { credentials: 'same-origin' });
            if (isHtml(response)) await shell.put(SHELL_KEY, response);
          }
        } catch (e) {
          /* بلا صفحةٍ مخزّنة تبقى صفحة «لا اتصال» — كما كان */
        }
      }
    })()
  );
});

/// التحديث يصل فوراً لا بعد إغلاق كل التبويبات
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      // مخازن شكلٍ سابق (تغيّر `CACHE_VERSION`) تُمحى ولا تُترك تأكل المساحة
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('sham-') && !KNOWN_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  )
);
