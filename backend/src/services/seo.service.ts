// backend/src/services/seo.service.ts
//
// إعدادات محرّكات البحث لكل نشاط — المرجع الوحيد لشكلها وحدودها.
//
// **ما يضبطه التاجر:** عنوان الصفحة، ووصفها، وكلماتٌ مفتاحية، وصورة
// المشاركة، وأيقونة التبويب، وإخفاء الواجهة عن محرّكات البحث. كلها اختيارية:
// الفارغ يُشتقّ من الاسم والوصف والشعار — فمن لم يفتح الإعدادات قطّ تبقى
// واجهته مفهرسةً باسمه كما كانت.
//
// **ولماذا الحدود:** جوجل يقصّ العنوان بعد نحو ٦٠ محرفاً والوصف بعد نحو
// ١٦٠. الحفظ فوقها لا يُخطئ، لكنه يُري التاجر نصّاً لن يراه زبونه أبداً —
// فالحدّ هنا هو ما يعرضه المحرّك فعلاً لا رقمٌ اعتباطيّ.

export interface SeoSettings {
  title?: string | null;
  description?: string | null;
  keywords?: string[];
  ogImage?: string | null;
  favicon?: string | null;
  noindex?: boolean;
}

export const SEO_LIMITS = { title: 70, description: 170, keywords: 12, keyword: 40 } as const;

/** رابطٌ مطلق آمن أو مسار رفعٍ داخلي — لا `javascript:` ولا نصٌّ حرّ */
const cleanUrl = (value: unknown): string | null => {
  const url = String(value ?? '').trim();
  if (!url) return null;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return url.slice(0, 500);
  if (/^\/?uploads\/[^\s"'<>]+$/i.test(url)) return url.slice(0, 500);
  return null;
};

/** نصٌّ في سطرٍ واحد بلا وسوم — العنوان والوصف يُحقنان في `<head>` */
const cleanText = (value: unknown, max: number): string | null => {
  const text = String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, max) : null;
};

/**
 * يُنقّي ما أرسله التاجر قبل الحفظ.
 *
 * يُرجع `null` حين تكون كل الحقول فارغة: عمودٌ فيه كائنٌ فارغ وعمودٌ فارغ
 * معناهما واحد، والثاني لا يحتاج من القارئ أن يفحص كل حقل ليعرف ذلك.
 */
export const sanitizeSeoSettings = (input: unknown): SeoSettings | null => {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const keywordsSource = Array.isArray(raw.keywords)
    ? raw.keywords
    : typeof raw.keywords === 'string'
      ? raw.keywords.split(/[,،\n]/)
      : [];
  const keywords = Array.from(
    new Set(
      keywordsSource
        .map((k) => cleanText(k, SEO_LIMITS.keyword))
        .filter((k): k is string => !!k)
    )
  ).slice(0, SEO_LIMITS.keywords);

  const settings: SeoSettings = {
    title: cleanText(raw.title, SEO_LIMITS.title),
    description: cleanText(raw.description, SEO_LIMITS.description),
    keywords,
    ogImage: cleanUrl(raw.ogImage),
    favicon: cleanUrl(raw.favicon),
    noindex: raw.noindex === true
  };

  const empty =
    !settings.title && !settings.description && keywords.length === 0 &&
    !settings.ogImage && !settings.favicon && !settings.noindex;
  return empty ? null : settings;
};

/** يقرأ العمود بأيّ شكلٍ خُزّن — نصّاً قديماً أو كائناً */
export const readSeoSettings = (value: unknown): SeoSettings => {
  if (!value) return {};
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return sanitizeSeoSettings(parsed) || {};
  } catch {
    return {};
  }
};

interface SeoBusiness {
  name: string;
  nameEn?: string | null;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  slug?: string | null;
  subdomain?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean | null;
  seoSettings?: unknown;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  keywords: string[];
  image: string | null;
  favicon: string | null;
  canonical: string;
  noindex: boolean;
  siteName: string;
}

const APP_DOMAIN = process.env.APP_DOMAIN || 'shamstores.com';

/** العنوان القانوني: النطاق الموثَّق إن وُجد، وإلا الفرعي */
export const canonicalOrigin = (business: SeoBusiness): string => {
  if (business.customDomain && business.customDomainVerified) return `https://${business.customDomain}`;
  const handle = business.subdomain || business.slug;
  return handle ? `https://${handle}.${APP_DOMAIN}` : `https://${APP_DOMAIN}`;
};

/**
 * القيم النهائية التي تُكتب في `<head>` — ما ضبطه التاجر، وإلا المشتقّ.
 *
 * مشتركة بين حمولة الواجهة (تكتبها بـ Helmet) ونقطة الـ Worker (يحقنها في
 * HTML قبل أن يصل الزاحف). مصدرٌ واحد كي لا يرى جوجل عنواناً ويرى واتساب
 * عنواناً آخر للصفحة نفسها.
 */
export const resolveBusinessSeo = (business: SeoBusiness, type: 'restaurant' | 'store'): ResolvedSeo => {
  const custom = readSeoSettings(business.seoSettings);
  const name = business.name || (type === 'restaurant' ? 'مطعم' : 'متجر');
  const fallbackTitle = type === 'restaurant' ? `${name} — القائمة الرقمية والطلب أونلاين` : `${name} — متجر إلكتروني`;
  const fallbackDescription =
    (business.description || '').trim().slice(0, SEO_LIMITS.description) ||
    (type === 'restaurant'
      ? `تصفّح قائمة ${name} واطلب أونلاين. الأسعار بالليرة السورية.`
      : `تصفّح منتجات ${name} واطلب أونلاين. الأسعار بالليرة السورية.`);

  return {
    title: custom.title || fallbackTitle,
    description: custom.description || fallbackDescription,
    keywords: custom.keywords || [],
    image: custom.ogImage || business.coverImage || business.logo || null,
    // أيقونة التبويب: ما اختاره التاجر، وإلا شعاره — لا شعار المنصّة.
    // كان تبويب متجر «ديزني» يحمل اسمه وأيقونة شام ستورز.
    favicon: custom.favicon || business.logo || null,
    canonical: `${canonicalOrigin(business)}/`,
    noindex: custom.noindex === true,
    siteName: name
  };
};

export default { sanitizeSeoSettings, readSeoSettings, resolveBusinessSeo, canonicalOrigin, SEO_LIMITS };
