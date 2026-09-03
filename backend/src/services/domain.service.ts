// backend/src/services/domain.service.ts
// حلّ النطاقات: subdomain، النطاق المخصص (custom domain)، والتحقق من DNS

import dns from 'dns';
import prisma from './prisma';
import env from '../config/env';

const resolver = dns.promises;

export type BusinessType = 'restaurant' | 'store';

export interface ResolvedBusiness {
  type: BusinessType;
  id: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  data: any;
}

// ==================== أسماء محجوزة ====================

/** لا يجوز لتاجر أن يحجزها كـ subdomain */
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'cdn', 'images', 'img', 'media', 'static', 'assets',
  'auth', 'dashboard', 'app', 'mail', 'smtp', 'ftp', 'ns1', 'ns2', 'blog',
  'help', 'support', 'status', 'docs', 'dev', 'staging', 'test', 'demo',
  'shop', 'store', 'my', 'account', 'billing', 'pay', 'checkout', 'secure'
]);

/** مسارات الواجهة التي يجب ألا تُفسَّر كمعرّف نشاط تجاري */
export const RESERVED_PATHS = new Set([
  'terms', 'privacy', 'about', 'faq', 'contact',
  'login', 'register', 'dashboard', 'admin', 'user', 'track', 'api'
]);

export const isReservedSubdomain = (subdomain: string): boolean =>
  RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());

// ==================== تطبيع النطاقات ====================

/** يزيل البروتوكول والمنفذ والمسار و www. ويُرجع المضيف بأحرف صغيرة */
export const normalizeDomain = (input?: string | null): string => {
  if (!input) return '';
  let host = String(input).trim().toLowerCase();
  host = host.replace(/^[a-z]+:\/\//, '');
  host = host.split('/')[0];
  host = host.split('?')[0];
  host = host.split(':')[0];
  host = host.replace(/\.$/, '');
  return host;
};

/** يزيل بادئة www. للمقارنة */
export const stripWww = (host: string): string =>
  host.startsWith('www.') ? host.slice(4) : host;

/**
 * تحقق صارم من صيغة النطاق المخصص.
 * يرفض: النطاقات المحلية، عناوين IP، نطاقات المنصة نفسها، والنطاقات العامة الشهيرة.
 */
const DOMAIN_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

const BLOCKED_DOMAIN_SUFFIXES = [
  'localhost', 'local', 'internal', 'test', 'example', 'invalid',
  'google.com', 'gmail.com', 'facebook.com', 'apple.com', 'microsoft.com',
  'amazon.com', 'cloudflare.com', 'herokuapp.com', 'vercel.app', 'netlify.app',
  'github.io', 'pages.dev', 'ondigitalocean.app'
];

export interface DomainValidationResult {
  valid: boolean;
  domain: string;
  error?: string;
}

export const validateCustomDomain = (input: string): DomainValidationResult => {
  const domain = normalizeDomain(input);

  if (!domain) {
    return { valid: false, domain, error: 'الرجاء إدخال الدومين' };
  }
  if (domain.length > 253) {
    return { valid: false, domain, error: 'الدومين طويل جداً' };
  }
  if (!DOMAIN_REGEX.test(domain)) {
    return { valid: false, domain, error: 'صيغة الدومين غير صالحة. مثال صحيح: mystore.com' };
  }
  // منع عناوين IP
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return { valid: false, domain, error: 'لا يمكن استخدام عنوان IP كدومين' };
  }
  // منع نطاق المنصة نفسه — وإلا أمكن اختطاف نطاقات المنصة
  const appDomain = env.APP_DOMAIN.toLowerCase();
  if (domain === appDomain || domain.endsWith(`.${appDomain}`)) {
    return { valid: false, domain, error: `لا يمكن استخدام نطاق فرعي من ${appDomain} كدومين مخصص` };
  }
  const bare = stripWww(domain);
  if (BLOCKED_DOMAIN_SUFFIXES.some((s) => bare === s || bare.endsWith(`.${s}`))) {
    return { valid: false, domain, error: 'هذا الدومين غير مسموح به' };
  }
  if (bare.split('.').length < 2) {
    return { valid: false, domain, error: 'صيغة الدومين غير صالحة' };
  }

  return { valid: true, domain };
};

// ==================== تعليمات DNS ====================

export interface DnsInstructions {
  targetDomain: string;
  verificationCode: string;
  instructions: {
    cname: { type: 'CNAME'; name: string; value: string; ttl: number };
    txt: { type: 'TXT'; name: string; value: string; ttl: number };
  };
}

export const buildDnsInstructions = (
  subdomain: string | null,
  verificationCode: string,
  customDomain?: string | null
): DnsInstructions => {
  const target = subdomain ? `${subdomain}.${env.APP_DOMAIN}` : env.APP_DOMAIN;
  const bare = customDomain ? stripWww(normalizeDomain(customDomain)) : '';
  const isWww = customDomain ? normalizeDomain(customDomain).startsWith('www.') : false;

  return {
    targetDomain: target,
    verificationCode,
    instructions: {
      cname: {
        type: 'CNAME',
        // إذا كان الدومين المطلوب www.example.com فالسجل باسم www، وإلا فالجذر (@)
        name: isWww ? 'www' : '@',
        value: target,
        ttl: 3600
      },
      txt: {
        type: 'TXT',
        name: bare ? '_shamstores-verify' : '_shamstores-verify',
        value: verificationCode,
        ttl: 3600
      }
    }
  };
};

export const generateVerificationCode = (): string => {
  const random = Array.from({ length: 24 }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
  return `shamstores-verify=${random}`;
};

// ==================== التحقق الفعلي من DNS ====================

export interface DnsVerificationResult {
  txtVerified: boolean;
  cnameVerified: boolean;
  aVerified: boolean;
  foundTxt: string[];
  foundCname: string[];
  error?: string;
}

/**
 * تحقق حقيقي من سجلات DNS.
 * سجل TXT على `_shamstores-verify.<domain>` هو الإثبات الملزم لملكية النطاق؛
 * سجل CNAME/A مطلوب فقط ليصل الزوار فعلياً إلى المنصة.
 */
export const verifyDomainDns = async (
  customDomain: string,
  verificationCode: string,
  subdomain: string | null
): Promise<DnsVerificationResult> => {
  const domain = normalizeDomain(customDomain);
  const bare = stripWww(domain);
  const target = subdomain ? `${subdomain}.${env.APP_DOMAIN}` : env.APP_DOMAIN;

  const result: DnsVerificationResult = {
    txtVerified: false,
    cnameVerified: false,
    aVerified: false,
    foundTxt: [],
    foundCname: []
  };

  // 1) سجل TXT — إثبات الملكية
  for (const name of [`_shamstores-verify.${bare}`, bare]) {
    try {
      const records = await resolver.resolveTxt(name);
      const flat = records.map((r) => r.join('').trim());
      result.foundTxt.push(...flat);
      if (flat.some((r) => r === verificationCode || r === `verification=${verificationCode}`)) {
        result.txtVerified = true;
        break;
      }
    } catch {
      // السجل غير موجود بعد — نتابع
    }
  }

  // 2) سجل CNAME — يوجّه الزوار إلى المنصة
  try {
    const cnames = await resolver.resolveCname(domain);
    result.foundCname = cnames.map((c) => c.toLowerCase().replace(/\.$/, ''));
    result.cnameVerified = result.foundCname.some(
      (c) => c === target.toLowerCase() || c.endsWith(`.${env.APP_DOMAIN.toLowerCase()}`)
    );
  } catch {
    // قد يكون الجذر يستخدم سجل A بدل CNAME (قيود apex)
  }

  // 3) سجل A كبديل مقبول للجذر
  if (!result.cnameVerified) {
    try {
      const platformIps = await resolver.resolve4(target).catch(() => [] as string[]);
      const domainIps = await resolver.resolve4(domain);
      result.aVerified = domainIps.length > 0 && platformIps.some((ip) => domainIps.includes(ip));
    } catch {
      // لا سجل A
    }
  }

  return result;
};

// ==================== حل النشاط التجاري من المضيف ====================

const SELECT_FIELDS = {
  id: true,
  name: true,
  slug: true,
  subdomain: true,
  customDomain: true,
  customDomainVerified: true,
  isActive: true
} as const;

/** ذاكرة مؤقتة قصيرة العمر — يُستدعى هذا في كل طلب */
const cache = new Map<string, { value: ResolvedBusiness | null; expires: number }>();
const CACHE_TTL_MS = 60 * 1000;

export const invalidateDomainCache = (host?: string) => {
  if (!host) {
    cache.clear();
    return;
  }
  const normalized = normalizeDomain(host);
  cache.delete(normalized);
  cache.delete(stripWww(normalized));
  cache.delete(`www.${stripWww(normalized)}`);
};

/**
 * يبحث عن نشاط تجاري بنطاق مخصص موثّق فقط.
 * النطاق غير الموثّق لا يُخدَم إطلاقاً — وإلا أمكن انتحال نطاق أي جهة.
 */
export const resolveBusinessByCustomDomain = async (
  hostInput: string
): Promise<ResolvedBusiness | null> => {
  const host = normalizeDomain(hostInput);
  if (!host) return null;

  const cached = cache.get(host);
  if (cached && cached.expires > Date.now()) return cached.value;

  const candidates = Array.from(new Set([host, stripWww(host), `www.${stripWww(host)}`]));

  let resolved: ResolvedBusiness | null = null;

  const restaurant = await prisma.restaurant.findFirst({
    where: {
      customDomain: { in: candidates },
      customDomainVerified: true,
      isActive: true
    },
    select: SELECT_FIELDS
  });

  if (restaurant) {
    resolved = {
      type: 'restaurant',
      id: restaurant.id,
      slug: restaurant.slug,
      subdomain: restaurant.subdomain,
      customDomain: restaurant.customDomain,
      data: restaurant
    };
  } else {
    const store = await prisma.store.findFirst({
      where: {
        customDomain: { in: candidates },
        customDomainVerified: true,
        isActive: true
      },
      select: SELECT_FIELDS
    });

    if (store) {
      resolved = {
        type: 'store',
        id: store.id,
        slug: store.slug,
        subdomain: store.subdomain,
        customDomain: store.customDomain,
        data: store
      };
    }
  }

  cache.set(host, { value: resolved, expires: Date.now() + CACHE_TTL_MS });
  return resolved;
};

/** يتحقق ما إذا كان المضيف نطاقاً مخصصاً موثّقاً (يُستخدم في CORS) */
export const isVerifiedCustomDomain = async (hostInput: string): Promise<boolean> => {
  return (await resolveBusinessByCustomDomain(hostInput)) !== null;
};

/**
 * يستخرج الـ subdomain من المضيف بالنسبة لنطاق المنصة.
 * لا يعتمد على عدد الأجزاء فقط — هذا كان يكسر النطاقات المخصصة.
 */
export const extractSubdomainFromHost = (hostInput: string): string | null => {
  const host = normalizeDomain(hostInput);
  if (!host) return null;

  const appDomain = env.APP_DOMAIN.toLowerCase();

  // التطوير المحلي: sub.localhost
  if (host === 'localhost' || host === '127.0.0.1') return null;
  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    return sub && sub !== 'www' ? sub : null;
  }

  if (host === appDomain || host === `www.${appDomain}`) return null;

  if (host.endsWith(`.${appDomain}`)) {
    const sub = host.slice(0, -(appDomain.length + 1));
    // ندعم مستوى واحد فقط: branch.shamstores.com
    if (!sub || sub === 'www' || sub.includes('.')) return null;
    return sub;
  }

  return null;
};
