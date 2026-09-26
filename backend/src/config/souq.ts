// backend/src/config/souq.ts
//
// «سوق شام ستورز» — تصنيفات الدليل العامّ وأوزان ترتيبه.
//
// **لماذا قائمةٌ مغلقة لا نصٌّ حرّ:** التصنيف هنا فلترٌ يضغطه الزبون، ونصٌّ
// حرّ يصير «ملابس» و«ألبسة» و«أزياء» لثلاثة متاجر تبيع الشيء نفسه — فيختار
// الزبون واحداً ولا يرى الآخرَين. والرمز لاتينيّ للسبب نفسه في config/syria.ts:
// يُخزَّن ويمرّ في الروابط.
//
// **والأوزان هنا لا في الخدمة:** كي تُقرأ وتُراجَع في موضعٍ واحد، ويُعرض
// شرحها للزبون والتاجر كما هي — لا ترتيب خفيّ لا يعرف أحد سببه.

export interface SouqCategory {
  code: string;
  name: string;
  nameEn: string;
  /** لأيّ نوع نشاطٍ يصلح — المطعم لا يُصنَّف «إلكترونيات» */
  kinds: Array<'store' | 'restaurant'>;
}

export const SOUQ_CATEGORIES: SouqCategory[] = [
  { code: 'restaurants', name: 'مطاعم', nameEn: 'Restaurants', kinds: ['restaurant'] },
  { code: 'cafes', name: 'مقاهٍ وحلويات', nameEn: 'Cafés & sweets', kinds: ['restaurant', 'store'] },
  { code: 'fashion', name: 'أزياء وأحذية', nameEn: 'Fashion & shoes', kinds: ['store'] },
  { code: 'electronics', name: 'إلكترونيات وجوالات', nameEn: 'Electronics & phones', kinds: ['store'] },
  { code: 'beauty', name: 'تجميل وعناية', nameEn: 'Beauty & care', kinds: ['store'] },
  { code: 'grocery', name: 'بقالة ومواد غذائية', nameEn: 'Grocery & food', kinds: ['store', 'restaurant'] },
  { code: 'home', name: 'منزل ومطبخ', nameEn: 'Home & kitchen', kinds: ['store'] },
  { code: 'kids', name: 'أطفال وألعاب', nameEn: 'Kids & toys', kinds: ['store'] },
  { code: 'health', name: 'صحة وصيدلية', nameEn: 'Health & pharmacy', kinds: ['store'] },
  { code: 'sports', name: 'رياضة', nameEn: 'Sports', kinds: ['store'] },
  { code: 'books', name: 'كتب وقرطاسية', nameEn: 'Books & stationery', kinds: ['store'] },
  { code: 'gifts', name: 'هدايا وإكسسوارات', nameEn: 'Gifts & accessories', kinds: ['store'] },
  { code: 'other', name: 'أخرى', nameEn: 'Other', kinds: ['store', 'restaurant'] }
];

const BY_CODE = new Map(SOUQ_CATEGORIES.map((c) => [c.code, c]));

export const isSouqCategory = (code: unknown): code is string => typeof code === 'string' && BY_CODE.has(code);

/** تصنيف من لم يختر — المطعم مطعم، والمتجر «أخرى» حتى يختار */
export const defaultSouqCategory = (type: 'store' | 'restaurant'): string =>
  type === 'restaurant' ? 'restaurants' : 'other';

/**
 * أوزان الترتيب — مجموعها الأقصى نحو ١٠٠، وكلٌّ منها يُشرح في الواجهة.
 *
 * **الاشتراك المدفوع أكبرها لكنه ليس كلّها:** متجرٌ مجانيّ نشط بطلباتٍ
 * وتقييمات يسبق مدفوعاً خاملاً بلا منتجات. ولولا ذلك لصار الترتيب إعلاناً
 * مدفوعاً متنكّراً في هيئة «الأفضل» — وهذا ما لا نفعله. والأولوية المدفوعة
 * مذكورةٌ صراحةً في شرح الترتيب على الصفحة.
 */
export const SOUQ_WEIGHTS = {
  /** خطة مدفوعة سارية */
  paidPlan: 30,
  /** الطلبات في آخر ٣٠ يوماً — لوغاريتمياً: المئة الأولى تُحسب، الألف لا تبتلع الباقي */
  recentOrders: 25,
  /** التقييمات: المتوسّط مرجَّحاً بعددها — خمسة نجوم من تقييمٍ واحد لا تكفي */
  reviews: 15,
  /** اكتمال الواجهة: شعار وغلاف ووصف وعدد معروضات */
  completeness: 15,
  /** التحديث الأخير — نشاطٌ حيّ لا واجهةٌ منسيّة */
  freshness: 5,
  /** شارة «موثَّق» إن وُجدت */
  verified: 10
} as const;

/** نافذة «الطلبات الأخيرة» */
export const SOUQ_ORDERS_WINDOW_DAYS = 30;

/** أقلّ عددٍ من المعروضات كي يُدرَج النشاط — واجهةٌ فارغة تُخيّب من ضغطها */
export const SOUQ_MIN_ITEMS = 1;

export default SOUQ_CATEGORIES;
