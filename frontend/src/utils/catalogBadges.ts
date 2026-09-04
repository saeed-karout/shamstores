// frontend/src/utils/catalogBadges.ts
//
// شارات المعروضات في الواجهة.
//
// **الشارات تأتي من الخادم متى توفّرت** (`item.badges` من catalog.service).
// هذه الدوال احتياط للمسارات التي لم تُحدَّث بعد، وقواعدها تطابق الخادم
// حرفياً — نسبة تخفيض محسوبة بمعيارين مختلفين تُنتج رقمين مختلفين لنفس
// المنتج بين شاشة وأخرى.

export const TRENDING_MIN_ORDERS = 10;
export const NEW_ITEM_DAYS = 14;
export const MIN_DISCOUNT_PERCENT = 5;

export interface CatalogBadges {
  discountPercent: number | null;
  originalPrice: number | null;
  hasDiscount: boolean;
  isTrending: boolean;
  isNew: boolean;
  isFeatured: boolean;
}

export interface BadgeInput {
  price?: number | string | null;
  originalPrice?: number | string | null;
  isPopular?: boolean | null;
  ordersCount?: number | null;
  createdAt?: string | Date | null;
  badges?: CatalogBadges | null;
}

/**
 * نسبة التخفيض.
 * سعر «قبل» أقل من الحالي أو مساوٍ ليس تخفيضاً — عرضه كذلك يخدع الزبون
 * بسعر مختلق. نتجاهله بدل إنتاج نسبة سالبة.
 */
export const getDiscountPercent = (
  price?: number | string | null,
  originalPrice?: number | string | null
): number | null => {
  const now = typeof price === 'string' ? parseFloat(price) : Number(price);
  const before = typeof originalPrice === 'string' ? parseFloat(originalPrice) : Number(originalPrice);

  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  if (now <= 0 || before <= now) return null;

  const percent = Math.round(((before - now) / before) * 100);
  return percent >= MIN_DISCOUNT_PERCENT ? percent : null;
};

const isNewItem = (createdAt?: string | Date | null): boolean => {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= NEW_ITEM_DAYS * 24 * 60 * 60 * 1000;
};

/** يفضّل شارات الخادم، ويشتقّها محلياً إن غابت. */
export const resolveBadges = (item: BadgeInput): CatalogBadges => {
  if (item.badges) return item.badges;

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

export interface VisualBadge {
  key: string;
  label: string;
  tone: 'discount' | 'trending' | 'new';
}

/**
 * الشارات المعروضة، **واحدة على الأكثر فوق الصورة**.
 *
 * الأولوية: تخفيض ← رائج ← جديد. بطاقة تحمل ثلاث شارات لا تُوصل أياً منها؛
 * التخفيض أولاً لأنه سبب شراء فوري، والرائج دليل اجتماعي، والجديد أضعفها.
 */
export const getVisualBadges = (item: BadgeInput): VisualBadge[] => {
  const badges = resolveBadges(item);
  const all: VisualBadge[] = [];

  if (badges.hasDiscount) {
    all.push({ key: 'discount', label: `خصم ${badges.discountPercent}%`, tone: 'discount' });
  }
  if (badges.isTrending) {
    all.push({ key: 'trending', label: 'الأكثر طلباً', tone: 'trending' });
  }
  if (badges.isNew) {
    all.push({ key: 'new', label: 'جديد', tone: 'new' });
  }

  return all;
};

export default { getDiscountPercent, resolveBadges, getVisualBadges };
