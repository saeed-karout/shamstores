// backend/src/services/souq.service.ts
//
// «سوق شام ستورز» — دليلٌ عامّ يجلب الزبائن إلى التجّار.
//
// **لماذا يوجد:** المنافس يبيع أدوات فقط؛ التاجر يدفع ثمّ عليه أن يجد زبائنه
// وحده. السوق يجعل الاشتراك مصدر زبائن: من يبحث عن «آيفون ١٣» في حلب يجد
// المتاجر التي تبيعه، وينتقل إلى واجهة التاجر نفسها ليطلب — لا سلّة مشتركة
// ولا وسيط بين الزبون والتاجر.
//
// **وقاعدة الإنتاج بعشرة اتصالات فقط** (راجع ذاكرة المشروع). لذلك:
//   - الدليل كلّه لقطةٌ واحدة في الذاكرة تُبنى كل خمس دقائق بأربعة استعلامات
//     تجميع **متتالية لا متوازية** — لا استعلامٌ لكل متجر، ولا Promise.all
//     يحجز أربعة اتصالات دفعةً واحدة.
//   - التصفية بالمحافظة والتصنيف والترقيم تجري على اللقطة في الذاكرة.
//   - البحث عن منتج استعلامان (منتجات + أصناف مطاعم) ثمّ جلبٌ بالمعرّفات،
//     ونتيجته تُخزَّن دقيقةً لكل عبارة.
//   - طلبان متزامنان لنفس المفتاح ينتظران الوعد نفسه — لا يبني كلٌّ لقطته.
//
// **ومن يظهر:** النشاط المفعّل (`isActive`) الذي لم يُطفئ الظهور صراحةً،
// وله معروضٌ واحد متاح على الأقل. الموقوف لا يظهر، ولا صنفٌ موقوف
// (`isAvailable = false`) — تماماً كما تفعل واجهته.

import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { canonicalOrigin } from './seo.service';
import { GOVERNORATES, governorateName, isGovernorate } from '../config/syria';
import {
  SOUQ_CATEGORIES,
  SOUQ_WEIGHTS,
  SOUQ_ORDERS_WINDOW_DAYS,
  SOUQ_MIN_ITEMS,
  defaultSouqCategory,
  isSouqCategory
} from '../config/souq';
import { tokenize, tokenClause, scoreOf } from '../controllers/searchController';

export type SouqKind = 'store' | 'restaurant';

export interface SouqBusiness {
  id: string;
  type: SouqKind;
  name: string;
  nameEn: string | null;
  description: string | null;
  slug: string;
  subdomain: string | null;
  /** يُرسَل فقط إن كان موثَّقاً — غير الموثَّق لا يُخدَم أصلاً */
  customDomain: string | null;
  /** الرابط العامّ القانونيّ — نطاق التاجر ثمّ فرعيّه */
  url: string;
  logo: string | null;
  coverImage: string | null;
  governorate: string | null;
  governorateName: string | null;
  category: string;
  categoryName: string;
  verified: boolean;
  paid: boolean;
  itemCount: number;
  recentOrders: number;
  ratingAvg: number;
  ratingCount: number;
  score: number;
  createdAt: Date;
}

// ==================== ذاكرة مؤقّتة صغيرة ====================

const DIRECTORY_TTL_MS = 5 * 60 * 1000;
const SEARCH_TTL_MS = 60 * 1000;
const SEARCH_CACHE_MAX = 150;

let directory: { at: number; list: SouqBusiness[] } | null = null;
let directoryInflight: Promise<SouqBusiness[]> | null = null;

const searchCache = new Map<string, { at: number; value: Promise<SouqProductCard[]> }>();

/** يُمسح حين يغيّر تاجرٌ ظهوره — كي يرى أثر ضغطته فوراً لا بعد خمس دقائق */
export const invalidateSouqCache = (): void => {
  directory = null;
  searchCache.clear();
};

// ==================== الترتيب ====================

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * درجة النشاط — كل مكوّنٍ منها مشروحٌ في config/souq.ts وعلى الصفحة.
 * لا عشوائية ولا «ممَوَّل» مخفيّ: الدرجة نفسها لنفس المعطيات دائماً.
 */
const scoreBusiness = (b: Omit<SouqBusiness, 'score'> & { updatedAt: Date }): number => {
  const W = SOUQ_WEIGHTS;
  const orders = W.recentOrders * clamp01(Math.log10(1 + b.recentOrders) / 2); // ١٠٠ طلب = الوزن كاملاً
  // متوسّطٌ مرجَّح بعدده: ثلاثة تقييماتٍ بخمس نجوم لا تسبق عشرين بأربع ونصف
  const reviews = b.ratingCount > 0 ? W.reviews * clamp01((b.ratingAvg - 2) / 3) * clamp01(b.ratingCount / 20) : 0;
  const completeness =
    W.completeness *
    ((b.logo ? 0.3 : 0) + (b.coverImage ? 0.2 : 0) + (b.description ? 0.15 : 0) + 0.35 * clamp01(b.itemCount / 20));
  const ageDays = (Date.now() - new Date(b.updatedAt).getTime()) / 86400000;
  const freshness = W.freshness * clamp01(1 - ageDays / 60);
  const total =
    (b.paid ? W.paidPlan : 0) + orders + reviews + completeness + freshness + (b.verified ? W.verified : 0);
  return Math.round(total * 10) / 10;
};

/** يقرأ شارة «موثَّق» إن كانت موجودة في المخطّط — تُضاف في عملٍ موازٍ */
const readVerified = (row: any): boolean =>
  row?.verified === true || row?.isVerified === true || (row?.verifiedAt != null && row?.verifiedAt !== false);

const isPaid = (row: { plan?: { price?: number | null } | null; subscriptionEnd?: Date | null }): boolean => {
  if (!row.plan || !(Number(row.plan.price) > 0)) return false;
  // اشتراكٌ منتهٍ لا يُعدّ مدفوعاً — الأولوية لمن يدفع الآن
  return !row.subscriptionEnd || new Date(row.subscriptionEnd).getTime() > Date.now();
};

/**
 * الأعمدة الثقيلة التي لا يحتاجها الدليل — تُستثنى بدل أن تُسمّى الأعمدة
 * المطلوبة واحداً واحداً، لسببٍ واحد: شارة «موثَّق» يضيفها عملٌ آخر، وقراءتها
 * بلا `select` صريح تجعلها تظهر هنا حين تُضاف بلا تعديل هذا الملف.
 */
const HEAVY_OMIT = {
  storefrontDesign: true,
  deliverySettings: true,
  paymentSettings: true,
  enabledLanguages: true,
  enabledCurrencies: true,
  automations: true,
  seoSettings: true,
  trackingSettings: true
} as const;

const shortText = (value?: string | null, max = 180): string | null => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`;
};

const buildDirectory = async (): Promise<SouqBusiness[]> => {
  const listedWhere = { isActive: true, OR: [{ souqListed: null }, { souqListed: true }] };
  const planSelect = { select: { price: true, slug: true } };

  // متتالية عمداً — راجع رأس الملف
  const stores = await prisma.store.findMany({
    where: listedWhere,
    omit: { ...HEAVY_OMIT, notificationSettings: true },
    include: { plan: planSelect }
  } as any);
  const restaurants = await prisma.restaurant.findMany({
    where: listedWhere,
    omit: HEAVY_OMIT,
    include: { plan: planSelect }
  } as any);

  if (stores.length === 0 && restaurants.length === 0) return [];

  const productStats = await prisma.$queryRaw<Array<{ storeId: string; n: bigint; rc: any; rs: any }>>`
    SELECT storeId, COUNT(*) AS n, SUM(ratingCount) AS rc, SUM(ratingAvg * ratingCount) AS rs
    FROM \`Product\` WHERE isAvailable = 1 GROUP BY storeId`;
  const menuStats = await prisma.$queryRaw<Array<{ restaurantId: string; n: bigint }>>`
    SELECT restaurantId, COUNT(*) AS n FROM \`MenuItem\` WHERE isAvailable = 1 GROUP BY restaurantId`;

  // الطلبات الأخيرة لكل نشاط، وتقييمات طلبات المطعم (للمطعم لا تقييم منتجات)
  const since = new Date(Date.now() - SOUQ_ORDERS_WINDOW_DAYS * 86400000);
  const ratingSince = new Date(Date.now() - 180 * 86400000);
  const orderStats = await prisma.$queryRaw<
    Array<{ storeId: string | null; restaurantId: string | null; recent: any; rc: any; rs: any }>
  >`
    SELECT storeId, restaurantId,
      SUM(CASE WHEN createdAt >= ${since} THEN 1 ELSE 0 END) AS recent,
      SUM(CASE WHEN rating > 0 THEN 1 ELSE 0 END) AS rc,
      SUM(CASE WHEN rating > 0 THEN rating ELSE 0 END) AS rs
    FROM \`Order\`
    WHERE createdAt >= ${ratingSince} AND status <> 'cancelled'
    GROUP BY storeId, restaurantId`;

  const num = (v: unknown) => Number(v ?? 0) || 0;
  const pStats = new Map(productStats.map((r) => [r.storeId, r]));
  const mStats = new Map(menuStats.map((r) => [r.restaurantId, num(r.n)]));
  const oStats = new Map<string, { recent: number; rc: number; rs: number }>();
  for (const row of orderStats) {
    const key = row.storeId || row.restaurantId;
    if (!key) continue;
    const prev = oStats.get(key) || { recent: 0, rc: 0, rs: 0 };
    oStats.set(key, { recent: prev.recent + num(row.recent), rc: prev.rc + num(row.rc), rs: prev.rs + num(row.rs) });
  }

  const out: SouqBusiness[] = [];
  const push = (row: any, type: SouqKind) => {
    const o = oStats.get(row.id) || { recent: 0, rc: 0, rs: 0 };
    let itemCount: number;
    let ratingCount: number;
    let ratingAvg: number;
    if (type === 'store') {
      const p = pStats.get(row.id);
      itemCount = num(p?.n);
      ratingCount = num(p?.rc);
      ratingAvg = ratingCount > 0 ? num(p?.rs) / ratingCount : 0;
    } else {
      itemCount = mStats.get(row.id) || 0;
      ratingCount = o.rc;
      ratingAvg = o.rc > 0 ? o.rs / o.rc : 0;
    }
    if (itemCount < SOUQ_MIN_ITEMS) return;

    const category = isSouqCategory(row.souqCategory) ? row.souqCategory : defaultSouqCategory(type);
    const governorate = isGovernorate(row.souqGovernorate) ? row.souqGovernorate : null;
    const verifiedDomain = row.customDomain && row.customDomainVerified ? row.customDomain : null;
    const base = {
      id: row.id,
      type,
      name: row.name,
      nameEn: row.nameEn || null,
      description: shortText(row.description),
      slug: row.slug,
      subdomain: row.subdomain || null,
      customDomain: verifiedDomain,
      url: `${canonicalOrigin({ ...row, customDomain: verifiedDomain, customDomainVerified: !!verifiedDomain })}/`,
      logo: row.logo || null,
      coverImage: row.coverImage || null,
      governorate,
      governorateName: governorate ? governorateName(governorate) : null,
      category,
      categoryName: SOUQ_CATEGORIES.find((c) => c.code === category)?.name || category,
      verified: readVerified(row),
      paid: isPaid(row),
      itemCount,
      recentOrders: o.recent,
      ratingAvg: Math.round(ratingAvg * 10) / 10,
      ratingCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
    const { updatedAt: _u, ...business } = base;
    out.push({ ...business, score: scoreBusiness(base) });
  };

  for (const row of stores) push(row, 'store');
  for (const row of restaurants) push(row, 'restaurant');

  // تعادل الدرجات يُحسم بالأقدم على المنصّة — ثابتٌ بين الزيارات لا يقفز
  out.sort((a, b) => b.score - a.score || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return out;
};

export const getDirectory = async (): Promise<SouqBusiness[]> => {
  if (directory && Date.now() - directory.at < DIRECTORY_TTL_MS) return directory.list;
  if (directoryInflight) return directoryInflight;
  directoryInflight = buildDirectory()
    .then((list) => {
      directory = { at: Date.now(), list };
      return list;
    })
    .catch((error) => {
      // لقطةٌ قديمة خيرٌ من خطأ — والقاعدة المختنقة لا تُطرق مرّةً أخرى فوراً
      console.error('تعذّر بناء دليل السوق:', error);
      if (directory) {
        directory = { at: Date.now() - DIRECTORY_TTL_MS + 30_000, list: directory.list };
        return directory.list;
      }
      throw error;
    })
    .finally(() => {
      directoryInflight = null;
    });
  return directoryInflight;
};

// ==================== تصفّح المتاجر ====================

export interface DirectoryFilter {
  governorate?: string | null;
  category?: string | null;
  type?: SouqKind | null;
  q?: string | null;
}

const norm = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();

export const filterDirectory = (list: SouqBusiness[], f: DirectoryFilter): SouqBusiness[] => {
  const q = norm(f.q);
  return list.filter(
    (b) =>
      (!f.governorate || b.governorate === f.governorate) &&
      (!f.category || b.category === f.category) &&
      (!f.type || b.type === f.type) &&
      (!q || norm(b.name).includes(q) || norm(b.nameEn).includes(q) || norm(b.description).includes(q))
  );
};

/** عدّاد كل محافظة وتصنيف — كي لا يضغط الزبون فلتراً يُرجع صفحةً فارغة */
export const facetsOf = (list: SouqBusiness[]) => {
  const governorates: Record<string, number> = {};
  const categories: Record<string, number> = {};
  for (const b of list) {
    if (b.governorate) governorates[b.governorate] = (governorates[b.governorate] || 0) + 1;
    categories[b.category] = (categories[b.category] || 0) + 1;
  }
  return { governorates, categories, total: list.length };
};

/** ما يُرسَل للزائر — بلا الدرجة الخام وتاريخ الإنشاء */
export const publicBusiness = (b: SouqBusiness) => {
  const { score: _s, createdAt: _c, ...rest } = b;
  return rest;
};

// ==================== البحث عن منتج عبر المتاجر ====================

export interface SouqProductCard {
  id: string;
  kind: 'product' | 'menuItem';
  name: string;
  nameEn: string | null;
  price: number;
  originalPrice: number | null;
  image: string | null;
  soldOut: boolean;
  comingSoon: boolean;
  ratingAvg: number;
  ratingCount: number;
  business: Pick<
    SouqBusiness,
    'id' | 'type' | 'name' | 'slug' | 'subdomain' | 'customDomain' | 'url' | 'logo' | 'verified' | 'governorateName'
  >;
}

const CANDIDATE_CAP = 400;

const firstImage = (imageUrl: unknown, images: unknown): string | null => {
  if (typeof imageUrl === 'string' && imageUrl) return imageUrl;
  if (Array.isArray(images) && typeof images[0] === 'string') return images[0];
  return null;
};

const businessRef = (b: SouqBusiness): SouqProductCard['business'] => ({
  id: b.id,
  type: b.type,
  name: b.name,
  slug: b.slug,
  subdomain: b.subdomain,
  customDomain: b.customDomain,
  url: b.url,
  logo: b.logo,
  verified: b.verified,
  governorateName: b.governorateName
});

/**
 * يرتّب النتائج بالصلة أوّلاً ثمّ بقوّة النشاط، ثمّ يمنع احتكار الصفحة.
 *
 * - الصلة من `scoreOf` نفسها التي يرتّب بها بحث المتجر.
 * - درجة النشاط تضيف حتى ١٠ نقاط — تحسم بين متساويين، ولا تقلب مطابقةً
 *   تامّة لصالح متجرٍ أكبر.
 * - النافد يتأخّر (يبقى ظاهراً — ربما يعود، وربما يطلبه الزبون من متجرٍ
 *   آخر في النتائج نفسها)، والقادم «قريباً» بعده بقليل.
 * - كل نتيجةٍ إضافية من المتجر نفسه تخسر ٢٥ نقطة: متجرٌ بثلاثمئة «شاحن»
 *   لا يملأ الصفحة الأولى ويُخفي الباقين.
 */
const rankCards = (
  rows: Array<{ card: SouqProductCard; relevance: number; businessScore: number }>
): SouqProductCard[] => {
  const scored = rows
    .map((r) => ({
      ...r,
      total:
        r.relevance +
        Math.min(10, r.businessScore / 10) -
        (r.card.soldOut ? 150 : 0) -
        (r.card.comingSoon ? 60 : 0)
    }))
    .sort((a, b) => b.total - a.total);

  const seen = new Map<string, number>();
  return scored
    .map((r) => {
      const n = seen.get(r.card.business.id) || 0;
      seen.set(r.card.business.id, n + 1);
      return { ...r, total: r.total - n * 25 };
    })
    .sort((a, b) => b.total - a.total)
    .map((r) => r.card);
};

const runProductSearch = async (tokens: string[], phrase: string, eligible: SouqBusiness[]): Promise<SouqProductCard[]> => {
  const byId = new Map(eligible.map((b) => [b.id, b]));
  const storeIds = eligible.filter((b) => b.type === 'store').map((b) => b.id);
  const restaurantIds = eligible.filter((b) => b.type === 'restaurant').map((b) => b.id);
  const rows: Array<{ card: SouqProductCard; relevance: number; businessScore: number }> = [];

  if (storeIds.length) {
    const where = tokenClause(tokens, [
      Prisma.sql`p.name`, Prisma.sql`p.nameEn`, Prisma.sql`p.description`, Prisma.sql`p.descriptionEn`,
      Prisma.sql`p.sku`, Prisma.sql`CAST(p.tags AS CHAR)`, Prisma.sql`CAST(p.options AS CHAR)`,
      Prisma.sql`c.name`, Prisma.sql`c.nameEn`
    ]);
    // `storeId IN (...)` يستعمل الفهرس الفريد (storeId, sku) بادئةً
    const hits = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id FROM \`Product\` p
      LEFT JOIN \`Category\` c ON c.id = p.categoryId
      WHERE p.storeId IN (${Prisma.join(storeIds)}) AND p.isAvailable = 1 AND ${where}
      LIMIT ${CANDIDATE_CAP}`;
    if (hits.length) {
      const products = await prisma.product.findMany({
        where: { id: { in: hits.map((h) => h.id) } },
        select: {
          id: true, storeId: true, name: true, nameEn: true, sku: true, description: true, descriptionEn: true,
          price: true, originalPrice: true, imageUrl: true, images: true, tags: true, options: true, stock: true,
          comingSoon: true, ordersCount: true, isPopular: true, ratingAvg: true, ratingCount: true,
          category: { select: { name: true } }
        }
      });
      for (const p of products) {
        const b = byId.get(p.storeId);
        if (!b) continue;
        rows.push({
          relevance: scoreOf(p, tokens, phrase, p.category?.name || '').score,
          businessScore: b.score,
          card: {
            id: p.id,
            kind: 'product',
            name: p.name,
            nameEn: p.nameEn,
            price: p.price,
            originalPrice: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : null,
            image: firstImage(p.imageUrl, p.images),
            // نفس قاعدة الواجهة (services/publicProduct.service.ts)
            soldOut: !p.comingSoon && p.stock <= 0,
            comingSoon: p.comingSoon,
            ratingAvg: p.ratingAvg,
            ratingCount: p.ratingCount,
            business: businessRef(b)
          }
        });
      }
    }
  }

  if (restaurantIds.length) {
    const where = tokenClause(tokens, [
      Prisma.sql`m.name`, Prisma.sql`m.nameEn`, Prisma.sql`m.description`, Prisma.sql`m.descriptionEn`,
      Prisma.sql`m.sku`, Prisma.sql`CAST(m.options AS CHAR)`, Prisma.sql`c.name`, Prisma.sql`c.nameEn`
    ]);
    const hits = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT m.id FROM \`MenuItem\` m
      LEFT JOIN \`Category\` c ON c.id = m.categoryId
      WHERE m.restaurantId IN (${Prisma.join(restaurantIds)}) AND m.isAvailable = 1 AND ${where}
      LIMIT ${CANDIDATE_CAP}`;
    if (hits.length) {
      const items = await prisma.menuItem.findMany({
        where: { id: { in: hits.map((h) => h.id) } },
        select: {
          id: true, restaurantId: true, name: true, nameEn: true, sku: true, description: true, descriptionEn: true,
          price: true, originalPrice: true, image: true, images: true, options: true, trackStock: true, stock: true,
          ordersCount: true, isPopular: true, category: { select: { name: true } }
        }
      });
      for (const m of items) {
        const b = byId.get(m.restaurantId);
        if (!b) continue;
        rows.push({
          relevance: scoreOf(m, tokens, phrase, m.category?.name || '').score,
          businessScore: b.score,
          card: {
            id: m.id,
            kind: 'menuItem',
            name: m.name,
            nameEn: m.nameEn,
            price: m.price,
            originalPrice: m.originalPrice && m.originalPrice > m.price ? m.originalPrice : null,
            image: firstImage(m.image, m.images),
            // الصنف بلا تتبّع مخزون لا ينفد — كما في بحث المطعم
            soldOut: m.trackStock === true && (m.stock ?? 0) <= 0,
            comingSoon: false,
            ratingAvg: 0,
            ratingCount: 0,
            business: businessRef(b)
          }
        });
      }
    }
  }

  return rankCards(rows);
};

/**
 * «الأكثر طلباً» حين لا عبارة بحث — استعلامٌ واحد على أعلى المتاجر ترتيباً.
 * المتوفّر فقط: صفحة السوق الأولى لا تعرض ما لا يُشترى.
 */
const runPopular = async (eligible: SouqBusiness[]): Promise<SouqProductCard[]> => {
  const top = eligible.filter((b) => b.type === 'store').slice(0, 60);
  if (!top.length) return [];
  const byId = new Map(top.map((b) => [b.id, b]));
  const products = await prisma.product.findMany({
    where: { storeId: { in: top.map((b) => b.id) }, isAvailable: true, comingSoon: false, stock: { gt: 0 } },
    orderBy: [{ ordersCount: 'desc' }, { ratingCount: 'desc' }, { updatedAt: 'desc' }],
    take: 120,
    select: {
      id: true, storeId: true, name: true, nameEn: true, price: true, originalPrice: true, imageUrl: true,
      images: true, ordersCount: true, ratingAvg: true, ratingCount: true
    }
  });
  const rows = products
    .filter((p) => byId.has(p.storeId))
    .map((p) => {
      const b = byId.get(p.storeId)!;
      return {
        relevance: Math.min(60, p.ordersCount) + (firstImage(p.imageUrl, p.images) ? 20 : 0),
        businessScore: b.score,
        card: {
          id: p.id,
          kind: 'product' as const,
          name: p.name,
          nameEn: p.nameEn,
          price: p.price,
          originalPrice: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : null,
          image: firstImage(p.imageUrl, p.images),
          soldOut: false,
          comingSoon: false,
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          business: businessRef(b)
        }
      };
    });
  return rankCards(rows);
};

export interface ProductQuery {
  q?: string | null;
  governorate?: string | null;
  category?: string | null;
}

export const searchSouqProducts = async (query: ProductQuery): Promise<{ items: SouqProductCard[]; capped: boolean }> => {
  const phrase = String(query.q || '').trim().slice(0, 80);
  const tokens = tokenize(phrase);
  const governorate = isGovernorate(query.governorate) ? query.governorate : null;
  const category = isSouqCategory(query.category) ? query.category : null;
  const key = JSON.stringify([tokens, governorate, category]);

  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < SEARCH_TTL_MS) {
    const items = await cached.value;
    return { items, capped: items.length >= CANDIDATE_CAP };
  }

  const eligible = filterDirectory(await getDirectory(), { governorate, category });
  const value = (tokens.length ? runProductSearch(tokens, phrase, eligible) : runPopular(eligible)).catch((error) => {
    searchCache.delete(key);
    throw error;
  });

  // أقدم مدخلٍ يخرج أولاً — Map تحفظ ترتيب الإدراج
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(key, { at: Date.now(), value });
  const items = await value;
  return { items, capped: items.length >= CANDIDATE_CAP };
};

// ==================== إعداد التاجر ====================

export interface SouqListingInput {
  listed?: unknown;
  governorate?: unknown;
  category?: unknown;
}

export class SouqListingError extends Error {}

export const readListing = async (id: string, type: SouqKind) => {
  const select = {
    id: true, isActive: true, souqListed: true, souqGovernorate: true, souqCategory: true,
    subscriptionEnd: true, plan: { select: { price: true, slug: true } }
  } as const;
  const row: any =
    type === 'store'
      ? await prisma.store.findUnique({ where: { id }, select })
      : await prisma.restaurant.findUnique({ where: { id }, select });
  if (!row) return null;

  const list = await getDirectory().catch(() => [] as SouqBusiness[]);
  const index = list.findIndex((b) => b.id === id);
  const snapshot = index >= 0 ? list[index] : null;
  return {
    listed: row.souqListed !== false,
    governorate: isGovernorate(row.souqGovernorate) ? row.souqGovernorate : null,
    category: isSouqCategory(row.souqCategory) ? row.souqCategory : defaultSouqCategory(type),
    paid: isPaid(row),
    isActive: row.isActive,
    /** ظاهرٌ الآن فعلاً؟ قد يكون مفعّلاً وبلا معروضات فلا يظهر — يُقال للتاجر */
    visible: !!snapshot,
    rank: snapshot ? index + 1 : null,
    score: snapshot?.score ?? null
  };
};

export const updateListing = async (id: string, type: SouqKind, input: SouqListingInput) => {
  const data: { souqListed?: boolean; souqGovernorate?: string | null; souqCategory?: string | null } = {};

  if (input.listed !== undefined) {
    if (typeof input.listed !== 'boolean') throw new SouqListingError('قيمة الظهور غير صالحة');
    data.souqListed = input.listed;
  }
  if (input.governorate !== undefined) {
    if (input.governorate === null || input.governorate === '') data.souqGovernorate = null;
    else if (isGovernorate(input.governorate)) data.souqGovernorate = input.governorate;
    else throw new SouqListingError('المحافظة غير معروفة');
  }
  if (input.category !== undefined) {
    if (input.category === null || input.category === '') data.souqCategory = null;
    else if (isSouqCategory(input.category) && SOUQ_CATEGORIES.find((c) => c.code === input.category)!.kinds.includes(type)) {
      data.souqCategory = input.category;
    } else throw new SouqListingError('التصنيف غير مناسب لنوع نشاطك');
  }

  if (type === 'store') await prisma.store.update({ where: { id }, data });
  else await prisma.restaurant.update({ where: { id }, data });

  invalidateSouqCache();
  return readListing(id, type);
};

/** القوائم الثابتة للواجهة — من المرجع الوحيد لا نسخة في المتصفّح */
export const souqMeta = () => ({
  governorates: GOVERNORATES,
  categories: SOUQ_CATEGORIES,
  weights: SOUQ_WEIGHTS,
  ordersWindowDays: SOUQ_ORDERS_WINDOW_DAYS
});

export default {
  getDirectory,
  filterDirectory,
  facetsOf,
  publicBusiness,
  searchSouqProducts,
  readListing,
  updateListing,
  souqMeta,
  invalidateSouqCache
};
