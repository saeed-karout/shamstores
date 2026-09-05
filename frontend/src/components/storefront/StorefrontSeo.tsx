// frontend/src/components/storefront/StorefrontSeo.tsx
//
// وسوم البحث والبيانات المنظَّمة لواجهة تاجر.
//
// واجهات التجّار هي معظم محتوى المنصة القابل للفهرسة. وبلا بيانات منظَّمة
// يرى المحرّك نصاً وصوراً فيخمّن: هل هذا مطعم؟ أين يقع؟ ما رقمه؟ الوسم
// الصريح يجيب بلا تخمين، وهو ما يغذّي البطاقات المنسّقة وإجابات النماذج.
//
// ⚠️ حدٌّ يجب أن يكون معروفاً: هذه الوسوم تُكتب بجافاسكربت بعد التحميل.
// غوغل يصيّر الصفحات فيراها؛ وكثير من زواحف النماذج لا تفعل، فلا ترى منها
// شيئاً. الحلّ الكامل تصيير على الخادم — ولم يُنفَّذ بعد. أما وسوم
// index.html فثابتة في المصدر ويراها الجميع.
//
// ولا يُختلق شيء هنا: لا تقييمات ولا أسعار ولا مواعيد عمل ما لم يدخلها
// التاجر. البيانات المنظَّمة الكاذبة تُسقط الموقع من النتائج المنسّقة.

import { Helmet } from 'react-helmet-async';
import { getImageUrl } from '@/utils/imageHelpers';

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
}

interface Props {
  business: Business;
  type: 'restaurant' | 'store';
  /** عدد الأصناف أو المنتجات المعروضة — إشارة إلى حجم المحتوى */
  itemCount?: number;
}

/** العنوان القانوني للواجهة: النطاق المخصّص إن وُثِّق، وإلا النطاق الفرعي */
const canonicalUrl = (business: Business): string => {
  if (business.customDomain) return `https://${business.customDomain}/`;
  const handle = business.subdomain || business.slug;
  return handle ? `https://${handle}.shamstores.com/` : 'https://shamstores.com/';
};

const StorefrontSeo: React.FC<Props> = ({ business, type, itemCount }) => {
  const name = business.name || (type === 'restaurant' ? 'مطعم' : 'متجر');
  const url = canonicalUrl(business);
  const image = business.coverImage || business.logo;
  const absoluteImage = image ? getImageUrl(image) : undefined;

  const title =
    type === 'restaurant'
      ? `${name} — القائمة الرقمية والطلب أونلاين`
      : `${name} — متجر إلكتروني`;

  const description =
    business.description?.trim() ||
    (type === 'restaurant'
      ? `تصفّح قائمة ${name} واطلب أونلاين. الأسعار بالليرة السورية.`
      : `تصفّح منتجات ${name} واطلب أونلاين. الأسعار بالليرة السورية.`);

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type === 'restaurant' ? 'Restaurant' : 'Store',
    name,
    url,
    description,
    inLanguage: 'ar',
    currenciesAccepted: 'SYP'
  };

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

  return (
    <Helmet>
      <html lang="ar" dir="rtl" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow, max-image-preview:large" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={name} />
      <meta property="og:locale" content="ar_SY" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}

      <meta name="twitter:card" content={absoluteImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}

      <meta name="theme-color" content={business.backgroundColor || '#082E24'} />

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default StorefrontSeo;
