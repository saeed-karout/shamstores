// functions/_souqSeo.js
//
// وسوم «سوق شام ستورز» على حافّة Cloudflare — بنفس نهج `[slug].js`.
//
// **لماذا:** صفحة السوق تُصيَّر في المتصفّح، والزاحف بلا جافاسكربت كان
// سيرى عنوان المنصّة العامّ ولا رابطاً واحداً إلى متجر. هنا يُحقن عنوانٌ
// ووصفٌ لكل محافظة، وقائمةٌ مقروءة بروابط المتاجر داخل `#root` — وهي
// نفسها ما يعرضه التطبيق بعد التحميل، لكلّ زائرٍ لا للزاحف وحده.
//
// **والفشل مفتوح:** أي خطأ يُعيد الصفحة كما هي.

import { API_ORIGIN, escapeHtml, clamp, tag } from './_seo.js';

const SITE = 'https://shamstores.com';

const fetchDirectory = async (gov, waitUntil, env) => {
  const base = (env && env.API_ORIGIN) || API_ORIGIN;
  const url = `${base}/api/souq/businesses?limit=40${gov ? `&gov=${encodeURIComponent(gov)}` : ''}`;
  const cache = caches.default;
  const key = new Request(url, { method: 'GET' });
  let response = await cache.match(key);
  if (!response) {
    response = await fetch(url, {
      cf: { cacheTtl: 300, cacheEverything: true },
      signal: AbortSignal.timeout(2500)
    });
    if (response.ok && waitUntil) waitUntil(cache.put(key, response.clone()));
  }
  if (!response.ok) return null;
  const body = await response.json();
  return body?.data || null;
};

class SetContent {
  constructor(value) {
    this.value = value;
  }
  element(element) {
    element.setAttribute('content', this.value);
  }
}

/**
 * @param {string|null} gov رمز المحافظة من المسار، أو null لصفحة السوق العامّة
 */
export const souqSeoHandler = (getGov) => async (context) => {
  const { request, next, waitUntil, env } = context;
  try {
    const response = await next();
    if (!(response.headers.get('content-type') || '').includes('text/html')) return response;

    const gov = getGov(context);
    const data = await fetchDirectory(gov, waitUntil, env);
    if (!data) return tag(response, 'souq-nodata');

    const items = Array.isArray(data.items) ? data.items : [];
    // اسم المحافظة من أوّل متجرٍ فيها — لا نسخة ثالثة من القائمة هنا
    const govName = gov ? items.find((b) => b.governorate === gov)?.governorateName || null : null;
    // محافظةٌ بلا متاجر أو برمزٍ مجهول (الخادم يتجاهل المجهول فيُرجع الكل):
    // الصفحة تعمل، لكن لا تُفهرَس نسخةً مكرّرة من /souq
    const thin = Boolean(gov) && !govName;

    const title = govName
      ? `متاجر ومطاعم ${govName} — سوق شام ستورز`
      : 'سوق شام ستورز — متاجر ومطاعم سوريا في مكانٍ واحد';
    const description = clamp(
      govName
        ? `تسوّق من ${data.total || items.length} متجراً ومطعماً في ${govName}: ${items.slice(0, 5).map((b) => b.name).join('، ')}. اطلب مباشرةً من التاجر.`
        : `ابحث عن المنتجات وقارن بين متاجر سوريا ومطاعمها حسب المحافظة، واطلب مباشرةً من التاجر عبر واجهته.`,
      158
    );
    const pageUrl = `${SITE}/souq${gov ? `/${gov}` : ''}`;

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: title,
      url: pageUrl,
      numberOfItems: items.length,
      itemListElement: items.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': b.type === 'restaurant' ? 'Restaurant' : 'Store',
          name: b.name,
          url: b.url,
          ...(b.logo ? { image: b.logo } : {}),
          ...(b.governorateName
            ? { address: { '@type': 'PostalAddress', addressRegion: b.governorateName, addressCountry: 'SY' } }
            : {})
        }
      }))
    };
    const jsonLd = JSON.stringify(ld).replace(/</g, '\\u003c');

    const list = items
      .map(
        (b) =>
          `<li style="padding:10px 0;border-bottom:1px solid #cdef7c22">` +
          `<a href="${escapeHtml(b.url)}" style="color:#E8F5E9;font-weight:700">${escapeHtml(b.name)}</a>` +
          ` <span style="color:#9DC4AC">— ${escapeHtml(b.categoryName || '')}${b.governorateName ? ` · ${escapeHtml(b.governorateName)}` : ''}</span>` +
          `</li>`
      )
      .join('');
    const fallback =
      `<div style="background:#082E24;color:#E8F5E9;min-height:100vh;padding:28px 18px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">` +
      `<div style="max-width:720px;margin:0 auto">` +
      `<h1 style="font-size:22px;margin:0 0 10px">${escapeHtml(title)}</h1>` +
      `<p style="color:#9DC4AC;line-height:1.9;margin:0 0 18px">${escapeHtml(description)}</p>` +
      (list ? `<ul style="list-style:none;padding:0;margin:0">${list}</ul>` : '') +
      `<p style="color:#9DC4AC;margin:22px 0 0;font-size:13px">جارٍ تحميل السوق…</p>` +
      `</div></div>`;

    const safeUrl = escapeHtml(pageUrl);
    const out = new HTMLRewriter()
      .on('title', { element: (e) => e.setInnerContent(title) })
      .on('meta[name="description"]', new SetContent(description))
      .on('meta[name="robots"]', new SetContent(thin ? 'noindex, follow' : 'index, follow, max-image-preview:large'))
      .on('meta[property="og:title"]', new SetContent(title))
      .on('meta[property="og:description"]', new SetContent(description))
      .on('meta[name="twitter:title"]', new SetContent(title))
      .on('meta[name="twitter:description"]', new SetContent(description))
      .on('head', {
        element(element) {
          element.append(
            `<link rel="canonical" href="${safeUrl}">` +
              `<meta property="og:url" content="${safeUrl}">` +
              `<script type="application/ld+json">${jsonLd}</script>`,
            { html: true }
          );
        }
      })
      .on('#root', { element: (e) => e.setInnerContent(fallback, { html: true }) })
      .transform(tag(response, 'souq-hit'));
    return out;
  } catch (error) {
    console.error('Souq SEO rewrite failed:', error);
    return tag(await next(), `souq-error:${String(error).slice(0, 60)}`);
  }
};
