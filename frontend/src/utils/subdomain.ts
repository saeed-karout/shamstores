// frontend/src/utils/subdomain.ts

/**
 * النطاق الأساسي للمنصة. كل منطق التوجيه يقاس عليه بدل عدّ أجزاء المضيف،
 * لأن العدّ كان يكسر النطاقات المخصصة: `mystore.com` (جزآن) كان يُعتبر
 * الدومين الرئيسي، و`shop.mystore.com` كان يُعتبر subdomain اسمه `shop`.
 */
export const APP_DOMAIN = (
  (import.meta as any).env?.VITE_APP_DOMAIN || 'shamstores.com'
)
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

/** المضيف الحالي بأحرف صغيرة وبدون منفذ */
export const getCurrentHost = (): string =>
  window.location.hostname.toLowerCase().replace(/\.$/, '');

const isLocalHost = (host: string): boolean =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host.endsWith('.localhost') ||
  host.endsWith('.local');

/**
 * هل نحن على نطاق مخصص لتاجر؟
 * أي مضيف ليس نطاق المنصة ولا نطاقاً فرعياً منه ولا localhost.
 */
export const isCustomDomain = (): boolean => {
  const host = getCurrentHost();
  if (!host || isLocalHost(host)) return false;
  if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) return false;
  if (host.endsWith(`.${APP_DOMAIN}`)) return false;
  // نطاقات المعاينة (Heroku/Netlify/Cloudflare) ليست نطاقات تجار
  if (/\.(herokuapp\.com|netlify\.app|pages\.dev|vercel\.app|ondigitalocean\.app)$/.test(host)) {
    return false;
  }
  return true;
};

/**
 * استخراج الـ subdomain من المضيف الحالي بالنسبة لنطاق المنصة.
 * أمثلة:
 *  - molstore.shamstores.com -> molstore
 *  - www.shamstores.com      -> null
 *  - shamstores.com          -> null
 *  - molstore.localhost:3000 -> molstore
 *  - mystore.com             -> null (نطاق مخصص، يُحل عبر الخادم)
 */
export const getCurrentSubdomain = (): string | null => {
  const host = getCurrentHost();
  if (!host) return null;

  if (isLocalHost(host)) {
    if (host === 'localhost' || host === '127.0.0.1') return null;
    const sub = host.replace(/\.(localhost|local)$/, '');
    return sub && sub !== 'www' ? sub : null;
  }

  if (host === APP_DOMAIN || host === `www.${APP_DOMAIN}`) return null;

  if (host.endsWith(`.${APP_DOMAIN}`)) {
    const sub = host.slice(0, -(APP_DOMAIN.length + 1));
    // مستوى واحد فقط: branch.shamstores.com
    if (!sub || sub === 'www' || sub.includes('.')) return null;
    return sub;
  }

  // نطاق مخصص أو نطاق معاينة — لا يوجد subdomain نستخرجه محلياً
  return null;
};

/**
 * هل نحن على الدومين الرئيسي للمنصة (الصفحة التسويقية ولوحات التحكم)؟
 * النطاق المخصص ليس الدومين الرئيسي — يجب أن يعرض واجهة المتجر.
 */
export const isMainDomain = (): boolean => {
  if (isCustomDomain()) return false;
  return getCurrentSubdomain() === null;
};

/** هل يجب أن يعرض هذا المضيف واجهة متجر عامة بدل المنصة؟ */
export const isStorefrontHost = (): boolean =>
  isCustomDomain() || getCurrentSubdomain() !== null;

/**
 * الحصول على رابط المنصة الأساسي (بدون subdomain).
 */
export const getBaseUrl = (): string => {
  const protocol = window.location.protocol;
  const host = getCurrentHost();
  const port = window.location.port ? `:${window.location.port}` : '';

  if (isLocalHost(host)) {
    const bare = host.replace(/^[^.]+\./, '');
    return `${protocol}//${bare || 'localhost'}${port}`;
  }

  if (isCustomDomain()) return `https://${APP_DOMAIN}`;

  if (host.endsWith(`.${APP_DOMAIN}`)) return `${protocol}//${APP_DOMAIN}${port}`;

  return `${protocol}//${host}${port}`;
};

/** بناء رابط نطاق فرعي كامل */
export const buildSubdomainUrl = (subdomain: string): string =>
  `https://${subdomain}.${APP_DOMAIN}`;

/**
 * التحقق من صيغة الـ subdomain.
 */
export const isValidSubdomain = (subdomain: string): boolean => {
  const value = (subdomain || '').trim().toLowerCase();
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;
  return subdomainRegex.test(value) && value.length >= 3 && value.length <= 63;
};

/** التحقق من صيغة الدومين المخصص */
export const isValidCustomDomain = (domain: string): boolean => {
  const value = (domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0];
  if (!value || value.length > 253) return false;
  if (value === APP_DOMAIN || value.endsWith(`.${APP_DOMAIN}`)) return false;
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(value);
};

/** الأسماء المحجوزة للمنصة */
export const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'cdn', 'images', 'img', 'media', 'static', 'assets',
  'auth', 'dashboard', 'app', 'mail', 'smtp', 'blog', 'help', 'support',
  'status', 'docs', 'dev', 'staging', 'test', 'demo', 'shop', 'store', 'my',
  'account', 'billing', 'pay', 'checkout', 'secure'
];

export const isReservedSubdomain = (subdomain: string): boolean =>
  RESERVED_SUBDOMAINS.includes((subdomain || '').trim().toLowerCase());
