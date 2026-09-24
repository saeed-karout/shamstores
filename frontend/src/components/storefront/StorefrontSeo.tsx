// frontend/src/components/storefront/StorefrontSeo.tsx
//
// وسوم البحث والبيانات المنظَّمة وأيقونة التبويب لواجهة تاجر.
//
// واجهات التجّار هي معظم محتوى المنصة القابل للفهرسة. وبلا بيانات منظَّمة
// يرى المحرّك نصاً وصوراً فيخمّن: هل هذا مطعم؟ أين يقع؟ ما رقمه؟ الوسم
// الصريح يجيب بلا تخمين، وهو ما يغذّي البطاقات المنسّقة وإجابات النماذج.
//
// **لكل نشاطٍ إعداداته:** العنوان والوصف والكلمات المفتاحية وصورة المشاركة
// وأيقونة التبويب يضبطها التاجر من «الإعدادات ← محرّكات البحث»، ويحسمها
// الخادم في `business.seo` (راجع backend/src/services/seo.service.ts). وما لم
// يضبطه يُشتقّ من اسمه ووصفه وشعاره — لا من هوية المنصّة.
//
// **وأيقونة التبويب شعار المتجر:** كان تبويب متجر «ديزني» يحمل اسمه وأيقونة
// شام ستورز، لأن `index.html` يعلن أيقونة المنصّة ولا أحد يستبدلها.
//
// ⚠️ هذه الوسوم تُكتب بجافاسكربت بعد التحميل. الزواحف التي لا تنفّذه تقرأ
// ما تحقنه وظيفة الحافّة (`functions/` و`workers/subdomain-proxy`) من
// المصدر نفسه، فلا يرى جوجل عنواناً وواتساب عنواناً آخر.
//
// ولا يُختلق شيء هنا: لا تقييمات ولا أسعار ولا مواعيد عمل ما لم يدخلها
// التاجر. البيانات المنظَّمة الكاذبة تُسقط الموقع من النتائج المنسّقة.

import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { getImageUrl } from '@/utils/imageHelpers';

/** ما يحسمه الخادم من إعدادات التاجر — انظر `resolveBusinessSeo` */
export interface ResolvedSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string | null;
  favicon?: string | null;
  canonical?: string;
  noindex?: boolean;
}

interface Business {
  name?: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  latitude?: number | null;
  longitude?: number | null;
  slug?: string;
  subdomain?: string;
  customDomain?: string | null;
  backgroundColor?: string;
  currency?: string;
  seo?: ResolvedSeo | null;
}

/** منتجٌ أو صنفٌ مفرد — صفحته عنوانها اسمه لا اسم المتجر */
export interface SeoProduct {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  price?: number;
  sku?: string | null;
  inStock?: boolean;
  ratingAvg?: number | null;
  ratingCount?: number | null;
}

interface Props {
  business: Business;
  type: 'restaurant' | 'store';
  /** عدد الأصناف أو المنتجات المعروضة — إشارة إلى حجم المحتوى */
  itemCount?: number;
  /** صفحة منتجٍ بعينه */
  product?: SeoProduct | null;
  /** مسار الصفحة من أصل الواجهة — لصفحة المنتج */
  path?: string;
}

/** العنوان القانوني للواجهة: النطاق المخصّص إن وُثِّق، وإلا النطاق الفرعي */
const canonicalUrl = (business: Business): string => {
  if (business.seo?.canonical) return business.seo.canonical;
  if (business.customDomain) return `https://${business.customDomain}/`;
  const handle = business.subdomain || business.slug;
  return handle ? `https://${handle}.shamstores.com/` : 'https://shamstores.com/';
};

const clamp = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trim()}…`;
};

/**
 * أيقونة التبويب — تُستبدل في مكانها وتُعاد عند المغادرة.
 *
 * لا عبر Helmet: `index.html` يحمل `<link rel="icon">` ثابتاً، وHelmet يضيف
 * وسماً ثانياً بجانبه فيختار المتصفّح أيّهما شاء (Chrome يأخذ الأوّل). فنعدّل
 * الوسوم الموجودة نفسها، ونُرجع قيمها حين يعود الزائر إلى صفحات المنصّة.
 */
const useFavicon = (href: string | null) => {
  useEffect(() => {
    if (!href) return;
    const links = Array.from(
      // `apple-touch-icon` ليس هنا عمداً: يديره `useStoreManifest` مع بيان
      // التطبيق، وتعديله من موضعين يجعل أحدهما يُعيد ما غيّره الآخر
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')
    );
    const previous = links.map((link) => ({ link, href: link.href, type: link.type }));
    if (links.length === 0) {
      const link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
      links.push(link);
      previous.push({ link, href: '', type: '' });
    }
    links.forEach((link) => {
      link.href = href;
      // النوع المعلن `image/svg+xml` لشعار المنصّة — وشعار التاجر صورةٌ
      // نقطية غالباً؛ نوعٌ خاطئ يجعل بعض المتصفّحات تتجاهل الأيقونة
      link.removeAttribute('type');
    });
    return () => {
      previous.forEach(({ link, href: old, type }) => {
        if (!old) {
          link.remove();
          return;
        }
        link.href = old;
        if (type) link.type = type;
      });
    };
  }, [href]);
};

const StorefrontSeo: React.FC<Props> = ({ business, type, itemCount, product, path }) => {
  const name = business.name || (type === 'restaurant' ? 'مطعم' : 'متجر');
  const seo = business.seo || {};
  const origin = canonicalUrl(business).replace(/\/$/, '');
  const url = product && path ? `${origin}${path.startsWith('/') ? path : `/${path}`}` : `${origin}/`;

  const businessImage = seo.image || business.coverImage || business.logo;
  const image = product?.image || businessImage;
  const absoluteImage = image ? getImageUrl(image) : undefined;
  const favicon = seo.favicon || business.logo;
  useFavicon(favicon ? getImageUrl(favicon) : null);

  const businessTitle =
    seo.title ||
    (type === 'restaurant' ? `${name} — القائمة الرقمية والطلب أونلاين` : `${name} — متجر إلكتروني`);
  const title = product ? `${product.name} | ${name}` : businessTitle;

  const businessDescription =
    seo.description ||
    business.description?.trim() ||
    (type === 'restaurant'
      ? `تصفّح قائمة ${name} واطلب أونلاين. الأسعار بالليرة السورية.`
      : `تصفّح منتجات ${name} واطلب أونلاين. الأسعار بالليرة السورية.`);
  const description = clamp(
    product ? product.description?.trim() || `${product.name} من ${name} — اطلبه أونلاين.` : businessDescription,
    170
  );

  const currency = business.currency === 'USD' ? 'USD' : 'SYP';

  const jsonLd: Record<string, any> = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        url,
        description,
        ...(product.image ? { image: getImageUrl(product.image) } : {}),
        ...(product.sku ? { sku: product.sku } : {}),
        brand: { '@type': 'Brand', name },
        ...(typeof product.price === 'number' && product.price > 0
          ? {
              offers: {
                '@type': 'Offer',
                url,
                price: product.price,
                priceCurrency: currency,
                availability:
                  product.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
                seller: { '@type': type === 'restaurant' ? 'Restaurant' : 'Store', name }
              }
            }
          : {}),
        // التقييم يُذكر حين يوجد فعلاً — تقييمٌ مختلق يُسقط الصفحة من النتائج
        ...(product.ratingAvg && product.ratingCount
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(product.ratingAvg.toFixed(1)),
                reviewCount: product.ratingCount
              }
            }
          : {})
      }
    : {
        '@context': 'https://schema.org',
        '@type': type === 'restaurant' ? 'Restaurant' : 'Store',
        name,
        url,
        description,
        inLanguage: 'ar',
        currenciesAccepted: currency
      };

  if (!product) {
    if (absoluteImage) jsonLd.image = absoluteImage;
    if (business.logo) jsonLd.logo = getImageUrl(business.logo);
    if (business.phone) jsonLd.telephone = business.phone;
    if (business.address) {
      jsonLd.address = { '@type': 'PostalAddress', streetAddress: business.address, addressCountry: 'SY' };
    }
    // الإحداثيات تُدرَج معاً أو لا تُدرَج: نصف موقع أسوأ من لا موقع
    if (typeof business.latitude === 'number' && typeof business.longitude === 'number') {
      jsonLd.geo = { '@type': 'GeoCoordinates', latitude: business.latitude, longitude: business.longitude };
    }
    if (type === 'restaurant') jsonLd.hasMenu = url;
    if (itemCount && itemCount > 0) {
      jsonLd.makesOffer = { '@type': 'Offer', itemOffered: { '@type': 'MenuSection', name: `${itemCount} صنفاً` } };
    }
  }

  const keywords = (seo.keywords || []).filter(Boolean);

  return (
    <Helmet>
      <html lang="ar" dir="rtl" />
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join('، ')} />}
      <link rel="canonical" href={url} />
      {/* التاجر قد يُخفي واجهته عن المحرّكات (متجرٌ تحت التجهيز) */}
      <meta
        name="robots"
        content={seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}
      />

      <meta property="og:type" content={product ? 'product' : 'website'} />
      <meta property="og:site_name" content={name} />
      <meta property="og:locale" content="ar_SY" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}
      {product && typeof product.price === 'number' && product.price > 0 && (
        <meta property="product:price:amount" content={String(product.price)} />
      )}
      {product && <meta property="product:price:currency" content={currency} />}

      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}

      <meta name="theme-color" content={business.backgroundColor || '#082E24'} />
      <meta name="apple-mobile-web-app-title" content={name} />

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default StorefrontSeo;
