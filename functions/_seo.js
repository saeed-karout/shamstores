// functions/_seo.js
//
// منطقٌ مشترك بين مسار `/:slug` ومسار الجذر على النطاقات المخصّصة.
//
// الملفّ يبدأ بشرطةٍ سفلية فلا يُعامَل مساراً — Pages يستثني ما يبدأ بها من
// التوجيه، ويبقى قابلاً للاستيراد.

/**
 * أصل الواجهة البرمجية — **الخادم مباشرةً لا عبر نطاقنا**.
 *
 * نداءُ `/api/...` من داخل وظيفةٍ على Pages لا يمرّ بقاعدة الوكيل التي
 * تحوّل `/api` إلى Heroku: كلاودفلير لا تُعيد إدخال الطلبات الفرعية في
 * قواعد النطاق نفسه منعاً للحلقات. فيصل الطلب إلى أصول Pages ويلتقطه
 * `_redirects` فيُرجع `index.html` — ويفشل تحليل JSON على أوّل محرف.
 */
export const API_ORIGIN = 'https://shamstores-5fa37cec9e6e.herokuapp.com';

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** يقصّ الوصف إلى ما تعرضه نتيجة البحث — الأطول يُقطع بثلاث نقاط عندهم */
export const clamp = (value, max) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
};

const cachedJson = async (url, waitUntil, timeoutMs = 2500) => {
  const cache = caches.default;
  const key = new Request(url, { method: 'GET' });

  let response = await cache.match(key);
  if (!response) {
    response = await fetch(url, {
      cf: { cacheTtl: 300, cacheEverything: true },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (response.ok && waitUntil) waitUntil(cache.put(key, response.clone()));
  }
  if (!response.ok) return null;
  return response.json();
};

export const fetchSeo = async (slug, waitUntil, env) => {
  const base = (env && env.API_ORIGIN) || API_ORIGIN;
  const body = await cachedJson(
    `${base}/api/public/${encodeURIComponent(slug)}/seo`,
    waitUntil
  );
  return body?.data?.found ? body.data : null;
};

/** يحوّل مضيفاً مخصّصاً إلى معرّف نشاط — يستعمل منفذ المنصّة نفسه */
export const resolveHost = async (host, waitUntil, env) => {
  const base = (env && env.API_ORIGIN) || API_ORIGIN;
  const body = await cachedJson(
    `${base}/api/public/resolve-host?host=${encodeURIComponent(host)}`,
    waitUntil
  );
  return body?.data?.slug || null;
};

/**
 * بيانات منظَّمة بصيغة schema.org.
 *
 * **هذه ما يجعل جوجل يعرض السعر والصورة في النتيجة** لا مجرّد رابط. وهي
 * الطريقة المشروعة لإخبار المحرّك بما في الصفحة — بديلاً عن حشو أسماء
 * المنتجات في نصٍّ مخفيّ، وهو ما يُعاقَب عليه.
 */
export const buildJsonLd = (data, pageUrl) => {
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

/**
 * نصٌّ مقروء داخل `#root` — لمن لا ينفّذ الجافاسكربت.
 *
 * `createRoot().render()` يستبدل محتوى الحاوية عند أوّل رسم، فيعيش النصّ
 * للزاحف ويختفي للزائر بلا سطرٍ إضافيّ منّا.
 */
export const buildFallbackHtml = (data, pageUrl) => {
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
 * يحقن هوية المتجر في صفحةٍ جاهزة.
 *
 * `pageUrl` يُمرَّر ولا يُشتقّ: على النطاق المخصّص هو جذر ذلك النطاق، وعلى
 * نطاق المنصّة هو `/<slug>`. وخلطهما هو بالضبط ما جعل `canonical` يشير إلى
 * صفحتنا الرئيسية من متجرٍ على نطاقه الخاصّ — أي أن جوجل يُسقط نطاق
 * التاجر من الفهرس ويَنسب صفحته إلينا.
 */
export const injectSeo = (response, data, pageUrl, originForFallbackIcon) => {
  const title = `${data.name} — ${
    data.type === 'restaurant' ? 'قائمة الطعام والطلب أونلاين' : 'تسوّق أونلاين'
  }`;

  const description = data.description
    ? clamp(data.description, 155)
    : clamp(
        `اطلب من ${data.name} أونلاين${
          data.products?.length ? `: ${data.products.slice(0, 4).map((p) => p.name).join('، ')}` : ''
        }`,
        155
      );

  const image = data.cover || data.logo || `${originForFallbackIcon}/icons/icon-512.png`;

  // لا ترميز HTML داخل وسم script — يُفسد JSON. والخطر الوحيد وسمُ إغلاقٍ
  // داخل اسم منتج، وترميز «أصغر من» بيونيكود يمنعه
  const jsonLd = JSON.stringify(buildJsonLd(data, pageUrl)).replace(/</g, '\\u003c');

  return new HTMLRewriter()
    .on('title', new SetText(title))
    .on('meta[name="description"]', new SetContent(description))
    .on('meta[property="og:title"]', new SetContent(title))
    .on('meta[property="og:description"]', new SetContent(description))
    .on('meta[property="og:image"]', new SetContent(image))

    .on('meta[name="twitter:title"]', new SetContent(title))
    .on('meta[name="twitter:description"]', new SetContent(description))
    .on('meta[name="twitter:image"]', new SetContent(image))
    .on('head', {
      element(element) {
        // **تُضاف ولا تُستبدَل.** الوسمان الثابتان أُزيلا من `index.html`
        // لأنهما كانا يشيران إلى الصفحة الرئيسية في كل صفحة. ولو بقي
        // الحقن استبدالاً لما وجد ما يستبدله — فتخرج صفحة المتجر بلا
        // وسمٍ معياريّ إطلاقاً.
        const safeUrl = escapeHtml(pageUrl);
        element.append(
          `<link rel="canonical" href="${safeUrl}">` +
            `<meta property="og:url" content="${safeUrl}">` +
            `<meta name="twitter:url" content="${safeUrl}">` +
            `<script type="application/ld+json">${jsonLd}</script>`,
          { html: true }
        );
      }
    })
    .on('#root', {
      element(element) {
        element.setInnerContent(buildFallbackHtml(data, pageUrl), { html: true });
      }
    })
    .transform(response);
};

/** ترويسة تشخيصية — تميّز «لم تُستدعَ» عن «استُدعيت وتخطّت» */
export const tag = (response, state) => {
  const out = new Response(response.body, response);
  out.headers.set('x-sham-seo', state);
  return out;
};
