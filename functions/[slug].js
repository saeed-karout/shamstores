// functions/[slug].js
//
// حقن هوية المتجر في HTML على حافّة Cloudflare — قبل أن يصل إلى الزائر.
//
// **المشكلة التي يحلّها، مقيسةً لا مقدَّرة:** التطبيق يُصيَّر في المتصفّح،
// وزاحف جوجل لا ينفّذ الجافاسكربت. فطلبُ `/disneystore` بهوية Googlebot كان
// يُرجع **٦٣ محرفاً** من النصّ المرئيّ، كلّها عنوان المنصّة العامّ. أي أن
// كل متاجر المنصّة صفحةٌ واحدة مكرّرة في نظر جوجل: نفس العنوان ونفس الوصف
// وصفر منتجات. (للمقارنة: منصّة منافسة تُصيّر على الخادم تُرجع ١٬٦٣٤ محرفاً
// و١٢ منتجاً.)
//
// **ولماذا هذا لا Next.js:** التصيير على الخادم يعني إعادة كتابة التطبيق
// وخادم Node يُدار ويُكلَّف. وهذا الملفّ يعدّل HTML أثناء مروره بـ
// `HTMLRewriter` — بلا تصيير، وبلا خادم، وبلا لمس التطبيق.
//
// **وليس تمويهاً (cloaking):** الحقن واحدٌ للجميع، لا يقرأ `User-Agent`
// ولا يبدّل المحتوى للزاحف. ما يُضاف وسومُ وصفٍ وبياناتٌ منظَّمة تصف ما في
// الصفحة فعلاً — وهو ما توصي به جوجل نفسها.
//
// **والفشل مفتوح دائماً:** أي خطأ — شبكةٌ، أو خادمٌ بطيء، أو ردٌّ غريب —
// يُعيد الصفحة كما هي بلا حقن. صفحةٌ بلا وسوم أفضل من صفحةٍ لا تُخدَم.

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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * محتوى نصّيّ داخل `#root` — يراه من لا ينفّذ الجافاسكربت.
 *
 * **لماذا داخل `#root` تحديداً:** `createRoot().render()` يستبدل محتوى
 * الحاوية عند أوّل رسم. فالنصّ يعيش للزاحف ويختفي للزائر بلا سطر جافاسكربت
 * إضافيّ منّا، وبلا وميضٍ يبقى.
 *
 * **وليس تمويهاً:** نفس المنتجات تظهر في التطبيق بعد تحميله — النسخة
 * المقروءة بلا جافاسكربت تصف نفس الصفحة لا صفحةً أخرى. والتمويه أن يختلف
 * ما يراه الزاحف عمّا يراه الزائر، لا أن يصل إليه أبكر.
 *
 * **ولا نصّ مخفيّ:** لو أُخفي بـ`display:none` لصار حشواً يُعاقَب عليه.
 * يُرسَم مرئياً بألوان المتجر، فومضته — إن رآها أحد — تبدو تحميلاً لا عطلاً.
 */
const buildFallbackHtml = (data, pageUrl) => {
  const theme = data.theme || {};
  const bg = theme.background || '#082E24';
  const fg = theme.text || '#E8F5E9';
  const muted = theme.muted || '#9DC4AC';
  const accent = theme.accent || '#C8E235';
  const currency = data.currency === 'USD' ? '$' : 'ل.س';

  const items = (data.products || []).filter((p) => p?.name);
  const list = items
    .map((product) => {
      const price = Number(product.price) || 0;
      return (
        `<li style="padding:10px 0;border-bottom:1px solid ${accent}22">` +
        `<span style="color:${fg}">${escapeHtml(product.name)}</span>` +
        (price > 0
          ? ` <span style="color:${accent}">${price.toLocaleString('en-US')} ${currency}</span>`
          : '') +
        `</li>`
      );
    })
    .join('');

  return (
    `<div style="background:${bg};color:${fg};min-height:100vh;padding:28px 18px;` +
    `font-family:system-ui,-apple-system,'Segoe UI',sans-serif">` +
    `<div style="max-width:640px;margin:0 auto">` +
    `<h1 style="font-size:22px;margin:0 0 10px">${escapeHtml(data.name)}</h1>` +
    (data.description
      ? `<p style="color:${muted};line-height:1.9;margin:0 0 18px">${escapeHtml(clamp(data.description, 300))}</p>`
      : '') +
    (items.length
      ? `<h2 style="font-size:16px;margin:22px 0 8px">${data.type === 'restaurant' ? 'من القائمة' : 'من المنتجات'}</h2>` +
        `<ul style="list-style:none;padding:0;margin:0">${list}</ul>`
      : '') +
    `<p style="color:${muted};margin:22px 0 0;font-size:13px">` +
    `<a href="${escapeHtml(pageUrl)}" style="color:${accent}">${escapeHtml(data.name)}</a>` +
    ` — جارٍ تحميل المتجر…</p>` +
    `</div></div>`
  );
};

/** يقصّ الوصف إلى ما تعرضه نتيجة البحث — الأطول يُقطع بثلاث نقاط عندهم */
const clamp = (value, max) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
};

/**
 * أصل الواجهة البرمجية — **الخادم مباشرةً لا عبر نطاقنا**.
 *
 * نداءُ `https://shamstores.com/api/...` من داخل وظيفةٍ على Pages لا يمرّ
 * بقاعدة الوكيل التي تحوّل `/api` إلى Heroku: كلاودفلير لا تُعيد إدخال
 * الطلبات الفرعية في قواعد النطاق نفسه منعاً للحلقات. فيصل الطلب إلى أصول
 * Pages، ويلتقطه `_redirects` فيُرجع **index.html** — ويفشل `response.json()`
 * بـ«Unexpected token '<'». وهو ما وقع فعلاً، ولولا الترويسة التشخيصية
 * لبدا العطل «الوظيفة لا تعمل».
 *
 * يُضبط من متغيّرات المشروع عند الحاجة؛ وإلا فالأصل المعروف.
 */
const API_ORIGIN = 'https://shamstores-5fa37cec9e6e.herokuapp.com';

const fetchSeo = async (origin, slug, waitUntil, env) => {
  const base = (env && env.API_ORIGIN) || API_ORIGIN;
  const url = `${base}/api/public/${encodeURIComponent(slug)}/seo`;
  const cache = caches.default;
  const cacheKey = new Request(url, { method: 'GET' });

  // التخزين على الحافّة: بلا هذا يصير كل زائرٍ نداءً إلى Heroku قبل أن
  // يرى شيئاً — فنضيف تأخيراً حيث كنّا نحاول إزالته
  let response = await cache.match(cacheKey);
  if (!response) {
    response = await fetch(url, {
      cf: { cacheTtl: 300, cacheEverything: true },
      signal: AbortSignal.timeout(2500)
    });
    if (response.ok && waitUntil) {
      waitUntil(cache.put(cacheKey, response.clone()));
    }
  }

  if (!response.ok) return null;
  const body = await response.json();
  return body?.data?.found ? body.data : null;
};

/**
 * بيانات منظَّمة بصيغة schema.org.
 *
 * **هذه ما يجعل جوجل يعرض السعر والصورة في النتيجة** لا مجرّد رابط. وهي
 * الطريقة المشروعة لإخبار المحرّك بما في الصفحة — بديلاً عن حشو أسماء
 * المنتجات في نصٍّ مخفيّ، وهو ما يُعاقَب عليه.
 */
const buildJsonLd = (data, pageUrl) => {
  const currency = data.currency === 'USD' ? 'USD' : 'SYP';

  const business = {
    '@context': 'https://schema.org',
    '@type': data.type === 'restaurant' ? 'Restaurant' : 'Store',
    name: data.name,
    url: pageUrl,
    ...(data.description ? { description: clamp(data.description, 300) } : {}),
    ...(data.logo ? { image: data.logo } : {})
  };

  const items = (data.products || []).filter((p) => p?.name);
  if (items.length === 0) return [business];

  return [
    business,
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: data.name,
      numberOfItems: items.length,
      itemListElement: items.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          ...(product.image ? { image: product.image } : {}),
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: currency,
            availability: 'https://schema.org/InStock'
          }
        }
      }))
    }
  ];
};

/** يستبدل محتوى وسمٍ موجود بدل إضافة ثانٍ — المتصفّح والزاحف يقرآن الأوّل */
class SetContent {
  constructor(value) {
    this.value = value;
  }
  element(element) {
    element.setAttribute('content', this.value);
  }
}

class SetText {
  constructor(value) {
    this.value = value;
  }
  element(element) {
    element.setInnerContent(this.value);
  }
}

/**
 * ترويسة تشخيصية.
 *
 * بلا إشارةٍ من الوظيفة لا سبيل للتمييز بين «لم تُستدعَ أصلاً» و«استُدعيت
 * وتخطّت» — والعطلان يبدوان واحداً: صفحةٌ بلا وسوم.
 */
const tag = (response, state) => {
  const out = new Response(response.body, response);
  out.headers.set('x-sham-seo', state);
  return out;
};

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

    const url = new URL(request.url);
    const data = await fetchSeo(url.origin, slug, waitUntil, env);
    if (!data) return tag(response, 'nodata');

    const pageUrl = `${url.origin}/${slug}`;
    const title = `${data.name} — ${data.type === 'restaurant' ? 'قائمة الطعام والطلب أونلاين' : 'تسوّق أونلاين'}`;
    const description = data.description
      ? clamp(data.description, 155)
      : clamp(
          `اطلب من ${data.name} أونلاين${
            data.products?.length ? `: ${data.products.slice(0, 4).map((p) => p.name).join('، ')}` : ''
          }`,
          155
        );
    const image = data.cover || data.logo || `${url.origin}/icons/icon-512.png`;

    // **لا ترميز HTML هنا:** `&quot;` ليست علامة اقتباس، وترميزُ JSON داخل
    // وسم `script` يُفسده. والخطر الوحيد أن يحوي اسمُ منتجٍ وسمَ إغلاقٍ
    // فيقطع الوسم مبكّراً — وترميز علامة «أصغر من» بصيغة يونيكود يمنعه
    // ويبقى JSON صالحاً.
    const jsonLd = JSON.stringify(buildJsonLd(data, pageUrl)).replace(/</g, '\\u003c');

    return new HTMLRewriter()
      .on('title', new SetText(title))
      .on('meta[name="description"]', new SetContent(description))
      .on('meta[property="og:title"]', new SetContent(title))
      .on('meta[property="og:description"]', new SetContent(description))
      .on('meta[property="og:image"]', new SetContent(image))
      .on('meta[property="og:url"]', new SetContent(pageUrl))
      .on('meta[name="twitter:title"]', new SetContent(title))
      .on('meta[name="twitter:description"]', new SetContent(description))
      .on('meta[name="twitter:image"]', new SetContent(image))
      .on('link[rel="canonical"]', {
        element(element) {
          element.setAttribute('href', pageUrl);
        }
      })
      .on('head', {
        element(element) {
          // البيانات المنظَّمة تُضاف ولا تستبدل: صفحة المنصّة لها بياناتها
          // الخاصّة، وهذه تصف المتجر داخلها
          element.append(`<script type="application/ld+json">${jsonLd}</script>`, { html: true });
        }
      })
      .on('#root', {
        element(element) {
          // الحاوية فارغة في `index.html`، فالكتابة فيها لا تمحو شيئاً.
          // وReact يستبدل محتواها عند أوّل رسم فتختفي من تلقائها.
          element.setInnerContent(buildFallbackHtml(data, pageUrl), { html: true });
        }
      })
      .transform(tag(response, 'hit'));
  } catch (error) {
    // لا تُسقط الصفحة لأجل وسم: الزائر أهمّ من الزاحف
    console.error('SEO rewrite failed:', error);
    return tag(await next(), `error:${String(error).slice(0, 60)}`);
  }
}
