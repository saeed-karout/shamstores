// backend/src/controllers/pwaController.ts
//
// تطبيق مثبَّت **باسم المتجر وهويته** لا باسم المنصّة.
//
// **لماذا بيانٌ لكل متجر:** الزبون يثبّت متجرَ خالد لا منصّةً يسمع بها أوّل
// مرّة. وأيقونةٌ باسم «شام ستورز» على شاشته تعني أنه لن يجدها حين يبحث عن
// المتجر، ولن يعرف أيّها إن ثبّت متجرين.
//
// **وهي ميزةٌ تُشترى:** لذلك الاستحقاق يُفحص هنا في الخادم لا في الواجهة —
// بيانٌ يُخدَم بلا فحصٍ يعني ميزةً مدفوعة تعمل مجاناً لمن يعرف رابطها.

import { Request, Response } from 'express';
import sharp from 'sharp';
import prisma from '../services/prisma';
import { businessHasEntitlement, BusinessType } from '../services/entitlement.service';

export const PWA_FEATURE = 'pwa';

interface Business {
  id: string;
  type: BusinessType;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  cardColor: string;
  mutedColor: string;
  pwaShortName: string | null;
}

/**
 * يجد النشاط بالمعرّف اللفظي.
 *
 * المطاعم أوّلاً ثمّ المتاجر — والـ`slug` فريدٌ في كلٍّ منهما على حدة، فقد
 * يتصادمان نظرياً. الترتيب ثابتٌ هنا وفي بقيّة المنصّة فلا يختلف الجواب
 * باختلاف المسار.
 */
const findBusiness = async (slug: string): Promise<Business | null> => {
  const select = {
    id: true,
    name: true,
    slug: true,
    logo: true,
    primaryColor: true,
    backgroundColor: true,
    accentColor: true,
    textColor: true,
    cardColor: true,
    mutedColor: true,
    pwaShortName: true
  } as const;

  const restaurant = await prisma.restaurant.findUnique({ where: { slug }, select });
  if (restaurant) return { ...restaurant, type: 'restaurant' };

  const store = await prisma.store.findUnique({ where: { slug }, select });
  if (store) return { ...store, type: 'store' };

  return null;
};

/**
 * نطاق التطبيق داخل الموقع.
 *
 * **على نطاقٍ خاصّ بالمتجر يكون الجذر** — متجره وحده هناك. وعلى نطاق
 * المنصّة يكون `/<slug>` لأن كل المتاجر تتشارك الأصل، وبيانٌ نطاقه `/`
 * كان سيجعل تثبيت متجرين يتعارض.
 */
const isPlatformHost = (req: Request): boolean => {
  const host = (req.hostname || '').toLowerCase();
  const platform = (process.env.APP_DOMAIN || 'shamstores.com').toLowerCase();
  return host === platform || host.endsWith(`.${platform}`) || host === 'localhost';
};

const scopeFor = (req: Request, slug: string): { scope: string; start: string } => {
  if (!isPlatformHost(req)) return { scope: '/', start: '/' };
  return { scope: `/${slug}`, start: `/${slug}` };
};

const hexOrDefault = (value: string | null | undefined, fallback: string): string =>
  /^#[0-9a-fA-F]{6}$/.test(value || '') ? (value as string) : fallback;

// ==================== البيان ====================

export const getStoreManifest = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').trim();
    const business = await findBusiness(slug);

    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط غير موجود' });
      return;
    }

    // **٤٠٤ لا بيانٌ افتراضيّ:** غياب البيان يعني أن المتصفّح لا يعرض
    // «تثبيت» أصلاً. أمّا خدمةُ بيانٍ باسم المنصّة لمن لم يشترِ فتعني
    // أيقونةً باسمنا على شاشة زبونه — وهو أسوأ من غياب الميزة.
    const entitled = await businessHasEntitlement(business.id, business.type, PWA_FEATURE);
    if (!entitled) {
      res.status(404).json({ success: false, error: 'الميزة غير مفعّلة لهذا النشاط' });
      return;
    }

    const { scope, start } = scopeFor(req, business.slug);
    const theme = hexOrDefault(business.primaryColor, '#0D4A3A');
    const background = hexOrDefault(business.backgroundColor, '#082E24');
    const base = `/api/public/${encodeURIComponent(business.slug)}/pwa-icon`;

    const manifest = {
      // `id` ثابتٌ ومستقلّ عن `start_url`: تغييرُ الأخير لاحقاً كان
      // سيجعل المتصفّح يعدّ التطبيق تطبيقاً جديداً فيفقد الزبون تثبيته
      id: `/${business.slug}?pwa`,
      name: business.name,
      // ما كتبه التاجر إن كتب — والقطع الآليّ آخرَ حلّ لا أوّله
      short_name: (business.pwaShortName || business.name).slice(0, 24),
      description: `اطلب من ${business.name} وتابع طلبك.`,
      lang: 'ar',
      dir: 'rtl',
      start_url: `${start}?source=pwa`,
      scope,
      display: 'standalone',
      orientation: 'portrait',
      background_color: background,
      theme_color: theme,
      icons: [
        { src: `${base}/192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${base}/512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${base}/maskable-192.png`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: `${base}/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    // ساعةٌ لا سنة: التاجر يغيّر شعاره أو اسمه، وبيانٌ مخزَّن طويلاً يترك
    // التطبيق المثبَّت على هوية قديمة بلا سبيلٍ لتصحيحها
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(manifest);
  } catch (error) {
    console.error('getStoreManifest failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر توليد البيان' });
  }
};

// ==================== الأيقونات ====================

/** يجلب الشعار من مخزنه — بمهلةٍ قصيرة فلا يعلّق الطلب على مخزنٍ بطيء */
const fetchLogo = async (url: string): Promise<Buffer | null> => {
  try {
    const absolute = /^https?:\/\//i.test(url)
      ? url
      : `${process.env.R2_PUBLIC_URL || ''}/${url.replace(/^\/+/, '')}`;
    if (!/^https?:\/\//i.test(absolute)) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(absolute, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length > 0 ? buffer : null;
  } catch (error) {
    console.warn('fetchLogo failed:', error instanceof Error ? error.message : error);
    return null;
  }
};

/**
 * أيقونةٌ من الحرف الأوّل — حين لا شعار للمتجر.
 *
 * **البديل ليس «بلا أيقونة»:** المتصفّح يشترط أيقونةً ٥١٢ ليعرض التثبيت
 * أصلاً. فمتجرٌ لم يرفع شعاراً كان سيشتري الميزة ولا يجدها تعمل، بلا أن
 * يُقال له لماذا.
 */
const letterIcon = (name: string, size: number, bg: string, fg: string): Buffer => {
  const letter = (Array.from(name.trim())[0] || '؟')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <text x="50%" y="50%" dy=".35em" text-anchor="middle"
      font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
      font-size="${Math.round(size * 0.5)}" font-weight="700" fill="${fg}">${letter}</text>
  </svg>`;
  return Buffer.from(svg);
};

export const getStoreIcon = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').trim();
    const file = String(req.params.file || '');

    const match = /^(maskable-)?(192|512)\.png$/.exec(file);
    if (!match) {
      res.status(404).json({ success: false, error: 'أيقونة غير معروفة' });
      return;
    }
    const maskable = Boolean(match[1]);
    const size = Number(match[2]);

    const business = await findBusiness(slug);
    if (!business) {
      res.status(404).json({ success: false, error: 'النشاط غير موجود' });
      return;
    }

    const entitled = await businessHasEntitlement(business.id, business.type, PWA_FEATURE);
    if (!entitled) {
      res.status(404).json({ success: false, error: 'الميزة غير مفعّلة' });
      return;
    }

    const bg = hexOrDefault(business.primaryColor, '#0D4A3A');
    const logo = business.logo ? await fetchLogo(business.logo) : null;

    let png: Buffer;

    if (logo) {
      // **المقنَّعة تُصغَّر إلى ٦٠٪ داخل خلفية مصمتة:** أندرويد يقتطعها
      // دائرةً أو معيّناً، وشعارٌ يملأ المربّع تُقصّ أطرافه. والعادية
      // تُحاط بخلفيةٍ أيضاً لأن شعاراً شفّافاً يختفي على خلفية داكنة.
      const inner = maskable ? Math.round(size * 0.6) : Math.round(size * 0.78);

      const resized = await sharp(logo, { density: 400 })
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      png = await sharp({
        create: { width: size, height: size, channels: 4, background: bg }
      })
        .composite([{ input: resized, gravity: 'center' }])
        .png()
        .toBuffer();
    } else {
      // **بديل الحرف يُرسَم بمقاسه النهائي مباشرةً — بلا تصغيرٍ ثانٍ.**
      //
      // تمريره في مسار الشعار كان يُصغّره مرّتين: حجم خطٍّ نصفُ اللوحة، ثمّ
      // تصغيرٌ إلى ٧٨٪ — فيخرج الحرف بثلث الأيقونة تقريباً، تائهاً في
      // مربّعٍ فارغ. وهو أصلاً يحمل خلفيته وحوافه الصحيحة.
      png = await sharp(letterIcon(business.name, size, bg, '#FFFFFF'), { density: 400 })
        .png()
        .toBuffer();
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (error) {
    console.error('getStoreIcon failed:', error);
    res.status(500).json({ success: false, error: 'تعذّر توليد الأيقونة' });
  }
};

/**
 * هل لهذا النشاط تطبيقٌ خاصّ؟ — تقرؤها الواجهة لتقرّر عرض دعوة التثبيت.
 *
 * منفذٌ منفصل عن البيان لأن الواجهة تحتاج الجواب **قبل** أن تحقن الوسم،
 * ولأن ٤٠٤ على البيان يظهر خطأً في وحدة تحكّم المتصفّح لكل متجرٍ لم يشترِ.
 */
export const getPwaStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const business = await findBusiness(String(req.params.slug || '').trim());
    if (!business) {
      res.json({ success: true, data: { enabled: false } });
      return;
    }

    const enabled = await businessHasEntitlement(business.id, business.type, PWA_FEATURE);
    // الهوية تُرسل مع الحالة: نافذة التثبيت تُرسم بألوان المتجر لا
    // بألوان المنصّة، وطلبٌ ثانٍ لجلبها كان سيؤخّر ظهورها
    res.json({
      success: true,
      data: {
        enabled,
        name: enabled ? business.name : null,
        shortName: enabled ? business.pwaShortName || null : null,
        themeColor: enabled ? hexOrDefault(business.primaryColor, '#0D4A3A') : null,
        theme: enabled
          ? {
              primary: hexOrDefault(business.primaryColor, '#0D4A3A'),
              background: hexOrDefault(business.backgroundColor, '#082E24'),
              accent: hexOrDefault(business.accentColor, '#C8E235'),
              text: hexOrDefault(business.textColor, '#E8F5E9'),
              card: hexOrDefault(business.cardColor, '#112E23'),
              muted: hexOrDefault(business.mutedColor, '#9DC4AC')
            }
          : null
      }
    });
  } catch (error) {
    console.error('getPwaStatus failed:', error);
    res.json({ success: true, data: { enabled: false } });
  }
};

export default { getStoreManifest, getStoreIcon, getPwaStatus };
