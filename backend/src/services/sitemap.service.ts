// backend/src/services/sitemap.service.ts
//
// خريطة الموقع — تُبنى من قاعدة البيانات لا من ملف ثابت.
//
// واجهات التجّار هي معظم محتوى المنصة القابل للفهرسة، وهي تتغيّر يومياً:
// ملف ثابت يصير قديماً بعد أول متجر جديد. ولأن التطبيق يُصيَّر في المتصفح،
// لا تجد الزواحف روابط الواجهات بالتنقّل — الخريطة هي طريقها الوحيد إليها.
//
// المتاجر الموقوفة لا تُدرَج: رابط يُرجع صفحة «غير موجود» في الخريطة يُنقص
// ثقة الزاحف بها كلها.

import prisma from './prisma';

const SITE = 'https://shamstores.com';

/** صفحات المنصة الثابتة وأولويتها النسبية */
const STATIC_PAGES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/register', priority: '0.9', changefreq: 'monthly' },
  { path: '/user/login', priority: '0.5', changefreq: 'monthly' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'monthly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' }
];

/** الحد الأقصى لروابط ملف واحد في معيار sitemap هو ٥٠ ألفاً */
const MAX_URLS = 45000;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const urlEntry = (loc: string, lastmod?: Date | null, changefreq = 'weekly', priority = '0.8') =>
  [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ]
    .filter(Boolean)
    .join('\n');

export const buildSitemap = async (): Promise<string> => {
  const entries: string[] = STATIC_PAGES.map(({ path, priority, changefreq }) =>
    urlEntry(`${SITE}${path}`, null, changefreq, priority)
  );

  try {
    const [restaurants, stores] = await Promise.all([
      prisma.restaurant.findMany({
        where: { isActive: true },
        select: { slug: true, subdomain: true, updatedAt: true },
        take: MAX_URLS / 2
      }),
      prisma.store.findMany({
        where: { isActive: true },
        select: { slug: true, subdomain: true, updatedAt: true },
        take: MAX_URLS / 2
      })
    ]);

    for (const business of [...restaurants, ...stores]) {
      const handle = business.subdomain || business.slug;
      if (!handle) continue;
      // النطاق الفرعي هو العنوان القانوني للواجهة — وهو ما يضعه التاجر في
      // إعلاناته، فالفهرسة عليه لا على مسار فرعي في النطاق الرئيسي
      entries.push(urlEntry(`https://${handle}.shamstores.com/`, business.updatedAt, 'daily', '0.7'));
    }
  } catch (error) {
    // خريطة بالصفحات الثابتة خير من خطأ ٥٠٠ يجعل الزاحف يهجرها
    console.error('تعذّر إدراج واجهات التجّار في خريطة الموقع:', error);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</urlset>'
  ].join('\n');
};

export default { buildSitemap };
