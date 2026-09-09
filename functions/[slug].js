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

/** يقصّ الوصف إلى ما تعرضه نتيجة البحث — الأطول يُقطع بثلاث نقاط عندهم */
const clamp = (value, max) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
};

const fetchSeo = async (origin, slug, waitUntil) => {
  const url = `${origin}/api/public/${encodeURIComponent(slug)}/seo`;
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

export async function onRequestGet(context) {
  const { request, params, next, waitUntil } = context;

  try {
    const slug = String(params.slug || '').trim();

    // الملفّات لها امتداد، والمسارات المحجوزة ليست متاجر
    if (!slug || slug.includes('.') || RESERVED.has(slug.toLowerCase())) {
      return next();
    }

    const response = await next();
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    const url = new URL(request.url);
    const data = await fetchSeo(url.origin, slug, waitUntil);
    if (!data) return response;

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
      .transform(response);
  } catch (error) {
    // لا تُسقط الصفحة لأجل وسم: الزائر أهمّ من الزاحف
    console.error('SEO rewrite failed:', error);
    return next();
  }
}
