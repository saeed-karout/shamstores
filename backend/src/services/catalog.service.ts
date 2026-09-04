// backend/src/services/catalog.service.ts
//
// تصنيف المعروضات: تخفيض، رائج، جديد.
//
// القواعد هنا **مصدر واحد** يقرأ منه المنتج وصنف القائمة معاً. كانت
// المتاجر بلا حقول تخفيض ولا رائج إطلاقاً بينما تملكها القوائم — فكان
// «العرض» في المتجر مستحيلاً و«الرائج» يعني أشياء مختلفة في المكانين.
//
// وتُحسب على الخادم لا في الواجهة: نسبة التخفيض المحسوبة في مكانين تتباعد،
// وشارة «رائج» بمعيار مختلف بين شاشة وأخرى تفقد معناها.

/** حدّ اعتبار الصنف رائجاً بعدد الطلبات */
export const TRENDING_MIN_ORDERS = Number(process.env.TRENDING_MIN_ORDERS || 10);

/** كم يوماً يبقى المعروض «جديداً» */
export const NEW_ITEM_DAYS = Number(process.env.NEW_ITEM_DAYS || 14);

/** أقل نسبة تخفيض تستحق شارة — أقل منها ضجيج بصري لا عرض */
export const MIN_DISCOUNT_PERCENT = 5;

export interface CatalogBadges {
  /** نسبة التخفيض مقرّبة، أو null إن لا عرض */
  discountPercent: number | null;
  /** السعر قبل التخفيض — يُعرض مشطوباً */
  originalPrice: number | null;
  hasDiscount: boolean;
  isTrending: boolean;
  isNew: boolean;
  /** رفعه التاجر يدوياً */
  isFeatured: boolean;
}

export interface CatalogInput {
  price?: number | null;
  originalPrice?: number | null;
  isPopular?: boolean | null;
  ordersCount?: number | null;
  createdAt?: Date | string | null;
}

/**
 * نسبة التخفيض.
 *
 * `originalPrice` أقل من السعر أو مساوٍ له ليس تخفيضاً — وعرضه كذلك يخدع
 * الزبون بسعر «قبل» مختلق. نتجاهله بدل أن نُنتج نسبة سالبة أو صفرية.
 */
export const getDiscountPercent = (price?: number | null, originalPrice?: number | null): number | null => {
  const now = Number(price);
  const before = Number(originalPrice);

  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  if (now <= 0 || before <= now) return null;

  const percent = Math.round(((before - now) / before) * 100);
  return percent >= MIN_DISCOUNT_PERCENT ? percent : null;
};

export const isNewItem = (createdAt?: Date | string | null): boolean => {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= NEW_ITEM_DAYS * 24 * 60 * 60 * 1000;
};

/**
 * يبني شارات معروض واحد.
 *
 * «رائج» يجمع معيارين: عدّاد المبيعات **أو** رفع التاجر يدوياً. الأول موضوعي
 * لكنه لا يعمل لمتجر جديد بلا مبيعات، والثاني يعطي التاجر أداة إطلاق.
 */
export const getBadges = (item: CatalogInput): CatalogBadges => {
  const discountPercent = getDiscountPercent(item.price, item.originalPrice);

  return {
    discountPercent,
    originalPrice: discountPercent ? Number(item.originalPrice) : null,
    hasDiscount: discountPercent !== null,
    isTrending: Number(item.ordersCount || 0) >= TRENDING_MIN_ORDERS || item.isPopular === true,
    isNew: isNewItem(item.createdAt),
    isFeatured: item.isPopular === true
  };
};

/** يُلحق الشارات بقائمة معروضات قادمة من قاعدة البيانات. */
export const withBadges = <T extends CatalogInput>(items: T[]): Array<T & { badges: CatalogBadges }> =>
  items.map((item) => ({ ...item, badges: getBadges(item) }));

/**
 * أقسام واجهة المتجر، مرتّبة بما يراه الزبون أولاً.
 *
 * الترتيب مقصود: العروض أولاً لأنها سبب الشراء الفوري، ثم الرائج لأنه دليل
 * اجتماعي، ثم الجديد. معروض واحد قد يظهر في أكثر من قسم — وهذا مقبول: قسم
 * فارغ أسوأ من تكرار.
 */
export const buildSections = <T extends CatalogInput>(items: T[], limit = 12) => {
  const enriched = withBadges(items);

  const byDiscount = enriched
    .filter((i) => i.badges.hasDiscount)
    .sort((a, b) => (b.badges.discountPercent || 0) - (a.badges.discountPercent || 0));

  const byTrending = enriched
    .filter((i) => i.badges.isTrending)
    .sort((a, b) => Number(b.ordersCount || 0) - Number(a.ordersCount || 0));

  const byNew = enriched
    .filter((i) => i.badges.isNew)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return [
    { key: 'offers', title: 'عروض وتخفيضات', items: byDiscount.slice(0, limit) },
    { key: 'trending', title: 'الأكثر طلباً', items: byTrending.slice(0, limit) },
    { key: 'new', title: 'وصل حديثاً', items: byNew.slice(0, limit) }
  ].filter((section) => section.items.length > 0);
};

export default {
  TRENDING_MIN_ORDERS,
  NEW_ITEM_DAYS,
  MIN_DISCOUNT_PERCENT,
  getDiscountPercent,
  isNewItem,
  getBadges,
  withBadges,
  buildSections
};
